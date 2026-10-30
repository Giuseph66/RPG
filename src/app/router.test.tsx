import { act } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { click, fireEvent, mount } from "@components/ui/testUtils";
import { createApplicationRuntime } from "./bootstrap";
import { AppRouter, connectionFor, DataManagementRoute } from "./router";
import { fixtureRulesetRef, minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { IndexedDbCharacterRepository, openDatabase } from "@infrastructure/persistence/indexeddb";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { applyCreationDecision } from "@domain/character/creation";

// A composição do router não testa a implementação WebGL do preview de Configurações;
// os testes de dice3d cobrem esse contrato separadamente. O mock é local a este arquivo,
// preservando o setup global e deixando falhas reais de WebGL visíveis fora da composição.
vi.mock("@features/dice3d", () => ({ Dice3D: () => null }));

async function mountRoute(node: Parameters<typeof mount>[0]) {
  const mounted = await mount(node);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  return mounted;
}

describe("AppRouter", () => {
  it("mantém pending e erro distintos no indicador de sincronização", () => {
    expect(connectionFor("synced", true)).toBe("live");
    expect(connectionFor("offline", true)).toBe("down");
    expect(connectionFor("pending", true)).toBe("pending");
    expect(connectionFor("error", true)).toBe("error");
    expect(connectionFor("error", false)).toBeUndefined();
  });

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
      expect(reloadMount.container.textContent).toContain("Backup e recuperação");
      await click([...reloadMount.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Abrir backup")) as HTMLElement);
      expect(window.location.pathname).toBe("/data");
      await reloadMount.unmount();
    } finally {
      window.history.replaceState({}, "", originalUrl);
    }
  });

  it("limpa uma prévia inválida e atualiza recovery após importar", async () => {
    const validJson = readFileSync(resolve(process.cwd(), "Testes/evidencias/backup-campanha-qa.json"), "utf8");
    let recoveryCalls = 0;
    const recovery = [{ id: "recovery-old", sourceStore: "campaigns", recordedAt: "agora", raw: null }];
    const refreshedRecovery = [{ id: "recovery-new", sourceStore: "campaigns", recordedAt: "agora", raw: null }];
    const service = {
      listRecovery: vi.fn(async () => ({ ok: true as const, value: recoveryCalls++ === 0 ? recovery : refreshedRecovery })),
      import: vi.fn(async () => ({ ok: true as const, value: { imported: 1, copied: 0, replaced: 0, recovery: [] } })),
    };
    const integration = {
      service,
      previewImport: vi.fn(async () => ({ ok: true as const, value: {
        kind: "campaign" as const,
        rootName: "Campanha QA",
        schemaVersion: 1 as const,
        rulesetRefs: [],
        counts: { campaigns: 1 },
        conflicts: [],
        warnings: [],
        estimatedBytes: validJson.length,
      } })),
    };
    const mounted = await mountRoute(<DataManagementRoute registry={{ dataManagement: integration } as never} character={undefined} campaign={undefined} />);
    try {
      const input = mounted.container.querySelector('input[type="file"]') as HTMLInputElement;
      const changeFile = async (file: File) => {
        Object.defineProperty(input, "files", { configurable: true, value: [file] });
        await fireEvent(input, new Event("change", { bubbles: true }));
      };
      await changeFile(new File([validJson], "valid.json", { type: "application/json" }));
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Prévia da importação"));
      await changeFile(new File(["não é JSON"], "invalid.json", { type: "application/json" }));
      await vi.waitFor(() => expect(mounted.container.textContent).not.toContain("Prévia da importação"));
      expect(mounted.container.textContent).toContain("JSON inválido");

      await changeFile(new File([validJson], "valid-again.json", { type: "application/json" }));
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Prévia da importação"));
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Confirmar importação")) as HTMLElement);
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("recovery-new"));
      expect(service.import).toHaveBeenCalledOnce();
      expect(service.listRecovery).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.unmount();
    }
  });

  it("cancels character creation back to the character selection", async () => {
    const runtime = await createApplicationRuntime();
    const originalUrl = window.location.href;
    const mounted = await mountRoute(<AppRouter initialPath="/character/create" navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} createDraft={runtime.createDraft} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const cancel = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Cancelar");
      expect(cancel).toBeTruthy();
      await click(cancel!);
      expect(window.location.pathname).toBe("/character");
    } finally {
      window.history.replaceState({}, "", originalUrl);
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("lists and resumes a saved character draft", async () => {
    const runtime = await createApplicationRuntime();
    const named = applyCreationDecision(runtime.createDraft(), { kind: "identity", name: "Artemis" });
    if (!named.ok) throw new Error(named.error.message);
    expect((await runtime.services.character.saveDraft(named.value)).ok).toBe(true);
    const originalUrl = window.location.href;
    const mounted = await mountRoute(<AppRouter initialPath="/character" navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} createDraft={runtime.createDraft} diceOverlayController={runtime.diceOverlayController} />);
    try {
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Rascunhos"));
      const resume = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Retomar rascunho");
      expect(resume).toBeTruthy();
      await click(resume!);
      await act(async () => { await vi.dynamicImportSettled(); });
      expect(window.location.pathname).toBe(`/character/create/${named.value.id}`);
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Criação de personagem"));
      expect(mounted.container.textContent).toContain("Artemis");
    } finally {
      window.history.replaceState({}, "", originalUrl);
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("oferece cópia de rascunho usado sem substituir ficha existente", async () => {
    const runtime = await createApplicationRuntime();
    const named = applyCreationDecision(runtime.createDraft(), { kind: "identity", name: "Rascunho preservado" });
    if (!named.ok) throw new Error(named.error.message);
    await runtime.services.character.saveDraft(named.value);
    const existing = { ...minimalCharacter, id: named.value.id, name: "Ficha já editada", ownerUid: "outra-conta" };
    await runtime.services.character.saveCharacter(existing, asRevision(0));
    const originalUrl = window.location.href;
    const mounted = await mountRoute(<AppRouter initialPath={`/character/create/${named.value.id}`} navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} createDraft={runtime.createDraft} />);
    try {
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Este rascunho já foi usado"));
      expect(mounted.container.textContent).not.toContain("Abrir ficha existente");
      expect(mounted.container.textContent).not.toContain(existing.name);
      await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Criar uma nova ficha deste rascunho")!);
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Criação de personagem"));
      expect(window.location.pathname).not.toBe(`/character/create/${named.value.id}`);
      const drafts = await runtime.services.character.listDrafts();
      if (!drafts.ok) throw new Error(drafts.error.message);
      expect(drafts.value.filter((entry) => entry.partial.name === "Rascunho preservado")).toHaveLength(2);
      const loaded = await runtime.services.character.get(existing.id);
      expect(loaded.ok && loaded.value.name).toBe(existing.name);
    } finally {
      window.history.replaceState({}, "", originalUrl);
      await mounted.unmount();
      runtime.services.character.dispose(); runtime.services.campaign.dispose(); runtime.services.settings.dispose(); runtime.services.dice.dispose(); runtime.database.close();
    }
  });

  it("persists creation progress automatically across a reload", async () => {
    const runtime = await createApplicationRuntime();
    const originalUrl = window.location.href;
    const creation = await mountRoute(<AppRouter initialPath="/character/create" navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} createDraft={runtime.createDraft} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const name = creation.container.querySelector("input") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Artemis");
      await fireEvent(name, new Event("input", { bubbles: true }));
      await vi.waitFor(async () => {
        const drafts = await runtime.services.character.listDrafts();
        expect(drafts.ok && drafts.value[0]?.partial.name).toBe("Artemis");
      });
      await vi.waitFor(() => expect(window.location.pathname).toMatch(/^\/character\/create\/[\w-]+$/));
    } finally {
      await creation.unmount();
    }
    const reloaded = await mountRoute(<AppRouter initialPath={window.location.pathname} navigate={() => undefined} registry={runtime.registry} pack={runtime.pack} createDraft={runtime.createDraft} diceOverlayController={runtime.diceOverlayController} />);
    try {
      await vi.waitFor(() => expect(reloaded.container.textContent).toContain("Criação de personagem"));
      expect(reloaded.container.textContent).toContain("Artemis");
    } finally {
      window.history.replaceState({}, "", originalUrl);
      await reloaded.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
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

  it("conecta conta às rotas reais de colaboração e configurações", async () => {
    const runtime = await createApplicationRuntime({ authAvailability: { available: false, missingKeys: ["VITE_FIREBASE_API_KEY"] } });
    const originalUrl = window.location.href;
    const mounted = await mountRoute(<AppRouter initialPath="/account" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const collaboration = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Abrir colaboração"));
      expect(collaboration).toBeTruthy();
      await click(collaboration!);
      expect(window.location.pathname).toBe("/journey/participants");
    } finally {
      window.history.replaceState({}, "", originalUrl);
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
      const searchButton = mounted.container.querySelector('button[aria-label="Buscar"], button[aria-label="Buscando"]') as HTMLButtonElement | null;
      expect(searchButton).not.toBeNull();
      await click(searchButton as HTMLButtonElement);
      await vi.waitFor(() => expect([...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")].find((button) => button.textContent?.includes("Adaga"))).toBeDefined());
      const result = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")]
        .find((button) => button.textContent?.includes("Adaga")) as HTMLButtonElement | undefined;
      expect(result).toBeDefined();
      await act(async () => result?.click());
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Adaga");
      expect(mounted.container.textContent).toContain("Fonte ·");
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
      const searchButton = mounted.container.querySelector('button[aria-label="Buscar"], button[aria-label="Buscando"]') as HTMLButtonElement | null;
      expect(searchButton).not.toBeNull();
      await click(searchButton as HTMLButtonElement);
      await vi.waitFor(() => expect([...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")].find((button) => button.textContent?.includes("Força"))).toBeDefined());
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

  it("keeps the compendium locked during a lazy failure and retries before category recovery", async () => {
    const runtime = await createApplicationRuntime();
    const originalLoadCatalog = runtime.registry.compendium.loadCatalog;
    let attempts = 0;
    const loadCatalog = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("catálogo lazy indisponível");
      await originalLoadCatalog();
    });
    (runtime.registry.compendium as unknown as { loadCatalog: () => Promise<void> }).loadCatalog = loadCatalog;
    const mounted = await mountRoute(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("catálogo lazy indisponível"));
      const input = mounted.container.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      await act(async () => {
        setter?.call(input, "força");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await click(mounted.container.querySelector('button[aria-label="Buscar"], button[aria-label="Buscando"]') as HTMLButtonElement);
      expect([...mounted.container.querySelectorAll('section[aria-labelledby="compendium-results-title"] button')].find((button) => button.textContent?.includes("Força"))).toBeUndefined();

      const raceCategory = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-categories-title\"] button")].find((button) => button.textContent?.includes("Raças"));
      expect(raceCategory).toBeDefined();
      await click(raceCategory as HTMLButtonElement);
      await vi.waitFor(() => expect(loadCatalog).toHaveBeenCalledTimes(2));

      await click([...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-categories-title\"] button")].find((button) => button.textContent?.includes("Raças")) as HTMLButtonElement);
      await act(async () => {
        setter?.call(input, "força");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await click(mounted.container.querySelector('button[aria-label="Buscar"], button[aria-label="Buscando"]') as HTMLButtonElement);
      await vi.waitFor(() => expect([...mounted.container.querySelectorAll('section[aria-labelledby="compendium-results-title"] button')].find((button) => button.textContent?.includes("Força"))).toBeDefined());
      const result = [...mounted.container.querySelectorAll('section[aria-labelledby="compendium-results-title"] button')].find((button) => button.textContent?.includes("Força")) as HTMLButtonElement;
      await click(result);
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Força");
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
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Poção de cura"));
      await vi.waitFor(() => expect(mounted.container.textContent).toContain("Consumir"));
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
