/**
 * Character, schemaVersion 1. Autoridade: dados/schemas.md ("Character, schemaVersion 1
 * proposto"), dados/estado-personagem.md.
 *
 * Decisão de contrato: os "grupos" da tabela (Envelope/Identidade/Formação/Estado de
 * sessão/Posses/Magia/Ajustes) são categorias de documentação, não sub-objetos aninhados —
 * `Character` é uma interface plana com todos os campos no nível superior, o que casa com o
 * uso natural (`character.hp.current`, `character.classes`, `character.inventory`) e com o
 * armazenamento em um único registro por personagem (08-PERSISTENCIA-LOCAL.md).
 *
 * Este arquivo só referencia definitions por `DefinitionRef`/`EntityId`, nunca pelo tipo
 * completo (`RaceDefinition`, `SpellDefinition`, ...) — mantém a separação imutável/mutável
 * de 09-MODELO-DE-DADOS.md e evita import de `definitions/*` em `character.ts`.
 */

import { type DefinitionRef, type EntityId, type IsoTimestamp, type RulesetRef, type Uuid } from "./ids";
import {
  type Ability,
  type ChoiceSelection,
  type Currency,
  type DiceFaces,
  type Duration,
  type GameTime,
  type RuleModifierTarget,
  type RuleModifierValue,
  type SourceRef,
} from "./primitives";
import { type Revision } from "./versioning";

export const CHARACTER_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Identidade
// ---------------------------------------------------------------------------

export type Alignment =
  | "lawful-good"
  | "neutral-good"
  | "chaotic-good"
  | "lawful-neutral"
  | "true-neutral"
  | "chaotic-neutral"
  | "lawful-evil"
  | "neutral-evil"
  | "chaotic-evil"
  | "unaligned";

// ---------------------------------------------------------------------------
// Formação
// ---------------------------------------------------------------------------

export interface ClassLevel {
  readonly classId: EntityId;
  readonly level: number;
  readonly subclassId?: EntityId;
  readonly choices: readonly ChoiceSelection[];
}

export type AbilityGenerationMethod = "rolled" | "point-buy" | "standard-array" | "manual";

export interface AbilityGeneration {
  readonly method: AbilityGenerationMethod;
  readonly baseScores: Readonly<Record<Ability, number>>;
  /** IDs de AbilityScoreRollResult/DiceRoll quando method === "rolled". */
  readonly rollIds?: readonly Uuid[];
  readonly pointBuyAllocation?: Readonly<Record<Ability, number>>;
}

export type ProgressionHitPointGain =
  | { readonly kind: "first-level-max"; readonly amount: number }
  | { readonly kind: "rolled"; readonly amount: number; readonly rollId: Uuid }
  | { readonly kind: "fixed-average"; readonly amount: number };

export interface ProgressionHistoryEntry {
  readonly id: Uuid;
  readonly classId: EntityId;
  readonly level: number;
  readonly hitPointGain: ProgressionHitPointGain;
  readonly choices: readonly ChoiceSelection[];
  readonly gameTime?: GameTime;
  readonly recordedAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Estado de sessão
// ---------------------------------------------------------------------------

export interface HitPointsState {
  readonly current: number;
  readonly temp: number;
}

export interface DeathSaves {
  readonly successes: number;
  readonly failures: number;
  readonly stable: boolean;
}

export interface HitDiceSpentEntry {
  readonly classId: EntityId;
  readonly hitDie: DiceFaces;
  readonly spent: number;
}

export interface ResourceState {
  readonly id: Uuid;
  readonly definitionRef: DefinitionRef;
  readonly ownerInstanceId: Uuid;
  readonly spent: number;
  readonly resetMarker?: string;
}

export type ConditionOrigin =
  | { readonly kind: "spell"; readonly spellRef: DefinitionRef; readonly casterId?: Uuid }
  | { readonly kind: "feature"; readonly featureRef: DefinitionRef }
  | { readonly kind: "item"; readonly equipmentRef: DefinitionRef }
  | { readonly kind: "environment"; readonly description: string }
  | { readonly kind: "table-decision"; readonly description: string };

export interface ConditionInstance {
  readonly id: Uuid;
  readonly definitionRef: DefinitionRef;
  readonly origin: ConditionOrigin;
  readonly appliedAtGameTime?: GameTime;
  readonly duration?: Duration;
  readonly severity?: number;
  readonly removalContext?: string;
}

export interface ConcentrationState {
  readonly effectId: Uuid;
  readonly sourceRef: DefinitionRef;
  readonly startedAtGameTime?: GameTime;
  readonly duration: Duration;
  readonly pendingSaveIds: readonly Uuid[];
}

export type EquipmentDisposition = "worn" | "dropped" | "stored" | "merged-with-form";

export interface TransformationState {
  readonly id: Uuid;
  readonly formRef: DefinitionRef;
  readonly originalSnapshotRef: Uuid;
  readonly formHp: HitPointsState;
  readonly startedAtGameTime: GameTime;
  readonly duration: Duration;
  readonly equipmentDisposition: EquipmentDisposition;
  readonly retainedFeatureIds: readonly EntityId[];
}

export type PendingResolution =
  | { readonly kind: "input-request"; readonly requestId: Uuid; readonly reason: string }
  | { readonly kind: "pending-cast"; readonly pendingCastId: Uuid }
  | { readonly kind: "unresolved-rule"; readonly description: string; readonly sourceRef?: SourceRef };

// ---------------------------------------------------------------------------
// Posses
// ---------------------------------------------------------------------------

export type InventoryEquippedState = "equipped" | "carried" | "stored";

export interface InventoryItem {
  readonly id: Uuid;
  readonly equipmentRef: DefinitionRef;
  readonly quantity: number;
  readonly equippedState: InventoryEquippedState;
  readonly containerId?: Uuid;
  readonly customName?: string;
  readonly notes: string;
  readonly chargesSpent?: number;
}

// ---------------------------------------------------------------------------
// Magia
// ---------------------------------------------------------------------------

export interface CastingSourceState {
  readonly id: Uuid;
  readonly grantingRef: DefinitionRef;
  readonly ability: Ability;
  readonly knownSpellRefs: readonly DefinitionRef[];
  readonly preparedSpellRefs: readonly DefinitionRef[];
  readonly spellbookRefs: readonly DefinitionRef[];
  readonly resourcePoolIds: readonly Uuid[];
}

export type SpellSlotKind = "spellcasting" | "pact";

export interface SpellSlotState {
  readonly poolId: Uuid;
  readonly kind: SpellSlotKind;
  readonly slotLevel: number;
  readonly spent: number;
}

export interface SpellbookEntry {
  readonly id: Uuid;
  readonly spellRef: DefinitionRef;
  readonly castingSourceId: Uuid;
}

export interface PreparedSelection {
  readonly castingSourceId: Uuid;
  readonly spellRef: DefinitionRef;
  readonly alwaysPrepared: boolean;
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export interface ManualAdjustment {
  readonly id: Uuid;
  readonly target: RuleModifierTarget;
  readonly value: RuleModifierValue;
  readonly reason: string;
  readonly sourceRef?: SourceRef;
  readonly createdAt: IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

export interface CharacterSheetDisplay {
  readonly hideRace?: boolean;
  readonly hideClass?: boolean;
}

export interface Character {
  // Envelope
  readonly id: Uuid;
  readonly schemaVersion: typeof CHARACTER_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly rulesetRef: RulesetRef;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly campaignId?: Uuid;

  // Identidade
  readonly name: string;
  readonly playerName?: string;
  readonly raceRef: DefinitionRef;
  readonly subraceRef?: DefinitionRef;
  readonly backgroundRef: DefinitionRef;
  readonly alignment?: Alignment;
  readonly appearance: string;
  readonly personalityTraits: readonly string[];
  readonly ideals: readonly string[];
  readonly bonds: readonly string[];
  readonly flaws: readonly string[];
  readonly history: string;
  readonly portraitAssetId?: Uuid;
  /** SHA-256 dos bytes do retrato; permite baixar a cópia da nuvem em outro dispositivo. */
  readonly portraitSha256?: string;
  /** Preferências de exibição da ficha (ex.: esconder raça/classe no cabeçalho). */
  readonly sheetDisplay?: CharacterSheetDisplay;

  // Formação
  readonly classes: readonly ClassLevel[];
  readonly abilityGeneration: AbilityGeneration;
  readonly choices: readonly ChoiceSelection[];
  readonly progressionHistory: readonly ProgressionHistoryEntry[];

  // Estado de sessão
  readonly xp: number;
  readonly inspiration: boolean;
  readonly hp: HitPointsState;
  readonly hitDiceSpent: readonly HitDiceSpentEntry[];
  readonly deathSaves: DeathSaves;
  readonly conditions: readonly ConditionInstance[];
  readonly resources: readonly ResourceState[];
  readonly concentration?: ConcentrationState;
  readonly transformation?: TransformationState;
  readonly pendingResolutions: readonly PendingResolution[];

  // Posses
  readonly inventory: readonly InventoryItem[];
  readonly currency: Currency;

  // Magia
  readonly castingSources: readonly CastingSourceState[];
  readonly spellSlots: readonly SpellSlotState[];
  readonly spellbookEntries: readonly SpellbookEntry[];
  readonly preparedSelections: readonly PreparedSelection[];

  // Ajustes
  readonly manualAdjustments: readonly ManualAdjustment[];
}

// ---------------------------------------------------------------------------
// CharacterSummary — para list()
// ---------------------------------------------------------------------------

export interface CharacterClassSummary {
  readonly classId: EntityId;
  readonly level: number;
}

export interface CharacterSummary {
  readonly id: Uuid;
  readonly name: string;
  readonly raceRef: DefinitionRef;
  readonly classSummary: readonly CharacterClassSummary[];
  readonly totalLevel: number;
  readonly campaignId?: Uuid;
  readonly portraitAssetId?: Uuid;
  readonly updatedAt: IsoTimestamp;
  readonly revision: Revision;
}

// ---------------------------------------------------------------------------
// CharacterDraft
// ---------------------------------------------------------------------------

export const CHARACTER_DRAFT_SCHEMA_VERSION = 1;

/**
 * Ciclo de vida draft -> validated -> persisted -> active (dados/estado-personagem.md).
 * Decisão de contrato: CharacterDraft tem schema PRÓPRIO (não é Partial<Character> cru) —
 * usa `CHARACTER_DRAFT_SCHEMA_VERSION` independente, não carrega `revision` (rascunho é
 * documento de trabalho de um único dono, sem concorrência otimista entre agentes; conflito
 * de rascunho é responsabilidade da UI, não deste contrato) e guarda o progresso do wizard
 * (`completedSteps`/`currentStep`) e pendências de validação explícitas, nunca "campo vazio
 * vira zero silenciosamente".
 */
export type CharacterDraftStep =
  | "race"
  | "class"
  | "background"
  | "ability-scores"
  | "equipment"
  | "spells"
  | "details"
  | "review";

export interface CharacterDraftValidationIssue {
  readonly step: CharacterDraftStep;
  readonly field: string;
  readonly message: string;
}

export type CharacterDraftPartial = Partial<
  Pick<
    Character,
    | "name"
    | "playerName"
    | "raceRef"
    | "subraceRef"
    | "backgroundRef"
    | "alignment"
    | "appearance"
    | "personalityTraits"
    | "ideals"
    | "bonds"
    | "flaws"
    | "history"
    | "classes"
    | "abilityGeneration"
    | "choices"
    | "inventory"
    | "currency"
    | "castingSources"
    | "spellSlots"
    | "spellbookEntries"
    | "preparedSelections"
  >
>;

export interface CharacterDraft {
  readonly id: Uuid;
  readonly schemaVersion: typeof CHARACTER_DRAFT_SCHEMA_VERSION;
  readonly rulesetRef: RulesetRef;
  readonly completedSteps: readonly CharacterDraftStep[];
  readonly currentStep: CharacterDraftStep;
  readonly partial: CharacterDraftPartial;
  readonly pendingValidations: readonly CharacterDraftValidationIssue[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
