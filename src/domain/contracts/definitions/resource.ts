/**
 * ResourceDefinition. Autoridade: dados/schemas.md, personagem/recursos.md.
 * "gasto fica no estado" — esta definição só descreve capacidade e regras de recuperação.
 */

import { type DefinitionRef } from "../ids";
import { type Ability, type DefinitionBase } from "../primitives";

/** Gatilho declarativo de recuperação. Reaproveitado por condition.ts e feature.ts. */
export type RecoveryTrigger =
  | { readonly kind: "short-rest" }
  | { readonly kind: "long-rest" }
  | { readonly kind: "dawn" }
  | { readonly kind: "turn-start" }
  | { readonly kind: "manual-table-decision"; readonly description: string }
  | { readonly kind: "specific-condition"; readonly description: string };

export interface LevelCount {
  readonly level: number;
  readonly count: number;
}

export type ResourceCapacityRule =
  | { readonly kind: "fixed"; readonly amount: number }
  | { readonly kind: "by-class-level"; readonly classRef: DefinitionRef; readonly amountsByLevel: readonly LevelCount[] }
  | { readonly kind: "by-total-level-formula"; readonly description: string }
  | { readonly kind: "ability-modifier"; readonly ability: Ability; readonly minimum?: number };

export type ResourceSpendRule =
  | { readonly kind: "per-use"; readonly amount: number }
  | { readonly kind: "variable"; readonly description: string };

export type ResourceRecoveryAmountRule =
  | { readonly kind: "full" }
  | { readonly kind: "fixed-amount"; readonly amount: number }
  | { readonly kind: "half-rounded"; readonly rounding: "up" | "down" };

export interface ResourceDefinition extends DefinitionBase {
  readonly ownerRef: DefinitionRef;
  readonly unit: "charges" | "uses" | "points" | "dice";
  readonly capacityRule: ResourceCapacityRule;
  readonly spendRules: readonly ResourceSpendRule[];
  readonly recoveryTriggers: readonly RecoveryTrigger[];
  readonly recoveryAmountRule: ResourceRecoveryAmountRule;
}
