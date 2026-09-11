import { describe, expect, it, vi } from "vitest";

import { createSequenceRandomSource, rollExpression } from "@domain/dice";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { createDiceOverlayController } from "./controller";
import type { DiceRoll } from "@domain/contracts/dice";

const id = (value: string) => asUuid(`00000000-0000-4000-8000-${value.padStart(12, "0")}`);
const clock = { now: () => asIsoTimestamp("2026-09-11T00:00:00Z") };

function historyStub(appendResult: { readonly ok: true; readonly value: undefined } | { readonly ok: false; readonly error: { code: "storage-unavailable"; message: string; cause?: string } } = { ok: true, value: undefined }) {
  return { hydrate: vi.fn(async () => ({ ok: true as const, value: { entries: [] } })), append: vi.fn(async () => appendResult) };
}

describe("DiceOverlayController", () => {
  it("rejeita expressão inválida sem chamar o engine/RNG", async () => {
    const rng = createSequenceRandomSource([6]);
    const history = historyStub();
    const controller = createDiceOverlayController({ history, rng, idGenerator: { uuid: () => id("1") }, clock });
    controller.open({ source: "character" });
    controller.setFormula("2d20 advantage");

    const result = await controller.roll();

    expect(result.ok).toBe(false);
    expect(rng.calls).toBe(0);
    expect(controller.getSnapshot().validationError).toContain("inválida");
  });

  it("faz uma chamada por dado ao engine e persiste o resultado", async () => {
    const rng = createSequenceRandomSource([4, 6, 2]);
    const history = historyStub();
    const engine = vi.fn((...args: Parameters<typeof rollExpression>) => rollExpression(...args));
    const controller = createDiceOverlayController({ history, rng, engine, idGenerator: { uuid: () => id("2") }, clock });
    controller.open({ source: "actions" });
    controller.setFormula("3d6 + 2");

    const result = await controller.roll();

    expect(result.ok).toBe(true);
    expect(engine).toHaveBeenCalledTimes(1);
    expect(rng.calls).toBe(3);
    expect(history.append).toHaveBeenCalledTimes(1);
    expect(result.ok && result.value.total).toBe(14);
    expect(controller.getSnapshot().announcement).toContain("total 14");
  });

  it("mantém resultado visível quando o histórico falha", async () => {
    const rng = createSequenceRandomSource([20]);
    const history = historyStub({ ok: false, error: { code: "storage-unavailable", message: "Falha de disco" } });
    const controller = createDiceOverlayController({ history, rng, idGenerator: { uuid: () => id("3") }, clock });
    controller.open({ source: "journey" });
    const result = await controller.roll();

    expect(result.ok).toBe(true);
    expect(controller.getSnapshot().result?.total).toBe(20);
    expect(controller.getSnapshot().persistenceError?.message).toBe("Falha de disco");
    expect(controller.getSnapshot().history).toHaveLength(0);
  });

  it("re-rolagem cria nova entrada com ID novo", async () => {
    const rng = createSequenceRandomSource([1, 20]);
    const history = historyStub();
    let nextId = 0;
    const controller = createDiceOverlayController({ history, rng, idGenerator: { uuid: () => id(String(++nextId)) }, clock });
    controller.open({ source: "compendium" });
    await controller.roll();
    const first = controller.getSnapshot().result;
    await controller.reroll();

    expect(first).toBeDefined();
    expect(controller.getSnapshot().result?.id).not.toBe(first?.id);
    expect(history.append).toHaveBeenCalledTimes(2);
  });
});
