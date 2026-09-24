import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { DefinitionRef, EntityType } from "@domain/contracts/ids";
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
  | "conditions"
  | "pendingResolutions"
  | "castingSources"
  | "preparedSelections"
  | "portraitAssetId"
  | "portraitSha256"
  | "sheetDisplay"
>>;

/** Categoria e peso de um item do inventário, resolvidos do rule pack pelo consumidor. */
export interface SheetEquipmentInfo {
  readonly category: string;
  readonly weightGrams: number;
}

/** Magia disponível para a lista das classes conjuradoras do personagem. */
export interface SheetSpellOption {
  readonly ref: DefinitionRef;
  readonly name: string;
  readonly level: number;
  readonly school: string;
  readonly ritual: boolean;
  readonly concentration: boolean;
}

export type PortraitUploadResult =
  | { readonly ok: true; readonly assetId: NonNullable<Character["portraitAssetId"]>; readonly sha256: string }
  | { readonly ok: false; readonly message: string };

/** Retrato do personagem: carrega os bytes (local ou nuvem) e envia uma nova imagem. */
export interface SheetPortrait {
  /** Resolve uma URL exibível para o asset; `undefined` quando não há cópia disponível. */
  readonly load: (assetId: NonNullable<Character["portraitAssetId"]>, sha256?: string) => Promise<string | undefined>;
  readonly upload?: (file: File) => Promise<PortraitUploadResult>;
}

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
  /** Nome legível de uma definição do pack ativo; sem ele a ficha mostra o id formatado. */
  readonly resolveName?: (entityType: EntityType, entityId: string) => string | undefined;
  readonly equipmentInfo?: (entityId: string) => SheetEquipmentInfo | undefined;
  /** Lista de magias das classes do personagem; habilita "Gerenciar magias". */
  readonly spellOptions?: readonly SheetSpellOption[];
  /** Condições do pack para o seletor "Adicionar condição". */
  readonly conditionOptions?: readonly { readonly ref: DefinitionRef; readonly name: string }[];
  readonly portrait?: SheetPortrait;
}
