/**
 * Rules Engine — Command, RuleContext, RuleResult, Effect, InputRequest, RuleError,
 * CommandReceipt. Autoridade: 10-RULES-ENGINE.md, dados/schemas.md.
 *
 * Decisão de contrato: `Command.payload` vincula rolagens já realizadas por ID
 * (`diceResultIds: readonly Uuid[]`), nunca por objeto `DiceRoll` embutido — "consumo de
 * aleatoriedade ocorre no Dice Engine antes da resolução, com resultados vinculados ao
 * comando" (10-RULES-ENGINE.md). O Rules Engine resolve os IDs consultando o histórico de
 * rolagens (fora deste contrato); isso evita rules.ts depender de dice.ts.
 *
 * Decisão de contrato: `CastSpellPayload` reaproveita os campos de `CastRequest`
 * (definitions/spell.ts) exceto commandId/characterId/expectedRevision, que já vêm do
 * envelope do Command — evita duplicar a mesma informação em dois lugares.
 */

import { type CommandId, type DefinitionRef, type EntityId, type IsoTimestamp, type Uuid } from "./ids";
import {
  type Ability,
  type ChoiceSelection,
  type DamageType,
  type GameTime,
  type SourceRef,
} from "./primitives";
import { type Revision } from "./versioning";
import {
  type Character,
  type ConcentrationState,
  type ConditionInstance,
  type DeathSaves,
  type InventoryEquippedState,
  type ProgressionHitPointGain,
  type TransformationState,
} from "./character";
import { type Explanation } from "./derived";
import { type QuestStatus } from "./campaign";
import { type CastMode, type CastPreview, type SpellComponentContext, type SpellTargetContext } from "./definitions/spell";

// ---------------------------------------------------------------------------
// RuleContext
// ---------------------------------------------------------------------------

export type AvailableAction = "action" | "bonus-action" | "reaction" | "free";

/** "table-decision" cobre política de mesa/opcional habilitada explicitamente; nunca inferida. */
export type TablePolicy =
  | { readonly kind: "allow-optional-rule"; readonly ruleId: string }
  | { readonly kind: "table-decision"; readonly pendencyId: string; readonly decision: string };

export interface RuleContext {
  readonly gameTime: GameTime;
  readonly availableActions: readonly AvailableAction[];
  readonly targetContext?: SpellTargetContext;
  readonly tablePolicies: readonly TablePolicy[];
}

// ---------------------------------------------------------------------------
// Command — payloads tipados por kind
// ---------------------------------------------------------------------------

interface CommandEnvelope<Kind extends string, Payload> {
  readonly commandId: CommandId;
  readonly characterId: Uuid;
  readonly expectedRevision: Revision;
  readonly kind: Kind;
  readonly payload: Payload;
}

export interface ApplyDamagePayload {
  readonly amount: number;
  readonly damageType: DamageType;
  readonly diceResultIds: readonly Uuid[];
  readonly sourceRef?: DefinitionRef;
}

export interface ApplyHealingPayload {
  readonly amount: number;
  readonly diceResultIds: readonly Uuid[];
  readonly sourceRef?: DefinitionRef;
}

export interface ApplyTempHpPayload {
  readonly amount: number;
  readonly diceResultIds: readonly Uuid[];
  readonly sourceRef?: DefinitionRef;
  readonly stacking: "highest-wins" | "replace";
}

export interface SpendResourcePayload {
  readonly resourceStateId: Uuid;
  readonly amount: number;
}

export interface ResolveAttackPayload {
  readonly attackSourceRef: DefinitionRef;
  readonly targetId?: Uuid;
  readonly attackRollId: Uuid;
  readonly damageRollIds: readonly Uuid[];
}

/** Mesmos campos de CastRequest (spell.ts), sem commandId/characterId/expectedRevision. */
export interface CastSpellPayload {
  readonly spellRef: DefinitionRef;
  readonly castingSourceId: Uuid;
  readonly mode: CastMode;
  readonly resourcePoolId?: Uuid;
  readonly slotLevel?: number;
  readonly targetContext: SpellTargetContext;
  readonly componentContext: SpellComponentContext;
  readonly choices: readonly ChoiceSelection[];
  readonly diceResultIds: readonly Uuid[];
}

export interface EndConcentrationPayload {
  readonly reason: "voluntary" | "replaced" | "failed-save" | "incapacitated";
  readonly savingThrowRollId?: Uuid;
}

export interface ResolveSavingThrowPayload {
  readonly ability: Ability;
  readonly rollId: Uuid;
  readonly dc: number;
  readonly sourceRef?: DefinitionRef;
}

export interface ResolveDeathSavePayload {
  readonly rollId: Uuid;
}

export type RestKind = "short" | "long";

export interface HitDiceSpendRequest {
  readonly classId: EntityId;
  readonly count: number;
  readonly rollIds: readonly Uuid[];
}

export interface RestPayload {
  readonly restKind: RestKind;
  readonly hitDiceSpent?: readonly HitDiceSpendRequest[];
}

export interface EquipItemPayload {
  readonly inventoryItemId: Uuid;
  readonly equippedState: InventoryEquippedState;
}

export interface ConsumeItemPayload {
  readonly inventoryItemId: Uuid;
  readonly equipmentRef: DefinitionRef;
}

export interface ApplyConditionPayload {
  readonly conditionInstance: ConditionInstance;
}

export interface RemoveConditionPayload {
  readonly conditionInstanceId: Uuid;
  readonly sourceRef?: DefinitionRef;
}

export interface UpdateChoicesPayload {
  readonly selections: readonly ChoiceSelection[];
}

export interface LevelUpPayload {
  readonly classId: EntityId;
  readonly subclassId?: EntityId;
  readonly hitPointGain: ProgressionHitPointGain;
  readonly choices: readonly ChoiceSelection[];
}

export type Command =
  | CommandEnvelope<"apply-damage", ApplyDamagePayload>
  | CommandEnvelope<"apply-healing", ApplyHealingPayload>
  | CommandEnvelope<"apply-temp-hp", ApplyTempHpPayload>
  | CommandEnvelope<"spend-resource", SpendResourcePayload>
  | CommandEnvelope<"resolve-attack", ResolveAttackPayload>
  | CommandEnvelope<"cast-spell", CastSpellPayload>
  | CommandEnvelope<"end-concentration", EndConcentrationPayload>
  | CommandEnvelope<"resolve-saving-throw", ResolveSavingThrowPayload>
  | CommandEnvelope<"resolve-death-save", ResolveDeathSavePayload>
  | CommandEnvelope<"rest", RestPayload>
  | CommandEnvelope<"equip-item", EquipItemPayload>
  | CommandEnvelope<"consume-item", ConsumeItemPayload>
  | CommandEnvelope<"apply-condition", ApplyConditionPayload>
  | CommandEnvelope<"remove-condition", RemoveConditionPayload>
  | CommandEnvelope<"update-choices", UpdateChoicesPayload>
  | CommandEnvelope<"level-up", LevelUpPayload>;

// ---------------------------------------------------------------------------
// CampaignCommand — estrutura equivalente com campaignId
// ---------------------------------------------------------------------------

interface CampaignCommandEnvelope<Kind extends string, Payload> {
  readonly commandId: CommandId;
  readonly campaignId: Uuid;
  readonly expectedRevision: Revision;
  readonly kind: Kind;
  readonly payload: Payload;
}

export interface AddJournalEntryPayload {
  readonly title: string;
  readonly body: string;
  readonly sessionNumber?: number;
  readonly gameDate?: GameTime;
  readonly linkedEntityIds: readonly Uuid[];
  readonly tags: readonly string[];
}

export interface UpdateJournalEntryPayload {
  readonly journalEntryId: Uuid;
  readonly title?: string;
  readonly body?: string;
  readonly tags?: readonly string[];
}

export interface AddMapPinPayload {
  readonly mapId: Uuid;
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly label: string;
  readonly locationId?: Uuid;
  readonly iconToken: string;
}

export interface AddQuestPayload {
  readonly title: string;
  readonly description: string;
  readonly status: QuestStatus;
}

export interface UpdateQuestStatusPayload {
  readonly questId: Uuid;
  readonly status: QuestStatus;
}

export interface AddNpcPayload {
  readonly name: string;
  readonly description: string;
  readonly linkedEntityIds: readonly Uuid[];
}

export type CampaignCommand =
  | CampaignCommandEnvelope<"add-journal-entry", AddJournalEntryPayload>
  | CampaignCommandEnvelope<"update-journal-entry", UpdateJournalEntryPayload>
  | CampaignCommandEnvelope<"add-map-pin", AddMapPinPayload>
  | CampaignCommandEnvelope<"add-quest", AddQuestPayload>
  | CampaignCommandEnvelope<"update-quest-status", UpdateQuestStatusPayload>
  | CampaignCommandEnvelope<"add-npc", AddNpcPayload>;

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

interface EffectEnvelope<Kind extends string, Payload> {
  readonly kind: Kind;
  readonly payload: Payload;
  readonly sourceRef: DefinitionRef | SourceRef;
  readonly targetCharacterId: Uuid;
}

export type Effect =
  | EffectEnvelope<"hp-changed", { readonly delta: number; readonly newCurrent: number; readonly newTemp: number }>
  | EffectEnvelope<"resource-spent", { readonly resourceStateId: Uuid; readonly amount: number; readonly newSpent: number }>
  | EffectEnvelope<"condition-applied", { readonly conditionInstance: ConditionInstance }>
  | EffectEnvelope<"condition-removed", { readonly conditionInstanceId: Uuid }>
  | EffectEnvelope<"concentration-started", { readonly concentration: ConcentrationState }>
  | EffectEnvelope<"concentration-ended", { readonly reason: string }>
  | EffectEnvelope<"spell-slot-spent", { readonly poolId: Uuid; readonly slotLevel: number; readonly newSpent: number }>
  | EffectEnvelope<"inventory-changed", { readonly inventoryItemId: Uuid }>
  | EffectEnvelope<"choice-recorded", { readonly selection: ChoiceSelection }>
  | EffectEnvelope<"level-changed", { readonly classId: EntityId; readonly newLevel: number }>
  | EffectEnvelope<"death-save-recorded", { readonly deathSaves: DeathSaves }>
  | EffectEnvelope<"transformation-started", { readonly transformation: TransformationState }>
  | EffectEnvelope<"transformation-ended", { readonly transformationId: Uuid }>;

// ---------------------------------------------------------------------------
// InputRequest
// ---------------------------------------------------------------------------

export type InputRequestOption =
  | { readonly kind: "definition-ref"; readonly ref: DefinitionRef }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "number"; readonly value: number };

export interface InputRequest {
  readonly id: Uuid;
  readonly reason: string;
  readonly validOptions: readonly InputRequestOption[];
  readonly pendingSince?: IsoTimestamp;
}

/** Preview genérico para needsInput; "cast-spell" reaproveita CastPreview (schema-magia.md). */
export type RuleResultPreview =
  | { readonly kind: "cast-spell"; readonly castPreview: CastPreview }
  | { readonly kind: "generic"; readonly description: string; readonly estimatedEffects: readonly Effect[] };

// ---------------------------------------------------------------------------
// RuleError
// ---------------------------------------------------------------------------

export type RuleErrorCode =
  | "invalid-context"
  | "insufficient-resource"
  | "invariant-violation"
  | "unsupported-ruleset"
  | "unresolved-rule"
  | "concurrent-modification"
  | "invalid-command";

export interface RuleError {
  readonly code: RuleErrorCode;
  readonly message: string;
  readonly field?: string;
  readonly sourceRef?: SourceRef | DefinitionRef;
}

// ---------------------------------------------------------------------------
// RuleResult — união discriminada por `status`
// ---------------------------------------------------------------------------

export interface RuleResultSuccess {
  readonly status: "success";
  readonly nextState: Character;
  readonly effects: readonly Effect[];
  readonly explanations: readonly Explanation<unknown>[];
  readonly sourceRefs: readonly SourceRef[];
}

/** needsInput NUNCA contém nextState aplicável (10-RULES-ENGINE.md). */
export interface RuleResultNeedsInput {
  readonly status: "needsInput";
  readonly requests: readonly InputRequest[];
  readonly preview?: RuleResultPreview;
  readonly sourceRefs: readonly SourceRef[];
}

/** rejected NUNCA contém nextState aplicável nem altera estado. */
export interface RuleResultRejected {
  readonly status: "rejected";
  readonly errors: readonly RuleError[];
  readonly sourceRefs: readonly SourceRef[];
}

export type RuleResult = RuleResultSuccess | RuleResultNeedsInput | RuleResultRejected;

// ---------------------------------------------------------------------------
// CommandReceipt — idempotência
// ---------------------------------------------------------------------------

export interface CommandReceipt {
  readonly commandId: CommandId;
  readonly characterId: Uuid;
  readonly resultStatus: "success" | "needsInput" | "rejected";
  /** Presente somente quando resultStatus === "success". */
  readonly resultingRevision?: Revision;
  readonly recordedAt: IsoTimestamp;
  readonly diceRollIds: readonly Uuid[];
}
