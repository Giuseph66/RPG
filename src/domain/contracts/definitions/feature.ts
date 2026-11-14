/**
 * FeatureDefinition. Autoridade: dados/schemas.md, 10-RULES-ENGINE.md.
 * `automationStatus`/`pendingDecisionIds` documentam lacunas da fonte (decisoes/PENDENCIAS.md)
 * sem bloquear a modelagem estrutural do restante da feature.
 */

import { type DefinitionRef, type EntityId } from "../ids";
import { type Ability, type ChoiceDefinition, type DefinitionBase, type DiceFormula, type Prerequisite, type RuleModifier } from "../primitives";
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
  | { readonly kind: "grants-spell"; readonly spellRef: DefinitionRef; readonly alwaysPrepared: boolean; readonly resourceRef?: DefinitionRef; readonly ignoreMaterialComponents?: boolean; readonly concentrationAlternativeMinutes?: number }
  | { readonly kind: "grants-choice"; readonly choice: ChoiceDefinition }
  | { readonly kind: "ability-check-bonus"; readonly ability: Ability; readonly modifierAbility: Ability; readonly minimum?: number }
  /** CA alternativa sem armadura: base (padrão 10) + DES + modificadores listados; vale a maior CA disponível. */
  | { readonly kind: "unarmored-defense"; readonly abilities: readonly Ability[]; readonly allowsShield: boolean; readonly base?: number }
  /** Artes Marciais (Monge): sem armadura nem escudo, ataque desarmado e armas de monge (armas simples corpo a corpo sem pesada/duas mãos, mais `extraMonkWeaponIds`) usam FOR ou DES e o dado marcial. */
  | { readonly kind: "martial-arts"; readonly die: DiceFormula; readonly extraMonkWeaponIds: readonly string[] }
  | { readonly kind: "narrative"; readonly description: string };

export interface FeatureResourceCost {
  readonly resourceRef: DefinitionRef;
  readonly amount: number;
}

export interface FeatureSpellcastingSource {
  readonly ability: Ability;
  /** Lista validada além das referências explícitas já conhecidas pela fonte. */
  readonly spellListClassId?: EntityId;
  /** Autoriza conjurar os feitiços explicitamente concedidos por esta feature também com espaços. */
  readonly usesSpellSlots?: boolean;
}

export interface FeatureDefinition extends DefinitionBase {
  readonly activation: FeatureActivation;
  readonly eligibility: readonly Prerequisite[];
  readonly effects: readonly FeatureEffectDescriptor[];
  readonly resourceCosts: readonly FeatureResourceCost[];
  readonly recovery?: RecoveryTrigger;
  readonly choices: readonly ChoiceDefinition[];
  readonly spellcastingSource?: FeatureSpellcastingSource;
  readonly automationStatus: AutomationStatus;
  /** IDs de PENDENCIAS.md (ex.: "PEND-005") quando automationStatus !== "automated". */
  readonly pendingDecisionIds: readonly string[];
}
