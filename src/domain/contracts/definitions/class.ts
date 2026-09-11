/**
 * ClassDefinition / SubclassDefinition e descritor de conjuração.
 * Autoridade: dados/schemas.md, personagem/classes/README.md, magia/conjuracao.md.
 */

import { type DefinitionRef, type EntityId } from "../ids";
import {
  type Ability,
  type ChoiceDefinition,
  type DefinitionBase,
  type DiceFaces,
  type Prerequisite,
} from "../primitives";
import { type LevelCount, type ResourceCapacityRule } from "./resource";

export interface SpellSlotProgressionEntry {
  readonly slotsByLevel: readonly { readonly slotLevel: number; readonly count: number }[];
  readonly cantripsKnown?: number;
  readonly spellsKnown?: number;
}

/** Mudança declarativa de capacidade de um recurso em um nível específico da progressão. */
export interface ResourceProgressionChange {
  readonly resourceRef: DefinitionRef;
  readonly capacityRule: ResourceCapacityRule;
}

export interface ClassLevelProgressionEntry {
  readonly level: number;
  readonly featureRefs: readonly DefinitionRef[];
  readonly resourceChanges: readonly ResourceProgressionChange[];
  readonly spellSlotsGranted?: SpellSlotProgressionEntry;
  readonly choicesGranted: readonly ChoiceDefinition[];
}

export type SpellcastingKind = "prepared" | "known" | "spellbook-prepared";
export type SpellcastingProgressionType = "full" | "half" | "third" | "pact" | "none-with-feature";

export interface SpellcastingDescriptor {
  readonly ability: Ability;
  readonly kind: SpellcastingKind;
  readonly progressionType: SpellcastingProgressionType;
  readonly cantripsKnownByLevel?: readonly LevelCount[];
  readonly spellsKnownByLevel?: readonly LevelCount[];
  readonly ritualCasting: boolean;
  readonly spellcastingFocusAllowed: boolean;
}

export interface ClassDefinition extends DefinitionBase {
  readonly hitDie: DiceFaces;
  readonly primaryAbilities: readonly Ability[];
  readonly initialProficiencies: readonly DefinitionRef[];
  readonly savingThrowProficiencies: readonly Ability[];
  readonly skillChoices: ChoiceDefinition;
  readonly initialEquipmentChoices: readonly ChoiceDefinition[];
  /** Índice 0 = nível 1 ... índice 19 = nível 20; comprimento fixo de 20. */
  readonly progression: readonly ClassLevelProgressionEntry[];
  readonly subclassSelectionLevel: number;
  readonly subclassIds: readonly EntityId[];
  readonly multiclassPrerequisites: readonly Prerequisite[];
  readonly multiclassProficiencies: readonly DefinitionRef[];
  readonly spellcasting?: SpellcastingDescriptor;
}

export interface SubclassFeatureGrant {
  readonly level: number;
  readonly featureRef: DefinitionRef;
}

export interface SubclassSpellGrant {
  readonly level: number;
  readonly spellRef: DefinitionRef;
  readonly alwaysPrepared: boolean;
}

export interface SubclassDefinition extends DefinitionBase {
  readonly classId: EntityId;
  readonly selectionLevel: number;
  readonly featureGrants: readonly SubclassFeatureGrant[];
  readonly spellGrants: readonly SubclassSpellGrant[];
  readonly resourceChanges: readonly ResourceProgressionChange[];
  readonly choices: readonly ChoiceDefinition[];
}
