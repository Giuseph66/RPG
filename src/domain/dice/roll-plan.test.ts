import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { type RollPlan } from "@domain/contracts/dice";

import { createSequenceRandomSource } from "./random-source";
import { rollPlan } from "./roll-plan";
import { type RollMeta } from "./roll";

function metaFactory(): RollMeta {
  return {
    id: asUuid("11111111-1111-4111-8111-111111111111"),
    timestamp: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
    purpose: "damage",
  };
}

describe("rollPlan", () => {
  it("resolve várias parcelas nomeadas com o mesmo engine", () => {
    const plan: RollPlan = {
      parts: [
        { key: "weapon", expression: { quantity: 1, faces: 8, modifier: 3, mode: "normal" } },
        { key: "fire", expression: { quantity: 2, faces: 6, modifier: 0, mode: "normal" } },
      ],
    };
    const rng = createSequenceRandomSource([5, 4, 6]);
    const result = rollPlan(plan, rng, metaFactory);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.weapon.total).toBe(8);
      expect(result.value.fire.total).toBe(10);
    }
  });

  it("qualquer parcela inválida rejeita o plano inteiro ANTES de rolar qualquer uma", () => {
    const plan: RollPlan = {
      parts: [
        { key: "valid", expression: { quantity: 1, faces: 8, modifier: 0, mode: "normal" } },
        { key: "invalid", expression: { quantity: 0, faces: 8, modifier: 0, mode: "normal" } },
      ],
    };
    const rng = createSequenceRandomSource([5, 5, 5]);
    const result = rollPlan(plan, rng, metaFactory);
    expect(isErr(result)).toBe(true);
    expect(rng.calls).toBe(0);
  });

  it("rejeita chaves duplicadas antes de validar/rolar as parcelas", () => {
    const plan: RollPlan = {
      parts: [
        { key: "weapon", expression: { quantity: 1, faces: 8, modifier: 0, mode: "normal" } },
        { key: "weapon", expression: { quantity: 0, faces: 8, modifier: 0, mode: "normal" } },
      ],
    };
    const rng = createSequenceRandomSource([5, 5]);
    const result = rollPlan(plan, rng, metaFactory);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("validation-error");
      if (result.error.code !== "validation-error") return;
      expect(result.error.field).toBe("parts");
      expect(result.error.message).toMatch(/duplicada/);
    }
    expect(rng.calls).toBe(0);
  });
});
