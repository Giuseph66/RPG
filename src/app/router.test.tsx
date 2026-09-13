import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { mount } from "@components/ui/testUtils";
import { createApplicationRuntime } from "./bootstrap";
import { AppRouter } from "./router";
import { fixtureRulesetRef, minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { IndexedDbCharacterRepository, openDatabase } from "@infrastructure/persistence/indexeddb";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

async function mountRoute(node: Parameters<typeof mount>[0]) {
  const mounted = await mount(node);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  return mounted;
}

describe("AppRouter", () => {
  it("expõe fallback acessível durante o carregamento lazy de uma rota", async () => {
    const runtime = await createApplicationRuntime();
    try {
      const markup = renderToStaticMarkup(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
      expect(markup).toContain('aria-busy="true"');
      expect(markup).toContain("Carregando destino");
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("keeps a deep utility route when mounted without an initial path", async () => {
    const originalUrl = window.location.href;
    window.history.replaceState({}, "", "/settings");

    try {
      const firstMount = await mountRoute(<AppRouter navigate={() => undefined} />);
      expect(firstMount.container.textContent).toContain("Configurações");
      await firstMount.unmount();

      const reloadMount = await mountRoute(<AppRouter navigate={() => undefined} />);
      expect(reloadMount.container.textContent).toContain("Configurações");
      expect(reloadMount.container.textContent).not.toContain("Abra sua mesa");
      await reloadMount.unmount();
    } finally {
      window.history.replaceState({}, "", originalUrl);
    }
  });

  it("mounts the account surface and keeps local mode explicit when Firebase is absent", async () => {
    const runtime = await createApplicationRuntime({ authAvailability: { available: false, missingKeys: ["VITE_FIREBASE_API_KEY"] } });
    const mounted = await mountRoute(<AppRouter initialPath="/account" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      expect(mounted.container.textContent).toContain("Conta");
      expect(mounted.container.textContent).toContain("Firebase Authentication ainda não está disponível");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("wires compendium search and detail through the real route composition", async () => {
    const runtime = await createApplicationRuntime();
    const mounted = await mountRoute(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const input = mounted.container.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      await act(async () => {
        setter?.call(input, "adaga");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(input.value).toBe("adaga");
      const result = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")]
        .find((button) => button.textContent?.includes("Adaga")) as HTMLButtonElement | undefined;
      expect(result).toBeDefined();
      await act(async () => result?.click());
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Adaga");
      expect(mounted.container.textContent).toContain("Fonte:");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("opens a static attribute detail with its local source", async () => {
    const runtime = await createApplicationRuntime();
    const mounted = await mountRoute(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const input = mounted.container.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      await act(async () => {
        setter?.call(input, "força");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const result = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")]
        .find((button) => button.textContent?.includes("Força")) as HTMLButtonElement | undefined;
      expect(result).toBeDefined();
      await act(async () => result?.click());
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Força");
      expect(mounted.container.textContent).toContain("Capítulo 1");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("deriva metadata do pack e expõe Consumir para item consumível na ficha", async () => {
    const name = `router-inventory-${Date.now()}`;
    const opened = await openDatabase({ name });
    if (!opened.ok) throw new Error(opened.error.message);
    const character = {
      ...minimalCharacter,
      inventory: [{ id: asUuid("33333333-3333-4333-8333-333333333333"), equipmentRef: { rulesetId: fixtureRulesetRef.id, entityId: asEntityId("healing-potion") }, quantity: 1, equippedState: "carried" as const, notes: "" }],
    };
    const repository = new IndexedDbCharacterRepository(opened.value, { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") });
    expect(await repository.save(character, asRevision(0))).toMatchObject({ ok: true });
    opened.value.close();

    const runtime = await createApplicationRuntime({ database: { name }, settingsStorage: {
      get length() { return 0; }, clear() {}, getItem() { return null; }, key() { return null; }, removeItem() {}, setItem() {},
    } });
    await runtime.services.character.select(character.id);
    const snapshot = runtime.services.character.store.getSnapshot();
    const mounted = await mountRoute(<AppRouter initialPath={`/character/${character.id}`} navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} character={{ value: snapshot.value, status: snapshot.status }} diceOverlayController={runtime.diceOverlayController} />);
    try {
      expect(mounted.container.textContent).toContain("Poção de cura");
      expect(mounted.container.textContent).toContain("Consumir");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });
});
