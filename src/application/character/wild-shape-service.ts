import type { CreatureService } from "@application/campaign/creature-service";
import type { IdGenerator } from "@application/ports/id-generator";
import type { Character, BeastSightingState, EquipmentDisposition } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { AccountId, DefinitionRef, EntityId, Uuid } from "@domain/contracts/ids";
import type { AvailableAction, Command } from "@domain/contracts/rules";
import type { GameTime } from "@domain/contracts/primitives";
import type { CreatureStatBlock } from "@domain/creatures";
import { composeCharacterRuleContent, composeOptionalRuleContent } from "@domain/character/creation/optional-rules";
import { deriveCharacter } from "@domain/rules/derived/derive-character";
import { suggestEligibleBeasts, wildShapeActionCost, type EligibleBeastSuggestion } from "@domain/rules/wild-shape";
import { dispatchCharacterCommand, type CharacterCommandResolutionContext } from "./command-dispatcher";
import type { CharacterCommandOutcome } from "./commands";
import type { CharacterApplicationService } from "./service";

export interface WildShapeDispatchInput {
  readonly characterId: Uuid;
  readonly expectedRevision: Character["revision"];
  readonly command: Command;
  readonly gameTime?: GameTime;
  readonly availableActions?: readonly AvailableAction[];
}

export interface EnterWildShapeInput {
  readonly characterId: Uuid;
  readonly expectedRevision: Character["revision"];
  readonly beastRef: DefinitionRef;
  readonly equipmentDisposition?: EquipmentDisposition;
  readonly actionCost?: "action" | "bonus-action";
  readonly gameTime?: GameTime;
  readonly availableActions?: readonly AvailableAction[];
}

export interface ExitWildShapeInput {
  readonly characterId: Uuid;
  readonly expectedRevision: Character["revision"];
  readonly gameTime?: GameTime;
  readonly availableActions?: readonly AvailableAction[];
}

export interface MarkBeastSeenInput {
  readonly characterId: Uuid;
  readonly expectedRevision: Character["revision"];
  readonly beastRef: DefinitionRef;
  readonly gameTime?: GameTime;
}

export interface AdvanceWildShapeTimeInput {
  readonly characterId: Uuid;
  readonly expectedRevision: Character["revision"];
  readonly minutes: number;
}

export interface WildShapeApplicationOptions {
  readonly characterService: CharacterApplicationService;
  readonly creatureService: CreatureService;
  readonly baseRulePack: RulePack;
  readonly idGenerator: IdGenerator;
  readonly currentAccountId?: () => AccountId | undefined;
  readonly gameTimeFor?: (character: Character) => GameTime;
  readonly availableActionsFor?: (character: Character) => readonly AvailableAction[];
}

export interface WildShapeApplicationService {
  listCatalog(options?: { readonly selectedSupplementIds?: readonly EntityId[] }): Result<readonly CreatureStatBlock[], AppError>;
  listCampaignCatalog(characterId: Uuid): Promise<Result<readonly CreatureStatBlock[], AppError>>;
  listEligibleBeasts(characterId: Uuid): Promise<Result<readonly EligibleBeastSuggestion[], AppError>>;
  actionCost(characterId: Uuid, availableActions: readonly AvailableAction[], operation: "enter" | "exit"): Result<"action" | "bonus-action" | undefined, AppError>;
  listSightings(characterId: Uuid): Result<readonly BeastSightingState[], AppError>;
  markSeen(input: MarkBeastSeenInput): Promise<Result<CharacterCommandOutcome, AppError>>;
  enter(input: EnterWildShapeInput): Promise<Result<CharacterCommandOutcome, AppError>>;
  exit(input: ExitWildShapeInput): Promise<Result<CharacterCommandOutcome, AppError>>;
  advanceTime(input: AdvanceWildShapeTimeInput): Promise<Result<CharacterCommandOutcome, AppError>>;
  effective(character: Character): Character;
  dispatchCommand(input: WildShapeDispatchInput): Promise<Result<CharacterCommandOutcome, AppError>>;
}

export interface CreatureApplicationRuntime {
  /** Conteúdo publicado disponível; opt-in de regra é aplicado por listCatalog/por personagem. */
  readonly definitions: readonly CreatureStatBlock[];
  readonly service: CreatureService;
  readonly wildShape: WildShapeApplicationService;
}

const OUT_OF_COMBAT_ACTIONS: readonly AvailableAction[] = ["action", "bonus-action", "reaction", "free"];

function definitionsFrom(pack: RulePack): ReadonlyMap<EntityId, CreatureStatBlock> {
  return pack.creatures ?? new Map<EntityId, CreatureStatBlock>();
}

function notActive(characterId: Uuid): Result<never, AppError> {
  return err(appError.validation("characterId", `A ficha ativa não corresponde a ${characterId}.`));
}

async function campaignDefinitions(character: Character, service: CreatureService, currentAccountId?: () => AccountId | undefined): Promise<Result<readonly CreatureStatBlock[], AppError>> {
  if (!character.campaignId) return ok([]);
  const accountId = (character.ownerUid ?? currentAccountId?.() ?? "local") as AccountId;
  const records = await service.listCreatures(character.campaignId);
  if (!records.ok) return records;
  // O registro aprovado fica visível ao proponente por reveal do registro. A lista
  // sincronizada de proposals permanece própria para jogadores; não se consulta
  // scope=all no cliente para descobrir conteúdo aprovado de outras contas.
  const explicitlyRevealed = records.value
    .filter((record) => record.statBlock && record.reveals.some((reveal) => reveal.accountId === accountId && reveal.fields.includes("statBlock")))
    .map((record) => record.statBlock!);
  const byId = new Map<EntityId, CreatureStatBlock>();
  for (const definition of explicitlyRevealed) {
    const existing = byId.get(definition.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(definition)) {
      return err(appError.validation("creatureCatalog", `ID de criatura de campanha duplicado: ${definition.id}.`));
    }
    byId.set(definition.id, definition);
  }
  return ok([...byId.values()]);
}

async function resolveCommandContext(
  character: Character,
  options: WildShapeApplicationOptions,
  transformationId: Uuid,
  requestId: Uuid,
  includeCampaignCreatures: boolean,
  overrides: Pick<WildShapeDispatchInput, "gameTime" | "availableActions"> = {},
): Promise<Result<CharacterCommandResolutionContext, AppError>> {
  const gameTime = overrides.gameTime ?? options.gameTimeFor?.(character);
  const availableActions = overrides.availableActions ?? options.availableActionsFor?.(character) ?? OUT_OF_COMBAT_ACTIONS;
  const derived = deriveCharacter(character, options.baseRulePack, {
    ...(gameTime ? { gameTime } : {}),
    availableActions,
    tablePolicies: [],
  });
  if (!derived.ok) return derived;
  const resourceCapacities = new Map<string, number>();
  for (const capacity of derived.value.resourceCapacities) {
    const state = character.resources.find((entry) => entry.definitionRef.entityId === capacity.definitionRef.entityId);
    if (state) resourceCapacities.set(String(state.id), capacity.capacity.value);
    resourceCapacities.set(String(capacity.definitionRef.entityId), capacity.capacity.value);
  }
  const composed = composeOptionalRuleContent(options.baseRulePack, character.selectedSupplementIds ?? [], character.optionalRuleSelections ?? []);
  if (!composed.ok) return composed;
  const activePack = composed.value;
  const definitions = new Map(definitionsFrom(activePack));
  if (includeCampaignCreatures) {
    const campaign = await campaignDefinitions(character, options.creatureService, options.currentAccountId);
    if (!campaign.ok) return campaign;
    for (const definition of campaign.value) {
      if (definitions.has(definition.id) && JSON.stringify(definitions.get(definition.id)) !== JSON.stringify(definition)) {
        return err(appError.validation("creatureCatalog", `A criatura de campanha colide com o catálogo publicado: ${definition.id}.`));
      }
      definitions.set(definition.id, definition);
    }
  }
  const wildShape = {
    definitions,
    gameTime,
    availableActions,
    transformationId,
    requestId,
    originalMaximumHitPoints: derived.value.hitPointsMax.value,
  };
  return ok({
    maximumHitPoints: derived.value.hitPointsMax.value,
    resourceCapacities,
    resourceDefinitions: activePack.resources,
    spellDefinitions: activePack.spells,
    conditionDefinitions: activePack.conditions,
    equipmentDefinitions: activePack.equipment,
    classDefinitions: activePack.classes,
    conditionImmunities: derived.value.resistanceProfile.conditionImmunities,
    availableActions,
    rest: { resourceDefinitions: new Map([...activePack.resources].map(([id, definition]) => [String(id), definition])) },
    spell: { resourceCapacities },
    wildShape,
  });
}

export function createWildShapeApplicationService(options: WildShapeApplicationOptions): WildShapeApplicationService {
  const dispatch = async (input: WildShapeDispatchInput): Promise<Result<CharacterCommandOutcome, AppError>> => {
    const character = options.characterService.store.getSnapshot().value;
    if (!character) return err(appError.validation("characterId", "Nenhum personagem ativo para executar o comando."));
    if (character.id !== input.characterId) return notActive(input.characterId);
    const needsCreatureCatalog = input.command.kind === "mark-beast-seen" || input.command.kind === "enter-wild-shape";
    const context = await resolveCommandContext(character, options, options.idGenerator.uuid(), options.idGenerator.uuid(), needsCreatureCatalog, input);
    if (!context.ok) return context;
    return dispatchCharacterCommand({ characterService: options.characterService }, input.command, context.value);
  };

  return {
    listCatalog(input = {}) {
      const selected = input.selectedSupplementIds ?? [];
      const composed = composeOptionalRuleContent(options.baseRulePack, selected, []);
      if (!composed.ok) return composed;
      return ok([...(composed.value.creatures ?? new Map()).values()]);
    },
    async listCampaignCatalog(characterId) {
      const character = options.characterService.store.getSnapshot().value;
      if (!character || character.id !== characterId) return notActive(characterId);
      return campaignDefinitions(character, options.creatureService, options.currentAccountId);
    },
    async listEligibleBeasts(characterId) {
      const character = options.characterService.store.getSnapshot().value;
      if (!character || character.id !== characterId) return notActive(characterId);
      const composed = composeCharacterRuleContent(options.baseRulePack, character);
      if (!composed.ok) return composed;
      const campaign = await campaignDefinitions(character, options.creatureService, options.currentAccountId);
      if (!campaign.ok) return campaign;
      const definitions = new Map(composed.value.creatures ?? []);
      for (const definition of campaign.value) {
        if (definitions.has(definition.id) && JSON.stringify(definitions.get(definition.id)) !== JSON.stringify(definition)) {
          return err(appError.validation("creatureCatalog", `A criatura de campanha colide com o catálogo publicado: ${definition.id}.`));
        }
        definitions.set(definition.id, definition);
      }
      return ok(suggestEligibleBeasts(character, definitions.values()));
    },
    actionCost(characterId, availableActions, operation) {
      const character = options.characterService.store.getSnapshot().value;
      if (!character || character.id !== characterId) return notActive(characterId);
      return ok(wildShapeActionCost(character, availableActions, operation));
    },
    listSightings(characterId) {
      const character = options.characterService.store.getSnapshot().value;
      if (!character || character.id !== characterId) return notActive(characterId);
      return ok(character.beastSightings ?? []);
    },
    markSeen(input) {
      const command: Command = {
        commandId: options.idGenerator.commandId(), characterId: input.characterId, expectedRevision: input.expectedRevision,
        kind: "mark-beast-seen", payload: { beastRef: input.beastRef },
      };
      return dispatch({ characterId: input.characterId, expectedRevision: input.expectedRevision, command, gameTime: input.gameTime });
    },
    enter(input) {
      const command: Command = {
        commandId: options.idGenerator.commandId(), characterId: input.characterId, expectedRevision: input.expectedRevision,
        kind: "enter-wild-shape", payload: { beastRef: input.beastRef, ...(input.equipmentDisposition === undefined ? {} : { equipmentDisposition: input.equipmentDisposition }), ...(input.actionCost === undefined ? {} : { actionCost: input.actionCost }) },
      };
      return dispatch({ characterId: input.characterId, expectedRevision: input.expectedRevision, command, gameTime: input.gameTime, availableActions: input.availableActions });
    },
    exit(input) {
      const command: Command = {
        commandId: options.idGenerator.commandId(), characterId: input.characterId, expectedRevision: input.expectedRevision,
        kind: "exit-wild-shape", payload: { reason: "voluntary" },
      };
      return dispatch({ characterId: input.characterId, expectedRevision: input.expectedRevision, command, availableActions: input.availableActions });
    },
    advanceTime(input) {
      const command: Command = {
        commandId: options.idGenerator.commandId(), characterId: input.characterId, expectedRevision: input.expectedRevision,
        kind: "advance-wild-shape-time", payload: { minutes: input.minutes },
      };
      return dispatch({ characterId: input.characterId, expectedRevision: input.expectedRevision, command });
    },
    effective(character) {
      const transformation = character.transformation;
      if (!transformation) return character;
      return {
        ...character,
        hp: transformation.formHp,
      };
    },
    dispatchCommand: dispatch,
  };
}

export function createCreatureApplicationRuntime(input: {
  readonly service: CreatureService;
  readonly wildShape: WildShapeApplicationService;
  readonly baseRulePack: RulePack;
}): CreatureApplicationRuntime {
  const allSupplementIds = [...(input.baseRulePack.optionalRulePacks?.keys() ?? [])];
  const all = composeOptionalRuleContent(input.baseRulePack, allSupplementIds, []);
  const definitions = all.ok
    ? [...(all.value.creatures ?? new Map()).values()]
    : [...definitionsFrom(input.baseRulePack).values()];
  return { definitions, service: input.service, wildShape: input.wildShape };
}
