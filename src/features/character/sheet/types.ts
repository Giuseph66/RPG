import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { CharacterApplicationService } from "@application/character/service";
import type { StoreStatus } from "@application/state/external-store";

export type CharacterSheetView = "quick" | "expanded";

export type CharacterRollIntent =
  | { readonly kind: "ability"; readonly characterId: Character["id"]; readonly ability: CharacterDerived["abilityScores"][number]["ability"]; readonly modifier: number }
  | { readonly kind: "skill"; readonly characterId: Character["id"]; readonly skill: CharacterDerived["skills"][number]["skill"]; readonly modifier: number }
  | { readonly kind: "saving-throw"; readonly characterId: Character["id"]; readonly ability: CharacterDerived["savingThrows"][number]["ability"]; readonly modifier: number }
  | { readonly kind: "initiative"; readonly characterId: Character["id"]; readonly modifier: number };

export type CharacterSheetPatch = Partial<Pick<Character,
  | "name"
  | "playerName"
  | "alignment"
  | "appearance"
  | "personalityTraits"
  | "ideals"
  | "bonds"
  | "flaws"
  | "history"
  | "xp"
  | "inspiration"
  | "hp"
  | "deathSaves"
>>;

export type CharacterSheetService = Pick<
  CharacterApplicationService,
  "update" | "save" | "retry" | "flush"
>;

export interface CharacterSheetProps {
  /** The selected aggregate. Omitting it renders the explicit empty state. */
  readonly character?: Character;
  /** Derived values from RULE-001; the sheet never recomputes them. */
  readonly derived?: CharacterDerived;
  /** Optional application façade. UI commands remain injectable and testable. */
  readonly service?: CharacterSheetService;
  readonly status?: StoreStatus;
  readonly error?: unknown;
  readonly initialView?: CharacterSheetView;
  readonly onViewChange?: (view: CharacterSheetView) => void;
  readonly onRoll?: (intent: CharacterRollIntent) => void;
  readonly onDraftChange?: (patch: CharacterSheetPatch) => void;
}
