/**
 * RaceDefinition / SubraceDefinition. Autoridade: dados/schemas.md, personagem/racas/README.md.
 */

import { type DefinitionRef, type EntityId } from "../ids";
import {
  type Ability,
  type Centimeters,
  type ChoiceDefinition,
  type DefinitionBase,
  type RuleModifier,
  type Size,
  type SourceRef,
} from "../primitives";
import { type CreatureType } from "@domain/creatures";

export interface AbilityIncrease {
  /** "any" cobre aumento livre escolhido pelo jogador (ex.: humano variante). */
  readonly ability: Ability | "any";
  readonly amount: number;
}

export interface Sense {
  readonly kind: "darkvision" | "blindsight" | "tremorsense" | "truesight";
  readonly rangeCm: Centimeters;
}

export interface RaceTrait {
  readonly id: EntityId;
  readonly name: string;
  readonly description: string;
  readonly modifiers: readonly RuleModifier[];
  readonly sourceRefs: readonly SourceRef[];
}

/** Conjuração concedida pela raça, resolvida como uma fonte de magia própria do personagem. */
export interface RaceSpellcastingSource {
  readonly id: EntityId;
  readonly ability?: Ability;
  readonly abilityOptions?: readonly Ability[];
  /** ID de ChoiceDefinition da raça; selecionados[].entityId deve ser uma habilidade permitida. */
  readonly abilityChoiceId?: string;
  readonly spellRefs: readonly DefinitionRef[];
  readonly cantripRefs?: readonly DefinitionRef[];
  readonly minTotalLevel?: number;
  readonly usesPerLongRest?: number;
  readonly resourceRef?: DefinitionRef;
  readonly canUseSpellSlots?: boolean;
  /** Lista de classe usada na validação do feitiço; knownSpellRefs continua sendo o allowlist. */
  readonly spellListClassId?: EntityId;
  readonly sourceRefs: readonly SourceRef[];
}

export interface RaceDefinition extends DefinitionBase {
  readonly abilityIncreases: readonly AbilityIncrease[];
  readonly size: Size;
  readonly speedCm: Centimeters;
  /** Tipo mecânico da criatura quando a raça não é humanoide (ex.: fada Feérica). */
  readonly creatureType?: CreatureType;
  readonly languages: readonly EntityId[];
  readonly senses: readonly Sense[];
  readonly proficiencies: readonly DefinitionRef[];
  readonly traits: readonly RaceTrait[];
  readonly spellcastingSources?: readonly RaceSpellcastingSource[];
  readonly subraceIds: readonly EntityId[];
  readonly choices: readonly ChoiceDefinition[];
}

export interface SubraceDefinition extends DefinitionBase {
  readonly raceId: EntityId;
  readonly additionalModifiers: readonly RuleModifier[];
  readonly traits: readonly RaceTrait[];
  readonly choices: readonly ChoiceDefinition[];
}
