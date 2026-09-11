/**
 * BackgroundDefinition. Autoridade: dados/schemas.md, personagem/antecedentes/README.md.
 * "customização da fonte tratada separadamente" -> variantes ficam em `variants`.
 */

import { type DefinitionRef } from "../ids";
import { type ChoiceDefinition, type DefinitionBase, type Skill } from "../primitives";

export interface BackgroundEquipmentGrant {
  readonly equipmentRef: DefinitionRef;
  readonly quantity: number;
}

export interface BackgroundFeature {
  readonly name: string;
  readonly description: string;
}

export interface BackgroundVariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly skillProficiencies?: readonly Skill[];
  readonly feature?: BackgroundFeature;
}

export interface BackgroundDefinition extends DefinitionBase {
  readonly skillProficiencies: readonly Skill[];
  readonly toolChoices: readonly ChoiceDefinition[];
  readonly languageChoices: readonly ChoiceDefinition[];
  readonly equipment: readonly BackgroundEquipmentGrant[];
  readonly feature: BackgroundFeature;
  readonly variants: readonly BackgroundVariant[];
}
