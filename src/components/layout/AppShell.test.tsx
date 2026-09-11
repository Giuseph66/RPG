import { describe, expect, it, vi } from "vitest";
import { click, mount } from "@components/ui/testUtils";
import { asUuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import { createDiceOverlayController } from "@features/dice";
import { AppShell } from "./AppShell";
import { matchRoute } from "@app/routes";

function diceController() {
  return createDiceOverlayController({
    history: { hydrate: async () => ({ ok: true as const, value: { entries: [] } }), append: async () => ({ ok: true as const, value: undefined }) },
    rng: { nextInt: (_min, max) => max },
  });
}

describe("AppShell", () => {
  it("renders the four destinations, global dice action, and empty-character state", async () => {
    const onOpenDice = vi.fn();
    const mounted = await mount(<AppShell route={matchRoute("/")} navigate={vi.fn()} onOpenDice={onOpenDice} />);
    const navigation = mounted.container.querySelector('[aria-label="Destinos principais"]')!;
    expect(navigation.firstElementChild?.querySelectorAll("button")).toHaveLength(4);
    expect(mounted.container.querySelector('[aria-label="Abrir rolagem de dados"]')).toBeTruthy();
    expect(mounted.container.textContent).toContain("Nenhum personagem ativo");
    expect(mounted.container.textContent).toContain("Criar personagem");
    expect(mounted.container.querySelector("h1")).toBe(document.activeElement);
    await click(mounted.container.querySelector('[aria-label="Abrir rolagem de dados"]')!);
    expect(onOpenDice).toHaveBeenCalledTimes(1);
    await mounted.unmount();
  });

  it("announces boot and error states without inventing character statistics", async () => {
    const mounted = await mount(<AppShell route={matchRoute("/character")} navigate={vi.fn()} bootState="booting" />);
    expect(mounted.container.textContent).toContain("Abrindo dados locais");
    await mounted.rerender(<AppShell route={matchRoute("/character")} navigate={vi.fn()} bootState="error" bootErrorMessage="Banco indisponível" />);
    expect(mounted.container.textContent).toContain("Banco indisponível");
    expect(mounted.container.textContent).not.toContain("PV 10");
    await mounted.unmount();
  });

  it("hosts the overlay and opens it with the active character from the header", async () => {
    const dice = diceController();
    const characterId = asUuid("00000000-0000-4000-8000-000000000001");
    const mounted = await mount(
      <AppShell
        route={matchRoute("/")}
        navigate={vi.fn()}
        character={{ value: { id: characterId, name: "Aria", classes: [] } as unknown as Character }}
        diceOverlayController={dice}
      />,
    );

    await click(mounted.container.querySelector('[aria-label="Abrir rolagem de dados"]')!);

    expect(dice.getSnapshot()).toMatchObject({ open: true, source: "header", characterId });
    expect(mounted.container.querySelector('[aria-label="Área de sobreposições"] [role="dialog"]')).toBeTruthy();
    await mounted.unmount();
  });

  it("marks the responsive global trigger as FAB", async () => {
    const previousMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    try {
      const dice = diceController();
      const mounted = await mount(<AppShell route={matchRoute("/")} navigate={vi.fn()} diceOverlayController={dice} />);
      await click(mounted.container.querySelector('[aria-label="Abrir rolagem de dados"]')!);
      expect(dice.getSnapshot().source).toBe("fab");
      await mounted.unmount();
    } finally {
      Object.defineProperty(window, "matchMedia", { configurable: true, value: previousMatchMedia });
    }
  });
});
