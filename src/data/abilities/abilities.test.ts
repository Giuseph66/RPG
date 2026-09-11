import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";

import { ABILITIES, POINT_BUY, STANDARD_ARRAY, abilityModifier, pointBuyCost } from "./abilities";

describe("ABILITIES", () => {
  it("tem 6 entradas com IDs únicos e abreviações pt-BR", () => {
    expect(ABILITIES).toHaveLength(6);
    const ids = ABILITIES.map((ability) => ability.id);
    expect(new Set(ids).size).toBe(6);
    const abbreviations = ABILITIES.map((ability) => ability.abbreviation);
    expect(abbreviations).toEqual(["FOR", "DES", "CON", "INT", "SAB", "CAR"]);
  });

  it("cada entrada tem ao menos um sourceRef do pack local", () => {
    for (const ability of ABILITIES) {
      expect(ability.sourceRefs.length).toBeGreaterThan(0);
      for (const ref of ability.sourceRefs) {
        expect(ref.sourceId).toBe("phb-ptbr-local-2017");
      }
    }
  });
});

describe("abilityModifier", () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [16, 3],
    [17, 3],
    [20, 5],
    [30, 10],
  ])("modifier(%i) === %i", (score, expected) => {
    expect(abilityModifier(score)).toBe(expected);
  });
});

describe("STANDARD_ARRAY", () => {
  it("é a matriz padrão 15,14,13,12,10,8", () => {
    expect(STANDARD_ARRAY).toEqual([15, 14, 13, 12, 10, 8]);
  });
});

describe("POINT_BUY / pointBuyCost", () => {
  it("orçamento e custos batem com atributos.md", () => {
    expect(POINT_BUY.budget).toBe(27);
    expect(POINT_BUY.min).toBe(8);
    expect(POINT_BUY.max).toBe(15);
    expect(POINT_BUY.costs).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
  });

  it("15,15,15,8,8,8 custa exatamente 27 pontos", () => {
    const result = pointBuyCost([15, 15, 15, 8, 8, 8]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(27);
    }
  });

  it("rejeita valor 16, fora do domínio 8-15", () => {
    const result = pointBuyCost([16, 8, 8, 8, 8, 8]);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
    }
  });

  it("rejeita valor 7, abaixo do domínio", () => {
    const result = pointBuyCost([7, 8, 8, 8, 8, 8]);
    expect(isErr(result)).toBe(true);
  });
});
