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
import { type CreatureStatBlock } from "@domain/creatures";

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
export type TransformationExitReason = "voluntary" | "duration-ended" | "unconscious" | "zero-hit-points" | "died" | "manual-table-decision";

export interface TransformationState {
  readonly id: Uuid;
  readonly formRef: DefinitionRef;
  /** Referência legada mantida para importações; novas formas também guardam o snapshot inline. */
  readonly originalSnapshotRef: Uuid;
  /** Snapshot completo sem a propriedade transformation, evitando recursão/cadeias de snapshots. */
  readonly originalSnapshot?: CharacterSnapshot;
  readonly originalMaximumHitPoints?: number;
  /** Cópia validada do bloco da forma ativa, para dano/derivação após reload do pack. */
  readonly formSnapshot?: CreatureStatBlock;
  readonly formMaximumHitPoints?: number;
  readonly formHp: HitPointsState;
  readonly startedAtGameTime?: GameTime;
  readonly duration: Duration;
  /** Minutos de jogo explicitamente avançados durante a forma; não é tempo real. */
  readonly elapsedMinutes?: number;
  readonly equipmentDisposition: EquipmentDisposition;
  readonly retainedFeatureIds: readonly EntityId[];
}

export interface BeastSightingState {
  readonly beastRef: DefinitionRef;
  readonly firstSeenAt?: GameTime;
}

/** Seleção persistida de conteúdo de classe opcional sem ativar automaticamente suas opções. */
export interface OptionalRuleSelection {
  readonly supplementId: EntityId;
  readonly optionId: EntityId;
  readonly selectedFeatureRefs: readonly DefinitionRef[];
  readonly selectedSpellRefs?: readonly DefinitionRef[];
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
  /** Origem racial mantém lista explícita; não herda acesso à lista da classe associada. */
  readonly sourceKind?: "class" | "subclass" | "race" | "feature";
  readonly ability: Ability;
  readonly knownSpellRefs: readonly DefinitionRef[];
  readonly preparedSpellRefs: readonly DefinitionRef[];
  readonly spellbookRefs: readonly DefinitionRef[];
  readonly resourcePoolIds: readonly Uuid[];
  /** Recurso de conjuração por descanso de uma fonte com um único pool (legado). */
  readonly featureResourceId?: Uuid;
  /** Mantém a conjuração bloqueada quando um pool declarado não pôde ser composto/restaurado. */
  readonly requiresFeatureResource?: boolean;
  /** Permite vincular espaços de classe à origem racial ou feature que autoriza seu uso. */
  readonly usesSpellSlots?: boolean;
  /** Lista de classe que valida os feitiços de uma fonte racial/feature, sem trocar seu dono. */
  readonly spellListClassId?: EntityId;
  /** Feitiços individuais concedidos por features e seu pool de uso próprio (ex.: 1/LR). */
  readonly featureSpellResources?: readonly { readonly spellRef: DefinitionRef; readonly resourceId: Uuid }[];
  /** Ajustes por magia de uma concessão feature; não alteram a SpellDefinition global. */
  readonly featureSpellOverrides?: readonly { readonly spellRef: DefinitionRef; readonly ignoreMaterialComponents?: boolean; readonly concentrationAlternativeMinutes?: number }[];
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
  readonly ownerUid?: string;
  /**
   * Ficha de personagem secundário (NPC, ameaça, animal) criada ou vinculada pelo mestre no Elenco.
   * Ela só aparece no Elenco: fica fora das listas de personagens, do grupo e das configurações.
   */
  readonly castSheet?: true;

  // Identidade
  readonly name: string;
  readonly playerName?: string;
  readonly raceRef: DefinitionRef;
  readonly subraceRef?: DefinitionRef;
  /** Antecedente é opcional: sem ele, a ficha só não recebe perícias, ferramentas, idiomas e equipamento dele. */
  readonly backgroundRef?: DefinitionRef;
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
  /** Suplementos opt-in escolhidos para esta ficha; ausente em personagens legados. */
  readonly selectedSupplementIds?: readonly EntityId[];
  readonly optionalRuleSelections?: readonly OptionalRuleSelection[];

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
  readonly beastSightings?: readonly BeastSightingState[];
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
  readonly ownerUid?: string;
  readonly castSheet?: true;
  readonly portraitAssetId?: Uuid;
  readonly updatedAt: IsoTimestamp;
  readonly revision: Revision;
}

/** Snapshot completo da ficha imediatamente antes da forma, excluindo transformação para não recursar. */
export type CharacterSnapshot = Omit<Character, "transformation">;

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
    | "selectedSupplementIds"
    | "optionalRuleSelections"
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
