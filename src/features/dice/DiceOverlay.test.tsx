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
      await new Promise((resolve) => setTimeout(resolve, 250));
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(container.querySelector("canvas")).not.toBeNull();
    await unmount();
  });
});
