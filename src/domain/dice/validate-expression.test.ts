import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";
import { DICE_FACES } from "@domain/contracts/primitives";

import { validateDiceExpression } from "./validate-expression";

describe("validateDiceExpression", () => {
  it("aceita expressão normal válida", () => {
    const result = validateDiceExpression({ quantity: 3, faces: 6, modifier: 2, mode: "normal" });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ quantity: 3, faces: 6, modifier: 2, mode: "normal" });
    }
  });

  it("aceita todas as faces com semântica publicada", () => {
    for (const faces of DICE_FACES) {
      const result = validateDiceExpression({ quantity: 1, faces, modifier: 0, mode: "normal" });
      expect(isOk(result)).toBe(true);
    }
  });

  it("aceita modifier negativo válido", () => {
    const result = validateDiceExpression({ quantity: 1, faces: 20, modifier: -1000, mode: "normal" });
    expect(isOk(result)).toBe(true);
  });

  it("aceita quantity=100 (limite superior) e quantity=1 (limite inferior)", () => {
    expect(isOk(validateDiceExpression({ quantity: 100, faces: 6, modifier: 0, mode: "normal" }))).toBe(true);
    expect(isOk(validateDiceExpression({ quantity: 1, faces: 6, modifier: 0, mode: "normal" }))).toBe(true);
  });

  it("aceita modifier=1000 e modifier=-1000 (limites)", () => {
    expect(isOk(validateDiceExpression({ quantity: 1, faces: 6, modifier: 1000, mode: "normal" }))).toBe(true);
    expect(isOk(validateDiceExpression({ quantity: 1, faces: 6, modifier: -1000, mode: "normal" }))).toBe(true);
  });

  it("rejeita quantity=0 identificando o campo", () => {
    const result = validateDiceExpression({ quantity: 0, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
      expect(result.error.field).toBe("quantity");
    }
  });

  it("rejeita quantity=101 (acima do limite)", () => {
    const result = validateDiceExpression({ quantity: 101, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita faces=9 (sem modelo publicado) identificando o campo", () => {
    const result = validateDiceExpression({ quantity: 1, faces: 9, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("faces");
  });

  it("rejeita quantity decimal", () => {
    const result = validateDiceExpression({ quantity: 1.5, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita quantity=NaN", () => {
    const result = validateDiceExpression({ quantity: Number.NaN, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita quantity=Infinity", () => {
    const result = validateDiceExpression({ quantity: Number.POSITIVE_INFINITY, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita quantity negativa", () => {
    const result = validateDiceExpression({ quantity: -1, faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita quantity como string", () => {
    const result = validateDiceExpression({ quantity: "3", faces: 6, modifier: 0, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("rejeita modifier decimal", () => {
    const result = validateDiceExpression({ quantity: 1, faces: 6, modifier: 1.1, mode: "normal" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("modifier");
  });

  it("rejeita modifier fora do intervalo", () => {
    expect(isErr(validateDiceExpression({ quantity: 1, faces: 6, modifier: 1001, mode: "normal" }))).toBe(true);
    expect(isErr(validateDiceExpression({ quantity: 1, faces: 6, modifier: -1001, mode: "normal" }))).toBe(true);
  });

  it("rejeita mode desconhecido", () => {
    const result = validateDiceExpression({ quantity: 1, faces: 20, modifier: 0, mode: "critical" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("mode");
  });

  it("rejeita 2d20 advantage (quantity incompatível com vantagem)", () => {
    const result = validateDiceExpression({ quantity: 2, faces: 20, modifier: 0, mode: "advantage" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("mode");
  });

  it("rejeita 1d6 advantage (faces incompatível com vantagem)", () => {
    const result = validateDiceExpression({ quantity: 1, faces: 6, modifier: 0, mode: "advantage" });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("mode");
  });

  it("aceita 1d20 advantage e 1d20 disadvantage", () => {
    expect(isOk(validateDiceExpression({ quantity: 1, faces: 20, modifier: 0, mode: "advantage" }))).toBe(true);
    expect(isOk(validateDiceExpression({ quantity: 1, faces: 20, modifier: 0, mode: "disadvantage" }))).toBe(true);
  });

  it("rejeita entrada não-objeto", () => {
    expect(isErr(validateDiceExpression("3d6"))).toBe(true);
    expect(isErr(validateDiceExpression(null))).toBe(true);
    expect(isErr(validateDiceExpression(undefined))).toBe(true);
  });
});
