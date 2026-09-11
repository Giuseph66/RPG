/**
 * CharacterTemplate. Autoridade: dados/schemas.md ("não é personagem salvo e exige revisão").
 */

import { type EntityId, type RulesetRef } from "../ids";
import { type ChoiceSelection, type SourceRef } from "../primitives";

export interface CharacterTemplate {
  readonly templateId: EntityId;
  readonly name: string;
  readonly rulesetRef: RulesetRef;
  readonly suggestedChoices: readonly ChoiceSelection[];
  readonly sourceRefs: readonly SourceRef[];
  /** Estruturalmente sempre true: um template nunca é aceito como personagem final sem revisão. */
  readonly requiresReview: true;
}
