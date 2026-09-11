import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";

export * from "./common";
export * from "./weapons";
export * from "./armor";
export * from "./tools";
export * from "./gear";
export * from "./bundles";

import { armors } from "./armor";
import { gear } from "./gear";
import { tools } from "./tools";
import { weapons } from "./weapons";

/** Catálogo de definitions imutáveis; quantidade e estado vivem no inventário. */
export const equipment: readonly EquipmentDefinition[] = [...weapons, ...armors, ...tools, ...gear];
export const EQUIPMENT_DEFINITIONS = equipment;
export const equipmentById: ReadonlyMap<string, EquipmentDefinition> = new Map(equipment.map((entry) => [entry.id, entry]));

export function findEquipment(equipmentId: string): EquipmentDefinition | undefined {
  return equipmentById.get(equipmentId);
}

