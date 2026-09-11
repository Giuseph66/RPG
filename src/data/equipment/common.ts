import { asEntityId, asRulesetId, type DefinitionRef, type EntityId } from "@domain/contracts/ids";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { asCopperPieces, asGrams, type SourceRef } from "@domain/contracts/primitives";

/** Identidade do pack local; não depende do agregador do rule pack. */
export const RULESET_ID = asRulesetId("phb-ptbr-local-2017");

export function ref(entityId: string): DefinitionRef {
  return { rulesetId: RULESET_ID, entityId: asEntityId(entityId) };
}

export function source(
  chapter: string,
  printedPage: number,
  pdfPage: number,
  section?: string,
): SourceRef {
  return {
    sourceId: RULESET_ID,
    chapter,
    printedPage,
    pdfPage,
    ...(section ? { section } : {}),
  };
}

export type EquipmentSpec = Omit<EquipmentDefinition, "id" | "name" | "tags" | "sourceRefs" | "weightGrams" | "valueCp"> & {
  id: string;
  name: string;
  tags?: readonly string[];
  sourceRefs?: readonly SourceRef[];
  weightGrams: number;
  valueCp: number;
};

export function definition(spec: EquipmentSpec): EquipmentDefinition {
  return {
    id: asEntityId(spec.id),
    name: spec.name,
    tags: spec.tags ?? ["player-handbook", "equipment"],
    sourceRefs: spec.sourceRefs ?? [],
    category: spec.category,
    weightGrams: asGrams(spec.weightGrams),
    valueCp: asCopperPieces(spec.valueCp),
    stackable: spec.stackable,
    properties: spec.properties,
    ...(spec.armor ? { armor: spec.armor } : {}),
    ...(spec.weapon ? { weapon: spec.weapon } : {}),
    ...(spec.tool ? { tool: spec.tool } : {}),
    ...(spec.consumable ? { consumable: spec.consumable } : {}),
  };
}

export function id(value: string): EntityId {
  return asEntityId(value);
}

export function copper(goldPieces: number): number {
  return goldPieces * 100;
}

export function silver(silverPieces: number): number {
  return silverPieces * 10;
}

export const PHB_WEAPONS = source("Capítulo 5 — Equipamento", 148, 147, "Tabela de armas");
export const PHB_WEAPON_TABLE = source("Capítulo 5 — Equipamento", 151, 150, "Tabela de armas");
export const PHB_ARMOR = source("Capítulo 5 — Equipamento", 145, 144, "Tabela de armaduras e escudo");
export const PHB_GEAR = source("Capítulo 5 — Equipamento", 150, 149, "Equipamento de aventura");
export const PHB_GEAR_TABLE = source("Capítulo 5 — Equipamento", 152, 151, "Tabela de equipamento");
export const PHB_TOOLS = source("Capítulo 5 — Equipamento", 156, 155, "Ferramentas");
export const PHB_BUNDLES = source("Capítulo 5 — Equipamento", 153, 152, "Pacotes de equipamento");
