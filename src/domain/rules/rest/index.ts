import { type DiceRoll } from "@domain/contracts/dice";
import { type Character, type HitDiceSpentEntry } from "@domain/contracts/character";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";
import { type Effect, type HitDiceSpendRequest, type RestPayload, type RuleResult } from "@domain/contracts/rules";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 8",
  printedPage: 188,
  pdfPage: 187,
  section: "Descanso",
};

export interface RestInput extends RestPayload {
  readonly durationHours?: number;
  readonly maximumHitPoints?: number;
  readonly constitutionModifier?: number;
  readonly hitDiceRolls?: ReadonlyMap<Uuid, DiceRoll>;
  readonly resourceDefinitions?: ReadonlyMap<string, ResourceDefinition>;
  readonly recoverHitDiceByClass?: Readonly<Record<string, number>>;
  readonly ateAndDrank?: boolean;
  /** Chave estável da sessão de descanso; usada como marcador para reabrir sem repetir resets. */
  readonly restId?: string;
  readonly uninterrupted?: boolean;
}

function reject(message: string, code: "invalid-command" | "invalid-context" | "insufficient-resource" | "unresolved-rule" = "invalid-command"): RuleResult {
  return { status: "rejected", errors: [{ code, message }], sourceRefs: [SOURCE] };
}

function needsInput(reason: string, id: Uuid): RuleResult {
  return { status: "needsInput", requests: [{ id, reason, validOptions: [] }], sourceRefs: [SOURCE] };
}

function success(character: Character, nextState: Character, effects: readonly Effect[], descriptions: readonly string[]): RuleResult {
  return { status: "success", nextState, effects, explanations: descriptions.map((description) => ({ value: description, contributions: [{ sourceRef: SOURCE, description }] })), sourceRefs: [SOURCE] };
}

function triggerMatches(definition: ResourceDefinition, kind: "short-rest" | "long-rest"): boolean {
  return definition.recoveryTriggers.some((trigger) => trigger.kind === kind);
}

function applyResourceRecovery(character: Character, input: RestInput): { readonly resources: Character["resources"]; readonly descriptions: string[] } {
  if (!input.resourceDefinitions) return { resources: character.resources, descriptions: [] };
  const trigger = input.restKind === "short" ? "short-rest" : "long-rest";
  const resources = character.resources.map((resource) => {
    const definition = input.resourceDefinitions?.get(String(resource.definitionRef.entityId));
    if (!definition || !triggerMatches(definition, trigger)) return resource;
    if (input.restId && resource.resetMarker === input.restId) return resource;
    let amount = resource.spent;
    if (definition.recoveryAmountRule.kind === "full") amount = 0;
    else if (definition.recoveryAmountRule.kind === "fixed-amount") amount = Math.max(0, resource.spent - definition.recoveryAmountRule.amount);
    else amount = Math.max(0, resource.spent - Math.floor(resource.spent / 2));
    return { ...resource, spent: amount, resetMarker: input.restId ?? resource.resetMarker };
  });
  return { resources, descriptions: resources.some((resource, index) => resource.spent !== character.resources[index]?.spent) ? [`Recursos marcados para ${trigger} foram recuperados conforme suas definições.`] : [] };
}

function validateDuration(input: RestInput): RuleResult | undefined {
  const minimum = input.restKind === "short" ? 1 : 8;
  if (input.durationHours !== undefined && (!Number.isFinite(input.durationHours) || input.durationHours < minimum)) return reject(`${input.restKind === "short" ? "Descanso curto" : "Descanso longo"} exige pelo menos ${minimum} hora(s).`, "invalid-context");
  if (input.uninterrupted === false) return reject("Atividade extenuante/interrupção impede concluir este descanso; a sessão deve ser reiniciada.", "invalid-context");
  return undefined;
}

function shortRest(character: Character, input: RestInput): RuleResult {
  const requests = input.hitDiceSpent ?? [];
  if (requests.length > 0 && input.maximumHitPoints === undefined) return needsInput("Informe o máximo efetivo de PV para limitar a cura dos Dados de Vida.", character.id as Uuid);
  if (input.maximumHitPoints !== undefined && (!Number.isInteger(input.maximumHitPoints) || input.maximumHitPoints <= 0)) return reject("Máximo de PV inválido para descanso curto.");
  let current = character.hp.current;
  const spent = character.hitDiceSpent.map((entry) => ({ ...entry }));
  const descriptions: string[] = ["Descanso curto elegível: apenas Dados de Vida escolhidos e recursos com gatilho de curto podem recuperar."];
  for (const request of requests) {
    if (!Number.isInteger(request.count) || request.count < 0 || request.rollIds.length !== request.count) return reject(`Quantidade de Dados de Vida inválida para ${request.classId}.`);
    const entry = spent.find((candidate) => candidate.classId === request.classId);
    const level = character.classes.find((candidate) => candidate.classId === request.classId)?.level ?? 0;
    if (!entry || request.count > level - entry.spent) return reject(`Dados de Vida insuficientes para ${request.classId}.`, "insufficient-resource");
    const rolls = request.rollIds.map((id) => input.hitDiceRolls?.get(id));
    if (rolls.some((roll) => roll === undefined)) return needsInput(`Informe os resultados já rolados dos Dados de Vida de ${request.classId}; o descanso não rola aleatoriedade.`, request.rollIds.find((id) => !input.hitDiceRolls?.has(id)) ?? (character.id as Uuid));
    let healed = 0;
    for (const roll of rolls as DiceRoll[]) healed += Math.max(0, roll.total + (input.constitutionModifier ?? 0));
    current = Math.min(input.maximumHitPoints as number, current + healed);
    const index = spent.findIndex((candidate) => candidate.classId === request.classId);
    spent[index] = { ...spent[index], spent: spent[index].spent + request.count };
    descriptions.push(`${request.count} Dado(s) de Vida gasto(s) em ${request.classId}; cura aplicada após cada resultado (${healed} PV no total).`);
  }
  const resourceRecovery = applyResourceRecovery(character, input);
  descriptions.push(...resourceRecovery.descriptions);
  const hpChanged = current !== character.hp.current;
  const nextState: Character = { ...character, hp: { ...character.hp, current }, hitDiceSpent: spent, resources: resourceRecovery.resources };
  const effects: Effect[] = [];
  if (hpChanged) effects.push({ kind: "hp-changed", targetCharacterId: character.id, sourceRef: SOURCE, payload: { delta: current - character.hp.current, newCurrent: current, newTemp: character.hp.temp } });
  return success(character, nextState, effects, descriptions);
}

function longRest(character: Character, input: RestInput): RuleResult {
  if (character.hp.current < 1) return reject("Descanso longo exige pelo menos 1 PV no início e não concede benefício.", "invalid-context");
  if (input.maximumHitPoints === undefined || !Number.isInteger(input.maximumHitPoints) || input.maximumHitPoints <= 0) return needsInput("Informe o máximo efetivo de PV para concluir a recuperação total do descanso longo.", character.id as Uuid);
  const totalSpent = character.hitDiceSpent.reduce((total, entry) => total + entry.spent, 0);
  const recoverable = Math.floor(totalSpent / 2);
  const allocation = input.recoverHitDiceByClass;
  if (recoverable > 0 && !allocation && new Set(character.hitDiceSpent.filter((entry) => entry.spent > 0).map((entry) => String(entry.classId))).size > 1) return needsInput("Escolha de quais classes recuperar Dados de Vida é necessária no descanso longo.", character.id as Uuid);
  const chosen = allocation ?? Object.fromEntries(character.hitDiceSpent.filter((entry) => entry.spent > 0).map((entry) => [String(entry.classId), recoverable]));
  const requested = Object.values(chosen).reduce((sum, count) => sum + count, 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > recoverable) return reject(`Recuperação de Dados de Vida excede floor(${totalSpent}/2) = ${recoverable}.`, "invalid-command");
  for (const entry of character.hitDiceSpent) {
    const count = chosen[String(entry.classId)] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > entry.spent) return reject(`Recuperação de Dados de Vida excede o gasto registrado para ${entry.classId}.`, "invalid-command");
  }
  const hitDiceSpent: HitDiceSpentEntry[] = character.hitDiceSpent.map((entry) => ({ ...entry, spent: Math.max(0, entry.spent - Math.min(entry.spent, chosen[String(entry.classId)] ?? 0)) }));
  const resourceRecovery = applyResourceRecovery(character, input);
  if (character.conditions.some((condition) => condition.definitionRef.entityId === "exhaustion" && (condition.severity ?? 0) > 0) && input.ateAndDrank === undefined) return needsInput("Informe se houve alimentação e hidratação adequadas para remover exaustão.", character.id as Uuid);
  const exhaustion = input.ateAndDrank !== true ? character.conditions : character.conditions.map((condition) => condition.definitionRef.entityId === "exhaustion" && (condition.severity ?? 0) > 0 ? { ...condition, severity: (condition.severity ?? 0) - 1 } : condition);
  const hp: Character["hp"] = { current: input.maximumHitPoints, temp: 0 };
  const nextState: Character = { ...character, hp, hitDiceSpent, resources: resourceRecovery.resources, conditions: exhaustion };
  const effects: Effect[] = [{ kind: "hp-changed", targetCharacterId: character.id, sourceRef: SOURCE, payload: { delta: input.maximumHitPoints - character.hp.current, newCurrent: input.maximumHitPoints, newTemp: 0 } }];
  return success(character, nextState, effects, ["Descanso longo recuperou todos os PV até o máximo efetivo e expirou PV temporários sem duração própria.", `Dados de Vida recuperados: ${requested} de no máximo ${recoverable} (arredondamento para baixo).`, ...(input.ateAndDrank === false ? ["Exaustão foi preservada sem alimentação e hidratação adequadas."] : ["Alimentação/hidratação permitiu remover um nível de exaustão, quando existente."]), ...resourceRecovery.descriptions]);
}

/** Conclui atomicamente um descanso; rolagens são sempre fornecidas pelo Dice Engine. */
export function resolveRest(character: Character, input: RestInput): RuleResult {
  const duration = validateDuration(input);
  if (duration) return duration;
  return input.restKind === "short" ? shortRest(character, input) : longRest(character, input);
}

export const rest = resolveRest;
export { SOURCE as REST_RULE_SOURCE_REF };
