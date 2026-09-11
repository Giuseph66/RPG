/**
 * SpellDefinition e contratos de conjuração. Autoridade: magia/schema-magia.md (campo a campo).
 *
 * Decisão de contrato: `CastResolution` não é um tipo próprio aqui — o schema-magia.md diz
 * "CastResolution usa RuleResult canônico"; declarar um alias exigiria importar rules.ts,
 * criando ciclo (rules.ts já importa CastRequest/CastMode daqui para o payload de
 * `cast-spell`). O tipo correto para o resultado de uma conjuração é `RuleResult` (rules.ts).
 */

import { type CommandId, type DefinitionRef, type EntityId, type Uuid } from "../ids";
import {
  type Ability,
  type Centimeters,
  type ChoiceDefinition,
  type ChoiceSelection,
  type CopperPieces,
  type DamageType,
  type DefinitionBase,
  type DiceFormula,
  type GameTime,
  type SourceRef,
} from "../primitives";
import { type Revision } from "../versioning";
import { type AutomationStatus, type FeatureResourceCost } from "./feature";

export type SpellSchool =
  | "abjuration"
  | "conjuration"
  | "divination"
  | "enchantment"
  | "evocation"
  | "illusion"
  | "necromancy"
  | "transmutation";

export type CastingTimeKind = "action" | "bonus-action" | "reaction" | "minutes" | "hours";

export interface CastingTime {
  readonly kind: CastingTimeKind;
  readonly amount?: number;
  readonly unit?: "minute" | "hour";
  readonly reactionTrigger?: string;
}

export type SpellRangeKind = "self" | "touch" | "distance" | "special";

export interface SpellRange {
  readonly kind: SpellRangeKind;
  readonly distanceCm?: Centimeters;
  readonly origin?: "caster" | "point-chosen-in-range";
}

export interface SpellMaterialComponent {
  readonly descriptionSummary: string;
  readonly costCp?: CopperPieces;
  readonly consumed: boolean;
  readonly requiredItemKind?: EntityId;
}

export interface SpellComponents {
  readonly verbal: boolean;
  readonly somatic: boolean;
  readonly material?: SpellMaterialComponent;
}

export type SpellDurationKind = "instantaneous" | "rounds" | "minutes" | "hours" | "until-dispelled" | "special";

export type SpellDurationEndTrigger =
  | { readonly kind: "end-of-turn"; readonly whose: "caster" | "target" | "any" }
  | { readonly kind: "start-of-turn"; readonly whose: "caster" | "target" | "any" }
  | { readonly kind: "concentration-ends" }
  | { readonly kind: "short-rest" }
  | { readonly kind: "long-rest" }
  | { readonly kind: "damage-taken" }
  | { readonly kind: "table-decision"; readonly description: string };

export interface SpellDuration {
  readonly kind: SpellDurationKind;
  readonly amount?: number;
  readonly unit?: "round" | "minute" | "hour";
  readonly endTriggers: readonly SpellDurationEndTrigger[];
}

export type SpellTargetType = "creature" | "object" | "point" | "self" | "mixed";

export interface SpellTargeting {
  readonly type: SpellTargetType;
  readonly count?: number;
  readonly restrictions: readonly string[];
  readonly visibilityRequired: boolean;
}

export type SpellAreaShape = "cone" | "cube" | "cylinder" | "sphere" | "line";

export interface SpellArea {
  readonly shape: SpellAreaShape;
  readonly dimensionsCm: readonly Centimeters[];
  readonly originPolicy?: "caster" | "point-in-range";
}

export interface SpellSavingThrow {
  readonly ability: Ability;
  readonly successOutcome: "half-damage" | "no-effect" | "partial-effect";
  readonly repeatTiming?: "end-of-turn" | "start-of-turn";
  readonly conditionToRepeat?: DefinitionRef;
}

export type SpellAttackType = "melee-spell" | "ranged-spell" | "none";

export interface SpellDamagePart {
  readonly expression: DiceFormula;
  readonly damageType: DamageType;
  readonly condition?: string;
  readonly timing?: "immediate" | "start-of-turn" | "end-of-turn";
  readonly target?: "primary" | "all-in-area";
}

export interface SpellHealingPart {
  readonly expression: DiceFormula;
  readonly bonusPerCasterAbility?: Ability;
  readonly timing?: "immediate";
}

export type SpellHigherLevelsRule =
  | { readonly kind: "none" }
  | { readonly kind: "extra-damage-dice-per-slot-level"; readonly diceIncrease: DiceFormula; readonly perSlotLevels: number }
  | { readonly kind: "extra-targets-per-slot-level"; readonly targetsPerLevel: number }
  | { readonly kind: "extra-healing-dice-per-slot-level"; readonly diceIncrease: DiceFormula }
  | { readonly kind: "custom"; readonly description: string };

export type SpellEffectDescriptor =
  | { readonly kind: "apply-condition"; readonly conditionRef: DefinitionRef; readonly duration: SpellDuration }
  | { readonly kind: "grant-choice"; readonly choice: ChoiceDefinition }
  | { readonly kind: "summon"; readonly description: string }
  | { readonly kind: "interrupt"; readonly description: string }
  | { readonly kind: "narrative"; readonly description: string };

export interface SpellDefinition extends DefinitionBase {
  readonly level: number;
  readonly school: SpellSchool;
  readonly castingTime: CastingTime;
  readonly range: SpellRange;
  readonly components: SpellComponents;
  readonly duration: SpellDuration;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly classes: readonly EntityId[];
  readonly targetType: SpellTargeting;
  readonly area?: SpellArea;
  readonly savingThrow?: SpellSavingThrow;
  readonly attackType: SpellAttackType;
  readonly damage: readonly SpellDamagePart[];
  readonly healing: readonly SpellHealingPart[];
  readonly higherLevels: SpellHigherLevelsRule;
  readonly effects: readonly SpellEffectDescriptor[];
  readonly automationStatus: AutomationStatus;
  readonly pendingDecisionIds: readonly string[];
}

// ---------------------------------------------------------------------------
// Fluxo de conjuração
// ---------------------------------------------------------------------------

export type CastMode = "normal" | "ritual" | "feature";

export interface SpellTargetContext {
  readonly targetIds: readonly Uuid[];
  readonly pointCm?: { readonly x: Centimeters; readonly y: Centimeters };
}

export interface SpellComponentContext {
  readonly materialProvided: boolean;
  readonly focusUsed: boolean;
  readonly consumedItemRef?: DefinitionRef;
}

export interface CastRequest {
  readonly commandId: CommandId;
  readonly characterId: Uuid;
  readonly expectedRevision: Revision;
  readonly spellRef: DefinitionRef;
  readonly castingSourceId: Uuid;
  readonly mode: CastMode;
  readonly resourcePoolId?: Uuid;
  readonly slotLevel?: number;
  readonly targetContext: SpellTargetContext;
  readonly componentContext: SpellComponentContext;
  readonly choices: readonly ChoiceSelection[];
}

export interface SpellSlotCost {
  readonly poolId: Uuid;
  readonly slotLevel: number;
}

export interface SpellInterventionRequest {
  readonly reason: string;
  readonly relatedRef?: DefinitionRef;
}

export interface CastPreview {
  readonly slotCost?: SpellSlotCost;
  readonly resourceCosts: readonly FeatureResourceCost[];
  readonly actionCost: CastingTime;
  readonly componentsConsumed: readonly EntityId[];
  readonly concentrationReplaced?: { readonly priorEffectSourceRef: DefinitionRef };
  readonly interventionsRequired: readonly SpellInterventionRequest[];
  readonly sourceRefs: readonly SourceRef[];
}

/**
 * Persistido quando o tempo de conjuração é longo (minutos/horas) e a sessão pode ser
 * interrompida. "não descontar espaço antes de conclusão quando a fonte diz que falha não
 * o gasta" — a aplicação decide o desconto no commit final, não neste registro de progresso.
 */
export interface PendingCast {
  readonly id: Uuid;
  readonly request: CastRequest;
  readonly gameTimeProgress: GameTime;
  readonly concentrationEffectId?: Uuid;
  readonly interrupted: boolean;
  readonly interruptReason?: string;
}
