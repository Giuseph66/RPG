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

describe("DiceOverlayController — rolagem decidida pela física", () => {
  function physicsController(rngSeq: readonly number[] = [], appendOk = true) {
    const rng = createSequenceRandomSource(rngSeq);
    const history = historyStub(appendOk ? { ok: true, value: undefined } : { ok: false, error: { code: "storage-unavailable", message: "Falha de disco" } });
    let nextId = 0;
    const controller = createDiceOverlayController({ history, rng, idGenerator: { uuid: () => id(String(++nextId)) }, clock });
    controller.setPhysicsAvailable(true);
    return { controller, history, rng };
  }

  it("não resolve nem persiste enquanto os dados não param", async () => {
    const { controller, history } = physicsController();
    controller.open({ source: "fab" });
    controller.setFormula("1d20");

    let resolvido = false;
    const pendente = controller.roll().then((r) => { resolvido = true; return r; });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(resolvido).toBe(false);
    expect(history.append).not.toHaveBeenCalled();
    expect(controller.getSnapshot().awaitingPhysics).toBe(true);
    expect(controller.getSnapshot().status).toBe("rolling");
    // O número da rolagem anterior não pode permanecer na tela.
    expect(controller.getSnapshot().result).toBeUndefined();

    await controller.onPhysicsResult([13]);
    const result = await pendente;

    expect(result.ok).toBe(true);
    expect(result.ok && result.value.total).toBe(13);
    expect(controller.getSnapshot().awaitingPhysics).toBe(false);
    expect(history.append).toHaveBeenCalledTimes(1);
  });

  it("usa a face lida da mesa e não o RNG, marcando a origem no histórico", async () => {
    // A sequência do RNG seria 1; se o valor físico não mandasse, o total denunciaria.
    const { controller, rng } = physicsController([1]);
    controller.open({ source: "fab" });
    controller.setFormula("1d20 + 3");

    const pendente = controller.roll();
    await controller.onPhysicsResult([18]);
    const result = await pendente;

    expect(result.ok && result.value.rawDice).toEqual([18]);
    expect(result.ok && result.value.total).toBe(21);
    expect(result.ok && result.value.rngVersion).toBe("physical-v1");
    expect(rng.calls).toBe(0);
  });

  it("aplica vantagem sobre os dois valores físicos", async () => {
    const { controller } = physicsController();
    controller.open({ source: "character" });
    controller.setFormula("1d20");
    controller.setMode("advantage");

    const pendente = controller.roll();
    await controller.onPhysicsResult([7, 19]);
    const result = await pendente;

    expect(result.ok && result.value.rawDice).toEqual([7, 19]);
    expect(result.ok && result.value.total).toBe(19);
  });

  it("recusa valores que não batem com a expressão", async () => {
    const { controller, history } = physicsController();
    controller.open({ source: "fab" });
    controller.setFormula("3d6");

    const pendente = controller.roll();
    await controller.onPhysicsResult([4, 5]);
    const result = await pendente;

    expect(result.ok).toBe(false);
    expect(history.append).not.toHaveBeenCalled();
    expect(controller.getSnapshot().awaitingPhysics).toBe(false);
    expect(controller.getSnapshot().validationError).toContain("3");
  });

  it("declinePhysics fecha a rolagem pelo RNG sem esperar o watchdog", async () => {
    const { controller, rng } = physicsController([6, 6, 6]);
    controller.open({ source: "fab" });
    controller.setFormula("3d6");

    const pendente = controller.roll();
    expect(controller.getSnapshot().awaitingPhysics).toBe(true);
    controller.declinePhysics();
    const result = await pendente;

    expect(result.ok && result.value.total).toBe(18);
    expect(result.ok && result.value.rngVersion).not.toBe("physical-v1");
    expect(rng.calls).toBe(3);
    expect(controller.getSnapshot().awaitingPhysics).toBe(false);
  });

  it("perder a mesa no meio da queda cai no RNG na hora", async () => {
    const { controller, rng } = physicsController([20]);
    controller.open({ source: "fab" });
    controller.setFormula("1d20");

    const pendente = controller.roll();
    controller.setPhysicsAvailable(false);
    const result = await pendente;

    expect(result.ok && result.value.total).toBe(20);
    expect(rng.calls).toBe(1);
  });

  it("fechar durante a queda cancela sem gravar no histórico", async () => {
    const { controller, history } = physicsController();
    controller.open({ source: "fab" });
    controller.setFormula("1d20");

    const pendente = controller.roll();
    controller.close();
    const result = await pendente;

    expect(result.ok).toBe(false);
    expect(history.append).not.toHaveBeenCalled();
    expect(controller.getSnapshot().awaitingPhysics).toBe(false);
    // Resultado atrasado da mesa já descartada não pode ressuscitar a rolagem.
    await controller.onPhysicsResult([20]);
    expect(history.append).not.toHaveBeenCalled();
    expect(controller.getSnapshot().result).toBeUndefined();
  });

  it("sem física disponível o RNG decide, como antes", async () => {
    const { controller, rng } = physicsController([11]);
    controller.setPhysicsAvailable(false);
    controller.open({ source: "fab" });
    controller.setFormula("1d20");

    const result = await controller.roll();

    expect(result.ok && result.value.total).toBe(11);
    expect(rng.calls).toBe(1);
    expect(controller.getSnapshot().awaitingPhysics).toBe(false);
  });
});
