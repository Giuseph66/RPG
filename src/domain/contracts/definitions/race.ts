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

export interface RaceDefinition extends DefinitionBase {
  readonly abilityIncreases: readonly AbilityIncrease[];
  readonly size: Size;
  readonly speedCm: Centimeters;
  readonly languages: readonly EntityId[];
  readonly senses: readonly Sense[];
  readonly proficiencies: readonly DefinitionRef[];
  readonly traits: readonly RaceTrait[];
  readonly subraceIds: readonly EntityId[];
  readonly choices: readonly ChoiceDefinition[];
}

export interface SubraceDefinition extends DefinitionBase {
  readonly raceId: EntityId;
  readonly additionalModifiers: readonly RuleModifier[];
  readonly traits: readonly RaceTrait[];
  readonly choices: readonly ChoiceDefinition[];
}
