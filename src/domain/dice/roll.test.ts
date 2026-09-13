import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { type DiceExpression } from "@domain/contracts/dice";

import { createSequenceRandomSource } from "./random-source";
import { rollExpression, type RollMeta } from "./roll";

const META: RollMeta = {
  id: asUuid("11111111-1111-4111-8111-111111111111"),
  timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
  purpose: "free",
};

function expr(partial: Partial<DiceExpression>): DiceExpression {
  return { quantity: 1, faces: 6, modifier: 0, mode: "normal", ...partial };
}

describe("rollExpression — tabela de casos determinísticos (11-DICE-ENGINE.md)", () => {
  it("3d6+2, sequência 4,6,2 → individuais 4/6/2, subtotal 12, total 14", () => {
    const rng = createSequenceRandomSource([4, 6, 2]);
    const result = rollExpression(expr({ quantity: 3, faces: 6, modifier: 2 }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([4, 6, 2]);
      expect(result.value.subtotal).toBe(12);
      expect(result.value.total).toBe(14);
      expect(result.value.selectedIndexes).toEqual([0, 1, 2]);
      expect(result.value.discardedIndexes).toEqual([]);
      expect(result.value.rngVersion).toBe("platform-rejection-v1");
    }
  });

  it("1d20+5, vantagem, sequência 3,17 → seleciona índice 1 (17), total 22", () => {
    const rng = createSequenceRandomSource([3, 17]);
    const result = rollExpression(expr({ quantity: 1, faces: 20, modifier: 5, mode: "advantage" }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([3, 17]);
      expect(result.value.selectedIndexes).toEqual([1]);
      expect(result.value.discardedIndexes).toEqual([0]);
      expect(result.value.subtotal).toBe(17);
      expect(result.value.total).toBe(22);
    }
  });

  it("mesma sequência 3,17, desvantagem → seleciona índice 0 (3), total 8", () => {
    const rng = createSequenceRandomSource([3, 17]);
    const result = rollExpression(expr({ quantity: 1, faces: 20, modifier: 5, mode: "disadvantage" }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([3, 17]);
      expect(result.value.selectedIndexes).toEqual([0]);
      expect(result.value.discardedIndexes).toEqual([1]);
      expect(result.value.subtotal).toBe(3);
      expect(result.value.total).toBe(8);
    }
  });

  it("empate 12/12 em vantagem → seleciona índice 0", () => {
    const rng = createSequenceRandomSource([12, 12]);
    const result = rollExpression(expr({ quantity: 1, faces: 20, modifier: 0, mode: "advantage" }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.selectedIndexes).toEqual([0]);
      expect(result.value.discardedIndexes).toEqual([1]);
      expect(result.value.total).toBe(12);
    }
  });

  it("empate 12/12 em desvantagem → seleciona índice 0", () => {
    const rng = createSequenceRandomSource([12, 12]);
    const result = rollExpression(expr({ quantity: 1, faces: 20, modifier: 0, mode: "disadvantage" }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.selectedIndexes).toEqual([0]);
      expect(result.value.total).toBe(12);
    }
  });

  it("d100 com sequência [1] aceita o limite inferior", () => {
    const rng = createSequenceRandomSource([1]);
    const result = rollExpression(expr({ quantity: 1, faces: 100, modifier: 0 }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([1]);
      expect(result.value.total).toBe(1);
    }
  });

  it("d100 com sequência [100] aceita o limite superior", () => {
    const rng = createSequenceRandomSource([100]);
    const result = rollExpression(expr({ quantity: 1, faces: 100, modifier: 0 }), rng, META);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([100]);
      expect(result.value.total).toBe(100);
    }
  });

  it("ataque com natural 20: engine só relata o valor, sem flag de crítico", () => {
    const rng = createSequenceRandomSource([20]);
    const result = rollExpression(expr({ quantity: 1, faces: 20, modifier: 3, mode: "normal", }), rng, {
      ...META,
      purpose: "attack",
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.rawDice).toEqual([20]);
      expect(result.value.total).toBe(23);
      expect(Object.keys(result.value)).not.toContain("critical");
      expect((result.value as unknown as Record<string, unknown>).critical).toBeUndefined();
    }
  });

  describe("rejeições sem consumir RNG", () => {
    it("quantity=0 rejeita e calls===0", () => {
      const rng = createSequenceRandomSource([1, 2, 3]);
      const result = rollExpression(expr({ quantity: 0 }), rng, META);
      expect(isErr(result)).toBe(true);
      expect(rng.calls).toBe(0);
    });

    it("faces=9 (sem modelo publicado) rejeita e calls===0", () => {
      const rng = createSequenceRandomSource([1, 2, 3]);
      const result = rollExpression({ quantity: 1, faces: 9 as never, modifier: 0, mode: "normal" }, rng, META);
      expect(isErr(result)).toBe(true);
      expect(rng.calls).toBe(0);
    });

    it("quantity decimal rejeita e calls===0", () => {
      const rng = createSequenceRandomSource([1, 2, 3]);
      const result = rollExpression(expr({ quantity: 1.5 as never }), rng, META);
      expect(isErr(result)).toBe(true);
      expect(rng.calls).toBe(0);
    });

    it("quantity=Infinity rejeita e calls===0", () => {
      const rng = createSequenceRandomSource([1, 2, 3]);
      const result = rollExpression(expr({ quantity: Number.POSITIVE_INFINITY as never }), rng, META);
      expect(isErr(result)).toBe(true);
      expect(rng.calls).toBe(0);
    });

    it("2d20 advantage (incompatível) rejeita e calls===0", () => {
      const rng = createSequenceRandomSource([1, 2, 3]);
      const result = rollExpression(expr({ quantity: 2, faces: 20, mode: "advantage" }), rng, META);
      expect(isErr(result)).toBe(true);
      expect(rng.calls).toBe(0);
    });
  });

  it("RNG fora do intervalo produz erro tipado (validation-error), não silêncio", () => {
    const rng = createSequenceRandomSource([999]);
    const result = rollExpression(expr({ quantity: 1, faces: 6 }), rng, META);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
    }
  });

  it("RNG não-inteiro produz erro tipado", () => {
    const rng = createSequenceRandomSource([3.5]);
    const result = rollExpression(expr({ quantity: 1, faces: 6 }), rng, META);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
    }
  });
});
