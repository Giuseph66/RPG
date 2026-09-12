import { type InventoryItem, type InventoryEquippedState } from "@domain/contracts/character";
import { type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type Currency, type Grams } from "@domain/contracts/primitives";
import { type EquipmentProperty } from "@domain/contracts/definitions/equipment";

/** Estado de posses. Definitions ficam no rule pack e nunca são copiadas para cá. */
export interface InventoryState {
  readonly inventory: readonly InventoryItem[];
  readonly currency: Currency;
}

export interface InventoryItemInput {
  readonly id: Uuid;
  readonly equipmentRef: DefinitionRef;
  readonly quantity: number;
  readonly equippedState?: InventoryEquippedState;
  readonly containerId?: Uuid;
  readonly customName?: string;
  readonly notes?: string;
  readonly chargesSpent?: number;
}

/** A política é opcional de propósito: sem `enabled`, carga não participa do resultado. */
export interface EncumbrancePolicy {
  readonly enabled: boolean;
  readonly gramsPerStrengthPoint?: number;
  readonly pushDragLiftMultiplier?: number;
  readonly currencyWeightGramsPerCoin?: number;
}

export interface InventoryRules {
  readonly encumbrance?: EncumbrancePolicy;
}

export interface InventoryMutation {
  readonly inventory: readonly InventoryItem[];
  readonly removedItem?: InventoryItem;
  readonly changedItem?: InventoryItem;
  readonly explanations: readonly InventoryExplanation[];
}

export interface InventoryTransfer {
  readonly source: InventoryState;
  readonly destination: InventoryState;
  readonly transferredItem: InventoryItem;
  readonly explanations: readonly InventoryExplanation[];
}

export interface InventoryExplanation {
  readonly sourceRef?: DefinitionRef;
  readonly itemId?: Uuid;
  readonly amount?: number;
  readonly description: string;
}

export interface EquippedEquipment {
  readonly item: InventoryItem;
  readonly equipmentRef: DefinitionRef;
  readonly category: string;
  readonly properties: readonly EquipmentProperty[];
  readonly proficiency: EquipmentProficiency;
}

export interface EquipmentProficiency {
  readonly proficient: boolean;
  readonly proficiencyRef?: DefinitionRef;
  readonly description: string;
}

export interface EncumbranceSummary {
  readonly enabled: true;
  readonly totalWeightGrams: Grams;
  readonly capacityGrams: Grams;
  readonly pushDragLiftGrams: Grams;
  readonly overCapacity: boolean;
  readonly overPushDragLift: boolean;
  readonly currencyWeightGrams: Grams;
  readonly explanations: readonly InventoryExplanation[];
}
