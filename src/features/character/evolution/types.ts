import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { Uuid } from "@domain/contracts/ids";
import type { SpellInfoLookup } from "../spell-info";

/** Texto do livro para uma característica ou opção; fornecido pela composição. */
export interface FeatureInfo {
  readonly name: string;
  readonly paragraphs: readonly string[];
  readonly source?: string;
}

export type FeatureInfoLookup = (featureId: string) => FeatureInfo | undefined;

/** Característica racial que passa a valer neste nível total (ex.: magias do Drow nos níveis 3 e 5). */
export interface RacialUnlock {
  readonly name: string;
  readonly description: string;
  readonly level: number;
}

export interface EvolutionResult {
  readonly ok: boolean;
  readonly message?: string;
}

export interface LevelUpWizardProps {
  readonly character: Character;
  readonly derived?: CharacterDerived;
  readonly pack: RulePack;
  readonly spellInfo?: SpellInfoLookup;
  readonly featureInfo?: FeatureInfoLookup;
  /** Características raciais com nível mínimo; o wizard mostra as que passam a valer. */
  readonly racialTraits?: readonly RacialUnlock[];
  /** Gerador de ids novos (espaços de magia, histórico, rolagens). */
  readonly newId: () => Uuid;
  readonly onConfirm: (next: Character) => Promise<EvolutionResult> | EvolutionResult;
  readonly onCancel: () => void;
}
