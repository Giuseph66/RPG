import { describe, expect, it } from "vitest";
import { PHB_SUBRACE_DESCRIPTIONS } from "@data/correto/descricoes/subraces";
import { PHB_SUBCLASS_DESCRIPTIONS } from "@data/correto/descricoes/subclasses";
import { PHB_RESOURCE_DESCRIPTIONS } from "@data/correto/descricoes/resources";
import { PHB_FEATURE_DESCRIPTIONS } from "@data/correto/descricoes/features";
import { PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION } from "./progression-general";
import { PHB_REST_MISSING_DESCRIPTIONS } from "./rest-missing";
import { PHB_MOVEMENT_MISSING_DESCRIPTIONS } from "./movement-missing";
import { PHB_ARMOR_ITEM_DESCRIPTIONS } from "./armor-items";
import { PHB_SPECIAL_WEAPON_DESCRIPTIONS } from "./weapon-specials";

const hasText = (entry: { readonly text: string }) => entry.text.trim().length > 0;

describe("PHB description coverage", () => {
  it("keeps all individual subraces and subclasses", () => {
    expect(PHB_SUBRACE_DESCRIPTIONS).toHaveLength(9);
    expect(PHB_SUBCLASS_DESCRIPTIONS).toHaveLength(41);
    expect(PHB_SUBRACE_DESCRIPTIONS.every(hasText)).toBe(true);
    expect(PHB_SUBCLASS_DESCRIPTIONS.every(hasText)).toBe(true);
  });

  it("keeps the class resource descriptions and feature blocks", () => {
    expect(PHB_RESOURCE_DESCRIPTIONS).toHaveLength(9);
    expect(PHB_RESOURCE_DESCRIPTIONS.every(hasText)).toBe(true);
    expect(PHB_FEATURE_DESCRIPTIONS.featureBlocks.length).toBeGreaterThan(0);
    expect(PHB_FEATURE_DESCRIPTIONS.featureBlocks.filter(hasText).length).toBeGreaterThan(400);
  });

  it("publishes the missing general progression", () => {
    expect(PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION.rows).toHaveLength(20);
    expect(PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION.text).toContain("AVANÇO DE PERSONAGEM");
  });

  it("fills remaining rest and movement descriptions", () => {
    expect(PHB_REST_MISSING_DESCRIPTIONS).toHaveLength(4);
    expect(PHB_REST_MISSING_DESCRIPTIONS.every(hasText)).toBe(true);
    expect(PHB_MOVEMENT_MISSING_DESCRIPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(PHB_MOVEMENT_MISSING_DESCRIPTIONS.every(hasText)).toBe(true);
  });

  it("adds individual armor descriptions and special weapon rules", () => {
    expect(PHB_ARMOR_ITEM_DESCRIPTIONS).toHaveLength(13);
    expect(PHB_ARMOR_ITEM_DESCRIPTIONS.every(hasText)).toBe(true);
    expect(PHB_SPECIAL_WEAPON_DESCRIPTIONS.map((entry) => entry.id)).toEqual(["lance", "net"]);
    expect(PHB_SPECIAL_WEAPON_DESCRIPTIONS.every(hasText)).toBe(true);
  });
});
