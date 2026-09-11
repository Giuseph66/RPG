/**
 * EquipmentDefinition (+ partes Weapon/Armor/Tool/Consumable).
 * Autoridade: dados/schemas.md, equipamento/README.md, equipamento/armas.md, armaduras.md.
 */

import {
  type Ability,
  type ArmorCategory,
  type Centimeters,
  type CopperPieces,
  type DamageType,
  type DefinitionBase,
  type DiceFormula,
  type Grams,
} from "../primitives";

export type EquipmentCategory =
  | "weapon"
  | "armor"
  | "tool"
  | "adventuring-gear"
  | "consumable"
  | "mount"
  | "vehicle"
  | "trade-good"
  | "container"
  | "focus";

export type EquipmentProperty =
  | "light"
  | "heavy"
  | "finesse"
  | "reach"
  | "thrown"
  | "two-handed"
  | "versatile"
  | "ammunition"
  | "loading"
  | "special";

export interface ArmorDefinition {
  readonly armorCategory: ArmorCategory;
  readonly baseArmorClass: number;
  /** undefined = sem teto (armadura leve); definido = teto do bônus de Destreza (média=2, pesada=0). */
  readonly dexModifierCap?: number;
  readonly strengthRequirement?: number;
  readonly stealthDisadvantage: boolean;
}

export type WeaponAbilityPolicy =
  | { readonly kind: "fixed"; readonly ability: Ability }
  | { readonly kind: "finesse"; readonly abilities: readonly [Ability, Ability] }
  | { readonly kind: "spellcasting-ability" };

export interface WeaponDamagePart {
  readonly expression: DiceFormula;
  readonly damageType: DamageType;
}

export interface WeaponDefinition {
  readonly damageParts: readonly WeaponDamagePart[];
  readonly rangeCm?: { readonly normal: Centimeters; readonly long: Centimeters };
  readonly reachCm: Centimeters;
  readonly abilityPolicy: WeaponAbilityPolicy;
  readonly proficiencyCategory: "simple" | "martial";
  readonly properties: readonly EquipmentProperty[];
}

export interface ToolDefinition {
  readonly toolCategory: "artisan" | "gaming-set" | "musical-instrument" | "other";
  readonly associatedAbility?: Ability;
}

export interface ConsumableDefinition {
  readonly consumeOnUse: boolean;
  readonly effectDescription: string;
  readonly charges?: number;
}

export interface EquipmentDefinition extends DefinitionBase {
  readonly category: EquipmentCategory;
  readonly weightGrams: Grams;
  readonly valueCp: CopperPieces;
  readonly stackable: boolean;
  readonly properties: readonly EquipmentProperty[];
  readonly armor?: ArmorDefinition;
  readonly weapon?: WeaponDefinition;
  readonly tool?: ToolDefinition;
  readonly consumable?: ConsumableDefinition;
}
