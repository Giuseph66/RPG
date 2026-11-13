/** Regras e projeções puras de Forma Selvagem (PHB local 2017 + override explícito de voo/nado). */

import {
  type BeastSightingState,
  type Character,
  type CharacterSnapshot,
  type EquipmentDisposition,
  type HitPointsState,
  type TransformationState,
} from "@domain/contracts/character";
import { type Command, type Effect, type InputRequest, type RuleError, type RuleResult } from "@domain/contracts/rules";
import { type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import { type AvailableAction } from "@domain/contracts/rules";
import { type GameTime, type SourceRef } from "@domain/contracts/primitives";
import { isBeastDefinition, type BeastDefinition, type CreatureStatBlock } from "@domain/creatures";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Capítulo 3 — Classes",
  printedPage: 73,
  pdfPage: 72,
  section: "Druida — Forma Selvagem",
};

export interface WildShapeResolutionContext {
  readonly definitions: ReadonlyMap<EntityId, CreatureStatBlock>;
  readonly gameTime?: GameTime;
  readonly availableActions: readonly AvailableAction[];
  readonly transformationId: Uuid;
  readonly requestId: Uuid;
  readonly originalMaximumHitPoints: number;
}

export interface EligibleBeastSuggestion {
  readonly beast: BeastDefinition;
  readonly reasons: readonly string[];
}

export type WildShapeExitReason = "voluntary" | "duration-ended" | "unconscious" | "zero-hit-points" | "died" | "manual-table-decision";

export function wildShapeActionCost(
  character: Character,
  availableActions: readonly AvailableAction[],
  operation: "enter" | "exit",
): "action" | "bonus-action" | undefined {
  if (operation === "exit") return availableActions.includes("bonus-action") ? "bonus-action" : undefined;
  if (availableActions.includes("action")) return "action";
  return hasMoonCircle(character) && availableActions.includes("bonus-action") ? "bonus-action" : undefined;
}

function reject(message: string, code: RuleError["code"] = "invalid-command"): RuleResult {
  return { status: "rejected", errors: [{ code, message, sourceRef: SOURCE }], sourceRefs: [SOURCE] };
}

function success(character: Character, nextState: Character, effects: readonly Effect[], description: string): RuleResult {
  return {
    status: "success",
    nextState,
    effects,
    explanations: [{ value: description, contributions: [{ sourceRef: SOURCE, description }] }],
    sourceRefs: [SOURCE],
  };
}

function needsInput(reason: string, id: Uuid): RuleResult {
  return { status: "needsInput", requests: [{ id, reason, validOptions: [] } satisfies InputRequest], sourceRefs: [SOURCE] };
}

function druidLevel(character: Character): number {
  return character.classes.find((entry) => entry.classId === "druid")?.level ?? 0;
}

function hasMoonCircle(character: Character): boolean {
  return character.classes.some((entry) => entry.classId === "druid" && entry.subclassId === "circle-of-the-moon");
}

function maximumCr(character: Character): { readonly numerator: number; readonly denominator: number } | undefined {
  const level = druidLevel(character);
  if (level < 2) return undefined;
  if (hasMoonCircle(character)) {
    const allowed = level >= 6 ? Math.floor(level / 3) : 1;
    return { numerator: allowed, denominator: 1 };
  }
  if (level <= 3) return { numerator: 1, denominator: 4 };
  if (level <= 7) return { numerator: 1, denominator: 2 };
  return { numerator: 1, denominator: 1 };
}

function crAtMost(value: CreatureStatBlock["challengeRating"], maximum: { readonly numerator: number; readonly denominator: number }): boolean {
  return value !== null && Number.isInteger(value.numerator) && Number.isInteger(value.denominator) && value.denominator > 0 &&
    value.numerator * maximum.denominator <= maximum.numerator * value.denominator;
}

function isSeen(character: Character, beastRef: DefinitionRef): boolean {
  return (character.beastSightings ?? []).some((sighting) => sighting.beastRef.rulesetId === beastRef.rulesetId && sighting.beastRef.entityId === beastRef.entityId);
}

function sourceRuleBlock(reason: string): string {
  return reason;
}

/** Registra a decisão explícita de que o personagem viu uma besta. Aprovação de proposta não chama esta função. */
export function resolveMarkBeastSeen(
  character: Character,
  command: Extract<Command, { readonly kind: "mark-beast-seen" }>,
  context: Pick<WildShapeResolutionContext, "definitions" | "gameTime">,
): RuleResult {
  if (command.characterId !== character.id || command.expectedRevision !== character.revision) return reject("Comando de avistamento não corresponde à ficha/revisão atual.", "concurrent-modification");
  const { beastRef } = command.payload;
  if (beastRef.rulesetId !== character.rulesetRef.id) return reject("A besta pertence a outro catálogo; ela não foi registrada como vista.", "invalid-context");
  const definition = context.definitions.get(beastRef.entityId);
  if (!definition || !isBeastDefinition(definition)) return reject("A referência não resolve para uma besta individual do catálogo.", "invalid-context");
  if (isSeen(character, beastRef)) return success(character, character, [], `${definition.name} já consta entre as bestas vistas.`);
  const sighting: BeastSightingState = { beastRef, ...(context.gameTime ? { firstSeenAt: context.gameTime } : {}) };
  return success(character, { ...character, beastSightings: [...(character.beastSightings ?? []), sighting] }, [], `${definition.name} foi registrada como vista; isso não aprova sugestões nem concede transformação automaticamente.`);
}

/** Valida e aplica Forma Selvagem usando somente bestas individuais vistas. */
export function resolveEnterWildShape(
  character: Character,
  command: Extract<Command, { readonly kind: "enter-wild-shape" }>,
  context: WildShapeResolutionContext,
): RuleResult {
  if (command.characterId !== character.id || command.expectedRevision !== character.revision) return reject("Comando de transformação não corresponde à ficha/revisão atual.", "concurrent-modification");
  if (character.transformation) return reject("O personagem já está transformado.", "invalid-context");
  const level = druidLevel(character);
  if (level < 2) return reject("Forma Selvagem exige Druida nível 2.", "invalid-context");
  if (!isSeen(character, command.payload.beastRef)) return reject("Só bestas registradas como vistas podem ser usadas em Forma Selvagem.", "invalid-context");
  const beast = context.definitions.get(command.payload.beastRef.entityId);
  if (!beast || !isBeastDefinition(beast)) return reject("A referência precisa apontar para uma besta individual, não enxame ou outro tipo.", "invalid-context");
  if (beast.scaling !== undefined) return reject("Criaturas com estatísticas escaláveis não podem ser usadas como forma; escolha um bloco estático.", "invalid-context");
  const max = maximumCr(character);
  if (!max || !crAtMost(beast.challengeRating, max)) return reject("O ND da besta excede o limite do Druida/Círculo da Lua ou não é aplicável.", "invalid-context");
  if (beast.hitPoints.average <= 0) return reject("PV máximos da forma precisam ser positivos.", "invalid-context");
  if (!Number.isInteger(context.originalMaximumHitPoints) || context.originalMaximumHitPoints <= 0 || !Number.isFinite(context.originalMaximumHitPoints)) {
    return reject("Máximo de PV original não foi derivado; transformação não iniciada.", "unresolved-rule");
  }
  if (!Array.isArray(context.availableActions)) return reject("Contexto de ações está ausente.", "unresolved-rule");
  if (command.payload.equipmentDisposition === undefined) return needsInput("Escolha o que acontece com o equipamento antes de transformar.", context.requestId);
  const moon = hasMoonCircle(character);
  const actionCost = command.payload.actionCost ?? wildShapeActionCost(character, context.availableActions, "enter");
  if (!actionCost) return reject("A transformação exige uma ação disponível.", "invalid-context");
  if (actionCost !== "action" && actionCost !== "bonus-action") return reject("Custo de ação inválido para Forma Selvagem.", "invalid-context");
  if (actionCost === "bonus-action" && !moon) return reject("Somente o Círculo da Lua pode substituir a ação por uma ação bônus.", "invalid-context");
  if (!context.availableActions.includes(actionCost)) return reject(`A transformação exige ${actionCost === "bonus-action" ? "uma ação bônus" : "uma ação"} disponível.`, "invalid-context");
  if (character.hp.current <= 0) return reject("Personagem com 0 PV não pode iniciar Forma Selvagem.", "invalid-context");
  if (character.deathSaves.failures >= 3) return reject("Personagem morto não pode iniciar Forma Selvagem.", "invalid-context");
  if (character.conditions.some((condition) => {
    const id = String(condition.definitionRef.entityId).toLowerCase();
    return id === "unconscious" || id === "incapacitated" || id.endsWith(".unconscious") || id.endsWith(".incapacitated");
  })) return reject("Personagem inconsciente ou incapacitado não pode iniciar Forma Selvagem.", "invalid-context");

  const resourceIndexes = character.resources.map((resource, index) => String(resource.definitionRef.entityId) === "druid.wild-shape" ? index : -1).filter((index) => index >= 0);
  const unlimited = level >= 20;
  if (!unlimited && resourceIndexes.length !== 1) return reject("Recurso Forma Selvagem ausente ou duplicado; nenhuma carga foi gasta.", "unresolved-rule");
  const resourceIndex = resourceIndexes[0];
  if (!unlimited && character.resources[resourceIndex].spent >= 2) return reject("Os dois usos de Forma Selvagem já foram gastos.", "invalid-context");

  const { transformation: _existing, ...originalSnapshot } = character;
  const transformed: TransformationState = {
    id: context.transformationId,
    formRef: command.payload.beastRef,
    originalSnapshotRef: context.transformationId,
    originalSnapshot: originalSnapshot as CharacterSnapshot,
    originalMaximumHitPoints: context.originalMaximumHitPoints,
    formSnapshot: beast,
    formMaximumHitPoints: beast.hitPoints.average,
    // PV temporários são um único reservatório durante a transformação: os anteriores
    // continuam disponíveis e os adquiridos na forma não desaparecem no retorno.
    formHp: { current: beast.hitPoints.average, temp: character.hp.temp },
    ...(context.gameTime ? { startedAtGameTime: context.gameTime } : {}),
    duration: { kind: "hours", value: Math.floor(level / 2) },
    elapsedMinutes: 0,
    equipmentDisposition: command.payload.equipmentDisposition,
    retainedFeatureIds: level >= 18 ? ["druid.beast-spells" as EntityId] : [],
  };
  const resources = unlimited ? character.resources : character.resources.map((resource, index) => index === resourceIndex ? { ...resource, spent: resource.spent + 1 } : resource);
  const nextState: Character = { ...character, resources, transformation: transformed };
  const effect: Effect = { kind: "transformation-started", targetCharacterId: character.id, sourceRef: SOURCE, payload: { transformation: transformed, actionCost } };
  const crText = beast.challengeRating ? `${beast.challengeRating.numerator}/${beast.challengeRating.denominator}` : "—";
  return success(character, nextState, [effect], `Forma Selvagem: ${beast.name} (ND ${crText}); limite ${max.numerator}/${max.denominator}, duração ${Math.floor(level / 2)}h. Custo: ${actionCost === "bonus-action" ? "ação bônus" : "ação"}. Voo/natação não impedem a forma, mas deslocamentos de voo/natação ficam suprimidos enquanto transformado.`);
}

/** Avança somente tempo de jogo informado; duração expirada encerra sem consumir uma ação. */
export function resolveAdvanceWildShapeTime(
  character: Character,
  command: Extract<Command, { readonly kind: "advance-wild-shape-time" }>,
): RuleResult {
  if (command.characterId !== character.id || command.expectedRevision !== character.revision) return reject("Comando de tempo não corresponde à ficha/revisão atual.", "concurrent-modification");
  const transformation = character.transformation;
  if (!transformation) return reject("O personagem não está transformado.", "invalid-context");
  const minutes = command.payload.minutes;
  const durationHours = transformation.duration.kind === "hours" ? transformation.duration.value : undefined;
  if (!Number.isInteger(minutes) || minutes <= 0 || !Number.isInteger(durationHours) || durationHours! <= 0 ||
    !Number.isSafeInteger(transformation.elapsedMinutes ?? 0) || (transformation.elapsedMinutes ?? 0) < 0 ||
    !transformation.originalSnapshot || "transformation" in transformation.originalSnapshot ||
    transformation.originalSnapshot.id !== character.id || transformation.originalSnapshotRef !== transformation.id ||
    !Number.isInteger(transformation.formMaximumHitPoints) || transformation.formMaximumHitPoints! <= 0 ||
    !Number.isInteger(transformation.originalMaximumHitPoints) || transformation.originalMaximumHitPoints! <= 0 ||
    !isBeastDefinition(transformation.formSnapshot) || transformation.formSnapshot.id !== transformation.formRef.entityId ||
    !validHitPoints(transformation.formHp, transformation.formMaximumHitPoints!)) {
    return reject("Informe minutos de jogo positivos e uma duração válida para a forma.", "invalid-context");
  }
  const elapsedMinutes = (transformation.elapsedMinutes ?? 0) + minutes;
  if (!Number.isSafeInteger(elapsedMinutes)) return reject("O total de tempo avançado excede o limite seguro.", "invalid-context");
  if (elapsedMinutes >= durationHours! * 60) {
    return resolveExitWildShape(character, {
      ...command,
      kind: "exit-wild-shape",
      payload: { reason: "duration-ended" },
    }, { availableActions: [] });
  }
  const nextTransformation = { ...transformation, elapsedMinutes };
  return success(character, { ...character, transformation: nextTransformation }, [], `Tempo de jogo da forma: ${elapsedMinutes} de ${durationHours! * 60} minutos.`);
}

/** Encerra a transformação sem restaurar a ficha inteira: recursos, inventário e outros updates atuais permanecem. */
export function resolveExitWildShape(
  character: Character,
  command: Extract<Command, { readonly kind: "exit-wild-shape" }>,
  context: Pick<WildShapeResolutionContext, "availableActions">,
): RuleResult {
  if (command.characterId !== character.id || command.expectedRevision !== character.revision) return reject("Comando de retorno não corresponde à ficha/revisão atual.", "concurrent-modification");
  const transformation = character.transformation;
  if (!transformation) return reject("O personagem não está transformado.", "invalid-context");
  const durationHours = transformation.duration.kind === "hours" ? transformation.duration.value : undefined;
  if (!transformation.originalSnapshot || "transformation" in transformation.originalSnapshot ||
    transformation.originalSnapshot.id !== character.id || transformation.originalSnapshotRef !== transformation.id ||
    !Number.isInteger(durationHours) || durationHours! <= 0 ||
    !Number.isSafeInteger(transformation.elapsedMinutes ?? 0) || (transformation.elapsedMinutes ?? 0) < 0 ||
    !Number.isInteger(transformation.formMaximumHitPoints) || transformation.formMaximumHitPoints! <= 0 ||
    !Number.isInteger(transformation.originalMaximumHitPoints) || transformation.originalMaximumHitPoints! <= 0 ||
    !isBeastDefinition(transformation.formSnapshot) || transformation.formSnapshot.id !== transformation.formRef.entityId ||
    !validHitPoints(transformation.formHp, transformation.formMaximumHitPoints!)) {
    return reject("Snapshot/estado de forma ausente ou inválido; ficha preservada para revisão.", "invalid-context");
  }
  if (command.payload.reason === "voluntary" && !context.availableActions.includes("bonus-action")) return reject("Retorno voluntário exige uma ação bônus disponível.", "invalid-context");
  const { transformation: _removed, ...withoutTransformation } = character;
  const nextState: Character = { ...withoutTransformation, hp: { ...character.hp, temp: transformation.formHp.temp } };
  const effect: Effect = { kind: "transformation-ended", targetCharacterId: character.id, sourceRef: SOURCE, payload: { transformationId: transformation.id, ...(command.payload.reason === "voluntary" ? { actionCost: "bonus-action" } : {}) } };
  return success(character, nextState, [effect], `Forma Selvagem encerrada (${command.payload.reason}); estado atual de recursos, inventário e demais campos foi preservado.`);
}

function validHitPoints(hp: HitPointsState, maximum: number): boolean {
  return Number.isInteger(hp.current) && hp.current >= 0 && hp.current <= maximum && Number.isInteger(hp.temp) && hp.temp >= 0;
}

/** Lista determinística de formas possíveis, sempre com explicação da regra aplicada. */
export function suggestEligibleBeasts(character: Character, definitions: Iterable<CreatureStatBlock>): readonly EligibleBeastSuggestion[] {
  const max = maximumCr(character);
  if (!max) return [];
  return [...definitions]
    .filter((definition): definition is BeastDefinition => isBeastDefinition(definition) && crAtMost(definition.challengeRating, max) && isSeen(character, { rulesetId: character.rulesetRef.id, entityId: definition.id }))
    .sort((left, right) => {
      const leftCr = left.challengeRating!;
      const rightCr = right.challengeRating!;
      const crCompare = rightCr.numerator / rightCr.denominator - leftCr.numerator / leftCr.denominator;
      return crCompare || left.name.localeCompare(right.name, "pt-BR") || String(left.id).localeCompare(String(right.id));
    })
    .map((beast) => ({ beast, reasons: [sourceRuleBlock("Besta individual registrada como vista."), `ND ${beast.challengeRating!.numerator}/${beast.challengeRating!.denominator} dentro do limite ${max.numerator}/${max.denominator}.`, "Voo/natação não bloqueiam seleção; esses deslocamentos são suprimidos na forma."] }));
}

export function beastReference(character: Character, entityId: EntityId): DefinitionRef {
  return { rulesetId: character.rulesetRef.id, entityId };
}

export function isUnconscious(character: Character): boolean {
  return character.conditions.some((condition) => {
    const id = String(condition.definitionRef.entityId).toLowerCase();
    return id === "unconscious" || id.endsWith(".unconscious");
  }) || character.hp.current <= 0;
}

export function exitReasonFromState(character: Character): WildShapeExitReason | undefined {
  const transformation = character.transformation;
  const durationHours = transformation?.duration.kind === "hours" ? transformation.duration.value : undefined;
  if (Number.isInteger(durationHours) && durationHours! > 0 && Number.isSafeInteger(transformation?.elapsedMinutes ?? 0) &&
    (transformation?.elapsedMinutes ?? 0) >= durationHours! * 60) return "duration-ended";
  if (character.hp.current <= 0) return "zero-hit-points";
  if (character.conditions.some((condition) => {
    const id = String(condition.definitionRef.entityId).toLowerCase();
    return id === "unconscious" || id.endsWith(".unconscious");
  })) return "unconscious";
  return undefined;
}

export type { EquipmentDisposition };
