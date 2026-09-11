import { describe, expect, it } from "vitest";
import { races, subraces, variantHuman, DRAGONBORN_ANCESTRIES, RACE_CHOICE_ALLOWED_OPTIONS, RACE_PENDING_DECISIONS } from "./races";

describe("catálogo DATA-004", () => {
  it("publica as nove raças e nove sub-raças com referências pai", () => {
    expect(races).toHaveLength(9);
    expect(subraces).toHaveLength(9);
    expect(new Set(races.map((entry) => entry.id)).size).toBe(9);
    for (const race of races) {
      expect(race.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
      for (const subraceId of race.subraceIds) expect(subraces.find((entry) => entry.id === subraceId)?.raceId).toBe(race.id);
    }
    for (const subrace of subraces) expect(races.find((entry) => entry.id === subrace.raceId)?.subraceIds).toContain(subrace.id);
  });

  it("mantém escolhas obrigatórias sem defaults e preserva IDs independentes dos labels", () => {
    expect(races.find((entry) => entry.id === "dwarf")?.choices[0]?.count).toEqual({ min: 1, max: 1 });
    expect(RACE_CHOICE_ALLOWED_OPTIONS["dwarf.tool-proficiency"]).toHaveLength(3);
    expect(races.find((entry) => entry.id === "half-elf")?.choices.map((choice) => choice.count)).toEqual([{ min: 2, max: 2 }, { min: 2, max: 2 }, { min: 1, max: 1 }]);
    expect(variantHuman.choices.map((choice) => choice.id)).toEqual(["variant-human.ability-increases", "variant-human.skill", "variant-human.feat", "variant-human.language"]);
    expect(variantHuman.choices[0]?.optionSet.kind).toBe("explicit");
    expect(variantHuman.choices[0]?.optionSet.kind === "explicit" ? variantHuman.choices[0].optionSet.options.map((option) => option.entityId) : []).toContain("str");
    expect(variantHuman.name).not.toBe(variantHuman.id);
  });

  it("registra efeitos escalonados por nível e opções de ancestralidade", () => {
    expect(DRAGONBORN_ANCESTRIES).toHaveLength(10);
    const drow = subraces.find((entry) => entry.id === "dark-elf");
    const tiefling = races.find((entry) => entry.id === "tiefling");
    const levels = [...(drow?.traits ?? []), ...(tiefling?.traits ?? [])].flatMap((trait) => trait.modifiers.map((item) => item.predicate));
    expect(levels).toEqual(expect.arrayContaining([{ kind: "min-total-level", level: 1 }, { kind: "min-total-level", level: 3 }, { kind: "min-total-level", level: 5 }]));
    expect(RACE_PENDING_DECISIONS["variant-human"]).toEqual(["PEND-009"]);
  });
});
