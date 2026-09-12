import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { click, mount } from "@components/ui/testUtils";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { minimalCharacter } from "@domain/contracts/fixtures";
import type { Character } from "@domain/contracts/character";
import { createDiceOverlayController } from "@features/dice";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft } from "@domain/character/creation";
import { Compendium } from "@features/compendium";
import { Actions } from "@features/actions";
import { CharacterSheet } from "@features/character/sheet";
import { CharacterProgression } from "@features/character/progression";
import { CharacterCreationWizard } from "@features/character/creation";
import { CharacterSelection } from "@features/character/selection";
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
    expect(mounted.container.querySelector("h1")).not.toBe(document.activeElement);
    await mounted.rerender(<AppShell route={matchRoute("/character")} navigate={vi.fn()} onOpenDice={onOpenDice} />);
    expect(mounted.container.querySelector("h1")).toBe(document.activeElement);
    await click(mounted.container.querySelector('[aria-label="Abrir rolagem de dados"]')!);
    expect(onOpenDice).toHaveBeenCalledTimes(1);
    expect(mounted.container.querySelector('[aria-label="Área de sobreposições"] [role="dialog"]')).toBeNull();
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

  it("keeps exactly one <main> landmark per route, even when the routed feature owns a top-level section", async () => {
    const loaded = loadPhbPtBrLocal2017();
    if (!loaded.ok) throw new Error(loaded.error.message);
    const rulePack = loaded.value;
    const rulesetRef = minimalCharacter.rulesetRef;
    const draftResult = createCharacterDraft({ id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z") });
    if (!draftResult.ok) throw new Error(draftResult.error.message);

    const routedChildren: readonly { readonly label: string; readonly node: ReactElement }[] = [
      { label: "Compendium", node: <Compendium entries={[]} /> },
      { label: "Actions", node: <Actions character={minimalCharacter} /> },
      { label: "CharacterSheet", node: <CharacterSheet character={minimalCharacter} /> },
      { label: "CharacterProgression", node: <CharacterProgression character={minimalCharacter} catalog={rulePack} onApplyLevelUp={vi.fn()} /> },
      { label: "CharacterCreationWizard", node: <CharacterCreationWizard draft={draftResult.value} catalog={{ rulePack, equipmentBundles }} /> },
      { label: "CharacterSelection", node: <CharacterSelection drafts={[{ id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), currentStep: "class", updatedAt: asIsoTimestamp("2024-01-01T00:00:00.000Z") }]} /> },
    ];

    for (const { label, node } of routedChildren) {
      const mounted = await mount(<AppShell route={matchRoute("/")} navigate={vi.fn()}>{node}</AppShell>);
      expect(mounted.container.querySelectorAll("main"), `${label} should not add a second <main> inside AppShell's own landmark`).toHaveLength(1);
      await mounted.unmount();
    }
  });
});
