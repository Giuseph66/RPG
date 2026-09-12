import type { Character, ProgressionHitPointGain } from "@domain/contracts/character";
import type { ChoiceDefinition, ChoiceSelection, SourceRef } from "@domain/contracts/primitives";
import type { DefinitionRef, EntityId, IsoTimestamp, Uuid } from "@domain/contracts/ids";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { ResourceDefinition, ResourceCapacityRule } from "@domain/contracts/definitions/resource";

export interface LevelUpRequest {
  readonly classId: EntityId;
  /** Opcional para replays/importações; sem ele o domínio exige exatamente o próximo nível. */
  readonly targetClassLevel?: number;
  readonly subclassId?: EntityId;
  readonly hitPointGain: ProgressionHitPointGain;
  readonly choices: readonly ChoiceSelection[];
  /** XP é exigido por padrão; milestone é uma autorização explícita da campanha. */
  readonly mode?: "xp" | "milestone";
}

export interface ProgressionIssue {
  readonly code: "invalid-xp" | "invalid-level" | "required-choice" | "invalid-choice" | "duplicate-choice" | "unresolved-source" | "invalid-hit-points" | "invalid-class" | "invalid-subclass" | "multiclass-prerequisite" | "already-applied";
  readonly field: string;
  readonly message: string;
  readonly blocking: boolean;
  readonly sourceRefs?: readonly SourceRef[];
}

export interface ProgressionStatus {
  readonly totalLevel: number;
  readonly proficiencyBonus: number;
  readonly currentThreshold: number;
  readonly nextThreshold?: number;
  readonly progress: number;
  readonly eligibleLevels: readonly number[];
}

export interface ProgressionResourcePreview {
  readonly definitionRef: DefinitionRef;
  readonly definition?: ResourceDefinition;
  readonly capacityRule: ResourceCapacityRule;
  readonly preservedSpent: number;
}

export interface LevelUpPreview {
  readonly classId: EntityId;
  readonly targetClassLevel: number;
  readonly totalLevel: number;
  readonly proficiencyBonus: number;
  readonly xpRequired: number;
  readonly hitPointGain: ProgressionHitPointGain;
  readonly featureRefs: readonly DefinitionRef[];
  readonly resources: readonly ProgressionResourcePreview[];
  readonly choices: readonly ChoiceDefinition[];
  readonly pending: readonly ProgressionIssue[];
  readonly valid: boolean;
}

export interface ProgressionApplyOptions {
  readonly now?: IsoTimestamp;
  readonly idGenerator?: (purpose: string, index: number) => Uuid;
}

export type ProgressionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: readonly ProgressionIssue[] };

export interface ProgressionCatalog {
  readonly rulePack: RulePack;
}

export type ProgressionCatalogInput = RulePack | ProgressionCatalog;

export function asProgressionCatalog(input: ProgressionCatalogInput): ProgressionCatalog {
  return "rulePack" in input ? input : { rulePack: input };
}

export type CharacterProgressionState = Pick<Character, "xp" | "classes" | "progressionHistory" | "resources" | "hp" | "choices">;
