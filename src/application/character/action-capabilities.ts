/**
 * action-capabilities — deriva `ActionCapability[]` (contrato de UI-003,
 * `src/features/actions/types.ts`) a partir do estado real do personagem, do `CharacterDerived`
 * (RULE-001) e do `RulePack` ativo. Corrige o achado #1 de QA-004: a página `/actions` mostrava
 * "ActionDispatcher pendente" para sempre porque nada produzia capacidades nem um dispatcher.
 *
 * Decisão de arquitetura central: para cada capacidade "executável" (attack/damage/spell/rest/
 * concentration) esta função também produz uma `ActionCapabilityExecution` — um par
 * `{ command, rollPlan, resolve }` guardado num `Map` por `capability.id`. `command` é o
 * `Command` já totalmente formado (com IDs de rolagem pré-alocados via `idGenerator`, prontos
 * para aparecerem em `diceResultIds`/`attackRollId`/`damageRollIds`, conforme
 * `domain/contracts/rules.ts`: "consumo de aleatoriedade ocorre no Dice Engine antes da
 * resolução, com resultados vinculados ao comando"). `rollPlan` lista quais rolagens o
 * dispatcher precisa gerar (com o RNG real, no momento do commit) antes de chamar `resolve`.
 * `resolve` é uma função pura que recebe o personagem ATUAL (não o capturado no momento da
 * derivação — o app pode ter mudado de personagem ou persistido algo entre a listagem e o
 * clique) mais as rolagens geradas, e devolve o `RuleResult` chamando a função de domínio certa
 * (`resolveCombatCommand`, `resolveRest` ou `castSpell`). Isso mantém `action-dispatcher.ts`
 * genérico: ele não precisa conhecer `command.kind` nem `pack`, só executa o `rollPlan` e chama
 * `resolve`.
 *
 * Decisões de mapeamento documentadas (ver handoff para a lista completa):
 * - "attack": um `resolve-attack` por `derived.attacks[]`. O domínio (`resolveAttack`, em
 *   `domain/rules/combat/index.ts`) SÓ aceita `targetId === character.id` — ele resolve dano
 *   contra o PRÓPRIO personagem recebido, não contra um alvo externo (este app não modela
 *   inimigos como entidades separadas). `targetId` é sempre o próprio personagem. A CA do alvo,
 *   porém, agora É coletada: a capacidade ganha `inputKind: "target-armor-class"` (types.ts),
 *   `Actions.tsx` mostra um input obrigatório (sem default — nunca inventa CA 0/10) e
 *   `action-dispatcher.ts` repassa `intent.targetArmorClass` até aqui via `resolve({...,
 *   targetArmorClass})`, que o encaminha para `CombatCommandContext.targetArmorClass` →
 *   `ResolveAttackInput.targetArmorClass`. Sem valor informado (ex.: intent antigo, ou UI que
 *   não colete o campo), o comportamento honesto de antes se mantém: `resolveAttack` devolve
 *   `needsInput` pedindo a CA em vez de aplicar dano à toa. A rolagem de ataque e de dano
 *   continua acontecendo de verdade (consome RNG real) antes de `resolve`.
 * - "damage" (dano/cura manual avulsos): `ActionIntent.value` (types.ts) agora carrega a
 *   quantidade digitada pelo usuário. A capacidade ganha `inputKind: "amount"` +
 *   `inputDefault: PRESET_AMOUNT` para a UI mostrar um campo numérico pré-preenchido com 5;
 *   `resolve({..., value})` usa `value ?? PRESET_AMOUNT` — nunca quebra se ninguém informar
 *   (compatível com chamadas antigas de teste que não passam `value`). O `Command` e o preview
 *   expostos na listagem continuam fixados em `PRESET_AMOUNT` (a quantidade real só é conhecida
 *   no momento do commit, quando o intent chega); o valor de fato aplicado é recomputado dentro
 *   de `resolve` a partir do `value` recebido. Ambas usam `kind: "damage"` porque
 *   `ActionCapabilityKind` não tem uma variante "healing" — cosmético, fora do meu ownership
 *   consertar.
 * - "spell": uma por `DefinitionRef` conhecido/preparado em cada `castingSources[]`, resolvida
 *   contra `pack.spells`. `automationStatus === "blocked"` vira `status: "blocked"` citando
 *   `pendingDecisionIds`. Como não há UI de seleção de alvo/slot na intent, o `CastSpellPayload`
 *   é o mínimo estrutural (`targetContext: {targetIds: []}`, sem `slotLevel`/`resourcePoolId`);
 *   `castSpell` (domain/spells) validará e devolverá `needsInput`/`rejected` honesto quando
 *   faltar alvo ou espaço — nunca inventa uma escolha. `preview` tenta `previewCast` com a mesma
 *   requisição mínima; quando o preview também precisa de mais contexto que não temos
 *   (`previewCast` delega para `castSpell` internamente), fica `undefined` (campo opcional).
 * - "rest": duas capacidades fixas (curto/longo), sem seleção de Dados de Vida a recuperar
 *   (não modelado na intent) — `resolveRest` é chamado com `hitDiceSpent: []`.
 * - "concentration": só aparece quando `character.concentration` está ativo; sempre
 *   `reason: "voluntary"`.
 * - "resource" (recursos de personagem e features de classe não passivas): `Command.kind
 *   "spend-resource"` é resolvido por `spendResource` (`domain/rules/resources/index.ts`). Cada
 *   `ResourceState` do personagem com `spendRules` inequívoco (exatamente uma regra
 *   `{kind: "per-use"}`) ganha uma `ActionCapabilityExecution` que gasta esse valor fixo,
 *   validando saldo contra `derived.resourceCapacities` (nunca recalculado aqui). Recurso sem
 *   definição no pack, sem entrada em `resourceCapacities`, ou com custo `"variable"`/múltiplas
 *   `spendRules` (quantidade depende de escolha de mesa) fica `status: "unsupported"` — o motor
 *   não inventa qual quantidade gastar. Features de classe/subclasse com
 *   `automationStatus !== "automated"` continuam `status: "blocked"`/`"pending"` citando
 *   `pendingDecisionIds`: não existe `Command` dedicado à ativação genérica de uma feature, só ao
 *   gasto de um `ResourceState` já existente.
 *
 * "item" (uso de item consumível) não é coberto nesta rodada — não há Command dedicado a uso de
 * item nem contexto suficiente para derivar uma lista seguramente; ver handoff.
 */

import { type Character, type PendingResolution } from "@domain/contracts/character";
import { type AttackOption, type CharacterDerived } from "@domain/contracts/derived";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type CastRequest, type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import { type DamageType, type SourceRef } from "@domain/contracts/primitives";
import { type DiceExpression, type DicePurpose, type DiceRoll } from "@domain/contracts/dice";
import { type Command, type RuleResult } from "@domain/contracts/rules";
import { type IdGenerator } from "@application/ports/id-generator";
import { resolveCombatCommand, type CombatCommandContext } from "@domain/rules/combat";
import { resolveRest, type RestInput } from "@domain/rules/rest";
import { spendResource } from "@domain/rules/resources";
import { castSpell, previewCast } from "@domain/spells";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type ActionCapability, type ActionCapabilityKind } from "@features/actions/types";
import { EXTRACTED_PHB_SPELLS } from "@data/spells/spells-book-catalog";

/** Nome impresso da magia (catálogo do cap. 11) para as que ainda não têm definição estruturada. */
function bookSpellName(spellId: string): string | undefined {
  return EXTRACTED_PHB_SPELLS.find((spell) => spell.id === spellId)?.name;
}

/** Uma rolagem que `action-dispatcher.ts` precisa gerar (com RNG real) antes de `resolve`. */
export interface RollPlanRequest {
  readonly id: Uuid;
  readonly expression: DiceExpression;
  readonly purpose: DicePurpose;
}

/**
 * Tudo que `createActionDispatcher` precisa para executar uma capacidade, sem conhecer
 * `pack`/`command.kind`. `resolve` é síncrona e pura: recebe o personagem ATUAL (lido pelo
 * dispatcher no momento do commit, não o capturado aqui) e as rolagens já feitas.
 */
export interface ActionCapabilityExecution {
  readonly command: Command;
  readonly rollPlan: readonly RollPlanRequest[];
  /**
   * `value`/`targetArmorClass` são opcionais e vêm de `ActionIntent` via `action-dispatcher.ts`
   * (repassados sem interpretação). Capacidades que não pedem input (`inputKind` ausente na
   * `ActionCapability`) simplesmente ignoram os dois campos; capacidades de dano/cura manual
   * usam `value`; a capacidade "attack" usa `targetArmorClass`. Adicionar campos aqui é
   * compatível com chamadores existentes: são opcionais e vêm depois dos já usados.
   */
  readonly resolve: (args: {
    readonly character: Character;
    readonly rolls: ReadonlyMap<Uuid, DiceRoll>;
    readonly value?: number;
    readonly targetArmorClass?: number;
  }) => RuleResult;
}

export interface DeriveActionCapabilitiesResult {
  readonly capabilities: readonly ActionCapability[];
  /** Só contém entradas para capacidades com `status "available"` (as demais não são executáveis). */
  readonly executions: ReadonlyMap<string, ActionCapabilityExecution>;
}

function sameRef(a: DefinitionRef, b: DefinitionRef): boolean {
  return a.rulesetId === b.rulesetId && a.entityId === b.entityId;
}

function dedupeRefs(refs: readonly DefinitionRef[]): readonly DefinitionRef[] {
  const result: DefinitionRef[] = [];
  for (const ref of refs) if (!result.some((existing) => sameRef(existing, ref))) result.push(ref);
  return result;
}

/**
 * Enumera as `FeatureDefinition` concedidas pelas classes/subclasses do personagem, direto do
 * `RulePack` público (mesmos dados que `deriveCharacter` já teria lido) — não é um novo cálculo
 * de regra, só uma travessia de leitura. Referências ausentes/inconsistentes são ignoradas
 * silenciosamente (lista vazia é aceitável; "não travar o app" tem prioridade sobre reportar
 * aqui — erros estruturais de pack já são responsabilidade de `deriveCharacter`).
 */
function collectGrantedFeatures(character: Character, pack: RulePack): readonly FeatureDefinition[] {
  const features: FeatureDefinition[] = [];
  const seen = new Set<EntityId>();
  const push = (id: EntityId) => {
    if (seen.has(id)) return;
    const feature = pack.features.get(id);
    if (feature) {
      seen.add(id);
      features.push(feature);
    }
  };
  for (const classLevel of character.classes) {
    const classDefinition = pack.classes.get(classLevel.classId);
    if (!classDefinition) continue;
    for (let level = 1; level <= classLevel.level; level += 1) {
      const progression = classDefinition.progression[level - 1];
      if (!progression || progression.level !== level) continue;
      for (const featureRef of progression.featureRefs) push(featureRef.entityId);
    }
    if (classLevel.subclassId) {
      const subclass = pack.subclasses.get(classLevel.subclassId);
      if (!subclass) continue;
      for (const grant of subclass.featureGrants) {
        if (grant.level > classLevel.level) continue;
        push(grant.featureRef.entityId);
      }
    }
  }
  return features;
}

function buildAttackCapabilities(
  character: Character,
  derived: CharacterDerived,
  pack: RulePack,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  const capabilities: ActionCapability[] = [];
  const executions: (readonly [string, ActionCapabilityExecution])[] = [];
  derived.attacks.forEach((attack: AttackOption, index: number) => {
    const definition = pack.equipment.get(attack.sourceRef.entityId);
    const label = definition?.name ?? String(attack.sourceRef.entityId);
    const commandId = idGenerator.commandId();
    const attackRollId = idGenerator.uuid();
    const damageRollIds = attack.damageParts.map(() => idGenerator.uuid());
    const damageTypes = new Map<Uuid, DamageType>(damageRollIds.map((id, partIndex) => [id, attack.damageParts[partIndex].damageType]));
    const command: Command = {
      commandId,
      characterId: character.id,
      expectedRevision: character.revision,
      kind: "resolve-attack",
      payload: { attackSourceRef: attack.sourceRef, targetId: character.id, attackRollId, damageRollIds },
    };
    const rollPlan: RollPlanRequest[] = [
      { id: attackRollId, expression: { quantity: 1, faces: 20, modifier: attack.attackModifier.value, mode: "normal" }, purpose: "attack" },
      ...attack.damageParts.map((part, partIndex) => ({
        id: damageRollIds[partIndex],
        expression: { quantity: part.expression.quantity, faces: part.expression.faces, modifier: part.modifierBonus.value, mode: "normal" } satisfies DiceExpression,
        purpose: "damage" as const,
      })),
    ];
    const execution: ActionCapabilityExecution = {
      command,
      rollPlan,
      resolve: ({ character: liveCharacter, rolls, targetArmorClass }) =>
        resolveCombatCommand(liveCharacter, command, {
          diceResults: rolls,
          damageTypes,
          maximumHitPoints: derived.hitPointsMax.value,
          targetArmorClass,
        } satisfies CombatCommandContext),
    };
    const id = `attack:${index}:${String(attack.sourceRef.entityId)}`;
    capabilities.push({
      id,
      commandId,
      kind: "attack",
      label: `Atacar com ${label}`,
      description: "Rola ataque e dano reais contra a CA do alvo informada abaixo. Sem uma CA explícita, o resultado volta como pendência pedindo o valor (nenhum acerto é inventado).",
      costs: [{ label: "Ação", available: true }],
      sourceRefs: [attack.sourceRef],
      status: "available",
      actionCost: "action",
      inputKind: "target-armor-class",
    });
    executions.push([id, execution]);
  });
  return { capabilities, executions };
}

function buildManualHpCapabilities(
  character: Character,
  derived: CharacterDerived,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  const PRESET_AMOUNT = 5;
  const capabilities: ActionCapability[] = [];
  const executions: (readonly [string, ActionCapabilityExecution])[] = [];

  const damageCommandId = idGenerator.commandId();
  const damageCommand: Command = {
    commandId: damageCommandId,
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "apply-damage",
    payload: { amount: PRESET_AMOUNT, damageType: "bludgeoning", diceResultIds: [] },
  };
  // Sem rolagem (`rollPlan: []`), `resolveCombatCommand` é uma função pura sobre o estado
  // recebido — chamá-la aqui só para compor a prévia não persiste nada nem consome RNG; é o
  // mesmo cálculo que `resolve()` refaria no commit real. Isso evita que Actions.tsx (que trata
  // "sem preview" como "pendente" e desabilita Confirmar) bloqueie ações que já são executáveis.
  const damagePreview = resolveCombatCommand(character, damageCommand, { maximumHitPoints: derived.hitPointsMax.value });
  capabilities.push({
    id: "manual-damage",
    commandId: damageCommandId,
    kind: "damage",
    label: `Aplicar ${PRESET_AMOUNT} de dano (contundente)`,
    description: "Ação avulsa para registrar dano recebido manualmente. Informe a quantidade abaixo; sem preenchimento, usa o valor padrão.",
    status: "available",
    preview: damagePreview,
    inputKind: "amount",
    inputDefault: PRESET_AMOUNT,
  });
  executions.push([
    "manual-damage",
    {
      command: damageCommand,
      rollPlan: [],
      resolve: ({ character: liveCharacter, value }) =>
        resolveCombatCommand(
          liveCharacter,
          { ...damageCommand, payload: { ...damageCommand.payload, amount: value ?? PRESET_AMOUNT } },
          { maximumHitPoints: derived.hitPointsMax.value },
        ),
    },
  ]);

  const healCommandId = idGenerator.commandId();
  const healCommand: Command = {
    commandId: healCommandId,
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "apply-healing",
    payload: { amount: PRESET_AMOUNT, diceResultIds: [] },
  };
  const healPreview = resolveCombatCommand(character, healCommand, { maximumHitPoints: derived.hitPointsMax.value });
  capabilities.push({
    id: "manual-healing",
    commandId: healCommandId,
    kind: "damage",
    label: `Aplicar ${PRESET_AMOUNT} de cura`,
    description: "Ação avulsa para registrar cura manual. Informe a quantidade abaixo; sem preenchimento, usa o valor padrão. Usa kind \"damage\" porque ActionCapabilityKind não tem uma variante de cura.",
    status: "available",
    preview: healPreview,
    inputKind: "amount",
    inputDefault: PRESET_AMOUNT,
  });
  executions.push([
    "manual-healing",
    {
      command: healCommand,
      rollPlan: [],
      resolve: ({ character: liveCharacter, value }) =>
        resolveCombatCommand(
          liveCharacter,
          { ...healCommand, payload: { ...healCommand.payload, amount: value ?? PRESET_AMOUNT } },
          { maximumHitPoints: derived.hitPointsMax.value },
        ),
    },
  ]);

  return { capabilities, executions };
}

function minimalCastRequest(command: Extract<Command, { readonly kind: "cast-spell" }>): CastRequest {
  return {
    commandId: command.commandId,
    characterId: command.characterId,
    expectedRevision: command.expectedRevision,
    spellRef: command.payload.spellRef,
    castingSourceId: command.payload.castingSourceId,
    mode: command.payload.mode,
    resourcePoolId: command.payload.resourcePoolId,
    slotLevel: command.payload.slotLevel,
    targetContext: command.payload.targetContext,
    componentContext: command.payload.componentContext,
    choices: command.payload.choices,
    diceResultIds: command.payload.diceResultIds,
  };
}

function buildSpellCapabilities(
  character: Character,
  pack: RulePack,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  const capabilities: ActionCapability[] = [];
  const executions: (readonly [string, ActionCapabilityExecution])[] = [];

  for (const source of character.castingSources) {
    const spellRefs = dedupeRefs([...source.knownSpellRefs, ...source.preparedSpellRefs]);
    for (const spellRef of spellRefs) {
      const spell: SpellDefinition | undefined = pack.spells.get(spellRef.entityId);
      const id = `spell:${source.id}:${String(spellRef.entityId)}`;
      if (!spell) {
        capabilities.push({
          id,
          commandId: idGenerator.commandId(),
          kind: "spell",
          label: bookSpellName(String(spellRef.entityId)) ?? String(spellRef.entityId),
          description: "Magia do Livro do Jogador ainda sem automação: role e resolva o efeito na mesa.",
          status: "pending",
          pendingReasons: ["Definição da magia ausente no rule pack ativo; nada foi inventado no lugar."],
        });
        continue;
      }
      if (spell.automationStatus === "blocked") {
        capabilities.push({
          id,
          commandId: idGenerator.commandId(),
          kind: "spell",
          label: spell.name,
          sourceRefs: spell.sourceRefs,
          status: "blocked",
          blockedReason: `Bloqueada pela fonte: ${spell.pendingDecisionIds.length ? spell.pendingDecisionIds.join(", ") : "pendência sem ID registrado"}.`,
        });
        continue;
      }
      const commandId = idGenerator.commandId();
      const effectRollPlans: RollPlanRequest[] = [
        ...spell.damage.map((part) => ({ id: idGenerator.uuid(), expression: { quantity: part.expression.quantity, faces: part.expression.faces, modifier: 0, mode: "normal" as const }, purpose: "damage" as const })),
        ...spell.healing.map((part) => ({ id: idGenerator.uuid(), expression: { quantity: part.expression.quantity, faces: part.expression.faces, modifier: 0, mode: "normal" as const }, purpose: "healing" as const })),
      ];
      const command: Command = {
        commandId,
        characterId: character.id,
        expectedRevision: character.revision,
        kind: "cast-spell",
        payload: {
          spellRef,
          castingSourceId: source.id,
          mode: "normal",
          targetContext: { targetIds: [] },
          componentContext: { materialProvided: false, focusUsed: false },
          choices: [],
          diceResultIds: effectRollPlans.map((planned) => planned.id),
        },
      };
      const castCommand = command as Extract<Command, { readonly kind: "cast-spell" }>;
      let preview: RuleResult | undefined;
      try {
        const previewResult = previewCast(character, spell, minimalCastRequest(castCommand), {});
        preview = previewResult.status === "needsInput" && previewResult.preview ? previewResult : undefined;
      } catch {
        preview = undefined;
      }
      capabilities.push({
        id,
        commandId,
        kind: "spell",
        label: spell.level === 0 ? `${spell.name} (truque)` : `${spell.name} (nível ${spell.level})`,
        sourceRefs: spell.sourceRefs,
        preview,
        status: "available",
      });
      executions.push([
        id,
        {
          command,
          rollPlan: effectRollPlans,
          resolve: ({ character: liveCharacter, rolls }) => castSpell(liveCharacter, spell, minimalCastRequest(castCommand), { diceResults: rolls }),
        },
      ]);
    }
  }
  return { capabilities, executions };
}

function buildRestCapabilities(
  character: Character,
  derived: CharacterDerived,
  pack: RulePack,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  const capabilities: ActionCapability[] = [];
  const executions: (readonly [string, ActionCapabilityExecution])[] = [];
  const resourceDefinitions = new Map<string, ResourceDefinition>([...pack.resources].map(([entityId, definition]) => [String(entityId), definition]));

  for (const restKind of ["short", "long"] as const) {
    const commandId = idGenerator.commandId();
    const command: Command = {
      commandId,
      characterId: character.id,
      expectedRevision: character.revision,
      kind: "rest",
      payload: { restKind, hitDiceSpent: [] },
    };
    const id = `rest:${restKind}`;
    const restPreviewInput: RestInput = { restKind, hitDiceSpent: [], maximumHitPoints: derived.hitPointsMax.value, resourceDefinitions };
    capabilities.push({
      id,
      commandId,
      kind: "rest",
      label: restKind === "short" ? "Descanso curto" : "Descanso longo",
      description: "Não recupera Dados de Vida escolhidos manualmente nesta versão (sem seleção na intent); recursos com gatilho compatível recuperam normalmente.",
      status: "available",
      preview: resolveRest(character, restPreviewInput),
    });
    executions.push([
      id,
      {
        command,
        rollPlan: [],
        resolve: ({ character: liveCharacter }) => {
          const input: RestInput = { restKind, hitDiceSpent: [], maximumHitPoints: derived.hitPointsMax.value, resourceDefinitions };
          return resolveRest(liveCharacter, input);
        },
      },
    ]);
  }
  return { capabilities, executions };
}

function buildConcentrationCapability(
  character: Character,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  if (!character.concentration) return { capabilities: [], executions: [] };
  const concentration = character.concentration;
  const commandId = idGenerator.commandId();
  const command: Command = {
    commandId,
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "end-concentration",
    payload: { reason: "voluntary" },
  };
  const id = "concentration:end";
  return {
    capabilities: [{
      id,
      commandId,
      kind: "concentration",
      label: "Encerrar concentração",
      sourceRefs: [concentration.sourceRef],
      status: "available",
    }],
    executions: [[id, {
      command,
      rollPlan: [],
      resolve: ({ character: liveCharacter }) => resolveCombatCommand(liveCharacter, command, {}),
    }]],
  };
}

function pendingResolutionLabel(pending: PendingResolution): string {
  return pending.kind === "unresolved-rule" ? pending.description : pending.kind;
}

/**
 * `resource`: recursos de estado do personagem + features de classe/subclasse não passivas.
 * Um `ResourceState` só ganha `ActionCapabilityExecution` quando a definição está no pack, tem
 * capacidade derivada (`derived.resourceCapacities`) e exatamente uma `spendRule` do tipo
 * `"per-use"` (quantidade fixa, sem ambiguidade). Caso contrário fica `status: "unsupported"`
 * explicando o motivo, nunca mascarada. Features não passivas continuam
 * `status: "blocked"`/`"pending"` — não existe `Command` dedicado à ativação genérica delas.
 */
function buildResourceCapabilities(
  character: Character,
  derived: CharacterDerived,
  pack: RulePack,
  idGenerator: IdGenerator,
): { readonly capabilities: ActionCapability[]; readonly executions: readonly (readonly [string, ActionCapabilityExecution])[] } {
  const capabilities: ActionCapability[] = [];
  const executions: (readonly [string, ActionCapabilityExecution])[] = [];

  for (const resourceState of character.resources) {
    const definition = pack.resources.get(resourceState.definitionRef.entityId);
    const capacity = derived.resourceCapacities.find((entry) => sameRef(entry.definitionRef, resourceState.definitionRef));
    const id = `resource:${resourceState.id}`;
    const remaining = capacity ? Math.max(0, capacity.capacity.value - resourceState.spent) : undefined;
    const spendRule = definition && definition.spendRules.length === 1 && definition.spendRules[0].kind === "per-use" ? definition.spendRules[0] : undefined;

    if (!definition || !capacity || !spendRule) {
      capabilities.push({
        id,
        commandId: idGenerator.commandId(),
        kind: "resource",
        label: definition?.name ?? String(resourceState.definitionRef.entityId),
        description: !definition
          ? "Definição do recurso ausente no rule pack ativo; nada foi inventado no lugar."
          : !capacity
            ? "Capacidade do recurso não foi derivada; o motor não gasta recurso sem um máximo conhecido."
            : "Custo de uso variável ou ambíguo (mais de uma regra de gasto); requer decisão de mesa não modelada nesta versão.",
        sourceRefs: definition?.sourceRefs,
        costs: remaining !== undefined ? [{ label: "Usos restantes", remaining }] : undefined,
        status: "unsupported",
      });
      continue;
    }

    const commandId = idGenerator.commandId();
    const command: Command = {
      commandId,
      characterId: character.id,
      expectedRevision: character.revision,
      kind: "spend-resource",
      payload: { resourceStateId: resourceState.id, amount: spendRule.amount },
    };
    capabilities.push({
      id,
      commandId,
      kind: "resource",
      label: definition.name,
      description: `Gasta ${spendRule.amount} uso(s) de ${definition.name}.`,
      sourceRefs: definition.sourceRefs,
      costs: [{ label: "Usos restantes", remaining: remaining ?? 0 }],
      status: "available",
    });
    executions.push([
      id,
      {
        command,
        rollPlan: [],
        resolve: ({ character: liveCharacter }) =>
          spendResource(liveCharacter, { ...command.payload, capacity: capacity.capacity.value, sourceRef: definition.sourceRefs[0], ownerInstanceId: resourceState.ownerInstanceId }),
      },
    ]);
  }

  const pendingLabels = character.pendingResolutions.map(pendingResolutionLabel);
  for (const feature of collectGrantedFeatures(character, pack)) {
    if (feature.activation.kind === "passive") continue;
    if (feature.automationStatus === "automated") continue; // sem Command de ativação genérica; nada a bloquear ou expor aqui
    capabilities.push({
      id: `feature:${String(feature.id)}`,
      commandId: idGenerator.commandId(),
      kind: "resource",
      label: feature.name,
      sourceRefs: feature.sourceRefs,
      status: feature.automationStatus === "blocked" ? "blocked" : "pending",
      blockedReason: feature.automationStatus === "blocked"
        ? `Pendência(s) da fonte: ${feature.pendingDecisionIds.length ? feature.pendingDecisionIds.join(", ") : "sem ID registrado"}.`
        : undefined,
      pendingReasons: feature.automationStatus === "assisted"
        ? ["Feature requer decisão assistida; sem Command dedicado para ativação genérica nesta versão.", ...pendingLabels]
        : undefined,
    });
  }
  return { capabilities, executions };
}

/**
 * Deriva `ActionCapability[]` + `ActionCapabilityExecution` map para o personagem/derivação/pack
 * fornecidos. Nunca lança: dados de fonte ausentes viram capacidades `"pending"`/`"blocked"`
 * (ou são simplesmente omitidos quando não há nada a listar), nunca travam a função.
 */
export function deriveActionCapabilities(
  character: Character,
  derived: CharacterDerived,
  pack: RulePack,
  idGenerator: IdGenerator,
): DeriveActionCapabilitiesResult {
  const attacks = buildAttackCapabilities(character, derived, pack, idGenerator);
  const manualHp = buildManualHpCapabilities(character, derived, idGenerator);
  const spells = buildSpellCapabilities(character, pack, idGenerator);
  const rests = buildRestCapabilities(character, derived, pack, idGenerator);
  const concentration = buildConcentrationCapability(character, idGenerator);
  const resources = buildResourceCapabilities(character, derived, pack, idGenerator);

  const capabilities: ActionCapability[] = [
    ...attacks.capabilities,
    ...manualHp.capabilities,
    ...spells.capabilities,
    ...rests.capabilities,
    ...concentration.capabilities,
    ...resources.capabilities,
  ];
  const executions = new Map<string, ActionCapabilityExecution>([
    ...attacks.executions,
    ...manualHp.executions,
    ...spells.executions,
    ...rests.executions,
    ...resources.executions,
    ...concentration.executions,
  ]);

  return { capabilities, executions };
}

export type { ActionCapabilityKind };
