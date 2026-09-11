import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";

import {
  ABILITY_SCORE_CAP,
  ABILITY_SCORE_HARD_MAX,
  MAX_CHARACTER_LEVEL,
  PROFICIENCY_BONUS_BY_LEVEL,
  proficiencyBonus,
} from "./core-rules";

describe("PROFICIENCY_BONUS_BY_LEVEL", () => {
  it("tem 20 entradas, nível 1 a 20", () => {
    expect(PROFICIENCY_BONUS_BY_LEVEL).toHaveLength(20);
    expect(PROFICIENCY_BONUS_BY_LEVEL).toEqual([
      2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
    ]);
  });
});

describe("proficiencyBonus", () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [17, 6],
    [20, 6],
  ])("nível %i -> PB %i", (level, expected) => {
    const result = proficiencyBonus(level);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(expected);
    }
  });

  it("rejeita nível 0", () => {
    const result = proficiencyBonus(0);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
    }
  });

  it("rejeita nível 21", () => {
    const result = proficiencyBonus(21);
    expect(isErr(result)).toBe(true);
  });
});

describe("Constantes de habilidade", () => {
  it("MAX_CHARACTER_LEVEL, ABILITY_SCORE_CAP e ABILITY_SCORE_HARD_MAX", () => {
    expect(MAX_CHARACTER_LEVEL).toBe(20);
    expect(ABILITY_SCORE_CAP).toBe(20);
    expect(ABILITY_SCORE_HARD_MAX).toBe(30);
  });
});
