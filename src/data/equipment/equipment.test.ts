import { describe, expect, it } from "vitest";

import { equipment, equipmentBundles, equipmentById, gear, armors, tools, weapons } from "./index";

describe("equipment catalog", () => {
  it("mantém IDs únicos, labels separados e fontes do pack", () => {
    const ids = equipment.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of equipment) {
      expect(item.name.trim()).not.toBe("");
      expect(item.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z0-9-]+)*$/);
      expect(item.sourceRefs.length).toBeGreaterThan(0);
      expect(item.sourceRefs.every((source) => source.sourceId === "phb-ptbr-local-2017")).toBe(true);
      expect(Number.isInteger(item.weightGrams)).toBe(true);
      expect(Number.isInteger(item.valueCp)).toBe(true);
      expect(item.valueCp).toBeGreaterThanOrEqual(0);
    }
  });

  it("publica as 37 armas com payload tipado e propriedades espelhadas", () => {
    expect(weapons).toHaveLength(37);
    for (const item of weapons) {
      expect(item.category).toBe("weapon");
      expect(item.weapon).toBeDefined();
      expect(item.weapon?.properties).toEqual(item.properties);
      for (const property of item.properties) {
        expect(["light", "heavy", "finesse", "reach", "thrown", "two-handed", "versatile", "ammunition", "loading", "special"]).toContain(property);
      }
    }
    expect(equipmentById.get("dagger")?.weapon?.damageParts[0]).toEqual({ expression: { quantity: 1, faces: 4 }, damageType: "piercing" });
  });

  it("mantém armadura e escudo como definitions separadas", () => {
    expect(armors).toHaveLength(13);
    expect(equipmentById.get("chain-mail")?.armor).toMatchObject({ armorCategory: "heavy", baseArmorClass: 16, strengthRequirement: 13, dexModifierCap: 0 });
    expect(equipmentById.get("shield")?.armor).toMatchObject({ armorCategory: "shield", baseArmorClass: 2 });
    expect(equipmentById.get("shield")?.category).toBe("armor");
  });

  it("classifica ferramentas/itens e valida referências dos pacotes", () => {
    expect(tools.length).toBeGreaterThan(30);
    expect(gear.length).toBeGreaterThan(80);
    for (const item of tools) expect(item.tool).toBeDefined();
    for (const item of gear) {
      expect(["adventuring-gear", "consumable", "focus"]).toContain(item.category);
      if (item.category === "consumable") expect(item.consumable).toBeDefined();
    }
    expect(equipmentBundles).toHaveLength(7);
    for (const bundle of equipmentBundles) {
      expect(bundle.grants.length).toBeGreaterThan(0);
      expect(bundle.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
      for (const grant of bundle.grants) {
        expect(grant.quantity).toBeGreaterThan(0);
        expect(equipmentById.has(grant.equipmentRef.entityId)).toBe(true);
      }
      for (const choice of bundle.choices) {
        expect(choice.options.length).toBeGreaterThan(0);
        expect(choice.options.every((option) => equipmentById.has(option.entityId))).toBe(true);
      }
    }
  });
});

