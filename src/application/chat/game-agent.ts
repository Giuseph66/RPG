import type { ApplicationServices } from "@application/state";
import type { ChatRepository } from "@application/ports/chat";
import type { ChatAction, ChatAgent, ChatMemory, ChatScope, ChatSource, ChatToolDefinition, ChatToolResult } from "@application/ports/chat-agent";
import type { CampaignRepository } from "@application/ports/campaign-repository";
import type { CharacterRepository } from "@application/ports/character-repository";
import type { DiceHistoryRepository } from "@application/ports/dice-history-repository";
import type { SessionService } from "@application/session";
import type { CreatureService } from "@application/campaign/creature-service";
import type { CompendiumService } from "@application/compendium";
import type { IdGenerator } from "@application/ports/id-generator";
import type { Clock } from "@application/ports/clock";
import { asAccountId, asEntityId, asUuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { Result } from "@domain/contracts/errors";
import { deriveCharacter } from "@domain/rules";
import { composeCharacterRuleContent } from "@domain/character/creation/optional-rules";
import { deriveActionCapabilities } from "@application/character/action-capabilities";
import { createActionDispatcher } from "@application/character/action-dispatcher";
import { applyCondition, removeCondition } from "@domain/rules/conditions";
import { addInventoryItem, createInventoryItem, createInventoryState, equipInventoryItem, unequipInventoryItem, removeInventoryItem, setItemQuantity, setCurrency, consumeItem } from "@domain/inventory/operations";
import { createPlatformRandomSource, parseDiceFormula, rollExpression } from "@domain/dice";
import type { CoinDenomination } from "@domain/contracts/primitives";
import { DEFAULT_CHAT_SCOPE } from "@application/ports/chat-agent";
import { ownSlots, preparedLimitFor } from "@domain/character/evolution/spell-tables";

interface Dependencies {
  readonly services: ApplicationServices;
  readonly repository: ChatRepository;
  readonly characters: CharacterRepository;
  readonly campaigns: CampaignRepository;
  readonly dice: DiceHistoryRepository;
  readonly compendium: CompendiumService;
  readonly loadCatalog: () => Promise<void>;
  readonly session: SessionService;
  readonly creatures: CreatureService;
  readonly pack: RulePack;
  readonly ruleContext: Parameters<typeof deriveCharacter>[2];
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly currentUid: () => string | undefined;
}
const text = (input: Record<string, unknown>, key: string, max = 8000): string => {
  if (typeof input[key] !== "string" || !input[key].trim() || input[key].length > max) throw new Error(`Informe ${key} com até ${max} caracteres.`);
  return input[key].trim();
};
const number = (input: Record<string, unknown>, key: string, min = 0, max = 100000): number => {
  const value = input[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new Error(`Valor inválido para ${key}.`);
  return value;
};
const value = <T,>(result: Result<T, { readonly message: string }>): T => { if (!result.ok) throw new Error(result.error.message); return result.value; };
const json = (data: unknown, max = 18000): string => { const result = JSON.stringify(data); return result.length > max ? result.slice(0, max) + "\n[Conteúdo parcial: refine a consulta.]" : result; };
function passage(content: string, query: string): string {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const normalized = normalize(content), terms = normalize(query).split(/\s+/).filter((term) => term.length > 2);
  const locations = terms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0);
  const start = Math.max(0, (locations.length ? Math.min(...locations) : 0) - 400);
  return `${start ? "…" : ""}${content.slice(start, start + 3500)}${start + 3500 < content.length ? "…" : ""}`;
}
const prop = (description: string) => ({ type: "string", description });
const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []): ChatToolDefinition => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } } });
const READ_TOOLS = [
  tool("search_rules", "Busca no livro/compêndio habilitado. Use termos curtos, em português; refine quando vazio. Retorna fontes reais.", { query: prop("Termos da regra, magia, item ou criatura"), category: prop("Categoria opcional") }, ["query"]),
  tool("read_sheet", "Consulta a ficha selecionada, cálculos do motor, recursos, equipamentos e magias. section limita o contexto.", { section: { type: "string", enum: ["all", "identity", "abilities", "combat", "inventory", "spells", "resources"] } }),
  tool("read_campaign", "Consulta campanha, objetivos, regras da casa, NPCs e mapas respeitando visibilidade."),
  tool("read_journal", "Busca registros visíveis do diário e linha do tempo; jogador só acessa seu diário.", { query: prop("Termos opcionais") }),
  tool("read_sessions", "Consulta sessões, recapitulações, participantes e iniciativa. Filtre por número ou termos para localizar sessões antigas. Notas completas só para mestre.", { number: { type: "integer", minimum: 1 }, query: prop("Termos do título ou resumo") }),
  tool("read_creatures", "Mestre consulta elenco; jogador recebe apenas avistamentos publicados para ele."),
  tool("read_party", "Consulta o grupo para planejar encontros e comparar recursos. Mestre lê fichas da campanha; jogador só recebe sua própria ficha."),
  tool("read_rolls", "Consulta os últimos resultados reais de dados da ficha selecionada."),
  tool("read_memories", "Consulta memórias pessoais e da campanha; nunca trate sugestões como fatos ocorridos.", { query: prop("Termos opcionais") }),
  tool("read_actions", "Lista ações executáveis e bloqueadas calculadas pelo motor. Filtre por kind ou nome para listas extensas.", { kind: { type: "string", enum: ["attack", "damage", "spell", "resource", "item", "rest", "concentration"] }, query: prop("Parte do nome da ação") }),
];
const WRITE_TOOLS = [
  tool("propose_action", "Prepara ação do motor para confirmação. Use capabilityId e kind de read_actions. Não executa até o usuário confirmar.", { capabilityId: prop("ID real de read_actions"), kind: prop("Tipo da capacidade"), value: { type: "integer" }, targetArmorClass: { type: "integer" }, hitDice: { type: "object", additionalProperties: { type: "integer", minimum: 0 } }, ateAndDrank: { type: "boolean" }, spellTargetContext: { type: "object" }, spellComponentContext: { type: "object" } }, ["capabilityId", "kind"]),
  tool("propose_roll", "Prepara rolagem real. Para perícia/atributo/salvaguarda/iniciativa, o app calcula o modificador. Exige confirmação.", { formula: prop("NdF+M para rolagem livre"), check: { type: "string", enum: ["free", "skill", "ability", "save", "initiative"] }, key: prop("Nome/ID do atributo ou perícia conforme read_sheet"), mode: { type: "string", enum: ["normal", "advantage", "disadvantage"] }, label: prop("Descrição") }, ["check"]),
  tool("propose_inventory", "Prepara alteração validada de inventário ou moedas, com confirmação.", { operation: { type: "string", enum: ["add", "quantity", "equip", "unequip", "remove", "consume", "currency"] }, itemId: prop("ID da instância"), equipmentId: prop("ID da definição do catálogo"), quantity: { type: "integer", minimum: 0 }, denomination: { type: "string", enum: ["cp", "sp", "ep", "gp", "pp"] }, amount: { type: "integer", minimum: 0 } }, ["operation"]),
  tool("propose_condition", "Prepara aplicar/remover condição real da ficha, respeitando imunidades.", { operation: { type: "string", enum: ["apply", "remove"] }, conditionId: prop("ID da definição para aplicar ou instância para remover"), severity: { type: "integer", minimum: 0 }, reason: prop("Origem/decisão da mesa") }, ["operation", "conditionId"]),
  tool("propose_preparation", "Propõe lista de magias preparadas de fonte de classe. Preserva magias sempre preparadas, valida lista e limites. Pergunte se houve tempo/descanso para preparar.", { sourceId: prop("ID de fonte de conjuração da ficha"), spellIds: { type: "array", items: { type: "string" }, maxItems: 40 }, preparationTimeConfirmed: { type: "boolean" } }, ["sourceId", "spellIds", "preparationTimeConfirmed"]),
  tool("propose_creature", "Mestre prepara NPC, ameaça ou animal no elenco privado. Conteúdo é rascunho até confirmação. Bloco de estatísticas opcional deve ser completo e validável pelo app.", { kind: { type: "string", enum: ["npc", "enemy", "animal", "unknown"] }, name: prop("Nome"), appearance: prop("Aparência"), race: prop("Espécie"), description: prop("Descrição"), hitPoints: prop("PV"), armorClass: prop("CA"), abilities: prop("Habilidades"), notes: prop("Notas privadas do mestre"), statBlock: { type: "object" } }, ["kind", "name"]),
  tool("propose_record", "Cria rascunho revisável de diário, NPC, missão ou regra da casa. NPC/missão/regra são exclusivos do mestre. Só salva após confirmação.", { kind: { type: "string", enum: ["journal", "npc", "quest", "house_rule"] }, title: prop("Título"), body: prop("Texto completo do rascunho"), sessionNumber: { type: "integer", minimum: 1 } }, ["kind", "title", "body"]),
  tool("propose_memory", "Propõe criar/corrigir/apagar memória. private é pessoal; party é fato compartilhado; master é segredo do mestre. Compartilhamento exige mestre e confirmação.", { operation: { type: "string", enum: ["save", "delete"] }, id: prop("ID existente para corrigir/remover"), title: prop("Título"), body: prop("Fato confirmado ou correção explicitamente pedida"), visibility: { type: "string", enum: ["private", "party", "master"] } }, ["operation"]),
  tool("propose_session", "Propõe criar/iniciar/encerrar sessão, atualizar notas, presença ou iniciativa. Somente mestre; exige confirmação.", { operation: { type: "string", enum: ["create", "start", "end", "notes", "encounter", "attendance"] }, sessionId: prop("ID real da sessão"), title: prop("Título"), number: { type: "integer", minimum: 1 }, body: prop("Notas/resumo"), encounter: { type: "object" }, attendance: { type: "array", items: { type: "object", properties: { characterId: { type: "string" }, playerId: { type: "string" }, present: { type: "boolean" } }, required: ["characterId", "playerId", "present"], additionalProperties: false } } }, ["operation"]),
];

export function createGameChatAgent(d: Dependencies): ChatAgent {
  function session(uid: string) { if (d.currentUid() !== uid) throw new Error("Sua sessão mudou. Entre novamente antes de continuar."); }
  async function role(uid: string, scope: ChatScope) {
    session(uid);
    const result = scope.campaignId ? await d.repository.campaignRole(uid, scope.campaignId) : undefined;
    session(uid);
    if (scope.campaignId && !result) throw new Error("Você não tem acesso a esta campanha.");
    if (scope.master && result !== "master") throw new Error("Esta conversa contém contexto do mestre. Abra uma nova conversa com suas permissões atuais.");
    // A player conversation never gains master-only data after a later promotion.
    return result === "master" && scope.master === false ? "player" : result;
  }
  async function character(uid: string, scope: ChatScope, write = false) {
    if (!scope.sheet || !scope.characterId) throw new Error("Selecione e compartilhe uma ficha para esta consulta.");
    const current = value(await d.services.character.get(asUuid(scope.characterId)));
    const campaignRole = await role(uid, scope);
    if (current.ownerUid !== uid && !(campaignRole === "master" && current.campaignId === scope.campaignId)) throw new Error("Você não tem acesso a esta ficha.");
    const snapshot = d.services.character.store.getSnapshot();
    if (write && snapshot.value?.id !== current.id) throw new Error("Selecione esta ficha no aplicativo antes de confirmar a alteração.");
    if (write && (snapshot.hasPendingChanges || snapshot.value?.revision !== current.revision)) throw new Error("Aguarde a gravação das alterações pendentes da ficha antes de confirmar.");
    if (current.campaignId && scope.campaignId && current.campaignId !== scope.campaignId) throw new Error("A ficha pertence a outra campanha. Abra uma conversa com a campanha correta.");
    return current;
  }
  function calculated(current: Character) {
    const pack = value(composeCharacterRuleContent(d.pack, current));
    const derived = value(deriveCharacter(current, pack, d.ruleContext));
    return { pack, derived };
  }
  async function campaign(uid: string, scope: ChatScope, master = false) {
    if (!scope.campaign || !scope.campaignId) throw new Error("Selecione e compartilhe uma campanha.");
    const r = await role(uid, scope);
    if (master && r !== "master") throw new Error("Esta operação é exclusiva do mestre.");
    return value(await d.campaigns.get(asUuid(scope.campaignId)));
  }
  const source = (kind: ChatSource["kind"], title: string, locator: string, data: unknown, href: string, updatedAt?: string): Omit<ChatSource, "id"> => ({ kind, title, locator, excerpt: typeof data === "string" ? data.slice(0, 500) : json(data, 500), ...(href !== "/chat" ? { href } : {}), ...(updatedAt ? { updatedAt } : {}) });
  const ref = (type: "equipment" | "condition", id: string) => ({ rulesetId: d.pack.manifest.id, entityType: type, entityId: asEntityId(id) });
  async function proposal(uid: string, scope: ChatScope, name: string, input: Record<string, unknown>): Promise<ChatToolResult> {
    let revision: number | undefined;
    let label = name;
    let review = "";
    if (name === "propose_roll" && input.check === "free" && (!scope.characterId || !scope.sheet)) {
      value(parseDiceFormula(text(input, "formula", 80)));
      label = "Rolar dados livres";
      review = `Fórmula: ${String(input.formula)}\nModo: ${String(input.mode ?? "normal")}`;
    } else if (["propose_action", "propose_roll", "propose_inventory", "propose_condition", "propose_preparation"].includes(name)) {
      const current = await character(uid, scope);
      const { pack: currentPack } = calculated(current);
      revision = current.revision;
      label = `${current.name} · ${name === "propose_roll" ? "Rolar dados" : name === "propose_inventory" ? "Alterar inventário" : name === "propose_condition" ? "Alterar condição" : "Executar ação"}`;
      if (name === "propose_action") {
        const { pack, derived } = calculated(current);
        const found = deriveActionCapabilities(current, derived, pack, d.ids).capabilities.find((item) => item.id === input.capabilityId);
        if (!found || found.kind !== input.kind || found.status !== "available") throw new Error("A capacidade não está disponível. Consulte read_actions.");
        if (found.inputKind === "amount") number(input, "value");
        if (found.inputKind === "target-armor-class") number(input, "targetArmorClass", 0, 100);
        label = `${current.name} · ${found.label}`;
        review = [found.description, ...(found.effectSummary ?? []), ...(found.costs ?? []).map((item) => `${item.label}: ${item.value ?? item.remaining ?? "consumo conforme motor"}`)].filter(Boolean).join("\n");
      } else if (name === "propose_inventory") {
        const item = current.inventory.find((item) => item.id === input.itemId);
        const definition = currentPack.equipment.get(asEntityId(String(input.equipmentId ?? item?.equipmentRef.entityId ?? "")));
        if (input.operation !== "currency" && !definition) throw new Error("Informe um equipamento real do catálogo ou inventário.");
        review = `${input.operation === "currency" ? `Moeda: ${String(input.denomination)}` : `Item: ${item?.customName ?? definition?.name}`}\nOperação: ${String(input.operation)}\nQuantidade/valor: ${String(input.quantity ?? input.amount ?? 1)}`;
      } else if (name === "propose_condition") {
        const instance = current.conditions.find((item) => item.id === input.conditionId);
        const definition = currentPack.conditions.get(asEntityId(String(instance?.definitionRef.entityId ?? input.conditionId)));
        if (!definition) throw new Error("Condição não encontrada na ficha ou no catálogo.");
        review = `Condição: ${definition.name}\nOperação: ${String(input.operation)}\nSeveridade: ${String(input.severity ?? "padrão")}`;
      } else if (name === "propose_preparation") {
        review = `Magias: ${Array.isArray(input.spellIds) ? input.spellIds.map((id) => currentPack.spells.get(asEntityId(String(id)))?.name ?? String(id)).join(", ") : "lista não informada"}`;
      } else if (name === "propose_roll") {
        review = `Teste: ${String(input.check)}\nFórmula: ${String(input.formula ?? "1d20 com bônus calculado pela ficha")}\nAtributo/perícia: ${String(input.key ?? "não se aplica")}\nModo: ${String(input.mode ?? "normal")}`;
      }
    } else if (name === "propose_memory") {
      if (!scope.memory) throw new Error("Memórias não foram compartilhadas nesta conversa.");
      if (input.visibility && input.visibility !== "private") await campaign(uid, scope, true);
      if (input.operation !== "save" && input.operation !== "delete") throw new Error("Operação de memória inválida.");
      const previous = typeof input.id === "string" ? (await d.repository.listMemories(uid, scope)).find((item) => item.id === input.id) : undefined;
      if (input.id && !previous) throw new Error("Memória não encontrada ou sem acesso.");
      input = { ...input, visibility: input.visibility ?? previous?.visibility ?? "private", ...(previous ? { _memoryUpdatedAt: previous.updatedAt, ...(input.operation === "delete" ? { title: previous.title, body: previous.body } : {}) } : {}) };
      if (input.visibility !== "private") await campaign(uid, scope, true);
      if (input.operation === "save") { text(input, "title", 120); text(input, "body"); }
      label = input.operation === "delete" ? "Remover memória" : `Guardar memória · ${String(input.title).slice(0, 120)}`;
    } else {
      const current = await campaign(uid, scope, name === "propose_session" || input.kind !== "journal");
      revision = current.revision;
      if (name === "propose_record") { text(input, "title", 120); text(input, "body"); }
      label = name === "propose_record" ? `Salvar ${String(input.kind)} · ${String(input.title).slice(0, 120)}` : name === "propose_creature" ? `Criar no elenco · ${String(input.name).slice(0, 80)}` : `Sessão · ${String(input.operation)}`;
      if (name === "propose_session" && input.operation !== "create") {
        const existing = value(await d.session.get(asUuid(text(input, "sessionId", 160))));
        if (existing.campaignId !== current.id) throw new Error("A sessão pertence a outra campanha.");
        input = { ...input, _sessionRevision: existing.revision };
        review = `Sessão ${existing.number}: ${existing.title}\nEstado atual: ${existing.status}`;
      }
    }
    // Input is displayed verbatim for review and revalidated again at commit.
    return { content: "Proposta preparada. Nada foi executado. O usuário precisa revisar e confirmar no cartão da resposta.", proposal: { name, label, input, scope, ...(review ? { review: review.slice(0, 4000) } : {}), ...(revision === undefined ? {} : { expectedRevision: revision }) } };
  }
  async function invoke(uid: string, scope: ChatScope, name: string, input: Record<string, unknown>): Promise<ChatToolResult> {
    await role(uid, scope);
    if (!tools(scope).some((item) => item.function.name === name)) throw new Error("Ferramenta não permitida para o contexto compartilhado.");
    if (name.startsWith("propose_")) return proposal(uid, scope, name, input);
    if (name === "search_rules") {
      await d.loadCatalog(); session(uid);
      const query = text(input, "query", 160);
      const entries = d.compendium.search({ query, ...(typeof input.category === "string" ? { category: input.category as never } : {}) }).entries
        .filter((entry) => entry.ruleset.id === d.pack.manifest.id && entry.ruleset.version === d.pack.manifest.version).slice(0, 5);
      const sources = entries.map((entry) => {
        const detail = d.compendium.getDetail(entry.ref);
        const locator = entry.sourceRefs.map((item) => [item.sourceId, item.chapter, item.section, item.printedPage ? `p. ${item.printedPage}` : ""].filter(Boolean).join(" · ")).join("; ");
        const definition = detail.ok ? detail.value.definition : undefined;
        const content = definition && "text" in definition ? String(definition.text) : definition && "description" in definition ? String(definition.description) : json(definition ?? entry.summary);
        return { ...source("rule", entry.title, locator || `${entry.ruleset.id} · ${entry.ruleset.version}`, content, `/compendium/${entry.category}/${encodeURIComponent(entry.ref.entityId)}`), excerpt: passage(content, query) };
      });
      return { content: entries.length ? "Trechos do catálogo carregado; páginas apenas quando constam da fonte. Referencie as fontes retornadas." : "Nenhuma regra encontrada. Refine os termos; não invente referência ou página.", sources };
    }
    if (name === "read_sheet" || name === "read_actions" || name === "read_rolls") {
      const current = await character(uid, scope), { pack, derived } = calculated(current);
      if (name === "read_rolls") return { content: json(value(await d.dice.list({ characterId: current.id, limit: 20 })).entries.map((item) => item.roll)) };
      if (name === "read_actions") return { content: json(deriveActionCapabilities(current, derived, pack, d.ids).capabilities.filter((item) => (!input.kind || item.kind === input.kind) && (!input.query || item.label.toLocaleLowerCase("pt-BR").includes(String(input.query).toLocaleLowerCase("pt-BR")))).slice(0, 40).map(({ id, kind, label, status, blockedReason, pendingReasons, inputKind, costs, effectSummary }) => ({ id, kind, label, status, blockedReason, pendingReasons, inputKind, costs, effectSummary }))) };
      const section = input.section ?? "all";
      const named = (items: readonly import("@domain/contracts/ids").DefinitionRef[]) => items.map((item) => ({ ...item, name: pack.spells.get(item.entityId)?.name }));
      const identity = { id: current.id, name: current.name, race: pack.races.get(current.raceRef.entityId)?.name, classes: current.classes.map((item) => ({ ...item, name: pack.classes.get(item.classId)?.name })), background: current.backgroundRef ? pack.backgrounds.get(current.backgroundRef.entityId)?.name : undefined, history: current.history, appearance: current.appearance, personalityTraits: current.personalityTraits, ideals: current.ideals, bonds: current.bonds, flaws: current.flaws, ruleset: current.rulesetRef, supplements: current.selectedSupplementIds };
      const sections: Record<string, unknown> = {
        identity,
        abilities: { attributes: derived.abilityScores, skills: derived.skills, savingThrows: derived.savingThrows, proficiencyBonus: derived.proficiencyBonus },
        combat: { hp: current.hp, maximumHp: derived.hitPointsMax, armorClass: derived.armorClass, initiative: derived.initiative, speeds: derived.speedsCm, attacks: derived.attacks, defenses: derived.resistanceProfile, conditions: current.conditions, concentration: current.concentration, transformation: current.transformation ? { form: current.transformation.formRef, hp: current.transformation.formHp, duration: current.transformation.duration } : undefined },
        inventory: { items: current.inventory.map((item) => ({ ...item, name: pack.equipment.get(item.equipmentRef.entityId)?.name })), currency: current.currency },
        spells: { sources: current.castingSources.map((item) => ({ ...item, knownSpellRefs: named(item.knownSpellRefs), preparedSpellRefs: named(item.preparedSpellRefs), spellbookRefs: named(item.spellbookRefs) })), slots: current.spellSlots, derived: derived.spellcastingSources },
        resources: { states: current.resources, capacities: derived.resourceCapacities, hitDiceSpent: current.hitDiceSpent, pending: current.pendingResolutions },
      };
      const data = section === "all" ? sections : sections[String(section)];
      if (!data) throw new Error("Seção da ficha inválida.");
      return { content: json(data), sources: [source("sheet", current.name, `Ficha · revisão ${current.revision} · ${section}`, data, `/character/${current.id}`, current.updatedAt)] };
    }
    if (name === "read_memories") {
      const memories = await d.repository.listMemories(uid, scope);
      const query = String(input.query ?? "").toLocaleLowerCase("pt-BR");
      const found = memories.filter((item) => `${item.title} ${item.body}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, 12);
      return { content: json(found), sources: found.map((item) => source("memory", item.title, `Memória ${item.visibility} · ${item.id}`, item.body, "/chat", item.updatedAt)) };
    }
    const current = await campaign(uid, scope), r = await role(uid, scope);
    if (name === "read_party") {
      if (!scope.sheet) throw new Error("Compartilhe as fichas para consultar os dados do grupo.");
      const listed = value(await d.characters.list()).filter((item) => item.campaignId === current.id && !item.castSheet && (r === "master" || item.ownerUid === uid)).slice(0, 20);
      const group = [];
      for (const item of listed) {
        const member = value(await d.services.character.get(item.id));
        const { derived, pack } = calculated(member);
        group.push({ id: member.id, name: member.name, classes: member.classes.map((cls) => ({ name: pack.classes.get(cls.classId)?.name, level: cls.level })), hp: member.hp, maximumHp: derived.hitPointsMax.value, armorClass: derived.armorClass.value, conditions: member.conditions, resources: member.resources, slots: member.spellSlots, revision: member.revision, updatedAt: member.updatedAt });
      }
      session(uid);
      return { content: json(group), sources: group.map((item) => source("sheet", item.name, `Grupo · revisão ${item.revision}`, item, `/character/${item.id}`, item.updatedAt)) };
    }
    if (name === "read_campaign") {
      const maps = value(await d.services.campaign.listMaps(current.id)).filter((item) => r === "master" || item.visibleTo?.some((id) => id === "*" || id === uid));
      const data = { id: current.id, name: current.name, description: current.description, ruleset: current.rulesetRef, settings: current.settings, objectives: current.objectives, quests: current.quests, sessionCounter: current.sessionCounter, ...(r === "master" ? { npcs: current.npcs } : {}), maps: maps.map(({ id, name, pins }) => ({ id, name, pins })) };
      return { content: json(data), sources: [source("campaign", current.name, `Campanha · revisão ${current.revision}`, data, "/journey", current.updatedAt)] };
    }
    if (name === "read_journal") {
      const query = String(input.query ?? "").toLocaleLowerCase("pt-BR");
      const entries = value(await d.campaigns.listJournalEntries(current.id)).filter((item) => r === "master" || item.authorId === uid).filter((item) => `${item.title} ${item.body}`.toLocaleLowerCase("pt-BR").includes(query)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
      return { content: json(entries), sources: entries.map((item) => source("journal", item.title, `Diário · sessão ${item.sessionNumber ?? "não informada"}`, item.body, "/journey/journal", item.updatedAt)) };
    }
    if (name === "read_sessions") {
      const sessions = [...value(await d.session.list(current.id))].filter((item) => (!input.number || item.number === input.number) && (!input.query || `${item.title} ${item.summary}`.toLocaleLowerCase("pt-BR").includes(String(input.query).toLocaleLowerCase("pt-BR")))).sort((a, b) => b.number - a.number).slice(0, 10).map(({ notes, ...item }) => ({ ...item, ...(r === "master" ? { notes } : {}) }));
      return { content: json(sessions), sources: sessions.map((item) => source("session", item.title, `Sessão ${item.number} · ${item.status}`, item.summary, `/session/${current.id}`, item.updatedAt)) };
    }
    if (name === "read_creatures") return { content: json(r === "master" ? value(await d.creatures.listCreatures(current.id)) : value(await d.creatures.listSightings(current.id, asAccountId(uid)))) };
    throw new Error("Ferramenta desconhecida.");
  }
  function tools(scope: ChatScope) {
    return [...READ_TOOLS, ...WRITE_TOOLS].filter(({ function: f }) => f.name === "propose_roll" ? true : f.name === "search_rules" ? scope.rules : ["read_sheet", "read_actions", "read_rolls", "propose_action", "propose_inventory", "propose_condition", "propose_preparation"].includes(f.name) ? scope.sheet && !!scope.characterId : f.name.includes("memor") ? scope.memory : scope.campaign && !!scope.campaignId);
  }
  async function execute(uid: string, action: ChatAction) {
    const { scope, input, name } = action;
    await role(uid, scope);
    if (!tools(scope).some((item) => item.function.name === name)) throw new Error("Ação não autorizada para esta conversa.");
    if (name === "propose_roll" && input.check === "free" && (!scope.characterId || !scope.sheet)) {
      const expression = value(parseDiceFormula(text(input, "formula", 80)));
      const mode = input.mode ?? "normal";
      if (!["normal", "advantage", "disadvantage"].includes(String(mode))) throw new Error("Modo de rolagem inválido.");
      const roll = value(rollExpression({ ...expression, mode: mode as typeof expression.mode }, createPlatformRandomSource(), { id: asUuid(action.id), timestamp: d.clock.now(), purpose: "free", label: String(input.label ?? "Rolagem livre").slice(0, 120) }));
      session(uid); value(await d.services.dice.append({ roll }));
      return { content: `Rolagem real: ${input.formula}; dados ${roll.rawDice.join(", ")}; total ${roll.total}.` };
    }
    if (["propose_action", "propose_roll", "propose_inventory", "propose_condition", "propose_preparation"].includes(name)) {
      const current = await character(uid, scope, true);
      if (current.revision !== action.expectedRevision) throw new Error("A ficha mudou desde a proposta. Peça ao Oráculo uma nova proposta.");
      const { pack, derived } = calculated(current);
      const undoFor = (revision: number) => ({ kind: "character", character: current, revision });
      if (name === "propose_roll") {
        let expression = value(parseDiceFormula(typeof input.formula === "string" ? input.formula : "1d20"));
        const key = String(input.key ?? ""), check = input.check;
        if (check !== "free") {
          const modifier = check === "skill" ? derived.skills.find((item) => item.skill === key)?.modifier.value : check === "save" ? derived.savingThrows.find((item) => item.ability === key)?.modifier.value : check === "ability" ? derived.abilityScores.find((item) => item.ability === key)?.modifier.value : check === "initiative" ? derived.initiative.value : undefined;
          if (modifier === undefined) throw new Error("Teste não encontrado na ficha. Consulte atributos e perícias antes de rolar.");
          expression = { quantity: 1, faces: 20, modifier, mode: "normal" };
        }
        if (input.mode !== undefined) {
          if (!["normal", "advantage", "disadvantage"].includes(String(input.mode))) throw new Error("Modo de rolagem inválido.");
          expression = { ...expression, mode: input.mode as typeof expression.mode };
        }
        const roll = value(rollExpression(expression, createPlatformRandomSource(), { id: asUuid(action.id), timestamp: d.clock.now(), purpose: "free", characterId: current.id, label: String(input.label ?? check).slice(0, 120) }));
        session(uid); value(await d.services.dice.append({ roll, characterId: current.id }));
        return { content: `Rolagem real: ${expression.quantity}d${expression.faces}${expression.modifier >= 0 ? "+" : ""}${expression.modifier}; dados ${roll.rawDice.join(", ")}; total ${roll.total}.` };
      }
      if (name === "propose_action") {
        const { capabilities, executions } = deriveActionCapabilities(current, derived, pack, d.ids);
        const found = capabilities.find((item) => item.id === input.capabilityId && item.kind === input.kind && item.status === "available");
        if (!found) throw new Error("Ação indisponível no estado atual da ficha.");
        if (found.inputKind === "amount") number(input, "value");
        if (found.inputKind === "target-armor-class") number(input, "targetArmorClass", 0, 100);
        session(uid);
        const result = await createActionDispatcher({ characterService: d.services.character, capabilitiesById: executions, rng: createPlatformRandomSource(), idGenerator: d.ids, clock: d.clock })({ ...input, commandId: found.commandId, characterId: current.id, capabilityId: found.id, kind: found.kind } as Parameters<ReturnType<typeof createActionDispatcher>>[0]);
        if (!result || result.status !== "success") throw new Error(result?.status === "needsInput" ? result.requests.map((item) => item.reason).join("; ") : result?.status === "rejected" ? result.errors.map((item) => item.message).join("; ") : "O comando não confirmou a gravação.");
        const saved = value(await d.services.character.get(current.id));
        return { content: `${found.label} executada pelo motor de regras. ${json(result.explanations, 2500)}`, undo: undoFor(saved.revision) };
      }
      let next = current;
      if (name === "propose_preparation") {
        if (input.preparationTimeConfirmed !== true) throw new Error("Confirme com o jogador o tempo ou descanso necessário à preparação.");
        const sourceId = text(input, "sourceId", 160), source = current.castingSources.find((item) => item.id === sourceId);
        const cls = source && current.classes.find((item) => item.classId === source.grantingRef.entityId);
        if (!source || !cls) throw new Error("Escolha uma fonte de classe preparada. Fontes raciais e concessões fixas não são alteradas aqui.");
        const modifier = derived.abilityScores.find((item) => item.ability === source.ability)?.modifier.value;
        const limit = modifier === undefined ? undefined : preparedLimitFor(String(cls.classId), cls.level, modifier);
        if (limit === undefined) throw new Error("Esta classe não usa a preparação suportada. Use as escolhas de evolução da ficha.");
        if (!Array.isArray(input.spellIds) || input.spellIds.some((id) => typeof id !== "string") || new Set(input.spellIds).size !== input.spellIds.length || input.spellIds.length > limit) throw new Error(`Escolha até ${limit} magias diferentes.`);
        const maxLevel = ownSlots(String(cls.classId) === "paladin" ? "half" : "full", cls.level).length;
        const always = current.preparedSelections.filter((item) => item.castingSourceId === source.id && item.alwaysPrepared);
        const selected = input.spellIds.map((id: string) => {
          const spell = pack.spells.get(asEntityId(id));
          if (!spell || spell.level < 1 || spell.level > maxLevel || !spell.classes.includes(cls.classId) || (String(cls.classId) === "wizard" && !source.spellbookRefs.some((ref) => ref.entityId === id))) throw new Error(`Magia ${id} não é válida para preparar nesta fonte.`);
          return { rulesetId: current.rulesetRef.id, entityId: spell.id };
        });
        const prepared = [...always.map((item) => item.spellRef), ...selected.filter((ref) => !always.some((item) => item.spellRef.entityId === ref.entityId))];
        next = { ...current, castingSources: current.castingSources.map((item) => item.id === source.id ? { ...item, preparedSpellRefs: prepared } : item), preparedSelections: [...current.preparedSelections.filter((item) => item.castingSourceId !== source.id || item.alwaysPrepared), ...selected.filter((ref) => !always.some((item) => item.spellRef.entityId === ref.entityId)).map((spellRef) => ({ castingSourceId: source.id, spellRef, alwaysPrepared: false }))] };
      }
      if (name === "propose_inventory") {
        const operation = text(input, "operation", 30), itemId = String(input.itemId ?? "");
        const state = value(createInventoryState(current.inventory, current.currency));
        if (operation === "currency") {
          if (!["cp", "sp", "ep", "gp", "pp"].includes(String(input.denomination))) throw new Error("Moeda inválida.");
          next = { ...current, currency: value(setCurrency(state, { ...state.currency, [String(input.denomination) as CoinDenomination]: number(input, "amount") })).currency };
        } else if (operation === "consume") {
          const item = current.inventory.find((item) => item.id === itemId);
          const definition = item && pack.equipment.get(item.equipmentRef.entityId);
          if (!item || !definition || !d.services.character.commands) throw new Error("Item ou comando de consumo indisponível.");
          const command = { commandId: action.id as import("@domain/contracts/ids").CommandId, characterId: current.id, expectedRevision: current.revision, kind: "consume-item" as const, payload: { inventoryItemId: item.id, equipmentRef: item.equipmentRef } };
          const result = consumeItem(current, command, definition);
          if (result.status !== "success") throw new Error("O motor recusou o consumo do item.");
          value(await d.services.character.commands.commit(command, result));
          value(await d.services.character.hydrate(current.id));
          const saved = value(await d.services.character.get(current.id));
          return { content: "Item consumido pelo motor de regras.", undo: undoFor(saved.revision) };
        } else {
          const mutation = operation === "add" ? (() => {
            const equipmentId = text(input, "equipmentId", 160);
            if (!pack.equipment.has(asEntityId(equipmentId))) throw new Error("Equipamento não encontrado no catálogo habilitado.");
            return addInventoryItem(state, value(createInventoryItem({ id: asUuid(action.id), equipmentRef: ref("equipment", equipmentId), quantity: number(input, "quantity", 1, 10000) })));
          })() : operation === "quantity" ? setItemQuantity(state, itemId, number(input, "quantity", 0, 10000)) : operation === "equip" ? equipInventoryItem(state, itemId) : operation === "unequip" ? unequipInventoryItem(state, itemId) : operation === "remove" ? removeInventoryItem(state, itemId) : undefined;
          if (!mutation) throw new Error("Operação de inventário inválida.");
          next = { ...current, inventory: value(mutation).inventory };
        }
      } else if (name === "propose_condition") {
        const id = text(input, "conditionId", 160), definition = pack.conditions.get(asEntityId(id));
        if (input.operation === "apply" && !definition) throw new Error("Condição não encontrada no catálogo.");
        const result = input.operation === "remove" ? removeCondition(current, asUuid(id)) : input.operation === "apply" && definition ? applyCondition(current, { id: asUuid(action.id), definitionRef: ref("condition", id), origin: { kind: "table-decision", description: typeof input.reason === "string" ? input.reason.slice(0, 500) : "Confirmada pelo usuário no Oráculo" }, ...(input.severity === undefined ? {} : { severity: number(input, "severity", 0, 10) }) }, definition, { conditionImmunities: derived.resistanceProfile.conditionImmunities }) : undefined;
        if (!result || result.status !== "success") throw new Error("O motor recusou a alteração de condição.");
        next = result.nextState;
      }
      session(uid);
      const revision = value(await d.services.character.saveCharacter(next, current.revision));
      if (d.services.character.store.selectedId === current.id) value(await d.services.character.hydrate(current.id));
      return { content: "Alteração salva na ficha.", undo: undoFor(revision) };
    }
    if (name === "propose_memory") {
      const memories = await d.repository.listMemories(uid, scope);
      const previous = typeof input.id === "string" ? memories.find((item) => item.id === input.id) : undefined;
      if (input.id && !previous) throw new Error("Memória não encontrada ou sem acesso.");
      if (previous && input._memoryUpdatedAt !== previous.updatedAt) throw new Error("A memória mudou desde a proposta. Solicite uma nova correção.");
      if (input.operation === "delete") {
        if (!previous) throw new Error("Informe qual memória remover.");
        session(uid); await d.repository.deleteMemory(uid, previous);
        return { content: "Memória removida." };
      }
      const visibility = input.visibility ?? previous?.visibility ?? "private";
      if (!["private", "party", "master"].includes(String(visibility))) throw new Error("Visibilidade inválida.");
      if (previous && previous.visibility !== visibility) throw new Error("Para mudar a visibilidade, crie uma nova memória e revise o compartilhamento.");
      const memory: ChatMemory = { id: previous?.id ?? action.id, title: text(input, "title", 120), body: text(input, "body"), visibility: visibility as ChatMemory["visibility"], ...(scope.campaignId ? { campaignId: scope.campaignId } : {}), ...(visibility === "private" && scope.characterId ? { characterId: scope.characterId } : {}), updatedAt: new Date().toISOString() };
      session(uid); await d.repository.saveMemory(uid, memory, previous?.updatedAt);
      return { content: "Memória salva com a visibilidade revisada." };
    }
    const current = await campaign(uid, scope, name === "propose_session" || input.kind !== "journal");
    if (current.revision !== action.expectedRevision) throw new Error("A campanha mudou desde a proposta. Gere uma nova proposta.");
    if (name === "propose_creature") {
      const field = (key: string, max: number) => input[key] === undefined ? "" : text(input, key, max);
      const created = value(await d.creatures.create(current.id, {
        kind: text(input, "kind", 20) as import("@domain/campaign/creatures").CreatureKind, name: text(input, "name", 80),
        appearance: field("appearance", 600), race: field("race", 80), description: field("description", 1200), hitPoints: field("hitPoints", 40), armorClass: field("armorClass", 40), abilities: field("abilities", 1200), notes: field("notes", 2000),
        ...(input.statBlock ? { statBlock: input.statBlock as import("@domain/creatures").CreatureStatBlock } : {}),
      }));
      return { content: `${created.name} criado no elenco privado do mestre.` };
    }
    if (name === "propose_record") {
      const title = text(input, "title", 120), body = text(input, "body"), now = d.clock.now(), id = asUuid(action.id);
      if (input.kind === "journal") {
        value(await d.services.campaign.saveJournalEntry({ id, campaignId: current.id, authorId: asAccountId(uid), title, body, tags: ["oraculo", "confirmado"], linkedEntityIds: [], ...(input.sessionNumber === undefined ? {} : { sessionNumber: number(input, "sessionNumber", 1) }), createdAt: now, updatedAt: now }));
        return { content: "Registro salvo no seu diário." };
      }
      const next = input.kind === "npc" ? { ...current, npcs: [...current.npcs, { id, name: title, description: body, linkedEntityIds: [], createdAt: now, updatedAt: now }] } : input.kind === "quest" ? { ...current, quests: [...current.quests, { id, title, description: body, status: "active" as const, linkedEntityIds: [], createdAt: now, updatedAt: now }] } : undefined;
      if (input.kind === "house_rule") {
        await d.repository.saveMemory(uid, { id, campaignId: current.id, title: `Regra da casa: ${title}`, body, visibility: "party", updatedAt: now });
        return { content: "Regra da casa registrada nas memórias compartilhadas da campanha." };
      }
      if (!next) throw new Error("Tipo de registro inválido.");
      const revision = value(await d.services.campaign.saveCampaign(next, current.revision));
      if (d.services.campaign.store.selectedId === current.id) await d.services.campaign.hydrate(current.id);
      return { content: "Registro confirmado e salvo na campanha.", undo: { kind: "campaign", campaign: current, revision } };
    }
    if (name === "propose_session") {
      const actor = asAccountId(uid), operation = text(input, "operation", 30);
      if (operation === "create") {
        const created = value(await d.session.create({ campaignId: current.id, accountId: actor, number: number(input, "number", 1), title: text(input, "title", 120), notes: typeof input.body === "string" ? input.body.slice(0, 8000) : "" }));
        return { content: `Sessão ${created.number} criada.` };
      }
      const existing = value(await d.session.get(asUuid(text(input, "sessionId", 160))));
      if (existing.campaignId !== current.id) throw new Error("A sessão pertence a outra campanha.");
      if (existing.revision !== input._sessionRevision) throw new Error("A sessão mudou desde a proposta. Solicite uma nova proposta.");
      if (operation === "encounter") {
        const encounter = input.encounter as { combatants?: readonly { entityType?: string; entityId?: string }[] } | undefined;
        if (!encounter || !Array.isArray(encounter.combatants) || encounter.combatants.length > 100) throw new Error("Informe um encontro com até 100 participantes cadastrados.");
        const creatures = value(await d.creatures.listCreatures(current.id));
        for (const combatant of encounter.combatants) {
          const registered = combatant.entityType === "character" ? current.characterIds.some((id) => id === combatant.entityId) : combatant.entityType === "npc" && (current.npcs.some((npc) => npc.id === combatant.entityId) || creatures.some((creature) => creature.id === combatant.entityId));
          if (!registered) throw new Error("O encontro contém um participante que não está cadastrado nesta campanha.");
        }
      }
      if (operation === "attendance") {
        if (!Array.isArray(input.attendance) || input.attendance.length > 100) throw new Error("Lista de presença inválida.");
        for (const attendance of input.attendance) {
          if (!attendance || typeof attendance !== "object" || !current.characterIds.some((id) => id === attendance.characterId)) throw new Error("Personagem da presença não pertence à campanha.");
          const member = value(await d.services.character.get(asUuid(String(attendance.characterId))));
          if (member.campaignId !== current.id || member.ownerUid !== attendance.playerId) throw new Error("O jogador informado não é o dono desta ficha.");
        }
      }
      if (operation === "start") value(await d.session.start(existing.id, actor, existing.revision));
      else if (operation === "end") value(await d.session.end(existing.id, actor, text(input, "body"), existing.revision));
      else if (operation === "notes") value(await d.session.updateNotes(existing.id, actor, text(input, "body"), existing.revision));
      else if (operation === "encounter") value(await d.session.setEncounter(existing.id, actor, input.encounter as Parameters<SessionService["setEncounter"]>[2], existing.revision));
      else if (operation === "attendance") value(await d.session.setAttendance(existing.id, actor, input.attendance as Parameters<SessionService["setAttendance"]>[2], existing.revision));
      else throw new Error("Operação de sessão inválida.");
      return { content: "Sessão atualizada pelo serviço da campanha." };
    }
    throw new Error("Ação desconhecida.");
  }
  return {
    tools, invoke, execute,
    async options(uid) {
      session(uid);
      const availableCampaigns = value(await d.services.campaign.list());
      const campaigns: { id: string; name: string }[] = [];
      for (const item of availableCampaigns) { try { if (await d.repository.campaignRole(uid, item.id)) campaigns.push({ id: item.id, name: item.name }); } catch { /* inaccessible local copies are omitted */ } }
      const masters = new Set<string>();
      for (const item of campaigns) if (await d.repository.campaignRole(uid, item.id) === "master") masters.add(item.id);
      const characters = value(await d.characters.list()).filter((item) => item.ownerUid === uid || (item.campaignId && masters.has(item.campaignId)));
      const current = d.services.character.store.getSnapshot().value;
      const characterId = current && characters.some((item) => item.id === current.id) ? current.id : undefined;
      const campaignId = current?.campaignId ?? d.services.campaign.store.selectedId;
      session(uid);
      return { characters: characters.map(({ id, name, campaignId }) => ({ id, name, ...(campaignId ? { campaignId } : {}) })), campaigns, defaults: { ...DEFAULT_CHAT_SCOPE, ...(characterId ? { characterId } : {}), ...(campaignId && campaigns.some((item) => item.id === campaignId) ? { campaignId } : {}) } };
    },
    async context(uid, scope) {
      const r = await role(uid, scope);
      const c = scope.sheet && scope.characterId ? await character(uid, scope) : undefined;
      const p = scope.campaign && scope.campaignId ? await campaign(uid, scope) : undefined;
      if (scope.rules && ((c && (c.rulesetRef.id !== d.pack.manifest.id || c.rulesetRef.version !== d.pack.manifest.version)) || (p && (p.rulesetRef.id !== d.pack.manifest.id || p.rulesetRef.version !== d.pack.manifest.version)))) throw new Error("O sistema desta ficha ou campanha difere do catálogo carregado. Desative a consulta ao livro para continuar sem atribuir regras de outra edição.");
      const alerts = c ? [
        ...(c.concentration?.pendingSaveIds.length ? [`Concentração: ${c.concentration.pendingSaveIds.length} salvaguarda(s) pendente(s) na ficha.`] : []),
        ...c.pendingResolutions.map((pending) => pending.kind === "input-request" ? pending.reason : pending.kind === "unresolved-rule" ? pending.description : "Existe uma conjuração pendente de resolução na ficha."),
      ].slice(0, 6) : [];
      return { scope: { ...scope, master: r === "master" }, alerts, text: json({ character: c ? { id: c.id, name: c.name, revision: c.revision, updatedAt: c.updatedAt } : undefined, campaign: p ? { id: p.id, name: p.name, ruleset: p.rulesetRef, revision: p.revision } : undefined, role: r ?? "personal", shared: { rules: scope.rules, sheet: scope.sheet, campaign: scope.campaign, memory: scope.memory }, alerts, consultedAt: new Date().toISOString(), note: "Dados locais sincronizados; consulte ferramentas antes de responder sobre fatos ou números. Não há conhecimento automático de sessões não registradas." }) };
    },
    async undo(uid, action) {
      const saved = action.undo;
      if (!saved) throw new Error("Esta operação não oferece desfazer automático.");
      await role(uid, action.scope);
      if (saved.kind === "character") {
        const current = await character(uid, action.scope, true);
        if (current.revision !== saved.revision) throw new Error("A ficha já sofreu outra alteração. Desfazer foi bloqueado para preservar os dados novos.");
        const before = saved.character as Character;
        if (before.id !== current.id) throw new Error("Ficha de desfazer inválida.");
        value(await d.services.character.saveCharacter({ ...before, revision: current.revision }, current.revision));
        await d.services.character.hydrate(current.id);
      } else if (saved.kind === "campaign") {
        const current = await campaign(uid, action.scope, true);
        if (current.revision !== saved.revision) throw new Error("A campanha já sofreu outra alteração. Desfazer foi bloqueado.");
        const before = saved.campaign as typeof current;
        if (before.id !== current.id) throw new Error("Campanha de desfazer inválida.");
        value(await d.services.campaign.saveCampaign({ ...before, revision: current.revision }, current.revision));
        await d.services.campaign.hydrate(current.id);
      } else throw new Error("Desfazer indisponível.");
      return "Alteração desfeita. O histórico da ação foi preservado.";
    },
  };
}
