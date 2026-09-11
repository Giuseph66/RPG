import { type EquipmentDefinition, type EquipmentProperty, type WeaponAbilityPolicy } from "@domain/contracts/definitions/equipment";
import { asCentimeters, type DamageType, type DiceFormula } from "@domain/contracts/primitives";
import { copper, definition, PHB_WEAPON_TABLE } from "./common";

type WeaponSpec = {
  id: string;
  name: string;
  damage?: DiceFormula;
  damageType?: DamageType;
  properties?: readonly EquipmentProperty[];
  range?: readonly [number, number];
  reach?: number;
  ability?: WeaponAbilityPolicy;
  proficiency: "simple" | "martial";
  weightGrams: number;
  valueGold: number;
};

const WEAPON_TAGS = ["player-handbook", "equipment", "weapon"] as const;

function weapon(spec: WeaponSpec): EquipmentDefinition {
  const properties = spec.properties ?? [];
  const damageParts = spec.damage && spec.damageType ? [{ expression: spec.damage, damageType: spec.damageType }] : [];
  return definition({
    id: spec.id,
    name: spec.name,
    tags: WEAPON_TAGS,
    sourceRefs: [PHB_WEAPON_TABLE],
    category: "weapon",
    weightGrams: spec.weightGrams,
    valueCp: copper(spec.valueGold),
    stackable: false,
    properties,
    weapon: {
      damageParts,
      ...(spec.range ? { rangeCm: { normal: asCentimeters(spec.range[0] * 100), long: asCentimeters(spec.range[1] * 100) } } : {}),
      reachCm: asCentimeters((spec.reach ?? (properties.includes("reach") ? 3 : 1.5)) * 100),
      abilityPolicy: spec.ability ?? { kind: "fixed", ability: "str" },
      proficiencyCategory: spec.proficiency,
      properties,
    },
  });
}

const simpleMelee: readonly WeaponSpec[] = [
  { id: "dagger", name: "Adaga", damage: { quantity: 1, faces: 4 }, damageType: "piercing", properties: ["finesse", "light", "thrown"], range: [6, 18], proficiency: "simple", weightGrams: 500, valueGold: 2 },
  { id: "javelin", name: "Azagaia", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["thrown"], range: [9, 36], proficiency: "simple", weightGrams: 1000, valueGold: 0.5 },
  { id: "quarterstaff", name: "Bordão", damage: { quantity: 1, faces: 6 }, damageType: "bludgeoning", properties: ["versatile"], proficiency: "simple", weightGrams: 2000, valueGold: 0.2 },
  { id: "greatclub", name: "Clava Grande", damage: { quantity: 1, faces: 8 }, damageType: "bludgeoning", properties: ["heavy", "two-handed"], proficiency: "simple", weightGrams: 5000, valueGold: 0.2 },
  { id: "sickle", name: "Foice Curta", damage: { quantity: 1, faces: 4 }, damageType: "slashing", properties: ["light"], proficiency: "simple", weightGrams: 1000, valueGold: 1 },
  { id: "spear", name: "Lança", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["thrown", "versatile"], range: [6, 18], proficiency: "simple", weightGrams: 1500, valueGold: 1 },
  { id: "mace", name: "Maça", damage: { quantity: 1, faces: 6 }, damageType: "bludgeoning", proficiency: "simple", weightGrams: 2000, valueGold: 5 },
  { id: "handaxe", name: "Machadinha", damage: { quantity: 1, faces: 6 }, damageType: "slashing", properties: ["light", "thrown"], range: [6, 18], proficiency: "simple", weightGrams: 1000, valueGold: 5 },
  { id: "light-hammer", name: "Martelo Leve", damage: { quantity: 1, faces: 4 }, damageType: "bludgeoning", properties: ["light", "thrown"], range: [6, 18], proficiency: "simple", weightGrams: 1000, valueGold: 2 },
  { id: "club", name: "Porrete", damage: { quantity: 1, faces: 4 }, damageType: "bludgeoning", properties: ["light"], proficiency: "simple", weightGrams: 1000, valueGold: 0.1 },
];

const simpleRanged: readonly WeaponSpec[] = [
  { id: "shortbow", name: "Arco Curto", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["ammunition", "two-handed"], range: [24, 96], proficiency: "simple", weightGrams: 1000, valueGold: 25 },
  { id: "light-crossbow", name: "Besta Leve", damage: { quantity: 1, faces: 8 }, damageType: "piercing", properties: ["ammunition", "loading", "two-handed"], range: [24, 96], proficiency: "simple", weightGrams: 2500, valueGold: 25 },
  { id: "dart", name: "Dardo", damage: { quantity: 1, faces: 4 }, damageType: "piercing", properties: ["finesse", "thrown"], range: [6, 18], proficiency: "simple", weightGrams: 100, valueGold: 0.05 },
  { id: "sling", name: "Funda", damage: { quantity: 1, faces: 4 }, damageType: "bludgeoning", properties: ["ammunition"], range: [9, 36], proficiency: "simple", weightGrams: 0, valueGold: 0.1 },
];

const martialMelee: readonly WeaponSpec[] = [
  { id: "halberd", name: "Alabarda", damage: { quantity: 1, faces: 10 }, damageType: "slashing", properties: ["heavy", "reach", "two-handed"], proficiency: "martial", weightGrams: 3000, valueGold: 20 },
  { id: "glaive", name: "Glaive", damage: { quantity: 1, faces: 10 }, damageType: "slashing", properties: ["heavy", "reach", "two-handed"], proficiency: "martial", weightGrams: 3000, valueGold: 20 },
  { id: "scimitar", name: "Cimitarra", damage: { quantity: 1, faces: 6 }, damageType: "slashing", properties: ["finesse", "light"], ability: { kind: "finesse", abilities: ["str", "dex"] }, proficiency: "martial", weightGrams: 1500, valueGold: 25 },
  { id: "whip", name: "Chicote", damage: { quantity: 1, faces: 4 }, damageType: "slashing", properties: ["finesse", "reach"], ability: { kind: "finesse", abilities: ["str", "dex"] }, proficiency: "martial", weightGrams: 1500, valueGold: 2 },
  { id: "shortsword", name: "Espada Curta", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["finesse", "light"], ability: { kind: "finesse", abilities: ["str", "dex"] }, proficiency: "martial", weightGrams: 1000, valueGold: 10 },
  { id: "greatsword", name: "Espada Grande", damage: { quantity: 2, faces: 6 }, damageType: "slashing", properties: ["heavy", "two-handed"], proficiency: "martial", weightGrams: 3000, valueGold: 50 },
  { id: "longsword", name: "Espada Longa", damage: { quantity: 1, faces: 8 }, damageType: "slashing", properties: ["versatile"], proficiency: "martial", weightGrams: 1500, valueGold: 15 },
  { id: "lance", name: "Lança de Montaria", damage: { quantity: 1, faces: 12 }, damageType: "piercing", properties: ["reach", "special"], proficiency: "martial", weightGrams: 3000, valueGold: 10 },
  { id: "pike", name: "Lança Longa", damage: { quantity: 1, faces: 10 }, damageType: "piercing", properties: ["heavy", "reach", "two-handed"], proficiency: "martial", weightGrams: 4000, valueGold: 5 },
  { id: "morningstar", name: "Maça Estrela", damage: { quantity: 1, faces: 8 }, damageType: "piercing", proficiency: "martial", weightGrams: 2000, valueGold: 15 },
  { id: "greataxe", name: "Machado Grande", damage: { quantity: 1, faces: 12 }, damageType: "slashing", properties: ["heavy", "two-handed"], proficiency: "martial", weightGrams: 3500, valueGold: 30 },
  { id: "battleaxe", name: "Machado de Batalha", damage: { quantity: 1, faces: 8 }, damageType: "slashing", properties: ["versatile"], proficiency: "martial", weightGrams: 2000, valueGold: 10 },
  { id: "maul", name: "Malho", damage: { quantity: 2, faces: 6 }, damageType: "bludgeoning", properties: ["heavy", "two-handed"], proficiency: "martial", weightGrams: 5000, valueGold: 10 },
  { id: "flail", name: "Mangual", damage: { quantity: 1, faces: 8 }, damageType: "bludgeoning", proficiency: "martial", weightGrams: 1000, valueGold: 10 },
  { id: "warhammer", name: "Martelo de Guerra", damage: { quantity: 1, faces: 8 }, damageType: "bludgeoning", properties: ["versatile"], proficiency: "martial", weightGrams: 1000, valueGold: 15 },
  { id: "war-pick", name: "Picareta de Guerra", damage: { quantity: 1, faces: 8 }, damageType: "piercing", proficiency: "martial", weightGrams: 1000, valueGold: 5 },
  { id: "rapier", name: "Rapieira", damage: { quantity: 1, faces: 8 }, damageType: "piercing", properties: ["finesse"], ability: { kind: "finesse", abilities: ["str", "dex"] }, proficiency: "martial", weightGrams: 1000, valueGold: 25 },
  { id: "trident", name: "Tridente", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["thrown", "versatile"], range: [6, 18], proficiency: "martial", weightGrams: 2000, valueGold: 5 },
];

const martialRanged: readonly WeaponSpec[] = [
  { id: "longbow", name: "Arco Longo", damage: { quantity: 1, faces: 8 }, damageType: "piercing", properties: ["ammunition", "heavy", "two-handed"], range: [45, 180], proficiency: "martial", weightGrams: 1000, valueGold: 50 },
  { id: "hand-crossbow", name: "Besta de Mão", damage: { quantity: 1, faces: 6 }, damageType: "piercing", properties: ["ammunition", "light", "loading"], range: [9, 36], proficiency: "martial", weightGrams: 1500, valueGold: 75 },
  { id: "heavy-crossbow", name: "Besta Pesada", damage: { quantity: 1, faces: 10 }, damageType: "piercing", properties: ["ammunition", "heavy", "loading", "two-handed"], range: [30, 120], proficiency: "martial", weightGrams: 4500, valueGold: 50 },
  { id: "net", name: "Rede", properties: ["special", "thrown"], range: [1.5, 4.5], proficiency: "martial", weightGrams: 3000, valueGold: 1 },
  // A fonte informa dano fixo 1; o contrato atual aceita apenas DiceFormula, portanto a
  // parcela fica pendente de extensão contratual e não é convertida silenciosamente em d4.
  { id: "blowgun", name: "Zarabatana", properties: ["ammunition", "loading"], range: [7.5, 30], proficiency: "martial", weightGrams: 1000, valueGold: 10 },
];

/** As 37 linhas da tabela de armas descritas em equipamento/armas.md. */
export const weapons: readonly EquipmentDefinition[] = [...simpleMelee, ...simpleRanged, ...martialMelee, ...martialRanged].map(weapon);
export const WEAPON_DEFINITIONS = weapons;
export const weaponsById: ReadonlyMap<string, EquipmentDefinition> = new Map(weapons.map((entry) => [entry.id, entry]));
export function findWeapon(weaponId: string): EquipmentDefinition | undefined { return weaponsById.get(weaponId); }
