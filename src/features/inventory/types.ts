import type { EquipmentImpact } from "@domain/inventory/impact";
import type { InventoryItem } from "@domain/contracts/character";
import type { CoinDenomination, CopperPieces, Currency, Grams } from "@domain/contracts/primitives";
import type { EquipmentProperty } from "@domain/contracts/definitions/equipment";
import type { CommandId, DefinitionRef } from "@domain/contracts/ids";

/** Dados resolvidos para uma instância. O componente não consulta o rule pack. */
export interface InventoryItemView {
  readonly item: InventoryItem;
  readonly name: string;
  readonly category?: string;
  readonly unitWeightGrams?: Grams | number;
  readonly unitValueCp?: CopperPieces | number;
  readonly properties?: readonly EquipmentProperty[];
  readonly description?: string;
  readonly consumable?: { readonly consumeOnUse: boolean; readonly effectDescription: string };
}

export type InventoryIntent =
  | { readonly kind: "set-quantity"; readonly itemId: InventoryItem["id"]; readonly quantity: number }
  | { readonly kind: "set-currency"; readonly denomination: CoinDenomination; readonly amount: number }
  | { readonly kind: "equip"; readonly itemId: InventoryItem["id"] }
  | { readonly kind: "unequip"; readonly itemId: InventoryItem["id"] }
  | { readonly kind: "remove"; readonly itemId: InventoryItem["id"]; readonly equipped: boolean }
  | { readonly kind: "consume"; readonly itemId: InventoryItem["id"]; readonly equipmentRef: DefinitionRef; readonly commandId?: CommandId };

export type InventoryStatus = "idle" | "loading" | "error";

export interface InventoryProps {
  /** Entries are already resolved by the consumer and keep their source order. */
  readonly items: readonly InventoryItemView[];
  readonly currency: Currency;
  /** Derived effects are injected; the UI never recalculates rules. */
  readonly impact?: Pick<EquipmentImpact, "armorClass" | "properties" | "weightGrams" | "encumbrance" | "explanations" | "equipped">;
  readonly status?: InventoryStatus;
  readonly error?: unknown;
  readonly onIntent?: (intent: InventoryIntent) => void;
  readonly title?: string;
}
