import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { definition, PHB_ARMOR, copper } from "./common";

type ArmorSpec = {
  id: string;
  name: string;
  armorCategory: "light" | "medium" | "heavy" | "shield";
  baseArmorClass: number;
  dexModifierCap?: number;
  strengthRequirement?: number;
  stealthDisadvantage: boolean;
  weightGrams: number;
  valueGold: number;
};

function armor(spec: ArmorSpec): EquipmentDefinition {
  return definition({
    id: spec.id,
    name: spec.name,
    tags: ["player-handbook", "equipment", "armor"],
    sourceRefs: [PHB_ARMOR],
    category: "armor",
    weightGrams: spec.weightGrams,
    valueCp: copper(spec.valueGold),
    stackable: false,
    properties: [],
    armor: {
      armorCategory: spec.armorCategory,
      baseArmorClass: spec.baseArmorClass,
      ...(spec.dexModifierCap === undefined ? {} : { dexModifierCap: spec.dexModifierCap }),
      ...(spec.strengthRequirement === undefined ? {} : { strengthRequirement: spec.strengthRequirement }),
      stealthDisadvantage: spec.stealthDisadvantage,
    },
  });
}

const armorSpecs: readonly ArmorSpec[] = [
  { id: "padded-armor", name: "Acolchoada", armorCategory: "light", baseArmorClass: 11, stealthDisadvantage: true, weightGrams: 4000, valueGold: 5 },
  { id: "leather-armor", name: "Couro", armorCategory: "light", baseArmorClass: 11, stealthDisadvantage: false, weightGrams: 5000, valueGold: 10 },
  { id: "studded-leather", name: "Couro Batido", armorCategory: "light", baseArmorClass: 12, stealthDisadvantage: false, weightGrams: 6500, valueGold: 45 },
  { id: "hide-armor", name: "Gibão de Peles", armorCategory: "medium", baseArmorClass: 12, dexModifierCap: 2, stealthDisadvantage: false, weightGrams: 6000, valueGold: 10 },
  { id: "chain-shirt", name: "Camisão de Malha", armorCategory: "medium", baseArmorClass: 13, dexModifierCap: 2, stealthDisadvantage: false, weightGrams: 10000, valueGold: 50 },
  { id: "scale-mail", name: "Brunea", armorCategory: "medium", baseArmorClass: 14, dexModifierCap: 2, stealthDisadvantage: true, weightGrams: 22500, valueGold: 50 },
  { id: "breastplate", name: "Peitoral", armorCategory: "medium", baseArmorClass: 14, dexModifierCap: 2, stealthDisadvantage: false, weightGrams: 10000, valueGold: 400 },
  { id: "half-plate", name: "Meia-Armadura", armorCategory: "medium", baseArmorClass: 15, dexModifierCap: 2, stealthDisadvantage: true, weightGrams: 20000, valueGold: 750 },
  { id: "ring-mail", name: "Cota de Anéis", armorCategory: "heavy", baseArmorClass: 14, dexModifierCap: 0, stealthDisadvantage: true, weightGrams: 20000, valueGold: 30 },
  { id: "chain-mail", name: "Cota de Malha", armorCategory: "heavy", baseArmorClass: 16, dexModifierCap: 0, strengthRequirement: 13, stealthDisadvantage: true, weightGrams: 27500, valueGold: 75 },
  { id: "splint-armor", name: "Cota de Talas", armorCategory: "heavy", baseArmorClass: 17, dexModifierCap: 0, strengthRequirement: 15, stealthDisadvantage: true, weightGrams: 30000, valueGold: 200 },
  { id: "plate-armor", name: "Placas", armorCategory: "heavy", baseArmorClass: 18, dexModifierCap: 0, strengthRequirement: 15, stealthDisadvantage: true, weightGrams: 32500, valueGold: 1500 },
  { id: "shield", name: "Escudo", armorCategory: "shield", baseArmorClass: 2, stealthDisadvantage: false, weightGrams: 3000, valueGold: 10 },
];

export const armors: readonly EquipmentDefinition[] = armorSpecs.map(armor);
export const ARMOR_DEFINITIONS = armors;
export const armorsById: ReadonlyMap<string, EquipmentDefinition> = new Map(armors.map((entry) => [entry.id, entry]));
export function findArmor(armorId: string): EquipmentDefinition | undefined { return armorsById.get(armorId); }
