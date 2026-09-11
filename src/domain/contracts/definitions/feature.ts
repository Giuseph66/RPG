/**
 * FeatureDefinition. Autoridade: dados/schemas.md, 10-RULES-ENGINE.md.
 * `automationStatus`/`pendingDecisionIds` documentam lacunas da fonte (decisoes/PENDENCIAS.md)
 * sem bloquear a modelagem estrutural do restante da feature.
 */

import { type DefinitionRef } from "../ids";
import { type ChoiceDefinition, type DefinitionBase, type Prerequisite, type RuleModifier } from "../primitives";
import { type RecoveryTrigger } from "./resource";

export type FeatureActivation =
  | { readonly kind: "passive" }
  | { readonly kind: "action" }
  | { readonly kind: "bonus-action" }
  | { readonly kind: "reaction"; readonly trigger: string }
  | { readonly kind: "free" };

/** automated: Rules Engine resolve sozinho. assisted: precisa de input do mestre/jogador.
 * blocked: pendência de fonte impede automação (ver PENDENCIAS.md). */
export type AutomationStatus = "automated" | "assisted" | "blocked";

export type FeatureEffectDescriptor =
  | { readonly kind: "modifier"; readonly modifier: RuleModifier }
  | { readonly kind: "grants-resource"; readonly resourceRef: DefinitionRef }
  | { readonly kind: "grants-condition-immunity"; readonly conditionRef: DefinitionRef }
  | { readonly kind: "grants-spell"; readonly spellRef: DefinitionRef; readonly alwaysPrepared: boolean }
  | { readonly kind: "grants-choice"; readonly choice: ChoiceDefinition }
  | { readonly kind: "narrative"; readonly description: string };

export interface FeatureResourceCost {
  readonly resourceRef: DefinitionRef;
  readonly amount: number;
}

export interface FeatureDefinition extends DefinitionBase {
  readonly activation: FeatureActivation;
  readonly eligibility: readonly Prerequisite[];
  readonly effects: readonly FeatureEffectDescriptor[];
  readonly resourceCosts: readonly FeatureResourceCost[];
  readonly recovery?: RecoveryTrigger;
  readonly choices: readonly ChoiceDefinition[];
  readonly automationStatus: AutomationStatus;
  /** IDs de PENDENCIAS.md (ex.: "PEND-005") quando automationStatus !== "automated". */
  readonly pendingDecisionIds: readonly string[];
}
