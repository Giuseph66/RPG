import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Bootstrap, createApplicationRuntime, hasPendingApplicationWork } from "@app/bootstrap";
import { click, mount } from "@components/ui/testUtils";
import type { ApplicationServices } from "@application/state";
import { createCampaign } from "@domain/campaign/journal";
import { diceRollAdvantageSample, fixtureRulesetRef, minimalCharacter } from "@domain/contracts/fixtures";
import { asAccountId, asEntityId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import {
  IndexedDbAssetRepository,
  IndexedDbCampaignRepository,
  IndexedDbCharacterRepository,
  IndexedDbDiceHistoryRepository,
  STORE_NAMES,
  openDatabase,
} from "@infrastructure/persistence/indexeddb";
import type { Campaign } from "@domain/contracts/campaign";
import type { BackupEnvelope } from "@domain/contracts/backup";
import type { CreatureGuess, CreatureProposal, CreatureRecord, CreatureSighting } from "@domain/campaign/creatures";
import type { CreatureStatBlock } from "@domain/creatures";
import type { Character } from "@domain/contracts/character";
import type { JournalDraftState } from "@domain/campaign/journal";
import type { AssetTransferPort } from "@application/ports/asset-transfer";

const fixedClock = { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") };

function emptyCampaign(id: ReturnType<typeof asUuid>, characterIds: readonly ReturnType<typeof asUuid>[] = []): Campaign {
  return {
    id,
    schemaVersion: 1,
    revision: asRevision(0),
    name: "Campanha DATA-007",
    description: "",
    rulesetRef: fixtureRulesetRef,
    characterIds,
    sessionCounter: 0,
    npcs: [],
    quests: [],
    objectives: [],
    settings: { optionalRules: [], abilityGenerationMethod: "standard-array", advancementMethod: "xp" },
    createdAt: fixedClock.now(),
    updatedAt: fixedClock.now(),
  };
}

async function readRaw(db: IDBDatabase, storeName: string, id: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const request = tx.objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readAllRaw(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putRaw(db: IDBDatabase, storeName: string, record: { readonly id: string; readonly [key: string]: unknown }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([storeName], "readwrite");
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function campaignCreatureRecords(campaignId: ReturnType<typeof asUuid>) {
  const creatureId = asUuid("00000000-0000-4000-8000-000000000391");
  const accountId = asAccountId("player-backup-test");
  const statBlock: CreatureStatBlock = {
    id: asEntityId("backup-test-wolf"), name: "Lobo do backup", creatureType: "beast", size: "medium", armorClass: 12,
    hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: 900 as never },
    abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
  };
  const creature: CreatureRecord = {
    id: creatureId, campaignId, schemaVersion: 1, revision: asRevision(0), kind: "enemy", name: "Lobo do backup",
    appearance: "Lobo cinzento", race: "Lobo", description: "", hitPoints: "11", armorClass: "12", abilities: "", notes: "Privado",
    statBlock, reveals: [{ accountId, fields: ["name", "statBlock"] }], createdAt: fixedClock.now(), updatedAt: fixedClock.now(),
  };
  const sighting: CreatureSighting = {
    id: `${creatureId}__${accountId}`, campaignId, creatureId, accountId, schemaVersion: 1, revision: asRevision(0),
    revealed: {}, createdAt: fixedClock.now(), updatedAt: fixedClock.now(),
  };
  const guess: CreatureGuess = {
    id: "guess__backup-test", campaignId, creatureId, accountId, schemaVersion: 1, revision: asRevision(0),
    name: "Lobo", note: "Pegadas e uivos", createdAt: fixedClock.now(), updatedAt: fixedClock.now(),
  };
  const proposal: CreatureProposal = {
    id: "proposal__00000000-0000-4000-8000-000000000392", campaignId, schemaVersion: 1, revision: asRevision(0),
    proposedBy: accountId, status: "pending", statBlock, suggestionReasons: ["Rastros recentes"],
    createdAt: fixedClock.now(), updatedAt: fixedClock.now(),
  };
  return { creature, sighting, guess, proposal };
}

async function mountRoute(node: Parameters<typeof mount>[0]) {
  const mounted = await mount(node);
  await act(async () => {
    await vi.dynamicImportSettled();
    for (let index = 0; index < 10; index += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  });
  return mounted;
}

async function waitForText(container: HTMLElement, expected: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (container.textContent?.includes(expected)) return;
    await act(async () => { await new Promise<void>((resolve) => setTimeout(resolve, 25)); });
  }
  throw new Error(`Texto não apareceu no tempo esperado: ${expected}`);
}

describe("Bootstrap", () => {
  it("compõe publicação de mapas quando o transporte Firestore é injetado", async () => {
    const transfer: AssetTransferPort = {
      isAvailable: () => true,
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
    };
    const runtime = await createApplicationRuntime({ assetTransfer: transfer });
    try {
      expect(runtime.registry.journey.mapPublication).toBeDefined();
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("keeps the application landmark visible while local data opens", () => {
    const markup = renderToStaticMarkup(<Bootstrap initialPath="/" />);

    expect(markup).toContain('aria-label="Destinos principais"');
    expect(markup).toContain("Abrindo dados locais");
  });

  it("renders the initial route through the real shell after boot", async () => {
    const runtime = await createApplicationRuntime();
    const mounted = await mountRoute(<Bootstrap runtime={runtime} initialPath="/compendium" />);
    try {
      expect(mounted.container.textContent).toContain("Categorias");
      expect(mounted.container.innerHTML).toContain('aria-current="page"');
      expect(mounted.container.textContent).toContain("Regras");
      const input = mounted.container.querySelector('input[placeholder="Buscar por nome, categoria ou tag"]') as HTMLInputElement | null;
      expect(input).not.toBeNull();
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        await act(async () => {
          setter?.call(input, "ábaco");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        const searchButton = mounted.container.querySelector('button[aria-label="Buscar"], button[aria-label="Buscando"]') as HTMLButtonElement | null;
        expect(searchButton).not.toBeNull();
        await click(searchButton as HTMLButtonElement);
        await vi.waitFor(() => expect([...mounted.container.querySelectorAll('section[aria-labelledby="compendium-results-title"] button')].find((button) => button.textContent?.includes("Ábaco"))).toBeDefined());
        const result = [...mounted.container.querySelectorAll('section[aria-labelledby="compendium-results-title"] button')].find((button) => button.textContent?.includes("Ábaco")) as HTMLButtonElement | undefined;
        expect(result).toBeDefined();
        await click(result as HTMLButtonElement);
        expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Ábaco");
        expect(mounted.container.textContent).toContain("Fonte ·");
      }
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("compõe sessões locais independentemente da disponibilidade do Firebase", async () => {
    const runtime = await createApplicationRuntime();
    try {
      expect(runtime.session).toBeDefined();
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
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
      await runtime.registry.compendium.loadCatalog();
      expect(runtime.registry.compendium.service.getIndex().length).toBeGreaterThan(0);
      expect(runtime.registry.compendium.service.search({ category: "attributes" }).entries).toHaveLength(6);
      expect(runtime.registry.compendium.service.search({ category: "skills" }).entries).toHaveLength(18);
      expect(runtime.registry.compendium.service.getCategories().find((category) => category.id === "attributes")).toMatchObject({ status: "available" });
      expect(runtime.registry.compendium.service.getCategories().find((category) => category.id === "skills")).toMatchObject({ status: "available" });
      const routes = [
        ["/character", "Carregando personagens"],
        ["/actions", "Nenhum personagem selecionado"],
        ["/journey", "Nenhuma campanha selecionada"],
        ["/compendium", "Categorias"],
      ] as const;
      for (const [path, expected] of routes) {
        const mounted = await mountRoute(<Bootstrap runtime={runtime} initialPath={path} />);
        try {
          if (path === "/character") await waitForText(mounted.container, "Nenhum personagem ainda");
          else expect(mounted.container.textContent).toContain(expected);
        } finally {
          await mounted.unmount();
        }
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
    const mounted = await mountRoute(<Bootstrap runtime={runtime} initialPath="/journey" />);
    try {
      expect(runtime.services.campaign.store.selectedId).toBe(created.value.id);
      expect(runtime.services.campaign.store.getSnapshot().value?.name).toBe("Campanha persistida");
      expect(mounted.container.textContent).toContain("Campanha persistida");
      expect(mounted.container.textContent).toContain("Campanha ativa");
    } finally {
      await mounted.unmount();
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
      const errorStore = { getSnapshot: () => ({ status: "error" as const, hasPendingChanges: false }) };
      const errorServices = { character: { store: errorStore }, campaign: { store: cleanStore }, settings: { store: cleanStore }, dice: { store: cleanStore } } as unknown as ApplicationServices;
      expect(hasPendingApplicationWork(errorServices)).toBe(true);
    } finally {
      await act(async () => root.unmount());
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
      container.remove();
    }
  });

  it("bloqueia atualização com rascunho de diário não persistido e libera após salvar ou descartar", () => {
    const cleanStore = { getSnapshot: () => ({ status: "clean" as const, hasPendingChanges: false }) };
    const services = { character: { store: cleanStore }, campaign: { store: cleanStore }, settings: { store: cleanStore }, dice: { store: cleanStore } } as unknown as ApplicationServices;
    let journalState: JournalDraftState | undefined = { status: "dirty" } as JournalDraftState;

    expect(hasPendingApplicationWork(services, () => journalState)).toBe(true);
    journalState = { status: "saved" } as JournalDraftState;
    expect(hasPendingApplicationWork(services, () => journalState)).toBe(false);
    journalState = { status: "dirty" } as JournalDraftState;
    journalState = undefined;
    expect(hasPendingApplicationWork(services, () => journalState)).toBe(false);
  });

  it("DATA-007: reset de personagens desvincula characterIds das campanhas remanescentes", async () => {
    const name = "bootstrap-data-007-reset-characters";
    const seeded = await openDatabase({ name });
    if (!seeded.ok) throw new Error(seeded.error.message);
    const campaignId = asUuid("00000000-0000-4000-8000-000000000301");
    const campaign = emptyCampaign(campaignId, [minimalCharacter.id]);
    const campaigns = new IndexedDbCampaignRepository(seeded.value, fixedClock);
    const characters = new IndexedDbCharacterRepository(seeded.value, fixedClock);
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await characters.save({ ...minimalCharacter, campaignId }, asRevision(0))).ok).toBe(true);
    seeded.value.close();

    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const reset = await runtime.registry.dataManagement?.service.reset({ scope: "characters", confirmation: "explicit" });
      expect(reset).toMatchObject({ ok: true });

      const storedCharacters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      expect((await storedCharacters.get(minimalCharacter.id)).ok).toBe(false);
      const storedCampaigns = new IndexedDbCampaignRepository(runtime.database, fixedClock);
      const stored = await storedCampaigns.get(campaignId);
      if (!stored.ok) throw new Error(stored.error.message);
      expect(stored.value.characterIds).toEqual([]);
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("DATA-007: reset de campanhas desvincula campaignId dos personagens remanescentes", async () => {
    const name = "bootstrap-data-007-reset-campaigns";
    const seeded = await openDatabase({ name });
    if (!seeded.ok) throw new Error(seeded.error.message);
    const campaignId = asUuid("00000000-0000-4000-8000-000000000302");
    const campaign = emptyCampaign(campaignId, [minimalCharacter.id]);
    const campaigns = new IndexedDbCampaignRepository(seeded.value, fixedClock);
    const characters = new IndexedDbCharacterRepository(seeded.value, fixedClock);
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await characters.save({ ...minimalCharacter, campaignId }, asRevision(0))).ok).toBe(true);
    for (const [index, storeName] of [STORE_NAMES.creatures, STORE_NAMES.sightings, STORE_NAMES.guesses, STORE_NAMES.proposals].entries()) {
      await putRaw(seeded.value, storeName, { id: `reset-${index}`, campaignId });
    }
    seeded.value.close();

    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const reset = await runtime.registry.dataManagement?.service.reset({ scope: "campaigns", confirmation: "explicit" });
      expect(reset).toMatchObject({ ok: true });

      const storedCampaigns = new IndexedDbCampaignRepository(runtime.database, fixedClock);
      expect((await storedCampaigns.get(campaignId)).ok).toBe(false);
      const storedCharacters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      const stored = await storedCharacters.get(minimalCharacter.id);
      if (!stored.ok) throw new Error(stored.error.message);
      expect(stored.value.campaignId).toBeUndefined();
      for (const storeName of [STORE_NAMES.creatures, STORE_NAMES.sightings, STORE_NAMES.guesses, STORE_NAMES.proposals]) {
        expect(await readAllRaw(runtime.database, storeName)).toEqual([]);
      }
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("DATA-007: reset de assets desvincula portraitAssetId e remove mapas órfãos", async () => {
    const name = "bootstrap-data-007-reset-assets";
    const seeded = await openDatabase({ name });
    if (!seeded.ok) throw new Error(seeded.error.message);
    const campaignId = asUuid("00000000-0000-4000-8000-000000000303");
    const assetId = asUuid("00000000-0000-4000-8000-000000000304");
    const mapId = asUuid("00000000-0000-4000-8000-000000000305");
    const campaign = emptyCampaign(campaignId);
    const campaigns = new IndexedDbCampaignRepository(seeded.value, fixedClock);
    const characters = new IndexedDbCharacterRepository(seeded.value, fixedClock);
    const assets = new IndexedDbAssetRepository(seeded.value, fixedClock);
    expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);
    expect((await assets.put({ id: assetId, mediaType: "image/png", bytes: new Uint8Array([1]), hash: "hash", originalName: "portrait.png" })).ok).toBe(true);
    expect((await characters.save({ ...minimalCharacter, portraitAssetId: assetId }, asRevision(0))).ok).toBe(true);
    expect((await campaigns.saveMap({ id: mapId, campaignId, name: "Mapa", assetId, pins: [], revision: asRevision(0) }, asRevision(0))).ok).toBe(true);
    seeded.value.close();

    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const reset = await runtime.registry.dataManagement?.service.reset({ scope: "assets", confirmation: "explicit" });
      expect(reset).toMatchObject({ ok: true });

      const storedAssets = new IndexedDbAssetRepository(runtime.database, fixedClock);
      expect((await storedAssets.get(assetId)).ok).toBe(false);
      const storedCharacters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      const character = await storedCharacters.get(minimalCharacter.id);
      if (!character.ok) throw new Error(character.error.message);
      expect(character.value.portraitAssetId).toBeUndefined();
      const storedCampaigns = new IndexedDbCampaignRepository(runtime.database, fixedClock);
      expect((await storedCampaigns.getMap(mapId)).ok).toBe(false);
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("DATA-007: import replace sobrescreve por id preservando o registro anterior em recovery, copy gera ids novos", async () => {
    const name = "bootstrap-data-007-import-modes";
    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const campaignId = asUuid("00000000-0000-4000-8000-000000000306");
      const campaign = emptyCampaign(campaignId);
      const campaigns = new IndexedDbCampaignRepository(runtime.database, fixedClock);
      expect((await campaigns.save(campaign, asRevision(0))).ok).toBe(true);

      const dataManagement = runtime.registry.dataManagement;
      if (!dataManagement) throw new Error("dataManagement não registrado");
      const exported = await dataManagement.service.exportCampaign(campaignId);
      if (!exported.ok) throw new Error(exported.error.message);
      const envelope = exported.value;

      const mutated = { ...campaign, revision: asRevision(1), name: "Campanha mutada" };
      expect((await campaigns.save(mutated, asRevision(1))).ok).toBe(true);
      await runtime.services.campaign.select(campaignId);
      expect(runtime.services.campaign.update((current) => ({ ...current, name: "Campanha em edição" })).ok).toBe(true);

      const replaced = await dataManagement.service.import(envelope, "replace");
      expect(replaced).toMatchObject({ ok: true, value: { rootId: campaignId } });
      expect(runtime.services.campaign.store.getSnapshot()).toMatchObject({
        status: "clean", hasPendingChanges: false, value: { name: "Campanha DATA-007" },
      });
      const afterReplace = await campaigns.get(campaignId);
      if (!afterReplace.ok) throw new Error(afterReplace.error.message);
      expect(afterReplace.value.name).toBe("Campanha DATA-007");

      const recovered = await readRaw(runtime.database, STORE_NAMES.recovery, campaignId);
      expect(recovered).toMatchObject({ sourceStore: STORE_NAMES.campaigns, raw: { name: "Campanha em edição" } });

      const copied = await dataManagement.service.import(envelope, "copy");
      if (!copied.ok) throw new Error(copied.error.message);
      expect(copied.value.rootId).not.toBe(campaignId);
      const original = await campaigns.get(campaignId);
      if (!original.ok) throw new Error(original.error.message);
      expect(original.value.name).toBe("Campanha DATA-007");
      const copy = await campaigns.get(copied.value.rootId);
      expect(copy.ok).toBe(true);
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });

  it("importa as quatro coleções de criaturas atomicamente em replace/copy e reseta com campanhas", async () => {
    const name = "bootstrap-journey-collections-backup";
    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const campaignId = asUuid("00000000-0000-4000-8000-000000000390");
      const otherCampaignId = asUuid("00000000-0000-4000-8000-000000000393");
      const otherBase = campaignCreatureRecords(otherCampaignId);
      const otherCreature: CreatureRecord = { ...otherBase.creature, id: asUuid("00000000-0000-4000-8000-000000000395") };
      const otherSighting: CreatureSighting = { ...otherBase.sighting, id: `${otherCreature.id}__${otherBase.sighting.accountId}`, creatureId: otherCreature.id };
      const otherGuess: CreatureGuess = { ...otherBase.guess, id: "guess__backup-test-other", creatureId: otherCreature.id };
      const otherProposal: CreatureProposal = { ...otherBase.proposal, id: "proposal__backup-test-other" };
      await Promise.all([
        putRaw(runtime.database, STORE_NAMES.creatures, otherCreature),
        putRaw(runtime.database, STORE_NAMES.sightings, otherSighting),
        putRaw(runtime.database, STORE_NAMES.guesses, otherGuess),
        putRaw(runtime.database, STORE_NAMES.proposals, otherProposal),
      ]);
      const { creature, sighting, guess, proposal } = campaignCreatureRecords(campaignId);
      const beastRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: creature.statBlock!.id };
      const original: Character = {
        ...minimalCharacter,
        campaignId,
        hp: { current: 17, temp: 2 },
        beastSightings: [{ beastRef }],
      };
      const activeForm: Character = {
        ...original,
        transformation: {
          id: asUuid("00000000-0000-4000-8000-000000000394"),
          formRef: beastRef,
          originalSnapshotRef: original.id,
          originalSnapshot: original,
          originalMaximumHitPoints: 17,
          formSnapshot: creature.statBlock,
          formMaximumHitPoints: 11,
          formHp: { current: 4, temp: 5 },
          duration: { kind: "hours", value: 1 },
          equipmentDisposition: "stored",
          retainedFeatureIds: [],
        },
      };
      const campaigns = new IndexedDbCampaignRepository(runtime.database, fixedClock);
      expect((await campaigns.save(emptyCampaign(campaignId, [activeForm.id]), asRevision(0))).ok).toBe(true);
      const characters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      expect((await characters.save(activeForm, asRevision(0))).ok).toBe(true);
      const dataManagement = runtime.registry.dataManagement;
      if (!dataManagement) throw new Error("dataManagement não registrado");
      const exported = await dataManagement.service.exportCampaign(campaignId);
      if (!exported.ok) throw new Error(exported.error.message);
      const envelope: BackupEnvelope = {
        ...exported.value,
        records: {
          ...exported.value.records,
          creatures: [creature],
          sightings: [sighting],
          guesses: [guess],
          proposals: [proposal],
        },
      };

      expect(await dataManagement.service.import(envelope, "replace")).toMatchObject({ ok: true, value: { rootId: campaignId } });
      for (const [storeName, id] of [
        [STORE_NAMES.creatures, creature.id],
        [STORE_NAMES.sightings, sighting.id],
        [STORE_NAMES.guesses, guess.id],
        [STORE_NAMES.proposals, proposal.id],
      ] as const) expect(await readRaw(runtime.database, storeName, id)).toBeDefined();
      expect(await readRaw(runtime.database, STORE_NAMES.creatures, otherCreature.id)).toEqual(otherCreature);
      expect(await readRaw(runtime.database, STORE_NAMES.sightings, otherSighting.id)).toEqual(otherSighting);
      expect(await readRaw(runtime.database, STORE_NAMES.guesses, otherGuess.id)).toEqual(otherGuess);
      expect(await readRaw(runtime.database, STORE_NAMES.proposals, otherProposal.id)).toEqual(otherProposal);
      const reloadedCharacters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      const reloaded = await reloadedCharacters.get(activeForm.id);
      if (!reloaded.ok) throw new Error(reloaded.error.message);
      expect(reloaded.value).toMatchObject({
        hp: { current: 17, temp: 2 },
        beastSightings: [{ beastRef }],
        transformation: {
          formRef: beastRef,
          originalSnapshot: { hp: { current: 17, temp: 2 } },
          originalMaximumHitPoints: 17,
          formSnapshot: { id: creature.statBlock!.id },
          formMaximumHitPoints: 11,
          formHp: { current: 4, temp: 5 },
        },
      });
      expect(await readRaw(runtime.database, STORE_NAMES.creatures, creature.id)).toMatchObject({ reveals: [{ fields: ["name", "statBlock"] }] });

      const validStoreState = await Promise.all([
        readAllRaw(runtime.database, STORE_NAMES.creatures),
        readAllRaw(runtime.database, STORE_NAMES.sightings),
        readAllRaw(runtime.database, STORE_NAMES.guesses),
        readAllRaw(runtime.database, STORE_NAMES.proposals),
      ]);
      const invalid = {
        ...envelope,
        records: { ...envelope.records, proposals: [{ ...proposal, statBlock: null }] },
      } as unknown as BackupEnvelope;
      const invalidImport = await dataManagement.service.import(invalid, "replace");
      expect(invalidImport.ok).toBe(false);
      const storesAfterInvalidImport = await Promise.all([
        readAllRaw(runtime.database, STORE_NAMES.creatures),
        readAllRaw(runtime.database, STORE_NAMES.sightings),
        readAllRaw(runtime.database, STORE_NAMES.guesses),
        readAllRaw(runtime.database, STORE_NAMES.proposals),
      ]);
      expect(storesAfterInvalidImport).toEqual(validStoreState);

      const copied = await dataManagement.service.import(envelope, "copy");
      expect(copied.ok).toBe(true);
      for (const storeName of [STORE_NAMES.creatures, STORE_NAMES.sightings, STORE_NAMES.guesses, STORE_NAMES.proposals]) {
        expect(await readAllRaw(runtime.database, storeName)).toHaveLength(3);
      }
      expect(await dataManagement.service.reset({ scope: "campaigns", confirmation: "explicit" })).toMatchObject({ ok: true });
      for (const storeName of [STORE_NAMES.creatures, STORE_NAMES.sightings, STORE_NAMES.guesses, STORE_NAMES.proposals]) {
        expect(await readAllRaw(runtime.database, storeName)).toEqual([]);
      }
    } finally {
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("DATA-007: importação restaura rolagens no formato do histórico local", async () => {
    const name = "bootstrap-data-007-import-rolls";
    const runtime = await createApplicationRuntime({ database: { name } });
    try {
      const characters = new IndexedDbCharacterRepository(runtime.database, fixedClock);
      expect((await characters.save(minimalCharacter, asRevision(0))).ok).toBe(true);
      const dataManagement = runtime.registry.dataManagement;
      if (!dataManagement) throw new Error("dataManagement não registrado");
      const exported = await dataManagement.service.exportCharacter(minimalCharacter.id);
      if (!exported.ok) throw new Error(exported.error.message);
      const envelope = {
        ...exported.value,
        records: { ...exported.value.records, rolls: [{ ...diceRollAdvantageSample, characterId: minimalCharacter.id }] },
      };

      expect(await dataManagement.service.import(envelope, "replace")).toMatchObject({ ok: true });

      const history = new IndexedDbDiceHistoryRepository(runtime.database, fixedClock);
      const restored = await history.list({ characterId: minimalCharacter.id });
      if (!restored.ok) throw new Error(restored.error.message);
      expect(restored.value.entries).toHaveLength(1);
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });
});
