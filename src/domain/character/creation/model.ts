import { type CharacterDraft, type CharacterDraftPartial, type CharacterDraftStep } from "@domain/contracts/character";
import { type DefinitionRef, type IsoTimestamp, type RulesetRef, type Uuid } from "@domain/contracts/ids";
import { type Ability, type ChoiceSelection, type SourceRef } from "@domain/contracts/primitives";
import { type RulePack } from "@domain/contracts/definitions/rulepack";

export interface CreationEquipmentBundle {
  readonly id: import("@domain/contracts/ids").EntityId;
  readonly grants: readonly { readonly equipmentRef: DefinitionRef; readonly quantity: number }[];
  readonly choices: readonly { readonly id: string; readonly count: { readonly min: number; readonly max: number }; readonly sourceRefs: readonly SourceRef[] }[];
}

export type CreationDecision =
  | { readonly kind: "identity"; readonly name: string; readonly playerName?: string }
  | { readonly kind: "race"; readonly raceRef: DefinitionRef; readonly subraceRef?: DefinitionRef }
  | { readonly kind: "class"; readonly classRef: DefinitionRef; readonly subclassRef?: DefinitionRef }
  | { readonly kind: "background"; readonly backgroundRef: DefinitionRef; readonly variantId?: string }
  | { readonly kind: "ability-scores"; readonly method: NonNullable<CharacterDraftPartial["abilityGeneration"]> }
  | { readonly kind: "choices"; readonly selections: readonly ChoiceSelection[] }
  | { readonly kind: "equipment"; readonly selections: readonly ChoiceSelection[] }
  | { readonly kind: "spells"; readonly selections: readonly ChoiceSelection[] }
  | { readonly kind: "details"; readonly details: Pick<CharacterDraftPartial, "appearance" | "personalityTraits" | "ideals" | "bonds" | "flaws" | "history"> };

export interface CreateCharacterDraftInput {
  readonly id: Uuid;
  readonly rulesetRef: RulesetRef;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt?: IsoTimestamp;
  readonly partial?: CharacterDraftPartial;
}

export interface CreationIssue {
  readonly code:
    | "required-choice"
    | "invalid-choice"
    | "duplicate-choice"
    | "invalid-reference"
    | "invalid-ability-scores"
    | "invalid-equipment"
    | "unresolved-source"
    | "invalid-identity";
  readonly field: string;
  readonly message: string;
  readonly sourceRefs?: readonly SourceRef[];
}

export interface CreationValidationReport {
  readonly valid: boolean;
  readonly issues: readonly CreationIssue[];
  readonly character?: import("@domain/contracts/character").Character;
  readonly derived?: import("@domain/contracts/derived").CharacterDerived;
}

export interface CreationCatalog {
  readonly rulePack: RulePack;
  /** Bundles são publicados em data/equipment, mas não fazem parte do RulePack contract. */
  readonly equipmentBundles?: readonly CreationEquipmentBundle[];
}

export type CreationCatalogInput = CreationCatalog | RulePack;

export function asCreationCatalog(input: CreationCatalogInput): CreationCatalog {
  return "rulePack" in input ? input : { rulePack: input };
}

export interface MaterializeOptions {
  readonly now?: IsoTimestamp;
  readonly revision?: import("@domain/contracts/versioning").Revision;
  readonly idGenerator?: (purpose: string, index: number) => Uuid;
  readonly context?: import("@domain/contracts/rules").RuleContext;
}

export interface MaterializedCharacter {
  readonly character: import("@domain/contracts/character").Character;
  readonly derived: import("@domain/contracts/derived").CharacterDerived;
}

export const CREATION_STEPS: readonly CharacterDraftStep[] = [
  "race", "class", "background", "ability-scores", "equipment", "spells", "details", "review",
];

export const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
