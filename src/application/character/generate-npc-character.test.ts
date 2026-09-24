import { describe, expect, it } from "vitest";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { RACE_CHOICE_ALLOWED_OPTIONS } from "@data/races/races";
import { generateNpcCharacter } from "./generate-npc-character";

describe("geração de ficha para NPCs e ameaças", () => {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  const catalog = { rulePack: loaded.value, equipmentBundles, selectorOptions: RACE_CHOICE_ALLOWED_OPTIONS };

  it("gera uma ficha completa para cada raça e classe publicada", () => {
    const failures: string[] = [];
    for (const race of catalog.rulePack.races.values()) for (const characterClass of catalog.rulePack.classes.values()) {
      const result = generateNpcCharacter(catalog, { name: "Guarda da mesa", raceId: race.id, classId: characterClass.id });
      if (!result.ok) failures.push(`${race.id}/${characterClass.id}: ${result.error.message}`);
      else {
        expect(result.value.raceRef.entityId).toBe(race.id);
        expect(result.value.classes[0]?.classId).toBe(characterClass.id);
        expect(result.value.hp.current).toBeGreaterThan(0);
      }
    }
    expect(failures).toEqual([]);
  });
});
