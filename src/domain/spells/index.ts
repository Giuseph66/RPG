import { type Character, type CastingSourceState, type ConditionInstance, type InventoryItem } from "@domain/contracts/character";
import { type ClassDefinition } from "@domain/contracts/definitions/class";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type SpellDefinition, type CastRequest, type CastPreview, type SpellDuration, type SpellComponentContext } from "@domain/contracts/definitions/spell";
import { type CommandId, type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import { type AvailableAction, type Effect, type InputRequest, type RuleResult } from "@domain/contracts/rules";
import { type DiceRoll } from "@domain/contracts/dice";
import { type Duration, type DurationExpiryTrigger, type SourceRef } from "@domain/contracts/primitives";
import { applyDamage, applyHealing, type DamageDefense } from "@domain/rules/combat";
import { applyCondition } from "@domain/rules/conditions";

export interface SpellResolutionContext {
  readonly classId?: EntityId;
  readonly classDefinition?: ClassDefinition;
  readonly availableActions?: readonly AvailableAction[];
  readonly canSpeak?: boolean;
  readonly freeHands?: boolean;
  readonly replaceConcentration?: boolean;
  readonly concentrationEffectId?: Uuid;
  readonly consumedInventoryItemId?: Uuid;
  readonly processedCommandIds?: ReadonlySet<CommandId>;
  /** Resultados já rolados e vinculados ao comando; ausência preserva o adaptador legado. */
  readonly diceResults?: ReadonlyMap<Uuid, DiceRoll>;
  /** Máximo efetivo de PV, necessário quando a magia cura. */
  readonly maximumHitPoints?: number;
  /** Catálogo necessário para efeitos `apply-condition`. */
  readonly conditionDefinitions?: ReadonlyMap<EntityId, ConditionDefinition>;
  /** ID explícito para cada instância de condição criada por este comando. */
  readonly conditionInstanceIds?: ReadonlyMap<string, Uuid>;
  /** Distância já medida pelo chamador; o domínio não inventa posições. */
  readonly targetDistanceCm?: number;
  /** Necessário para alvos cuja definição exige visibilidade. */
  readonly lineOfSight?: boolean;
  /** Acerto já resolvido para ataques mágicos. */
  readonly spellAttackHit?: boolean;
  /** Resultado já resolvido de uma resistência mágica. */
  readonly spellSaveSucceeded?: boolean;
  readonly defense?: DamageDefense;
}

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 10",
  printedPage: 203,
  pdfPage: 202,
  section: "Conjuração",
};

function sourceRefs(spell: SpellDefinition): readonly SourceRef[] {
  return spell.sourceRefs.length > 0 ? spell.sourceRefs : [SOURCE];
}

function reject(spell: SpellDefinition, message: string, code: "invalid-context" | "invalid-command" | "insufficient-resource" | "unresolved-rule" | "unsupported-ruleset" = "invalid-context"): RuleResult {
  return { status: "rejected", errors: [{ code, message, sourceRef: spell.sourceRefs[0] ?? SOURCE }], sourceRefs: sourceRefs(spell) };
}

function ask(spell: SpellDefinition, requestId: Uuid, reason: string): RuleResult {
  const request: InputRequest = { id: requestId, reason, validOptions: [] };
  return { status: "needsInput", requests: [request], sourceRefs: sourceRefs(spell) };
}

function success(character: Character, nextState: Character, effects: readonly Effect[], spell: SpellDefinition, descriptions: readonly string[]): RuleResult {
  return {
    status: "success",
    nextState,
    effects,
    explanations: descriptions.map((description) => ({ value: description, contributions: [{ sourceRef: spell.sourceRefs[0] ?? SOURCE, description }] })),
    sourceRefs: sourceRefs(spell),
  };
}

function sameRef(a: DefinitionRef, b: DefinitionRef): boolean {
  return a.rulesetId === b.rulesetId && a.entityId === b.entityId;
}

function sourceFor(character: Character, request: CastRequest): CastingSourceState | undefined {
  return character.castingSources.find((source) => source.id === request.castingSourceId);
}

function classIdFor(source: CastingSourceState, context: SpellResolutionContext): EntityId {
  return context.classId ?? source.grantingRef.entityId;
}

function hasRef(refs: readonly DefinitionRef[], target: DefinitionRef): boolean {
  return refs.some((ref) => sameRef(ref, target));
}

function actionAvailable(request: CastRequest, context: SpellResolutionContext, spell: SpellDefinition): RuleResult | undefined {
  const kind = spell.castingTime.kind;
  if (!context.availableActions) return ask(spell, request.commandId as unknown as Uuid, "Informe as ações disponíveis neste turno para validar o custo da conjuração.");
  const action = kind === "action" ? "action" : kind === "bonus-action" ? "bonus-action" : kind === "reaction" ? "reaction" : undefined;
  if (action && !context.availableActions.includes(action)) return reject(spell, `Ação de conjuração indisponível: ${kind}.`);
  return undefined;
}

function validateTargets(request: CastRequest, spell: SpellDefinition): string | undefined {
  const targets = request.targetContext.targetIds;
  if (targets.length === 0 && spell.targetType.type !== "point") return "Informe explicitamente ao menos um alvo; o motor não escolhe alvos.";
  if (spell.targetType.type === "point" && !request.targetContext.pointCm) return "Informe o ponto de origem da área; o motor não escolhe posição.";
  if (spell.targetType.count !== undefined && targets.length !== spell.targetType.count) return `A magia exige exatamente ${spell.targetType.count} alvo(s), mas recebeu ${targets.length}.`;
  return undefined;
}

function conditionKey(ref: DefinitionRef): string {
  return `${String(ref.rulesetId)}:${String(ref.entityId)}`;
}

function conditionDuration(duration: SpellDuration): Duration {
  const trigger = duration.endTriggers[0];
  const expiryTrigger: DurationExpiryTrigger | undefined = trigger?.kind === "end-of-turn" || trigger?.kind === "start-of-turn"
    ? trigger
    : trigger?.kind === "concentration-ends" || trigger?.kind === "short-rest" || trigger?.kind === "long-rest" || trigger?.kind === "damage-taken" || trigger?.kind === "table-decision"
      ? trigger
      : undefined;
  const withTrigger = (base: Duration): Duration => expiryTrigger ? { ...base, expiryTrigger } : base;
  switch (duration.kind) {
    case "instantaneous": return withTrigger({ kind: "instant" });
    case "rounds": return withTrigger({ kind: "rounds", value: duration.amount });
    case "minutes": return withTrigger({ kind: "minutes", value: duration.amount });
    case "hours": return withTrigger({ kind: "hours", value: duration.amount });
    case "until-dispelled": return withTrigger({ kind: "untilRemoved" });
    case "special": return withTrigger({ kind: "special" });
  }
}

function spellHasStatefulEffects(spell: SpellDefinition): boolean {
  return spell.damage.length > 0 || spell.healing.length > 0 || spell.effects.some((effect) => effect.kind === "apply-condition");
}

function validateEffectContext(character: Character, spell: SpellDefinition, request: CastRequest, context: SpellResolutionContext): RuleResult | undefined {
  if (!context.diceResults || !spellHasStatefulEffects(spell)) return undefined;

  const targets = request.targetContext.targetIds;
  if (targets.length === 0) return ask(spell, request.commandId as unknown as Uuid, "Selecione explicitamente os alvos dos efeitos; o motor não escolhe criaturas da área.");
  if (targets.some((targetId) => targetId !== character.id)) {
    return ask(spell, request.commandId as unknown as Uuid, "O estado do alvo informado não está carregado; forneça um agregado de personagem por alvo antes de aplicar o efeito.");
  }
  if (spell.range.kind === "distance") {
    if (context.targetDistanceCm === undefined) return ask(spell, request.commandId as unknown as Uuid, "Informe a distância medida até o alvo ou ponto da magia para validar o alcance.");
    if (!Number.isInteger(context.targetDistanceCm) || context.targetDistanceCm < 0) return reject(spell, "A distância do alvo deve ser um inteiro não negativo.");
    if (spell.range.distanceCm !== undefined && context.targetDistanceCm > spell.range.distanceCm) return reject(spell, "O alvo ou ponto está fora do alcance da magia.");
  }
  if (spell.targetType.visibilityRequired && context.lineOfSight !== true) return ask(spell, request.commandId as unknown as Uuid, "Confirme linha de visão para o alvo visível exigido pela magia.");
  if (spell.attackType !== "none" && context.spellAttackHit === undefined) return ask(spell, request.commandId as unknown as Uuid, "Resolva o ataque mágico antes de aplicar o dano.");
  if (spell.savingThrow && context.spellSaveSucceeded === undefined) return ask(spell, request.commandId as unknown as Uuid, "Resolva o teste de resistência do alvo antes de aplicar o efeito da magia.");

  const diceResultIds = request.diceResultIds ?? [];
  const expectedRolls = spell.damage.length + spell.healing.length;
  if (diceResultIds.length < expectedRolls) return ask(spell, request.commandId as unknown as Uuid, "Forneça todas as rolagens vinculadas aos efeitos da magia.");
  for (const rollId of diceResultIds.slice(0, expectedRolls)) {
    const roll = context.diceResults.get(rollId);
    if (!roll || !Number.isFinite(roll.total) || !Number.isInteger(roll.total)) return ask(spell, rollId, "A rolagem do efeito não foi encontrada no histórico do comando.");
    if (roll.commandId !== undefined && roll.commandId !== request.commandId) return reject(spell, "A rolagem vinculada pertence a outro comando.", "invalid-command");
  }
  for (const effect of spell.effects) {
    if (effect.kind !== "apply-condition") continue;
    if (!context.conditionDefinitions?.has(effect.conditionRef.entityId)) return reject(spell, `Definição da condição ${effect.conditionRef.entityId} ausente no rule pack.`, "unsupported-ruleset");
    if (!context.conditionInstanceIds?.has(conditionKey(effect.conditionRef))) return ask(spell, request.commandId as unknown as Uuid, `Forneça o ID da instância para aplicar ${effect.conditionRef.entityId}.`);
  }
  if (spell.healing.length > 0 && (!Number.isInteger(context.maximumHitPoints) || (context.maximumHitPoints ?? 0) <= 0)) return ask(spell, request.commandId as unknown as Uuid, "Informe o máximo efetivo de PV para aplicar a cura da magia.");
  return undefined;
}

interface AppliedSpellEffects {
  readonly nextState: Character;
  readonly effects: readonly Effect[];
  readonly descriptions: readonly string[];
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function applySpellEffects(character: Character, spell: SpellDefinition, request: CastRequest, context: SpellResolutionContext): RuleResult | AppliedSpellEffects {
  if (!context.diceResults || !spellHasStatefulEffects(spell)) return { nextState: character, effects: [], descriptions: [] };
  let nextState = character;
  const effects: Effect[] = [];
  const descriptions: string[] = [];
  let rollIndex = 0;

  for (const part of spell.damage) {
    const rollId = request.diceResultIds?.[rollIndex++];
    const roll = rollId ? context.diceResults.get(rollId) : undefined;
    if (!roll) return ask(spell, rollId ?? (request.commandId as unknown as Uuid), "A rolagem de dano vinculada não está disponível.");
    if (spell.attackType !== "none" && context.spellAttackHit === false) {
      descriptions.push("O ataque mágico não atingiu o alvo; nenhum dano foi aplicado.");
      continue;
    }
    const saveMultiplier = spell.savingThrow && context.spellSaveSucceeded === true ? 0.5 : 1;
    const amount = Math.floor(roll.total * saveMultiplier);
    const applied = applyDamage(nextState, { amount, damageType: part.damageType, defense: context.defense, sourceRef: request.spellRef });
    if (applied.status !== "success") return applied;
    nextState = applied.nextState;
    effects.push(...applied.effects);
    descriptions.push(`${spell.name}: ${amount} de ${part.damageType} aplicado ao alvo explicitamente informado.`);
  }

  const source = sourceFor(character, request);
  for (const part of spell.healing) {
    const rollId = request.diceResultIds?.[rollIndex++];
    const roll = rollId ? context.diceResults.get(rollId) : undefined;
    if (!roll) return ask(spell, rollId ?? (request.commandId as unknown as Uuid), "Uma rolagem de cura vinculada não está disponível.");
    const score = source ? character.abilityGeneration.baseScores[source.ability] : undefined;
    if (typeof score !== "number" || !Number.isFinite(score)) return reject(spell, `A habilidade ${source?.ability ?? "da fonte"} não está disponível para calcular a cura.`, "unresolved-rule");
    const amount = roll.total + (part.bonusPerCasterAbility ? abilityModifier(score) : 0);
    const applied = applyHealing(nextState, { amount, maximumHitPoints: context.maximumHitPoints as number, sourceRef: request.spellRef });
    if (applied.status !== "success") return applied;
    nextState = applied.nextState;
    effects.push(...applied.effects);
    descriptions.push(`${spell.name}: ${amount} de cura aplicado ao alvo explicitamente informado.`);
  }

  for (const descriptor of spell.effects) {
    if (descriptor.kind !== "apply-condition") continue;
    const definition = context.conditionDefinitions?.get(descriptor.conditionRef.entityId);
    const instanceId = context.conditionInstanceIds?.get(conditionKey(descriptor.conditionRef));
    if (!definition || !instanceId) return reject(spell, `A condição ${descriptor.conditionRef.entityId} não está completamente modelada para aplicação.`, "unsupported-ruleset");
    const instance: ConditionInstance = { id: instanceId, definitionRef: descriptor.conditionRef, origin: { kind: "spell", spellRef: request.spellRef }, duration: conditionDuration(descriptor.duration) };
    const applied = applyCondition(nextState, instance, definition);
    if (applied.status !== "success") return applied;
    nextState = applied.nextState;
    effects.push(...applied.effects);
    descriptions.push(`${definition.name} aplicada pela magia como instância explícita ${instance.id}.`);
  }
  return { nextState, effects, descriptions };
}

function validateComponents(character: Character, request: CastRequest, spell: SpellDefinition, context: SpellResolutionContext): { readonly item?: InventoryItem; readonly error?: RuleResult } {
  const components = request.componentContext as SpellComponentContext & { readonly canSpeak?: boolean; readonly freeHands?: boolean };
  if (spell.components.verbal && components.canSpeak !== true && context.canSpeak !== true) return { error: ask(spell, request.commandId as unknown as Uuid, "Confirme que a criatura pode vocalizar o componente verbal.") };
  if (spell.components.somatic && components.freeHands !== true && context.freeHands !== true) return { error: ask(spell, request.commandId as unknown as Uuid, "Confirme uma mão livre para o componente somático.") };
  const material = spell.components.material;
  if (!material) return {};
  const focus = request.componentContext.focusUsed;
  if (focus && context.classDefinition?.spellcasting?.spellcastingFocusAllowed === false) return { error: reject(spell, "A fonte de conjuração não permite usar foco como componente material.") };
  if (!request.componentContext.materialProvided && !focus) return { error: reject(spell, "Componente material ou foco permitido não foi fornecido.") };
  if (material.costCp !== undefined || material.consumed || material.requiredItemKind !== undefined) {
    const itemId = context.consumedInventoryItemId;
    if (!itemId) return { error: ask(spell, request.commandId as unknown as Uuid, "Selecione o item material específico que será usado nesta conjuração.") };
    const item = character.inventory.find((candidate) => candidate.id === itemId);
    if (!item || (material.requiredItemKind !== undefined && item.equipmentRef.entityId !== material.requiredItemKind)) return { error: reject(spell, "O item material selecionado não satisfaz o componente exigido.") };
    return { item };
  }
  return {};
}

function durationOf(spell: SpellDefinition): SpellDuration["kind"] {
  return spell.duration.kind;
}

function concentrationDuration(spell: SpellDefinition): { readonly kind: "instant" | "rounds" | "minutes" | "hours" | "untilRemoved" | "special"; readonly value?: number; readonly expiryTrigger?: { readonly kind: "concentration-ends" } } {
  switch (durationOf(spell)) {
    case "rounds": return { kind: "rounds", value: spell.duration.amount, ...(spell.duration.endTriggers.some((trigger) => trigger.kind === "concentration-ends") ? { expiryTrigger: { kind: "concentration-ends" as const } } : {}) };
    case "minutes": return { kind: "minutes", value: spell.duration.amount, ...(spell.duration.endTriggers.some((trigger) => trigger.kind === "concentration-ends") ? { expiryTrigger: { kind: "concentration-ends" as const } } : {}) };
    case "hours": return { kind: "hours", value: spell.duration.amount, ...(spell.duration.endTriggers.some((trigger) => trigger.kind === "concentration-ends") ? { expiryTrigger: { kind: "concentration-ends" as const } } : {}) };
    case "until-dispelled": return { kind: "untilRemoved", expiryTrigger: { kind: "concentration-ends" } };
    default: return { kind: "special", expiryTrigger: { kind: "concentration-ends" } };
  }
}

function slotFor(character: Character, source: CastingSourceState, request: CastRequest, spell: SpellDefinition, pactMagic: boolean): { readonly index: number; readonly error?: RuleResult } {
  if (spell.level === 0) {
    if (request.slotLevel !== undefined || request.resourcePoolId !== undefined) return { index: -1, error: reject(spell, "Truque não consome espaço de magia.") };
    return { index: -1 };
  }
  if (request.mode === "ritual" || request.mode === "feature") {
    if (request.slotLevel !== undefined || request.resourcePoolId !== undefined) return { index: -1, error: reject(spell, `${request.mode} não usa espaço de magia nesta resolução.`) };
    return { index: -1 };
  }
  if (request.slotLevel === undefined || request.resourcePoolId === undefined) return { index: -1, error: ask(spell, request.commandId as unknown as Uuid, "Selecione explicitamente o espaço e o nível usados para a conjuração.") };
  if (request.slotLevel < spell.level) return { index: -1, error: reject(spell, `Espaço de nível ${request.slotLevel} não pode conjurar magia de nível ${spell.level}.`, "insufficient-resource") };
  if (!source.resourcePoolIds.includes(request.resourcePoolId)) return { index: -1, error: reject(spell, "O pool de recurso selecionado não pertence à fonte de conjuração.", "insufficient-resource") };
  const index = character.spellSlots.findIndex((slot) => slot.poolId === request.resourcePoolId && slot.slotLevel === request.slotLevel);
  if (index < 0) return { index: -1, error: reject(spell, "Espaço de magia/pool não encontrado.", "insufficient-resource") };
  if (pactMagic && character.spellSlots[index].kind !== "pact") return { index: -1, error: reject(spell, "A fonte de Magia de Pacto exige um espaço do pool pact.", "insufficient-resource") };
  if (character.spellSlots[index].spent >= 1) return { index: -1, error: reject(spell, "Espaço de magia esgotado.", "insufficient-resource") };
  return { index };
}

function validateScaling(request: CastRequest, spell: SpellDefinition): RuleResult | undefined {
  if (request.slotLevel === undefined || request.slotLevel <= spell.level || spell.level === 0) return undefined;
  if (spell.higherLevels.kind === "none" || spell.higherLevels.kind === "custom") return reject(spell, "Escalonamento acima do nível base não está estruturado para resolução automática; consulte a pendência da magia.", "unresolved-rule");
  return undefined;
}

/** Executa uma conjuração validada, sem rolar dados, escolher alvo ou persistir estado. */
export function castSpell(character: Character, spell: SpellDefinition, request: CastRequest, context: SpellResolutionContext = {}): RuleResult {
  if (request.characterId !== character.id) return reject(spell, "Comando de conjuração não pertence ao personagem recebido.");
  if (context.processedCommandIds?.has(request.commandId)) return success(character, character, [], spell, ["Comando de conjuração já processado; nenhum recurso foi consumido novamente."]);
  const source = sourceFor(character, request);
  if (!source) return reject(spell, "Fonte de conjuração não encontrada no personagem.");
  const classId = classIdFor(source, context);
  if (request.spellRef.rulesetId !== (spell.sourceRefs[0]?.sourceId ?? SOURCE.sourceId) || request.spellRef.entityId !== spell.id) return reject(spell, "A referência da requisição não corresponde à definição de magia recebida.", "invalid-command");
  if (!spell.classes.some((id) => id === classId)) return reject(spell, `A classe ${classId} não concede acesso a esta magia.`);
  const known = hasRef(source.knownSpellRefs, request.spellRef);
  const prepared = hasRef(source.preparedSpellRefs, request.spellRef);
  const inSpellbook = hasRef(source.spellbookRefs, request.spellRef);
  const classDescriptor = context.classDefinition?.spellcasting;
  const accessKind = classDescriptor?.kind;
  const ritualAllowed = classDescriptor?.ritualCasting ?? classId === "wizard";
  if (!known && !prepared && !inSpellbook) return reject(spell, "Magia não está conhecida, preparada ou no grimório da fonte escolhida.");
  if (accessKind === "known" && !known) return reject(spell, "A fonte exige uma magia conhecida.");
  if ((accessKind === "prepared" || accessKind === "spellbook-prepared") && !prepared && !(request.mode === "ritual" && accessKind === "spellbook-prepared" && inSpellbook)) return reject(spell, "A fonte exige uma magia preparada.");
  if (request.mode === "ritual") {
    if (!spell.ritual) return reject(spell, "Esta magia não possui marca ritual.");
    if (!ritualAllowed) return reject(spell, "A fonte escolhida não concede capacidade de conjuração ritual.");
  }
  const targetError = validateTargets(request, spell);
  if (targetError) return reject(spell, targetError);
  const effectContextError = validateEffectContext(character, spell, request, context);
  if (effectContextError) return effectContextError;
  const actionError = actionAvailable(request, context, spell);
  if (actionError) return actionError;
  const components = validateComponents(character, request, spell, context);
  if (components.error) return components.error;
  const slot = slotFor(character, source, request, spell, classDescriptor?.progressionType === "pact" || classId === "warlock");
  if (slot.error) return slot.error;
  const scaling = validateScaling(request, spell);
  if (scaling) return scaling;
  if (spell.concentration && character.concentration && context.replaceConcentration !== true) return ask(spell, request.commandId as unknown as Uuid, "Confirme explicitamente a substituição da concentração ativa.");
  if (spell.concentration && !context.concentrationEffectId) return ask(spell, request.commandId as unknown as Uuid, "Forneça o ID do novo efeito de concentração para persistir sua identidade.");
  const spellRef = request.spellRef;
  let nextState = character;
  const effects: Effect[] = [];
  const descriptions: string[] = [request.mode === "ritual" ? "Conjuração ritual elegível: adicionou 10 minutos ao tempo e não consumiu espaço." : spell.level === 0 ? "Truque conjurado sem consumo de espaço." : `Espaço de nível ${request.slotLevel} consumido somente após validação completa.`];
  if (slot.index >= 0) {
    const slotState = character.spellSlots[slot.index];
    const spellSlots = character.spellSlots.map((entry, index) => index === slot.index ? { ...entry, spent: entry.spent + 1 } : entry);
    nextState = { ...nextState, spellSlots };
    effects.push({ kind: "spell-slot-spent", targetCharacterId: character.id, sourceRef: spellRef, payload: { poolId: slotState.poolId, slotLevel: slotState.slotLevel, newSpent: slotState.spent + 1 } });
  }
  if (components.item && spell.components.material?.consumed) {
    const inventory = character.inventory.flatMap((item) => item.id !== components.item?.id ? [item] : item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []);
    nextState = { ...nextState, inventory };
    effects.push({ kind: "inventory-changed", targetCharacterId: character.id, sourceRef: spellRef, payload: { inventoryItemId: components.item.id } });
    descriptions.push(`Componente material consumido: item ${components.item.id}; a remoção ocorreu na mesma transação.`);
  }
  if (spell.concentration) {
    const concentration = { effectId: context.concentrationEffectId as Uuid, sourceRef: spellRef, duration: concentrationDuration(spell), pendingSaveIds: [] };
    if (character.concentration) {
      effects.push({ kind: "concentration-ended", targetCharacterId: character.id, sourceRef: character.concentration.sourceRef, payload: { reason: "replaced" } });
      descriptions.push("Concentração anterior substituída somente após decisão explícita.");
    }
    nextState = { ...nextState, concentration };
    effects.push({ kind: "concentration-started", targetCharacterId: character.id, sourceRef: spellRef, payload: { concentration } });
  }
  const appliedSpellEffects = applySpellEffects(nextState, spell, request, context);
  if ("status" in appliedSpellEffects) return appliedSpellEffects;
  nextState = appliedSpellEffects.nextState;
  effects.push(...appliedSpellEffects.effects);
  descriptions.push(...appliedSpellEffects.descriptions);
  if (spell.effects.some((effect) => effect.kind === "narrative" || effect.kind === "summon" || effect.kind === "interrupt")) descriptions.push("A magia possui efeito assistido/narrativo; sua resolução específica permanece vinculada à fonte.");
  return success(character, nextState, effects, spell, descriptions);
}

export const cast = castSpell;
export const resolveCast = castSpell;

/** Prévia sem mutação: executa a mesma validação, mas não deve ser usada para confirmar gasto. */
export function previewCast(character: Character, spell: SpellDefinition, request: CastRequest, context: SpellResolutionContext = {}): RuleResult {
  const result = castSpell(character, spell, request, context);
  if (result.status !== "success") return result;
  const preview: CastPreview = {
    ...(request.mode === "normal" && spell.level > 0 && request.resourcePoolId && request.slotLevel !== undefined ? { slotCost: { poolId: request.resourcePoolId, slotLevel: request.slotLevel } } : {}),
    resourceCosts: [],
    actionCost: request.mode === "ritual" ? { kind: "minutes", amount: 10, unit: "minute" } : spell.castingTime,
    componentsConsumed: spell.components.material?.consumed && spell.components.material.requiredItemKind ? [spell.components.material.requiredItemKind] : [],
    ...(character.concentration && spell.concentration ? { concentrationReplaced: { priorEffectSourceRef: character.concentration.sourceRef } } : {}),
    interventionsRequired: spell.pendingDecisionIds.map((pendencyId) => ({ reason: `Pendência da magia: ${pendencyId}`, relatedRef: request.spellRef })),
    sourceRefs: sourceRefs(spell),
  };
  return { status: "needsInput", requests: [], preview: { kind: "cast-spell", castPreview: preview }, sourceRefs: sourceRefs(spell) };
}

export { SOURCE as SPELL_RULE_SOURCE_REF };
