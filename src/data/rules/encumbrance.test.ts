import { describe, expect, it } from "vitest";

import { carryingCapacityGrams, COIN_WEIGHT_GRAMS, currencyWeightGrams, PHB_ENCUMBRANCE_POLICY } from "./encumbrance";

describe("regra de carga do Livro do Jogador", () => {
  it("usa 10 g por moeda, como a fonte imprime", () => {
    expect(COIN_WEIGHT_GRAMS).toBe(10);
    expect(currencyWeightGrams({ cp: 100, sp: 0, ep: 0, gp: 0, pp: 0 })).toBe(1_000);
    expect(currencyWeightGrams({ cp: 10, sp: 10, ep: 10, gp: 10, pp: 10 })).toBe(500);
  });

  it("calcula capacidade como 7,5 kg por ponto de Força", () => {
    expect(carryingCapacityGrams(10)).toBe(75_000);
    expect(carryingCapacityGrams(8)).toBe(60_000);
    expect(carryingCapacityGrams(20)).toBe(150_000);
  });

  it("expõe a política pronta para o cálculo de impacto", () => {
    expect(PHB_ENCUMBRANCE_POLICY).toMatchObject({ enabled: true, gramsPerStrengthPoint: 7_500, pushDragLiftMultiplier: 2, currencyWeightGramsPerCoin: 10 });
  });
});
