/**
 * CharacterDerived. Autoridade: 09-MODELO-DE-DADOS.md, 10-RULES-ENGINE.md ("Fórmulas
 * essenciais"). Descartável: cache identificado por revisão do personagem + versão do pack.
 */

import { type DefinitionRef, type RulesetRef, type Uuid } from "./ids";
import { type Ability, type Centimeters, type DamageType, type DiceFormula, type Skill, type SourceRef } from "./primitives";
import { type Revision } from "./versioning";

/** Toda parcela derivada possui origem consultável (10-RULES-ENGINE.md, "Aceite do motor"). */
export interface Contribution {
  readonly sourceRef: SourceRef | DefinitionRef;
  readonly amount?: number;
  readonly description: string;
}

export interface Explanation<T> {
  readonly value: T;
  readonly contributions: readonly Contribution[];
}

export interface AbilityScoreDerived {
  readonly ability: Ability;
  readonly score: Explanation<number>;
  readonly modifier: Explanation<number>;
}

export interface SkillDerived {
  readonly skill: Skill;
  readonly modifier: Explanation<number>;
  readonly proficient: boolean;
  readonly expertise: boolean;
  readonly passiveScore: Explanation<number>;
}

export interface SavingThrowDerived {
  readonly ability: Ability;
  readonly modifier: Explanation<number>;
  readonly proficient: boolean;
}

export interface ResistanceProfile {
  readonly resistances: readonly DamageType[];
  readonly immunities: readonly DamageType[];
  readonly vulnerabilities: readonly DamageType[];
  readonly conditionImmunities: readonly DefinitionRef[];
}

export interface AttackDamagePart {
  readonly expression: DiceFormula;
  readonly damageType: DamageType;
  readonly modifierBonus: Explanation<number>;
}

export interface AttackOption {
  readonly sourceRef: DefinitionRef;
  readonly attackModifier: Explanation<number>;
  readonly damageParts: readonly AttackDamagePart[];
}

export interface SpellcastingSourceDerived {
  readonly castingSourceId: Uuid;
  readonly spellSaveDc: Explanation<number>;
  readonly spellAttackModifier: Explanation<number>;
}

export type SpeedKind = "walk" | "fly" | "swim" | "climb" | "burrow";

export interface ResourceCapacityDerived {
  readonly definitionRef: DefinitionRef;
  readonly capacity: Explanation<number>;
}

/**
 * Visão calculada, sem mutação, de `deriveCharacter(character, rulePack, context)`
 * (10-RULES-ENGINE.md). Nunca persistido como fonte de verdade.
 */
export interface CharacterDerived {
  readonly characterId: Uuid;
  readonly characterRevision: Revision;
  readonly rulesetRef: RulesetRef;
  readonly abilityScores: readonly AbilityScoreDerived[];
  readonly skills: readonly SkillDerived[];
  readonly savingThrows: readonly SavingThrowDerived[];
  readonly armorClass: Explanation<number>;
  readonly initiative: Explanation<number>;
  readonly speedsCm: readonly { readonly kind: SpeedKind; readonly value: Explanation<Centimeters> }[];
  readonly proficiencyBonus: Explanation<number>;
  readonly hitPointsMax: Explanation<number>;
  readonly resourceCapacities: readonly ResourceCapacityDerived[];
  readonly attacks: readonly AttackOption[];
  readonly spellcastingSources: readonly SpellcastingSourceDerived[];
  readonly resistanceProfile: ResistanceProfile;
  readonly passivePerception: Explanation<number>;
}
