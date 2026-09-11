/**
 * ConditionDefinition. Autoridade: dados/schemas.md, regras/condicoes.md.
 * "aplicação conserva origem" -> instância de estado (ConditionInstance) fica em character.ts.
 */

import { type Duration, type DefinitionBase, type RuleModifier } from "../primitives";
import { type RecoveryTrigger } from "./resource";

/**
 * no-stack: nova aplicação substitui/ignora. stack-independent-origins: origens distintas
 * coexistem sem dobrar efeito individual. stack-severity: mesma origem pode aumentar
 * severidade (ex.: níveis de exaustão).
 */
export type StackingPolicy = "no-stack" | "stack-independent-origins" | "stack-severity";

export interface ConditionDefinition extends DefinitionBase {
  readonly mechanicalEffects: readonly RuleModifier[];
  readonly stackingPolicy: StackingPolicy;
  readonly defaultDuration?: Duration;
  readonly removalTriggers: readonly RecoveryTrigger[];
  readonly severityRange?: { readonly min: number; readonly max: number };
}
