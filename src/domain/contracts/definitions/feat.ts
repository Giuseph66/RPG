/**
 * FeatDefinition. Autoridade: dados/schemas.md, personagem/talentos/README.md.
 */

import { type ChoiceDefinition, type DefinitionBase, type Prerequisite, type RuleModifier } from "../primitives";

export interface FeatDefinition extends DefinitionBase {
  readonly prerequisites: readonly Prerequisite[];
  readonly grants: readonly RuleModifier[];
  readonly choices: readonly ChoiceDefinition[];
  readonly repeatable: boolean;
  /** Talentos são regra opcional do Livro do Jogador (cap. 6); flag documenta a proveniência. */
  readonly optionalRule: boolean;
}
