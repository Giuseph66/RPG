import { type DiceRoll } from "@domain/contracts/dice";
import { type Character, type HitDiceSpentEntry } from "@domain/contracts/character";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { asCommandId, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";
import { type Effect, type HitDiceSpendRequest, type RestPayload, type RuleResult } from "@domain/contracts/rules";
import { resolveAdvanceWildShapeTime } from "@domain/rules/wild-shape";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 8",
  printedPage: 188,
  pdfPage: 187,
  section: "Descanso",
};

export interface RestInput extends RestPayload {
  readonly maximumHitPoints?: number;
  readonly constitutionModifier?: number;
  /** Valores derivados da ficha atual sem transformação, usados quando a forma termina durante o descanso. */
  readonly originalMaximumHitPoints?: number;
  readonly originalConstitutionModifier?: number;
  readonly hitDiceRolls?: ReadonlyMap<Uuid, DiceRoll>;
  readonly resourceDefinitions?: ReadonlyMap<string, ResourceDefinition>;
  readonly recoverHitDiceByClass?: Readonly<Record<string, number>>;
  readonly ateAndDrank?: boolean;
  readonly tirelessActive?: boolean;
  readonly tirelessSourceRef?: SourceRef;
  /** Chave estável da sessão de descanso; usada como marcador para reabrir sem repetir resets. */
  readonly restId?: string;
  readonly uninterrupted?: boolean;
}

/** Duração padrão representada pelo comando: mínimos publicados quando a mesa não informa mais. */
export const REST_MINIMUM_DURATION_HOURS = { short: 1, long: 8 } as const;
type SuccessfulRuleResult = Extract<RuleResult, { readonly status: "success" }>;

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
    else {
      const recovered = definition.recoveryAmountRule.rounding === "up"
        ? Math.ceil(resource.spent / 2)
        : Math.floor(resource.spent / 2);
      amount = Math.max(0, resource.spent - recovered);
    }
    return { ...resource, spent: amount, resetMarker: input.restId ?? resource.resetMarker };
  });
  return { resources, descriptions: resources.some((resource, index) => resource.spent !== character.resources[index]?.spent) ? [`Recursos marcados para ${trigger} foram recuperados conforme suas definições.`] : [] };
}

function validateDuration(input: RestInput): RuleResult | undefined {
  const minimum = REST_MINIMUM_DURATION_HOURS[input.restKind];
  if (input.durationHours !== undefined && (!Number.isFinite(input.durationHours) || input.durationHours < minimum)) return reject(`${input.restKind === "short" ? "Descanso curto" : "Descanso longo"} exige pelo menos ${minimum} hora(s).`, "invalid-context");
  if (input.uninterrupted === false) return reject("Atividade extenuante/interrupção impede concluir este descanso; a sessão deve ser reiniciada.", "invalid-context");
  return undefined;
}

function shortRest(character: Character, input: RestInput): RuleResult {
  const requests = input.hitDiceSpent ?? [];
  if (requests.length > 0 && input.maximumHitPoints === undefined) return needsInput("Informe o máximo efetivo de PV para limitar a cura dos Dados de Vida.", character.id as Uuid);
  if (input.maximumHitPoints !== undefined && (!Number.isInteger(input.maximumHitPoints) || input.maximumHitPoints <= 0)) return reject("Máximo de PV inválido para descanso curto.");
  const activeHp = character.transformation?.formHp ?? character.hp;
  let current = activeHp.current;
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
  let exhaustionReduced = false;
  const conditions = input.tirelessActive
    ? character.conditions.flatMap((condition) => {
      if (exhaustionReduced || condition.definitionRef.entityId !== "exhaustion" || (condition.severity ?? 0) <= 0) return [condition];
      exhaustionReduced = true;
      return (condition.severity ?? 0) === 1 ? [] : [{ ...condition, severity: (condition.severity ?? 0) - 1 }];
    })
    : character.conditions;
  if (exhaustionReduced) descriptions.push("Incansável reduziu a exaustão em 1 nível ao concluir o descanso curto.");
  // Magia de Pacto (bruxo): os espaços voltam ao terminar um descanso curto ou longo.
  const spellSlots = character.spellSlots.map((slot) => slot.kind === "pact" && slot.spent > 0 ? { ...slot, spent: 0 } : slot);
  if (spellSlots.some((slot, index) => slot !== character.spellSlots[index])) descriptions.push("Espaços de Magia de Pacto recuperados.");
  const hpChanged = current !== activeHp.current;
  const nextState: Character = {
    ...character,
    ...(character.transformation
      ? { transformation: { ...character.transformation, formHp: { ...character.transformation.formHp, current } } }
      : { hp: { ...character.hp, current } }),
    hitDiceSpent: spent,
    resources: resourceRecovery.resources,
    spellSlots,
    conditions,
  };
  const effects: Effect[] = [];
  if (hpChanged) effects.push({ kind: "hp-changed", targetCharacterId: character.id, sourceRef: SOURCE, payload: { delta: current - activeHp.current, newCurrent: current, newTemp: activeHp.temp } });
  const result = success(character, nextState, effects, descriptions);
  return exhaustionReduced && input.tirelessSourceRef
    ? { ...result, sourceRefs: [...new Set([...result.sourceRefs, input.tirelessSourceRef])] }
    : result;
}

/** Sem escolha explícita, recupera primeiro os maiores dados (mais PV por dado gasto). */
function defaultHitDiceRecovery(entries: readonly HitDiceSpentEntry[], recoverable: number): Record<string, number> {
  let left = recoverable;
  const chosen: Record<string, number> = {};
  for (const entry of [...entries].filter((candidate) => candidate.spent > 0).sort((a, b) => b.hitDie - a.hitDie)) {
    const count = Math.min(entry.spent, left);
    if (count > 0) chosen[String(entry.classId)] = count;
    left -= count;
  }
  return chosen;
}

function longRest(character: Character, input: RestInput): RuleResult {
  const activeHp = character.transformation?.formHp ?? character.hp;
  if (activeHp.current < 1) return reject("Descanso longo exige pelo menos 1 PV no início e não concede benefício.", "invalid-context");
  if (input.maximumHitPoints === undefined || !Number.isInteger(input.maximumHitPoints) || input.maximumHitPoints <= 0) return needsInput("Informe o máximo efetivo de PV para concluir a recuperação total do descanso longo.", character.id as Uuid);
  const totalSpent = character.hitDiceSpent.reduce((total, entry) => total + entry.spent, 0);
  // "recupera uma quantidade de Dados de Vida gastos igual a metade da quantidade total de
  // Dados de Vida do personagem" (p.188): metade do total (nível), limitado ao que foi gasto.
  const totalHitDice = character.classes.reduce((total, entry) => total + entry.level, 0);
  const recoverable = Math.min(totalSpent, Math.floor(totalHitDice / 2));
  const allocation = input.recoverHitDiceByClass;
  const chosen = allocation ?? defaultHitDiceRecovery(character.hitDiceSpent, recoverable);
  const requested = Object.values(chosen).reduce((sum, count) => sum + count, 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > recoverable) return reject(`Recuperação de Dados de Vida excede metade do total (${recoverable}).`, "invalid-command");
  for (const entry of character.hitDiceSpent) {
    const count = chosen[String(entry.classId)] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > entry.spent) return reject(`Recuperação de Dados de Vida excede o gasto registrado para ${entry.classId}.`, "invalid-command");
  }
  const hitDiceSpent: HitDiceSpentEntry[] = character.hitDiceSpent.map((entry) => ({ ...entry, spent: Math.max(0, entry.spent - Math.min(entry.spent, chosen[String(entry.classId)] ?? 0)) }));
  const resourceRecovery = applyResourceRecovery(character, input);
  if (character.conditions.some((condition) => condition.definitionRef.entityId === "exhaustion" && (condition.severity ?? 0) > 0) && input.ateAndDrank === undefined) return needsInput("Informe se houve alimentação e hidratação adequadas para remover exaustão.", character.id as Uuid);
  const exhaustion = input.ateAndDrank !== true ? character.conditions : character.conditions.map((condition) => condition.definitionRef.entityId === "exhaustion" && (condition.severity ?? 0) > 0 ? { ...condition, severity: (condition.severity ?? 0) - 1 } : condition);
  const hp: Character["hp"] = { current: input.maximumHitPoints, temp: 0 };
  // Conjuração (cap. 10): todos os espaços de magia gastos voltam ao terminar um descanso longo.
  const spellSlots = character.spellSlots.map((slot) => slot.spent > 0 ? { ...slot, spent: 0 } : slot);
  const slotsRecovered = spellSlots.some((slot, index) => slot !== character.spellSlots[index]);
  const nextState: Character = {
    ...character,
    ...(character.transformation
      ? { transformation: { ...character.transformation, formHp: hp } }
      : { hp }),
    hitDiceSpent,
    resources: resourceRecovery.resources,
    conditions: exhaustion,
    spellSlots,
  };
  const effects: Effect[] = [{ kind: "hp-changed", targetCharacterId: character.id, sourceRef: SOURCE, payload: { delta: input.maximumHitPoints - activeHp.current, newCurrent: input.maximumHitPoints, newTemp: 0 } }];
  return success(character, nextState, effects, ["Descanso longo recuperou todos os PV até o máximo efetivo e expirou PV temporários sem duração própria.", `Dados de Vida recuperados: ${requested} de no máximo ${recoverable} (arredondamento para baixo).`, ...(slotsRecovered ? ["Espaços de magia gastos recuperados."] : []), ...(input.ateAndDrank === false ? ["Exaustão foi preservada sem alimentação e hidratação adequadas."] : ["Alimentação/hidratação permitiu remover um nível de exaustão, quando existente."]), ...resourceRecovery.descriptions]);
}

/** Conclui atomicamente um descanso; rolagens são sempre fornecidas pelo Dice Engine. */
export function resolveRest(character: Character, input: RestInput): RuleResult {
  const duration = validateDuration(input);
  if (duration) return duration;
  let restCharacter = character;
  let timeEffects: readonly Effect[] = [];
  let timeExplanations: SuccessfulRuleResult["explanations"] = [];
  let timeSourceRefs: SuccessfulRuleResult["sourceRefs"] = [];
  let restInput = input;
  if (character.transformation) {
    const hours = input.durationHours ?? REST_MINIMUM_DURATION_HOURS[input.restKind];
    const minutes = hours * 60;
    if (!Number.isSafeInteger(minutes) || minutes <= 0) return reject("Duração do descanso não pode avançar o tempo de jogo da forma.", "invalid-context");
    const advanced = resolveAdvanceWildShapeTime(character, {
      commandId: asCommandId("rest-advances-wild-shape-time"),
      characterId: character.id,
      expectedRevision: character.revision,
      kind: "advance-wild-shape-time",
      payload: { minutes },
    });
    if (advanced.status !== "success") return advanced;
    restCharacter = advanced.nextState;
    timeEffects = advanced.effects;
    timeExplanations = advanced.explanations ?? [];
    timeSourceRefs = advanced.sourceRefs;
    if (!restCharacter.transformation) {
      const originalMaximum = input.originalMaximumHitPoints ?? character.transformation.originalMaximumHitPoints;
      if (originalMaximum === undefined) return needsInput("Informe o máximo atual de PV originais para concluir o descanso após a forma expirar.", character.id as Uuid);
      if ((input.hitDiceSpent?.length ?? 0) > 0 && input.originalConstitutionModifier === undefined) {
        return needsInput("Informe o modificador de Constituição original para recuperar PV com Dados de Vida após a forma expirar.", character.id as Uuid);
      }
      restInput = {
        ...input,
        maximumHitPoints: originalMaximum,
        constitutionModifier: input.originalConstitutionModifier,
      };
    }
  }
  const result = restInput.restKind === "short" ? shortRest(restCharacter, restInput) : longRest(restCharacter, restInput);
  if (result.status !== "success") return result;
  return {
    ...result,
    effects: [...timeEffects, ...result.effects],
    explanations: [...timeExplanations, ...result.explanations],
    sourceRefs: [...new Set([...timeSourceRefs, ...result.sourceRefs])],
  };
}

export const rest = resolveRest;
export { SOURCE as REST_RULE_SOURCE_REF };
