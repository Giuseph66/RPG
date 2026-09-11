import { describe, expect, it } from "vitest";

import { SKILLS, skillsByAbility } from "./skills";

const EXPECTED: Record<string, string> = {
  athletics: "str",
  acrobatics: "dex",
  "sleight-of-hand": "dex",
  stealth: "dex",
  arcana: "int",
  history: "int",
  investigation: "int",
  nature: "int",
  religion: "int",
  "animal-handling": "wis",
  insight: "wis",
  medicine: "wis",
  perception: "wis",
  survival: "wis",
  performance: "cha",
  deception: "cha",
  intimidation: "cha",
  persuasion: "cha",
};

describe("SKILLS", () => {
  it("tem 18 entradas com IDs únicos", () => {
    expect(SKILLS).toHaveLength(18);
    const ids = SKILLS.map((skill) => skill.id);
    expect(new Set(ids).size).toBe(18);
  });

  it("cada defaultAbility bate com pericias.md", () => {
    for (const skill of SKILLS) {
      expect(skill.defaultAbility).toBe(EXPECTED[skill.id]);
    }
    expect(Object.keys(EXPECTED).sort()).toEqual(SKILLS.map((skill) => skill.id).sort());
  });

  it("cada entrada tem ao menos um sourceRef do pack local", () => {
    for (const skill of SKILLS) {
      expect(skill.sourceRefs.length).toBeGreaterThan(0);
      for (const ref of skill.sourceRefs) {
        expect(ref.sourceId).toBe("phb-ptbr-local-2017");
      }
    }
  });
});

describe("skillsByAbility", () => {
  it("Constituição não tem perícia padrão", () => {
    expect(skillsByAbility("con")).toEqual([]);
  });

  it("Destreza tem 3 perícias (acrobacia, furtividade, prestidigitação)", () => {
    const dex = skillsByAbility("dex").map((skill) => skill.id).sort();
    expect(dex).toEqual(["acrobatics", "sleight-of-hand", "stealth"]);
  });
});
