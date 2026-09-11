import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";

import { createSequenceRandomSource } from "./random-source";
import { rollExpression, type RollMeta } from "./roll";
import { rerollDice } from "./reroll";

const ORIGINAL_META: RollMeta = {
  id: asUuid("11111111-1111-4111-8111-111111111111"),
  timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
  purpose: "skill-check",
  characterId: asUuid("22222222-2222-4222-8222-222222222222"),
};

const REROLL_META = {
  id: asUuid("33333333-3333-4333-8333-333333333333"),
  timestamp: asIsoTimestamp("2024-01-01T00:01:00.000Z"),
};

describe("rerollDice", () => {
  it("re-rola um índice específico mantendo vínculo com a rolagem original (normal)", () => {
    const originalRng = createSequenceRandomSource([1, 2, 3]);
    const original = rollExpression(
      { quantity: 3, faces: 6, modifier: 1, mode: "normal" },
      originalRng,
      ORIGINAL_META,
    );
    expect(isOk(original)).toBe(true);
    if (!isOk(original)) return;

    const rerollRng = createSequenceRandomSource([6]);
    const rerolled = rerollDice(original.value, [0], rerollRng, REROLL_META);
    expect(isOk(rerolled)).toBe(true);
    if (isOk(rerolled)) {
      expect(rerolled.value.rawDice).toEqual([6, 2, 3]);
      expect(rerolled.value.subtotal).toBe(11);
      expect(rerolled.value.total).toBe(12);
      expect(rerolled.value.rerolledFromId).toBe(original.value.id);
      expect(rerolled.value.id).toBe(REROLL_META.id);
      expect(rerolled.value.purpose).toBe("skill-check");
      expect(rerolled.value.characterId).toBe(ORIGINAL_META.characterId);
    }
  });

  it("re-rola e recalcula seleção em vantagem", () => {
    const originalRng = createSequenceRandomSource([3, 17]);
    const original = rollExpression(
      { quantity: 1, faces: 20, modifier: 5, mode: "advantage" },
      originalRng,
      ORIGINAL_META,
    );
    expect(isOk(original)).toBe(true);
    if (!isOk(original)) return;
    expect(original.value.selectedIndexes).toEqual([1]);

    // Re-rola o dado descartado (índice 0) para um valor maior — nova seleção deve mudar.
    const rerollRng = createSequenceRandomSource([19]);
    const rerolled = rerollDice(original.value, [0], rerollRng, REROLL_META);
    expect(isOk(rerolled)).toBe(true);
    if (isOk(rerolled)) {
      expect(rerolled.value.rawDice).toEqual([19, 17]);
      expect(rerolled.value.selectedIndexes).toEqual([0]);
      expect(rerolled.value.discardedIndexes).toEqual([1]);
      expect(rerolled.value.total).toBe(24);
    }
  });

  it("rejeita índice de rerrolagem fora do intervalo de rawDice", () => {
    const originalRng = createSequenceRandomSource([1, 2, 3]);
    const original = rollExpression(
      { quantity: 3, faces: 6, modifier: 0, mode: "normal" },
      originalRng,
      ORIGINAL_META,
    );
    expect(isOk(original)).toBe(true);
    if (!isOk(original)) return;

    const rerollRng = createSequenceRandomSource([5]);
    const rerolled = rerollDice(original.value, [5], rerollRng, REROLL_META);
    expect(isErr(rerolled)).toBe(true);
    expect(rerollRng.calls).toBe(0);
  });

  it("rejeita índices de rerrolagem duplicados sem consumir RNG", () => {
    const originalRng = createSequenceRandomSource([1, 2, 3]);
    const original = rollExpression(
      { quantity: 3, faces: 6, modifier: 0, mode: "normal" },
      originalRng,
      ORIGINAL_META,
    );
    expect(isOk(original)).toBe(true);
    if (!isOk(original)) return;

    const rerollRng = createSequenceRandomSource([6, 5]);
    const rerolled = rerollDice(original.value, [1, 1], rerollRng, REROLL_META);
    expect(isErr(rerolled)).toBe(true);
    if (isErr(rerolled)) {
      expect(rerolled.error.code).toBe("validation-error");
      if (rerolled.error.code !== "validation-error") return;
      expect(rerolled.error.field).toBe("indexesToReroll");
      expect(rerolled.error.message).toMatch(/duplicado/);
    }
    expect(rerollRng.calls).toBe(0);
  });
});
