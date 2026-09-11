import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";

import { type DiceExpression } from "@domain/contracts/dice";

import { formatDiceFormula, parseDiceFormula } from "./parse-formula";

describe("parseDiceFormula", () => {
  it("aceita '3d6'", () => {
    const result = parseDiceFormula("3d6");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ quantity: 3, faces: 6, modifier: 0, mode: "normal" });
    }
  });

  it("aceita '3D6 + 2' (D maiúsculo, espaços)", () => {
    const result = parseDiceFormula("3D6 + 2");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ quantity: 3, faces: 6, modifier: 2, mode: "normal" });
    }
  });

  it("aceita '1d20-1'", () => {
    const result = parseDiceFormula("1d20-1");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ quantity: 1, faces: 20, modifier: -1, mode: "normal" });
    }
  });

  it("rejeita '3d6*2' (multiplicação não suportada)", () => {
    expect(isErr(parseDiceFormula("3d6*2"))).toBe(true);
  });

  it("rejeita '1d20+1d4' (múltiplos termos não suportados)", () => {
    expect(isErr(parseDiceFormula("1d20+1d4"))).toBe(true);
  });

  it("rejeita 'abc'", () => {
    expect(isErr(parseDiceFormula("abc"))).toBe(true);
  });

  it("rejeita 'd6' (quantidade ausente)", () => {
    expect(isErr(parseDiceFormula("d6"))).toBe(true);
  });

  it("rejeita '3d' (faces ausente)", () => {
    expect(isErr(parseDiceFormula("3d"))).toBe(true);
  });

  it("rejeita string vazia", () => {
    expect(isErr(parseDiceFormula(""))).toBe(true);
  });

  it("rejeita fórmula com faces/quantidade fora do contrato (200d6)", () => {
    const result = parseDiceFormula("200d6");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) expect(result.error.field).toBe("quantity");
  });

  it("nunca usa eval/Function: entrada com sintaxe JS é rejeitada como texto comum", () => {
    expect(isErr(parseDiceFormula("1+1"))).toBe(true);
    expect(isErr(parseDiceFormula("() => 1"))).toBe(true);
  });
});

describe("formatDiceFormula", () => {
  it("formata sem modificador", () => {
    expect(formatDiceFormula({ quantity: 3, faces: 6, modifier: 0, mode: "normal" })).toBe("3d6");
  });

  it("formata com modificador positivo", () => {
    expect(formatDiceFormula({ quantity: 3, faces: 6, modifier: 2, mode: "normal" })).toBe("3d6+2");
  });

  it("formata com modificador negativo", () => {
    expect(formatDiceFormula({ quantity: 1, faces: 20, modifier: -1, mode: "normal" })).toBe("1d20-1");
  });

  it("round-trip: parse(format(expr)) === expr para expressões normal", () => {
    const original: DiceExpression = { quantity: 4, faces: 8, modifier: -5, mode: "normal" };
    const formatted = formatDiceFormula(original);
    const parsed = parseDiceFormula(formatted);
    expect(isOk(parsed)).toBe(true);
    if (isOk(parsed)) {
      expect(parsed.value).toEqual(original);
    }
  });
});
