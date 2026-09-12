import { type Character, type ConditionInstance } from "@domain/contracts/character";
import { type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type Effect, type RuleResult } from "@domain/contracts/rules";
import { type SourceRef } from "@domain/contracts/primitives";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Apêndice A",
  printedPage: 291,
  pdfPage: 290,
  section: "Condições",
};

function refOf(definition: ConditionDefinition): DefinitionRef {
  return { rulesetId: definition.sourceRefs[0]?.sourceId ?? SOURCE.sourceId, entityId: definition.id };
}

function rejected(message: string, source: DefinitionRef | SourceRef = SOURCE): RuleResult {
  const sourceRef = "chapter" in source ? source : SOURCE;
  return { status: "rejected", errors: [{ code: "invalid-command", message, sourceRef: source }], sourceRefs: [sourceRef] };
}

function result(character: Character, nextState: Character, effects: readonly Effect[], description: string, source: DefinitionRef | SourceRef): RuleResult {
  const sourceRef = "chapter" in source ? source : SOURCE;
  return { status: "success", nextState, effects, explanations: [{ value: description, contributions: [{ sourceRef: source, description }] }], sourceRefs: [sourceRef] };
}

/** Aplica uma instância identificada; repetir o mesmo ID não duplica a condição. */
export function applyCondition(
  character: Character,
  instance: ConditionInstance,
  definition: ConditionDefinition,
  options: { readonly conditionImmunities?: readonly DefinitionRef[] } = {},
): RuleResult {
  const definitionRef = refOf(definition);
  if (instance.definitionRef.entityId !== definition.id || instance.definitionRef.rulesetId !== definitionRef.rulesetId) return rejected("A instância e a definição de condição pertencem a referências diferentes.", definitionRef);
  if (character.conditions.some((existing) => existing.id === instance.id)) return result(character, character, [], "Instância de condição já aplicada; comando idempotente.", definitionRef);
  if (options.conditionImmunities?.some((immune) => immune.entityId === definition.id && immune.rulesetId === definitionRef.rulesetId)) return rejected(`Imunidade impediu a aplicação de ${definition.name}; nenhum efeito foi apagado.`, definitionRef);
  if (instance.severity !== undefined && definition.severityRange && (instance.severity < definition.severityRange.min || instance.severity > definition.severityRange.max)) return rejected(`Severidade de ${definition.name} fora do intervalo permitido.`, definitionRef);
  const same = character.conditions.filter((existing) => existing.definitionRef.entityId === definition.id && existing.definitionRef.rulesetId === definitionRef.rulesetId);
  let conditions = character.conditions;
  if (definition.stackingPolicy === "no-stack" && same.length > 0) conditions = conditions.filter((existing) => existing.definitionRef.entityId !== definition.id || existing.definitionRef.rulesetId !== definitionRef.rulesetId);
  const nextState = { ...character, conditions: [...conditions, instance] };
  const effect: Effect = { kind: "condition-applied", targetCharacterId: character.id, sourceRef: definitionRef, payload: { conditionInstance: instance } };
  return result(character, nextState, [effect], `${definition.name} aplicada como instância ${instance.id}; política ${definition.stackingPolicy} preservou origens e duração próprias.`, definitionRef);
}

/** Remove somente a instância informada; outra origem da mesma condição permanece ativa. */
export function removeCondition(character: Character, conditionInstanceId: Uuid, source?: DefinitionRef | SourceRef): RuleResult {
  const existing = character.conditions.find((condition) => condition.id === conditionInstanceId);
  if (!existing) return result(character, character, [], "Instância de condição já removida; comando idempotente.", source ?? SOURCE);
  const nextState = { ...character, conditions: character.conditions.filter((condition) => condition.id !== conditionInstanceId) };
  const effect: Effect = { kind: "condition-removed", targetCharacterId: character.id, sourceRef: source ?? existing.definitionRef, payload: { conditionInstanceId } };
  return result(character, nextState, [effect], `Removida somente a instância ${conditionInstanceId}; outras aplicações permanecem.`, source ?? existing.definitionRef);
}

export function conditionIsActive(character: Character, conditionRef: DefinitionRef): boolean {
  return character.conditions.some((instance) => instance.definitionRef.rulesetId === conditionRef.rulesetId && instance.definitionRef.entityId === conditionRef.entityId);
}

/** Soma somente severidades declaradas; a ausência do campo nunca vira nível implícito. */
export function conditionSeverity(character: Character, conditionRef: DefinitionRef): number {
  return character.conditions
    .filter((instance) => instance.definitionRef.rulesetId === conditionRef.rulesetId && instance.definitionRef.entityId === conditionRef.entityId)
    .reduce((total, instance) => total + (instance.severity ?? 0), 0);
}

/** Efeitos declarados da definição, preservando a origem de cada modificador. */
export function conditionEffects(character: Character, definition: ConditionDefinition): readonly { readonly instance: ConditionInstance; readonly effects: readonly ConditionDefinition["mechanicalEffects"][number][] }[] {
  return character.conditions
    .filter((instance) => instance.definitionRef.entityId === definition.id && instance.definitionRef.rulesetId === definition.sourceRefs[0]?.sourceId)
    .map((instance) => ({ instance, effects: definition.mechanicalEffects }));
}

export { SOURCE as CONDITIONS_RULE_SOURCE_REF };
