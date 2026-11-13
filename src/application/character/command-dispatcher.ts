import { type Character, type ConditionInstance } from "@domain/contracts/character";
import { type ClassDefinition, type SubclassDefinition } from "@domain/contracts/definitions/class";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type DiceRoll } from "@domain/contracts/dice";
import { type AppError, err, ok, type Result } from "@domain/contracts/errors";
import { asEntityId, type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import { type Ability, type SourceRef } from "@domain/contracts/primitives";
import {
  type CharacterCommandOutcome,
  type CharacterCommandService,
} from "./commands";
import { type CharacterApplicationService } from "./service";
import { type DamageDefense, resolveCombatCommand } from "@domain/rules/combat";
import { applyCondition, removeCondition } from "@domain/rules/conditions";
import { type RestInput, resolveRest } from "@domain/rules/rest";
import { spendResource, useTireless } from "@domain/rules/resources";
import { castSpell, type SpellResolutionContext } from "@domain/spells";
import { consumeItem } from "@domain/inventory/operations";
import { type Command, type Effect, type RuleError, type RuleResult } from "@domain/contracts/rules";
import { type WildShapeResolutionContext, resolveAdvanceWildShapeTime, resolveEnterWildShape, resolveExitWildShape, resolveMarkBeastSeen, exitReasonFromState } from "@domain/rules/wild-shape";

const SOURCE: SourceRef = {
  sourceId: "phb-ptbr-local-2017" as SourceRef["sourceId"],
  chapter: "Motor de regras",
  printedPage: 0,
  pdfPage: 0,
  section: "Despacho de comandos",
};

export interface CharacterCommandResolutionContext {
  readonly diceResults?: ReadonlyMap<Uuid, DiceRoll>;
  readonly processedCommandIds?: ReadonlySet<string>;
  readonly maximumHitPoints?: number;
  readonly targetArmorClass?: number;
  readonly defense?: DamageDefense;
  readonly damageTypes?: ReadonlyMap<Uuid, import("@domain/contracts/primitives").DamageType>;
  /** Aceita chave pelo estado do recurso ou pela definição, conforme o derivador disponível. */
  readonly resourceCapacities?: ReadonlyMap<string, number>;
  readonly abilityModifiers?: Readonly<Partial<Record<Ability, number>>>;
  readonly resourceDefinitions?: ReadonlyMap<EntityId, ResourceDefinition>;
  readonly spellDefinitions?: ReadonlyMap<EntityId, SpellDefinition>;
  readonly conditionDefinitions?: ReadonlyMap<EntityId, ConditionDefinition>;
  readonly conditionImmunities?: readonly DefinitionRef[];
  readonly targetDistanceCm?: number;
  readonly lineOfSight?: boolean;
  readonly spellAttackHit?: boolean;
  readonly spellSaveSucceeded?: boolean;
  readonly availableActions?: readonly import("@domain/contracts/rules").AvailableAction[];
  readonly canSpeak?: boolean;
  readonly freeHands?: boolean;
  readonly equipmentDefinitions?: ReadonlyMap<EntityId, EquipmentDefinition>;
  readonly classDefinitions?: ReadonlyMap<EntityId, ClassDefinition>;
  readonly subclassDefinitions?: ReadonlyMap<EntityId, SubclassDefinition>;
  readonly rest?: Omit<RestInput, "restKind" | "hitDiceSpent">;
  readonly spell?: Omit<SpellResolutionContext, "processedCommandIds">;
  /** Catálogo, tempo, ações e IDs fornecidos pela composição da aplicação. */
  readonly wildShape?: WildShapeResolutionContext;
}

function rejected(message: string, code: RuleError["code"] = "invalid-command"): RuleResult {
  return { status: "rejected", errors: [{ code, message, sourceRef: SOURCE }], sourceRefs: [SOURCE] };
}

function needsInput(reason: string, requestId: Uuid): RuleResult {
  return { status: "needsInput", requests: [{ id: requestId, reason, validOptions: [] }], sourceRefs: [SOURCE] };
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

function closeTransformationWhenUnconscious(
  command: Command,
  result: RuleResult,
  context: CharacterCommandResolutionContext,
): RuleResult {
  if (result.status !== "success" || !result.nextState.transformation) return result;
  const reason = exitReasonFromState(result.nextState);
  if (!reason) return result;
  const exited = resolveExitWildShape(result.nextState, {
    commandId: command.commandId,
    characterId: result.nextState.id,
    expectedRevision: result.nextState.revision,
    kind: "exit-wild-shape",
    payload: { reason },
  }, { availableActions: context.wildShape?.availableActions ?? context.availableActions ?? [] });
  if (exited.status !== "success") return exited;
  return {
    ...result,
    nextState: exited.nextState,
    effects: [...result.effects, ...exited.effects],
    explanations: [...(result.explanations ?? []), ...(exited.explanations ?? [])],
    sourceRefs: [...new Set([...(result.sourceRefs ?? []), ...(exited.sourceRefs ?? [])])],
  };
}

function capacityFor(character: Character, resourceId: Uuid, context: CharacterCommandResolutionContext): number | undefined {
  const capacities = context.resourceCapacities;
  if (!capacities) return undefined;
  const resource = character.resources.find((entry) => entry.id === resourceId);
  if (!resource) return undefined;
  return capacities.get(String(resource.id)) ?? capacities.get(String(resource.definitionRef.entityId));
}

function classDefinitionFor(command: Extract<Command, { readonly kind: "cast-spell" }>, character: Character, context: CharacterCommandResolutionContext): ClassDefinition | undefined {
  const source = character.castingSources.find((entry) => entry.id === command.payload.castingSourceId);
  return source ? context.classDefinitions?.get(source.grantingRef.entityId) : undefined;
}

function spellRequest(command: Extract<Command, { readonly kind: "cast-spell" }>) {
  return {
    commandId: command.commandId,
    characterId: command.characterId,
    expectedRevision: command.expectedRevision,
    spellRef: command.payload.spellRef,
    castingSourceId: command.payload.castingSourceId,
    mode: command.payload.mode,
    resourcePoolId: command.payload.resourcePoolId,
    resourceStateId: command.payload.resourceStateId,
    featureCastingOption: command.payload.featureCastingOption,
    slotLevel: command.payload.slotLevel,
    targetContext: command.payload.targetContext,
    componentContext: command.payload.componentContext,
    choices: command.payload.choices,
    diceResultIds: command.payload.diceResultIds,
  };
}

function resolveSavingThrow(character: Character, command: Extract<Command, { readonly kind: "resolve-saving-throw" }>, context: CharacterCommandResolutionContext): RuleResult {
  const roll = context.diceResults?.get(command.payload.rollId);
  if (!roll) return needsInput("Informe a rolagem vinculada ao teste de resistência.", command.payload.rollId);
  if (!Number.isInteger(roll.total) || !Number.isFinite(roll.total) || !Number.isInteger(command.payload.dc) || command.payload.dc < 0) return rejected("Rolagem ou CD inválida para o teste de resistência.");
  const passed = roll.total >= command.payload.dc;
  return success(character, character, [], `${passed ? "Sucesso" : "Falha"} no teste de ${command.payload.ability}: ${roll.total} contra CD ${command.payload.dc}.`);
}

function resolveEquipItem(character: Character, command: Extract<Command, { readonly kind: "equip-item" }>, context: CharacterCommandResolutionContext): RuleResult {
  const index = character.inventory.findIndex((item) => item.id === command.payload.inventoryItemId);
  if (index < 0) return rejected(`Item ${command.payload.inventoryItemId} não está no inventário.`, "invalid-context");
  const item = character.inventory[index];
  if (item.equippedState === command.payload.equippedState) return success(character, character, [], "Estado de equipamento já aplicado; comando idempotente.");
  const nextItem = { ...item, equippedState: command.payload.equippedState };
  const nextState = { ...character, inventory: character.inventory.map((entry, entryIndex) => entryIndex === index ? nextItem : entry) };
  const definition = context.equipmentDefinitions?.get(item.equipmentRef.entityId);
  const sourceRef = definition?.sourceRefs[0] ?? item.equipmentRef;
  const effect: Effect = { kind: "inventory-changed", targetCharacterId: character.id, sourceRef, payload: { inventoryItemId: item.id } };
  return { ...success(character, nextState, [effect], `Item ${item.id} alterado para ${command.payload.equippedState}.`), sourceRefs: definition?.sourceRefs ?? [SOURCE] };
}

/**
 * Única entrada pura para o Rules Engine na camada de aplicação. Ela valida o envelope,
 * encaminha ao resolver de cada domínio e nunca persiste nem muta o agregado recebido.
 */
export function resolveCharacterCommand(character: Character, command: Command, context: CharacterCommandResolutionContext = {}): RuleResult {
  if (command.characterId !== character.id) return rejected("Comando não pertence ao personagem recebido.", "invalid-context");
  if (command.expectedRevision !== character.revision) return rejected(`Revisão esperada ${command.expectedRevision} difere da revisão atual ${character.revision}.`, "concurrent-modification");
  if (context.processedCommandIds?.has(String(command.commandId))) return success(character, character, [], "Comando já processado; nenhum efeito foi reaplicado.");

  if (character.transformation && command.kind !== "exit-wild-shape") {
    const forcedReason = exitReasonFromState(character);
    if (forcedReason) {
      return resolveExitWildShape(character, {
        commandId: command.commandId,
        characterId: character.id,
        expectedRevision: character.revision,
        kind: "exit-wild-shape",
        payload: { reason: forcedReason },
      }, { availableActions: context.wildShape?.availableActions ?? context.availableActions ?? [] });
    }
  }

  switch (command.kind) {
    case "apply-damage":
    case "apply-healing":
    case "apply-temp-hp":
    case "resolve-attack":
    case "resolve-death-save":
    case "end-concentration":
      return resolveCombatCommand(character, command, {
        diceResults: context.diceResults,
        targetArmorClass: context.targetArmorClass,
        maximumHitPoints: context.maximumHitPoints,
        defense: context.defense,
        damageTypes: context.damageTypes,
      });
    case "resolve-saving-throw":
      return resolveSavingThrow(character, command, context);
    case "mark-beast-seen":
      return context.wildShape
        ? resolveMarkBeastSeen(character, command, context.wildShape)
        : rejected("Catálogo e tempo de jogo não foram compostos para registrar o avistamento.", "unresolved-rule");
    case "enter-wild-shape":
      return context.wildShape
        ? resolveEnterWildShape(character, command, context.wildShape)
        : rejected("Catálogo, tempo, ações ou PV máximos não foram compostos para Forma Selvagem.", "unresolved-rule");
    case "exit-wild-shape":
      return resolveExitWildShape(character, command, { availableActions: context.wildShape?.availableActions ?? context.availableActions ?? [] });
    case "advance-wild-shape-time":
      return resolveAdvanceWildShapeTime(character, command);
    case "spend-resource": {
      const capacity = capacityFor(character, command.payload.resourceStateId, context);
      if (capacity === undefined) return rejected("Capacidade do recurso não foi derivada para este comando; nenhuma quantidade foi inventada.", "unsupported-ruleset");
      return spendResource(character, { ...command.payload, capacity });
    }
    case "use-tireless": {
      const capacity = capacityFor(character, command.payload.resourceStateId, context);
      if (capacity === undefined) return rejected("Capacidade de Incansável não foi derivada para esta ficha; nenhum recurso foi gasto.", "unsupported-ruleset");
      const resource = character.resources.find((entry) => entry.id === command.payload.resourceStateId);
      const definition = resource ? context.resourceDefinitions?.get(resource.definitionRef.entityId) : undefined;
      if (!resource || !definition || definition.ownerRef.rulesetId !== command.payload.sourceRef.rulesetId ||
        definition.ownerRef.entityId !== command.payload.sourceRef.entityId || definition.ownerRef.entityId !== asEntityId("ranger.tireless")) {
        return rejected("A origem/recurso da feature Incansável não corresponde à definição ativa.", "invalid-context");
      }
      const roll = context.diceResults?.get(command.payload.rollId);
      if (!roll) return needsInput("Informe a rolagem d8 vinculada ao comando Incansável.", command.payload.rollId);
      const wisdomModifier = context.abilityModifiers?.wis;
      if (wisdomModifier === undefined) return rejected("Modificador de Sabedoria não foi derivado; Incansável não foi gasto.", "unresolved-rule");
      return useTireless(character, {
        resourceStateId: command.payload.resourceStateId,
        capacity,
        rollId: command.payload.rollId,
        roll,
        wisdomModifier,
        sourceRef: command.payload.sourceRef,
      });
    }
    case "rest":
      return resolveRest(character, { ...context.rest, ...command.payload, resourceDefinitions: context.resourceDefinitions ? new Map([...context.resourceDefinitions].map(([id, definition]) => [String(id), definition])) : undefined });
    case "cast-spell": {
      const spell = context.spellDefinitions?.get(command.payload.spellRef.entityId);
      if (!spell) return rejected(`Definição da magia ${command.payload.spellRef.entityId} não foi encontrada no rule pack.`, "unsupported-ruleset");
      let request = spellRequest(command);
      let canSpeak = context.spell?.canSpeak ?? context.canSpeak;
      let freeHands = context.spell?.freeHands ?? context.freeHands;
      if (character.transformation) {
        const druidLevel = character.classes.find((entry) => entry.classId === "druid")?.level ?? 0;
        const castingSource = character.castingSources.find((entry) => entry.id === command.payload.castingSourceId);
        if (druidLevel < 18) return rejected("O Druida só pode conjurar magias em Forma Selvagem a partir do nível 18.", "invalid-context");
        if (castingSource?.grantingRef.entityId !== asEntityId("druid") || !spell.classes.includes(asEntityId("druid"))) {
          return rejected("Magias em Forma Selvagem precisam ser magias de Druida concedidas pela fonte Druida.", "invalid-context");
        }
        canSpeak = true;
        freeHands = true;
        const material = spell.components.material;
        if (druidLevel < 20 && material) {
          return rejected("Magias da Besta permitem componentes verbais e somáticos, mas ainda não permitem componentes materiais.", "invalid-context");
        }
        if (druidLevel >= 20 && material && material.costCp === undefined && !material.consumed && material.requiredItemKind === undefined) {
          request = { ...request, componentContext: { ...request.componentContext, materialProvided: true, focusUsed: false } };
        }
      }
      const castResult = castSpell(character, spell, request, {
        ...context.spell,
        classId: context.spell?.classId ?? character.castingSources.find((entry) => entry.id === command.payload.castingSourceId)?.spellListClassId,
        classDefinition: context.spell?.classDefinition ?? classDefinitionFor(command, character, context),
        subclassDefinitions: context.spell?.subclassDefinitions ?? context.subclassDefinitions,
        availableActions: context.spell?.availableActions ?? context.availableActions,
        canSpeak,
        freeHands,
        // A entrada canônica não pode cair no adaptador legado: efeitos de
        // magia exigem um mapa (mesmo vazio) para que a ausência de rolagens
        // resulte em `needsInput`, sem gasto parcial.
        diceResults: context.diceResults ?? new Map(),
        casterAbilityModifier: context.spell?.casterAbilityModifier,
        conditionDefinitions: context.conditionDefinitions,
        processedCommandIds: context.processedCommandIds as ReadonlySet<import("@domain/contracts/ids").CommandId> | undefined,
        maximumHitPoints: context.maximumHitPoints,
        targetDistanceCm: context.targetDistanceCm,
        lineOfSight: context.lineOfSight,
        spellAttackHit: context.spellAttackHit,
        spellSaveSucceeded: context.spellSaveSucceeded,
        defense: context.defense,
        resourceCapacities: new Map(character.resources.flatMap((resource) => {
          const capacity = capacityFor(character, resource.id, context);
          return capacity === undefined ? [] : [[String(resource.id), capacity] as const];
        })),
      });
      return closeTransformationWhenUnconscious(command, castResult, context);
    }
    case "consume-item": {
      const equipment = context.equipmentDefinitions?.get(command.payload.equipmentRef.entityId);
      if (!equipment) return rejected(`Definição do item ${command.payload.equipmentRef.entityId} não foi encontrada no rule pack.`, "unsupported-ruleset");
      return consumeItem(character, command, equipment, { processedCommandIds: context.processedCommandIds });
    }
    case "apply-condition": {
      const instance: ConditionInstance = command.payload.conditionInstance;
      const definition = context.conditionDefinitions?.get(instance.definitionRef.entityId);
      if (!definition) return rejected(`Definição da condição ${instance.definitionRef.entityId} não foi encontrada no rule pack.`, "unsupported-ruleset");
      const applied = applyCondition(character, instance, definition, { conditionImmunities: context.conditionImmunities });
      return closeTransformationWhenUnconscious(command, applied, context);
    }
    case "remove-condition":
      return removeCondition(character, command.payload.conditionInstanceId, command.payload.sourceRef);
    case "equip-item":
      return resolveEquipItem(character, command, context);
    case "update-choices":
    case "level-up":
      return rejected(`Comando ${command.kind} exige um resolver de progressão ligado ao catálogo de escolhas; nenhum estado foi alterado.`, "unsupported-ruleset");
  }
}

export interface CharacterCommandDispatcherOptions {
  readonly characterService: CharacterApplicationService;
  readonly context?: CharacterCommandResolutionContext;
}

/** Resolve e, apenas em sucesso, persiste pelo boundary transacional já existente. */
export async function dispatchCharacterCommand(
  options: CharacterCommandDispatcherOptions,
  command: Command,
  context: CharacterCommandResolutionContext = options.context ?? {},
  rolls: readonly DiceRoll[] = [],
): Promise<Result<CharacterCommandOutcome, AppError>> {
  const character = options.characterService.store.getSnapshot().value;
  if (!character) return err({ code: "validation-error", field: "characterId", message: "Nenhum personagem ativo para executar o comando." });
  const result = resolveCharacterCommand(character, command, context);
  if (result.status !== "success") return ok({ result });
  const commands: CharacterCommandService | undefined = options.characterService.commands;
  if (!commands) return err({ code: "validation-error", field: "commands", message: "A composição não conectou a persistência de comandos." });
  return commands.commit(command, result, rolls);
}

export function createCharacterCommandDispatcher(options: CharacterCommandDispatcherOptions): (command: Command, context?: CharacterCommandResolutionContext, rolls?: readonly DiceRoll[]) => Promise<Result<CharacterCommandOutcome, AppError>> {
  return (command, context, rolls) => dispatchCharacterCommand(options, command, context ?? options.context ?? {}, rolls ?? []);
}
