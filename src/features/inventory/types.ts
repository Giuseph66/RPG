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
  | { readonly kind: "add"; readonly equipmentRef: DefinitionRef; readonly quantity: number }
  | { readonly kind: "set-quantity"; readonly itemId: InventoryItem["id"]; readonly quantity: number }
  | { readonly kind: "set-currency"; readonly denomination: CoinDenomination; readonly amount: number }
  | { readonly kind: "equip"; readonly itemId: InventoryItem["id"] }
  | { readonly kind: "unequip"; readonly itemId: InventoryItem["id"] }
  | { readonly kind: "remove"; readonly itemId: InventoryItem["id"]; readonly equipped: boolean }
  | { readonly kind: "consume"; readonly itemId: InventoryItem["id"]; readonly equipmentRef: DefinitionRef; readonly commandId?: CommandId };

export type InventoryStatus = "idle" | "loading" | "error";

/** Opção do catálogo para o seletor "Adicionar item"; resolvida pelo consumidor. */
export interface InventoryCatalogOption {
  readonly equipmentRef: DefinitionRef;
  readonly name: string;
  readonly category?: string;
  readonly unitWeightGrams?: Grams | number;
  readonly unitValueCp?: CopperPieces | number;
}

/** Carga carregada comparada à capacidade do livro (cap. 7): 7,5 kg × Força. */
export interface InventoryCarrying {
  readonly totalGrams: number;
  readonly capacityGrams: number;
  /** Limite da variante "Sobrecarga" (2,5 kg × Força), exibido como marca de referência. */
  readonly encumberedGrams?: number;
  readonly strengthScore: number;
}

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
  /** Itens do catálogo que podem ser adicionados; sem ele, o botão "Adicionar item" some. */
  readonly catalog?: readonly InventoryCatalogOption[];
  readonly carrying?: InventoryCarrying;
}
