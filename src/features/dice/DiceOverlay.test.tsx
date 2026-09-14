import { act } from "react";
import { describe, expect, it } from "vitest";

import { createSequenceRandomSource } from "@domain/dice";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { click, focus, mount } from "@components/ui/testUtils";
import { createDiceOverlayController } from "./controller";
import { DiceOverlay } from "./DiceOverlay";

function controller() {
  return createDiceOverlayController({
    history: { hydrate: async () => ({ ok: true as const, value: { entries: [] } }), append: async () => ({ ok: true as const, value: undefined }) },
    rng: createSequenceRandomSource([20]),
    idGenerator: { uuid: () => asUuid("00000000-0000-4000-8000-000000000001") },
    clock: { now: () => asIsoTimestamp("2026-09-11T00:00:00Z") },
  });
}

describe("DiceOverlay", () => {
  it("anuncia resultado e devolve foco ao acionador ao fechar", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<div><button onClick={() => dice.open({ source: "header" })}>Abrir dados</button><DiceOverlay controller={dice} /></div>);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await focus(trigger);
    await click(trigger);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    await click(dialog.querySelector('button[aria-label="Fechar"]') ?? dialog.querySelector("button") as HTMLElement);
    expect(document.activeElement).toBe(trigger);
    await unmount();
  });

  it("mostra cada dado e o anúncio acessível uma vez por rolagem", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    dice.open({ source: "fab" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const rollButton = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Rolar dados")) as HTMLButtonElement;
    await click(rollButton);
    expect(container.querySelectorAll('[aria-label^="Dado "]').length).toBe(1);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("total 20");
    await unmount();
  });

  it("não monta a mesa física de dados enquanto o overlay está fechado", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    expect(container.querySelector("canvas")).toBeNull();
    await unmount();
  });

  it("carrega a mesa física dinamicamente ao abrir o overlay", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    await act(async () => {
      dice.open({ source: "fab" });
    });

    const limite = Date.now() + 2_000;
    while (!container.querySelector("canvas") && Date.now() < limite) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
      });
    }
    expect(container.querySelector("canvas")).not.toBeNull();
    await unmount();
  });

  it("avisa que pode travar quando a mesa passa do orçamento, sem impedir a rolagem", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    await act(async () => { dice.open({ source: "fab" }); });

    const aviso = () => [...container.querySelectorAll("p")].find((p) => p.textContent?.includes("pode travar"));

    // Dentro do orçamento: nada de aviso.
    await act(async () => { dice.setFormula("1d20"); });
    expect(aviso()).toBeUndefined();

    // O d120 tem casco de 62 vértices e orçamento baixo; 30 deles custam 16 s
    // de pré-simulação. O pedido não é bloqueado — só avisado.
    await act(async () => { dice.setFormula("40d120"); });
    expect(aviso()).toBeDefined();
    expect(dice.getSnapshot().expression?.quantity).toBe(40);
    expect(dice.getSnapshot().validationError).toBeUndefined();

    // O botão de rolar segue disponível: quem quer, rola.
    const botao = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Rolar"));
    expect(botao?.disabled).toBeFalsy();
    await unmount();
  });

  it("o palco físico cobre a tela e fica fora do painel, para os dados caírem por cima", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    await act(async () => { dice.open({ source: "fab" }); });

    const limite = Date.now() + 2_000;
    while (!container.querySelector("canvas") && Date.now() < limite) {
      await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
    }
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    // Dentro do backdrop, o `backdrop-filter` do modal viraria bloco contentor
    // e o `position: fixed` do canvas passaria a se medir por ele.
    expect(canvas?.closest('[class*="backdrop"]')).toBeNull();
    await unmount();
  });

  it("o botão de olho oculta e mostra o palco sem desmontar o canvas", async () => {
    const dice = controller();
    const { container, unmount } = await mount(<DiceOverlay controller={dice} />);
    await act(async () => { dice.open({ source: "fab" }); });

    const limite = Date.now() + 2_000;
    while (!container.querySelector("canvas") && Date.now() < limite) {
      await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
    }
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();

    const botaoOlho = container.querySelector('[aria-label="Ocultar dados"]') as HTMLButtonElement;
    expect(botaoOlho).not.toBeNull();
    expect(botaoOlho.getAttribute("aria-pressed")).toBe("false");

    // O wrapper do canvas fica com opacidade 0 — a física continua por baixo,
    // desmontar reiniciaria a mesa e perderia a rolagem em andamento.
    await click(botaoOlho);
    expect(canvas?.closest('[class*="dadosOcultos"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Mostrar dados"]')).not.toBeNull();

    await click(container.querySelector('[aria-label="Mostrar dados"]') as HTMLButtonElement);
    expect(canvas?.closest('[class*="dadosOcultos"]')).toBeNull();
    expect(container.querySelector('[aria-label="Ocultar dados"]')).not.toBeNull();

    // O mesmo elemento <canvas> segue no DOM o tempo todo: nunca foi desmontado.
    expect(container.querySelector("canvas")).toBe(canvas);
    await unmount();
  });
});
