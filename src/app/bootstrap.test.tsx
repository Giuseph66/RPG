import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Bootstrap, createApplicationRuntime, hasPendingApplicationWork } from "@app/bootstrap";
import type { ApplicationServices } from "@application/state";
import { createCampaign } from "@domain/campaign/journal";
import { fixtureRulesetRef } from "@domain/contracts/fixtures";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { IndexedDbCampaignRepository, openDatabase } from "@infrastructure/persistence/indexeddb";

describe("Bootstrap", () => {
  it("keeps the application landmark visible while local data opens", () => {
    const markup = renderToStaticMarkup(<Bootstrap initialPath="/" />);

    expect(markup).toContain('aria-label="Destinos principais"');
    expect(markup).toContain("Abrindo dados locais");
  });

  it("renders the initial route through the real shell after boot", async () => {
    const runtime = await createApplicationRuntime();
    try {
      const markup = renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath="/compendium" />);

      expect(markup).toContain("Ábaco");
      expect(markup).toContain('aria-current="page"');
      expect(markup).toContain("Compêndio");
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("passes one stable dice controller through repeated renders", async () => {
    const runtime = await createApplicationRuntime();
    try {
      const controller = runtime.diceOverlayController;
      controller.open({ source: "header" });

      const firstMarkup = renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath="/" />);
      const secondMarkup = renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath="/" />);

      expect(runtime.diceOverlayController).toBe(controller);
      expect(firstMarkup).toContain("Dados");
      expect(secondMarkup).toContain("Dados");
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("adopts the registry for all four destinations with truthful local states", async () => {
    const runtime = await createApplicationRuntime();
    try {
      expect(runtime.registry.compendium.service.getIndex().length).toBeGreaterThan(0);
      expect(runtime.registry.compendium.service.search({ category: "attributes" }).entries).toHaveLength(6);
      expect(runtime.registry.compendium.service.search({ category: "skills" }).entries).toHaveLength(18);
      expect(runtime.registry.compendium.service.getCategories().find((category) => category.id === "attributes")).toMatchObject({ status: "available" });
      expect(runtime.registry.compendium.service.getCategories().find((category) => category.id === "skills")).toMatchObject({ status: "available" });
      const routes = [
        ["/character", "Nenhum personagem selecionado"],
        ["/actions", "Nenhum personagem selecionado"],
        ["/journey", "Nenhuma campanha local criada"],
        ["/compendium", "Ábaco"],
      ] as const;
      for (const [path, expected] of routes) {
        expect(renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath={path} />)).toContain(expected);
      }
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("restaura campanha persistida no IndexedDB e a exibe em Jornada após novo runtime", async () => {
    const name = "bootstrap-campaign-restore-r3-02";
    const seeded = await openDatabase({ name });
    if (!seeded.ok) throw new Error(seeded.error.message);
    const created = createCampaign({
      id: asUuid("00000000-0000-4000-8000-000000000201"),
      name: "Campanha persistida",
      description: "Retomada local",
      rulesetRef: fixtureRulesetRef,
      createdAt: asIsoTimestamp("2026-09-12T12:00:00.000Z"),
    });
    if (!created.ok) throw new Error(created.error.message);
    const repository = new IndexedDbCampaignRepository(seeded.value, { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") });
    expect(await repository.save(created.value, asRevision(0))).toMatchObject({ ok: true });
    seeded.value.close();

    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const markup = renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath="/journey" />);
      expect(runtime.services.campaign.store.selectedId).toBe(created.value.id);
      expect(runtime.services.campaign.store.getSnapshot().value?.name).toBe("Campanha persistida");
      expect(markup).toContain("Campanha persistida");
      expect(markup).toContain("Ativa: Campanha persistida");
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("registra o PWA depois do boot e libera o handle no unmount", async () => {
    const runtime = await createApplicationRuntime();
    const removeEventListener = vi.fn();
    const register = vi.fn(async () => ({ scope: "/", waiting: null, removeEventListener }));
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<Bootstrap runtime={runtime} pwaPlatform={{ serviceWorker: { register } }} initialPath="/compendium" />);
        await Promise.resolve();
      });
      expect(register).toHaveBeenCalledWith("/pwa-worker.js", undefined);
      expect(container.textContent ?? "").not.toContain("Abrindo dados locais");
    } finally {
      await act(async () => root.unmount());
      expect(removeEventListener).toHaveBeenCalledWith("updatefound", expect.any(Function));
      container.remove();
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("mantém boot pronto quando o registro PWA falha e adia em status pendente", async () => {
    const runtime = await createApplicationRuntime();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<Bootstrap runtime={runtime} pwaPlatform={{ serviceWorker: { register: vi.fn(async () => { throw new Error("blocked"); }) } }} initialPath="/compendium" />);
        await Promise.resolve();
      });
      expect(container.textContent ?? "").not.toContain("Abrindo dados locais");

      const pendingStore = { getSnapshot: () => ({ status: "saving" as const, hasPendingChanges: true }) };
      const services = { character: { store: pendingStore }, campaign: { store: pendingStore }, settings: { store: pendingStore }, dice: { store: pendingStore } } as unknown as ApplicationServices;
      expect(hasPendingApplicationWork(services)).toBe(true);
      const cleanStore = { getSnapshot: () => ({ status: "clean" as const, hasPendingChanges: false }) };
      const cleanServices = { character: { store: cleanStore }, campaign: { store: cleanStore }, settings: { store: cleanStore }, dice: { store: cleanStore } } as unknown as ApplicationServices;
      expect(hasPendingApplicationWork(cleanServices)).toBe(false);
    } finally {
      await act(async () => root.unmount());
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
      container.remove();
    }
  });
});
