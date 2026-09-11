import { describe, expect, it } from "vitest";

import { isOk } from "@domain/contracts/errors";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";

import { rollAbilityScores } from "./ability-scores";
import { createSequenceRandomSource } from "./random-source";

const META = {
  id: asUuid("11111111-1111-4111-8111-111111111111"),
  timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
};

describe("rollAbilityScores", () => {
  it("4d6 sequência 1,3,5,6 → total 14, discardedIndex 0 (descarta o valor 1)", () => {
    // 6 grupos idênticos para simplificar a prova do primeiro grupo.
    const sequence = Array(24).fill(0);
    [1, 3, 5, 6].forEach((v, i) => (sequence[i] = v));
    for (let g = 1; g < 6; g += 1) {
      sequence[g * 4 + 0] = 6;
      sequence[g * 4 + 1] = 6;
      sequence[g * 4 + 2] = 6;
      sequence[g * 4 + 3] = 6;
    }
    const rng = createSequenceRandomSource(sequence);
    const result = rollAbilityScores(rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const firstGroup = result.value.groups[0];
      expect(firstGroup.rawDice).toEqual([1, 3, 5, 6]);
      expect(firstGroup.discardedIndex).toBe(0);
      expect(firstGroup.total).toBe(14);
    }
  });

  it("empate no menor valor descarta o primeiro índice menor", () => {
    const sequence = [2, 2, 5, 6, ...Array(20).fill(6)];
    const rng = createSequenceRandomSource(sequence);
    const result = rollAbilityScores(rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const firstGroup = result.value.groups[0];
      expect(firstGroup.discardedIndex).toBe(0);
      expect(firstGroup.total).toBe(2 + 5 + 6);
    }
  });

  it("produz exatamente 6 grupos com rngVersion e timestamp", () => {
    const rng = createSequenceRandomSource(Array(24).fill(4));
    const result = rollAbilityScores(rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.groups).toHaveLength(6);
      expect(result.value.rngVersion).toBe("platform-rejection-v1");
      expect(result.value.timestamp).toBe(META.timestamp);
      expect(result.value.id).toBe(META.id);
    }
  });
});
