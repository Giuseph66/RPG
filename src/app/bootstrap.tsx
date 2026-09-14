import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  ApplicationServicesProvider,
  createApplicationServices,
  useExternalStore,
  type ApplicationServices,
} from "@application/state";
import {
  IndexedDbCampaignRepository,
  IndexedDbCharacterRepository,
  IndexedDbDiceHistoryRepository,
  IndexedDbAssetRepository,
  IndexedDbRecoveryRepository,
  IndexedDbUnitOfWork,
  IndexedDbOutboxRepository,
  IndexedDbMembershipRepository,
  IndexedDbSessionRepository,
  IndexedDbRemoteHydrationRepository,
  CryptoIdGenerator,
  SystemClock,
  openDatabase,
  type OpenDatabaseOptions,
} from "@infrastructure/persistence/indexeddb";
import { STORE_NAMES } from "@infrastructure/persistence/indexeddb/schema";
import { requestToPromise, runTransaction } from "@infrastructure/persistence/indexeddb/transaction";
import { LocalStorageSettingsRepository } from "@infrastructure/preferences";
import { createPlatformRandomSource } from "@domain/dice";
import { createDiceOverlayController, type DiceOverlayController } from "@features/dice";
import { createCompendiumService } from "@application/compendium";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { STATIC_COMPENDIUM_ITEMS } from "@data/compendium";
import { registerPwa, type PwaPlatform, type RegisteredPwa } from "@infrastructure/pwa";
import { deriveCharacter } from "@domain/rules";
import { deriveActionCapabilities, type DeriveActionCapabilitiesResult } from "@application/character/action-capabilities";
import { publishLocalCharacters } from "@application/character";
import { createActionDispatcher } from "@application/character/action-dispatcher";
import { createInventoryDispatcher } from "@application/character/inventory-dispatcher";
import { createCampaignDispatcher } from "@application/campaign/campaign-dispatcher";
import { createLocalCampaignCleanupManifestReader } from "@application/campaign/cleanup-manifest-reader";
import { createCampaignRecordDispatcher } from "@application/campaign/campaign-record-dispatcher";
import { createJournalDispatcher } from "@application/campaign/journal-dispatcher";
import { chooseCampaignForRestore } from "@application/campaign";
import { createBackupService, DataManagementService } from "@application/transfer";
import { createAssetSyncService, type AssetSyncService } from "@application/assets/service";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { BackupEnvelope, ImportMode } from "@domain/contracts/backup";
import type { Asset } from "@domain/contracts/campaign";
import type { Character, CharacterDraft } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { AvailableAction, RuleContext } from "@domain/contracts/rules";
import type { ActionCapability } from "@features/actions";
import { createCharacterDraft } from "@domain/character/creation";
import type { CreationWizardService } from "@features/character/creation";
import type { JournalDraftState } from "@domain/campaign/journal";
import type { AuthPort } from "@application/ports/auth-port";
import type { AccountAvailability, AccountSyncState } from "@features/account";
import { FirebaseAuthAdapter, createFirebaseAssetStorageAdapter, getFirebaseApp, getFirebaseConfigDiagnostic } from "@infrastructure/cloud/firebase";
import type { AssetTransferPort } from "@application/ports/asset-transfer";
import { getFirestoreClient, createFirebaseFirestoreSyncAdapter } from "@infrastructure/cloud/firebase";
import { createSessionGatedOutboxRepository, createSyncOutboxService, createSyncRuntime, type SyncRuntime } from "@application/sync";
import { createMembershipService, loadOrCreateLocalIdentity, type LocalIdentityStorage, type MembershipService } from "@application/membership";
import { createSessionService, type SessionService } from "@application/session";
import type { SyncRuntimeSnapshot } from "@application/sync";
import { type SessionAuthorizationPort } from "@application/session/authorization";
import { asAccountId, type AccountId, type Uuid } from "@domain/contracts/ids";
import { createFeatureRegistry, type FeatureRegistry } from "./feature-registry";
import { AppRouter } from "./router";

/**
 * Contexto de regra estático usado para derivar capacidades de Ações. Não há relógio de jogo
 * nem rastreador de turno na V1 (03-ARQUITETURA.md não exige um); listar os quatro tipos de
 * ação sempre disponíveis é uma constante de apresentação, não uma decisão de mestre inferida —
 * `RuleContext.availableActions` só filtra QUAIS TIPOS existem, nunca decide se o jogador pode
 * agir agora.
 */
const STATIC_RULE_CONTEXT: RuleContext = {
  gameTime: { day: 1, hour: 0, minute: 0 },
  availableActions: ["action", "bonus-action", "reaction", "free"] satisfies readonly AvailableAction[],
  tablePolicies: [],
};

const EMPTY_SYNC_SNAPSHOT: SyncRuntimeSnapshot = { state: "signed-out" };
const EMPTY_SYNC_SUBSCRIBE = (_listener: () => void): (() => void) => () => undefined;

export interface ApplicationRuntime {
  readonly database: IDBDatabase;
  readonly services: ApplicationServices;
  /** Offline-first account and campaign membership use cases. */
  readonly membership: MembershipService;
  /** Offline-first campaign session use cases; authorization comes from local memberships. */
  readonly session: SessionService;
  /** Local asset repository with an authenticated Cloud Storage adapter when available. */
  readonly assets: AssetSyncService;
  readonly diceOverlayController: DiceOverlayController;
  /** Recalcula `ActionCapability[]` para o personagem informado; atualiza o dispatcher acoplado. */
  readonly computeActionCapabilities: (character: Character | undefined) => readonly ActionCapability[];
  readonly registry: FeatureRegistry;
  /** Pack ativo, exposto para a rota de criação montar `CharacterCreationWizard`. */
  readonly pack: RulePack;
  /** Gera um `CharacterDraft` novo (novo ID/timestamp) a cada chamada; UI decide quando chamar. */
  readonly createDraft: () => CharacterDraft;
  readonly onCharacterCreated: (character: Character) => void;
  /** Optional remote identity; local data never depends on this capability. */
  readonly auth?: AuthPort;
  readonly authAvailability: AccountAvailability;
  /** Runtime sync is optional and remains local-only without Firebase config/session. */
  readonly sync?: SyncRuntime;
}

export interface BootstrapProps {
  /** Útil para SSR e testes de navegação; em produção a URL atual é usada. */
  readonly initialPath?: string;
  /** Permite renderizar uma composição já aberta em testes de integração. */
  readonly runtime?: ApplicationRuntime;
  /** Injeta a fronteira do browser para testes/hosts que controlam o registro PWA. */
  readonly pwaPlatform?: PwaPlatform;
}

export interface ApplicationRuntimeOptions {
  /** Permite isolar uma instância de runtime sem alterar a composição de produção. */
  readonly database?: OpenDatabaseOptions;
  readonly settingsStorage?: Storage;
  /** AuthPort fake for tests/hosts; production resolves Firebase lazily from build config. */
  readonly auth?: AuthPort;
  readonly authAvailability?: AccountAvailability;
  /** Optional transfer adapter for hosts/tests; production resolves Firebase lazily. */
  readonly assetTransfer?: AssetTransferPort;
  /** Storage simples e injetável para a identidade local persistente. */
  readonly localIdentityStorage?: LocalIdentityStorage;
}

function decodeImportedAsset(asset: BackupEnvelope["assets"][number]): Asset {
  const binary = typeof atob === "function" ? atob(asset.bytes) : Buffer.from(asset.bytes, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { id: asset.id, mediaType: asset.mediaType, bytes, hash: asset.hash, width: asset.width, height: asset.height, originalName: `imported-${asset.id}` };
}

/**
 * O callback do backup usa uma transação única do banco para todos os registros do envelope.
 *
 * `copy` (IDs remapeados por `DefaultBackupService.remap` antes de chegar aqui) e `replace`
 * (IDs originais, sobrescrevendo o agregado existente) têm semântica distinta: `replace`
 * preserva o valor anterior de cada registro sobrescrito em `recovery` antes do `put`, para que
 * a substituição nunca seja silenciosa e permaneça recuperável; `copy` nunca colide com um
 * registro existente (IDs são sempre novos), então não há nada para preservar.
 */
function commitBackupEnvelope(database: IDBDatabase, clock: { readonly now: () => string }, input: { readonly envelope: BackupEnvelope; readonly mode: ImportMode }): Promise<Result<{ readonly rootId: BackupEnvelope["rootId"] }, AppError>> {
  const stores = [STORE_NAMES.characters, STORE_NAMES.campaigns, STORE_NAMES.journalEntries, STORE_NAMES.maps, STORE_NAMES.rolls, STORE_NAMES.favorites, STORE_NAMES.assets, STORE_NAMES.recovery];
  return runTransaction(database, stores, "readwrite", async (tx) => {
    const { envelope, mode } = input;
    const now = clock.now();

    async function put<T extends { readonly id: string }>(storeName: string, record: T): Promise<void> {
      const store = tx.objectStore(storeName);
      if (mode === "replace") {
        const existing = await requestToPromise(store.get(record.id));
        if (existing !== undefined) {
          await requestToPromise(
            tx.objectStore(STORE_NAMES.recovery).put({ id: record.id, sourceStore: storeName, raw: existing, recordedAt: now }),
          );
        }
      }
      await requestToPromise(store.put(record));
    }

    for (const record of envelope.records.characters) await put(STORE_NAMES.characters, record);
    for (const record of envelope.records.campaigns) await put(STORE_NAMES.campaigns, record);
    for (const record of envelope.records.journalEntries) await put(STORE_NAMES.journalEntries, record);
    for (const record of envelope.records.maps) await put(STORE_NAMES.maps, record);
    // O envelope expõe DiceRoll diretamente, mas o store local mantém o wrapper
    // `StoredRoll` usado pelo DiceHistoryRepository. Gravar o DiceRoll cru faria a
    // importação parecer bem-sucedida e corromperia o histórico na próxima leitura.
    for (const record of envelope.records.rolls) {
      await put(STORE_NAMES.rolls, { id: record.id, roll: record, ...(record.characterId === undefined ? {} : { characterId: record.characterId }) });
    }
    for (const id of envelope.records.favorites) await put(STORE_NAMES.favorites, { id });
    for (const asset of envelope.assets) await put(STORE_NAMES.assets, decodeImportedAsset(asset));
    return ok({ rootId: envelope.rootId });
  });
}

type ResetScope = "characters" | "campaigns" | "assets" | "dice-history" | "all";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

/**
 * Reset seletivo apaga uma fatia dos dados locais mas nunca pode deixar as fatias
 * remanescentes referenciando algo que sumiu (08-PERSISTENCIA-LOCAL.md, DATA-007): apagar
 * `characters` desvincula `campaign.characterIds`; apagar `campaigns` desvincula
 * `character.campaignId`; apagar `assets` desvincula `character.portraitAssetId` e remove
 * mapas cujo `assetId` (campo obrigatório) deixaria de existir.
 */
function resetLocalData(database: IDBDatabase, clock: { readonly now: () => string }, request: { readonly scope: ResetScope }): Promise<Result<void, AppError>> {
  const byScope: Record<ResetScope, readonly string[]> = {
    characters: [STORE_NAMES.characters, STORE_NAMES.drafts],
    campaigns: [STORE_NAMES.campaigns, STORE_NAMES.journalEntries, STORE_NAMES.maps],
    assets: [STORE_NAMES.assets],
    "dice-history": [STORE_NAMES.rolls],
    all: Object.values(STORE_NAMES),
  };
  const extraStores: Record<ResetScope, readonly string[]> = {
    characters: [STORE_NAMES.campaigns, STORE_NAMES.assets, STORE_NAMES.maps, STORE_NAMES.rolls, STORE_NAMES.commandReceipts],
    campaigns: [STORE_NAMES.characters, STORE_NAMES.assets],
    assets: [STORE_NAMES.characters, STORE_NAMES.maps],
    "dice-history": [],
    all: [],
  };
  const scope = request.scope;
  const stores = [...new Set([...byScope[scope], ...extraStores[scope]])];

  return runTransaction(database, stores, "readwrite", async (tx) => {
    const now = clock.now();
    const charactersStore = tx.objectStore(STORE_NAMES.characters);
    const mapsStore = tx.objectStore(STORE_NAMES.maps);
    const rawCharacters = scope === "characters" || scope === "campaigns"
      ? await requestToPromise(charactersStore.getAll())
      : [];
    const rawMaps = scope === "characters" || scope === "campaigns"
      ? await requestToPromise(mapsStore.getAll())
      : [];
    const removedCharacterIds = new Set(
      scope === "characters"
        ? rawCharacters.flatMap((raw) => {
            const record = asRecord(raw);
            return typeof record?.id === "string" ? [record.id] : [];
          })
        : [],
    );
    const portraitAssetIds = new Set(
      scope === "characters"
        ? rawCharacters.flatMap((raw) => {
            const record = asRecord(raw);
            return typeof record?.portraitAssetId === "string" ? [record.portraitAssetId] : [];
          })
        : [],
    );
    const campaignMapAssetIds = new Set(
      scope === "campaigns"
        ? rawMaps.flatMap((raw) => {
            const record = asRecord(raw);
            return typeof record?.assetId === "string" ? [record.assetId] : [];
          })
        : [],
    );
    for (const name of byScope[scope]) await requestToPromise(tx.objectStore(name).clear());

    if (scope === "characters") {
      const campaignsStore = tx.objectStore(STORE_NAMES.campaigns);
      const raws = await requestToPromise(campaignsStore.getAll());
      for (const raw of raws) {
        const record = asRecord(raw);
        const characterIds = record?.characterIds;
        if (!record || !Array.isArray(characterIds) || characterIds.length === 0) continue;
        await requestToPromise(campaignsStore.put({ ...record, characterIds: [], revision: Number(record.revision) + 1, updatedAt: now }));
      }

      const assetsStore = tx.objectStore(STORE_NAMES.assets);
      for (const raw of rawMaps) {
        const record = asRecord(raw);
        if (typeof record?.assetId === "string") portraitAssetIds.delete(record.assetId);
      }
      for (const assetId of portraitAssetIds) await requestToPromise(assetsStore.delete(assetId));

      const rollsStore = tx.objectStore(STORE_NAMES.rolls);
      const rollRaws = await requestToPromise(rollsStore.getAll());
      for (const raw of rollRaws) {
        const record = asRecord(raw);
        if (typeof record?.id === "string" && typeof record.characterId === "string" && removedCharacterIds.has(record.characterId)) {
          await requestToPromise(rollsStore.delete(record.id));
        }
      }
      const receiptsStore = tx.objectStore(STORE_NAMES.commandReceipts);
      const receiptRaws = await requestToPromise(receiptsStore.getAll());
      for (const raw of receiptRaws) {
        const record = asRecord(raw);
        if (typeof record?.commandId === "string" && typeof record.characterId === "string" && removedCharacterIds.has(record.characterId)) {
          await requestToPromise(receiptsStore.delete(record.commandId));
        }
      }
    }

    if (scope === "campaigns") {
      for (const raw of rawCharacters) {
        const record = asRecord(raw);
        if (!record || record.campaignId === undefined) continue;
        const { campaignId: _campaignId, ...rest } = record;
        await requestToPromise(charactersStore.put({ ...rest, revision: Number(record.revision) + 1, updatedAt: now }));
      }

      const retainedPortraits = new Set(
        rawCharacters.flatMap((raw) => {
          const record = asRecord(raw);
          return typeof record?.portraitAssetId === "string" ? [record.portraitAssetId] : [];
        }),
      );
      const assetsStore = tx.objectStore(STORE_NAMES.assets);
      for (const assetId of campaignMapAssetIds) {
        if (!retainedPortraits.has(assetId)) await requestToPromise(assetsStore.delete(assetId));
      }
    }

    if (scope === "assets") {
      const characterRaws = await requestToPromise(charactersStore.getAll());
      for (const raw of characterRaws) {
        const record = asRecord(raw);
        if (!record || record.portraitAssetId === undefined) continue;
        const { portraitAssetId: _portraitAssetId, ...rest } = record;
        await requestToPromise(charactersStore.put({ ...rest, revision: Number(record.revision) + 1, updatedAt: now }));
      }

      const mapRaws = await requestToPromise(mapsStore.getAll());
      for (const raw of mapRaws) {
        const record = asRecord(raw);
        if (!record) continue;
        await requestToPromise(mapsStore.delete(record.id as IDBValidKey));
      }
    }

    return ok(undefined);
  });
}

/** Abre os adapters e hidrata preferências, personagem ativo e campanha persistida. */
export async function createApplicationRuntime(options: ApplicationRuntimeOptions = {}): Promise<ApplicationRuntime> {
  const opened = await openDatabase(options.database);
  if (!opened.ok) throw new Error(opened.error.message);

  const database = opened.value;
  const firebaseDiagnostic = getFirebaseConfigDiagnostic();
  const firebaseApp = options.auth ? null : getFirebaseApp();
  const auth = options.auth ?? (firebaseApp ? new FirebaseAuthAdapter(firebaseApp) : undefined);
  const authAvailability: AccountAvailability = options.authAvailability ?? (firebaseDiagnostic.available
    ? { available: Boolean(auth) }
    : { available: false, missingKeys: firebaseDiagnostic.missingKeys });
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();
  let localIdentityStorage = options.localIdentityStorage;
  if (!localIdentityStorage && typeof window !== "undefined") {
    try { localIdentityStorage = window.localStorage; } catch { /* storage bloqueado: identidade desta execução será efêmera */ }
  }
  const localIdentity = loadOrCreateLocalIdentity({ storage: localIdentityStorage, idGenerator });
  const characterRepository = new IndexedDbCharacterRepository(database, clock);
  const campaignRepository = new IndexedDbCampaignRepository(database, clock);
  const assetRepository = new IndexedDbAssetRepository(database, clock);
  const recoveryRepository = new IndexedDbRecoveryRepository(database);
  const outboxRepository = new IndexedDbOutboxRepository(database, clock);
  const membershipRepository = new IndexedDbMembershipRepository(database);
  const sessionRepository = new IndexedDbSessionRepository(database, clock);
  const remoteHydration = new IndexedDbRemoteHydrationRepository(database);
  const cleanupManifestReader = createLocalCampaignCleanupManifestReader({
    campaigns: campaignRepository,
    characters: characterRepository,
    memberships: membershipRepository,
    sessions: sessionRepository,
    assets: assetRepository,
    ownerUid: () => auth?.currentSession()?.uid ?? localIdentity.accountId,
  });
  let syncRuntime: SyncRuntime | undefined;
  const gatedOutboxRepository = createSessionGatedOutboxRepository(
    outboxRepository,
    { currentSession: () => auth?.currentSession() ?? null },
    { onEnqueued: () => syncRuntime?.notifyPending() },
  );
  const services = createApplicationServices({
    characterRepository,
    campaignRepository,
    settingsRepository: new LocalStorageSettingsRepository(options.settingsStorage),
    diceHistoryRepository: new IndexedDbDiceHistoryRepository(database, clock),
    unitOfWork: new IndexedDbUnitOfWork(database),
    clock,
    idGenerator,
    outboxRepository: gatedOutboxRepository,
    cleanupManifestReader,
  });
  // The membership service is always local-capable. Reuse the session-gated outbox
  // after it is created so an authenticated offline session queues for replay while a
  // signed-out local session never emits cloud operations.
  const membershipWithSync = createMembershipService({
    repository: membershipRepository,
    clock,
    idGenerator,
    unitOfWork: new IndexedDbUnitOfWork(database),
    syncOutbox: createSyncOutboxService(gatedOutboxRepository),
    localIdentity,
  });
  const sessionAuthorization: SessionAuthorizationPort = {
    async getCampaignRole(campaignId, accountId: AccountId) {
      const membership = await membershipRepository.getMembership(campaignId, accountId);
      if (!membership.ok) return err(membership.error);
      return ok(membership.value.status === "active" ? membership.value.role : "player");
    },
  };
  const session = createSessionService({
    repository: sessionRepository,
    authorization: sessionAuthorization,
    clock,
    idGenerator,
    unitOfWork: new IndexedDbUnitOfWork(database),
    syncOutbox: createSyncOutboxService(gatedOutboxRepository),
    localIdentity,
    ensureLocalOwner: (campaignId: Uuid, accountId: AccountId) => membershipWithSync.ensureCampaignOwner({ actorId: accountId, campaignId }),
  });
  const assetTransfer = options.assetTransfer ?? (firebaseApp && auth
    ? createFirebaseAssetStorageAdapter({
        app: firebaseApp,
        isAuthenticated: () => auth.currentSession() !== null,
      })
    : undefined);
  const assets = createAssetSyncService(assetRepository, assetTransfer);

  try {
    const settings = await services.settings.hydrate();
    if (!settings.ok) throw new Error(settings.error.message);

    if (settings.value.activeCharacterId !== undefined) {
      // `select` (não `hydrate`) marca o ID como selecionado antes de buscar o agregado —
      // `AggregateStore.hydrate(id)` só publica o snapshot quando `this.selected === id`
      // (guarda contra corrida entre trocas de personagem); sem `select` primeiro, o
      // personagem ativo nunca é restaurado ao recarregar a página, mesmo com sucesso na
      // leitura. Bug pré-existente descoberto ao verificar o achado #1 de QA-004.
      const character = await services.character.select(settings.value.activeCharacterId);
      if (!character.ok) throw new Error(character.error.message);
    }

    const campaigns = await services.campaign.list();
    if (!campaigns.ok) throw new Error(campaigns.error.message);
    // Every local campaign gets a device owner. This enables collaboration and
    // session records offline without pretending the device is a Firebase user.
    await membershipWithSync.ensureAccount({ actorId: localIdentity.accountId, email: null, displayName: localIdentity.displayName });
    for (const campaign of campaigns.value) {
      await membershipWithSync.ensureCampaignOwner({ actorId: localIdentity.accountId, campaignId: campaign.id });
    }
    const campaignToRestore = chooseCampaignForRestore(campaigns.value);
    if (campaignToRestore) {
      const campaign = await services.campaign.hydrate(campaignToRestore.id);
      if (!campaign.ok) throw new Error(campaign.error.message);
    }

    const diceOverlayController = createDiceOverlayController({
      history: services.dice,
      rng: createPlatformRandomSource(),
      idGenerator,
      clock,
    });

    const pack = loadPhbPtBrLocal2017();
    if (!pack.ok) throw new Error(pack.error.message);
    const activePack = pack.value;
    const compendiumService = createCompendiumService({ packs: [activePack], items: STATIC_COMPENDIUM_ITEMS, excludePackEntityTypes: ["spell", "condition", "race", "class", "background", "feat"] });

    // `executionsHolder` liga a lista reativa de capacidades (recalculada a cada snapshot de
    // personagem por `computeActionCapabilities`, chamado de `ReadyApplication`) ao dispatcher
    // estático abaixo, sem recriar o dispatcher a cada render — `capabilitiesById` é uma função
    // de leitura, nunca um Map fixo, para nunca resolver contra uma lista de capacidades velha.
    const executionsHolder: { current: DeriveActionCapabilitiesResult["executions"] } = { current: new Map() };
    const actionDispatcher = createActionDispatcher({
      characterService: services.character,
      capabilitiesById: (id) => executionsHolder.current.get(id),
      rng: createPlatformRandomSource(),
      idGenerator,
      clock,
    });
    const inventoryDispatcher = createInventoryDispatcher({ characterService: services.character });

    // `saveCharacter` não existe em `CharacterApplicationService` de propósito (ele só grava o
    // agregado já selecionado no store, ver `features/character/creation/types.ts`); o wizard
    // recebe este adaptador fino sobre o repository, nunca o port diretamente.
    const creationService: CreationWizardService = {
      saveDraft: (draft) => services.character.saveDraft(draft),
      deleteDraft: (id) => services.character.deleteDraft(id),
      saveCharacter: (character, expectedRevision) => services.character.saveCharacter(character, expectedRevision),
    };

    function createDraft(): CharacterDraft {
      const created = createCharacterDraft({
        id: idGenerator.uuid(),
        rulesetRef: { id: activePack.manifest.id, version: activePack.manifest.version },
        createdAt: clock.now(),
      });
      if (!created.ok) throw new Error(created.error.message);
      return created.value;
    }

    function computeActionCapabilities(character: Character | undefined): readonly ActionCapability[] {
      if (!character) {
        executionsHolder.current = new Map();
        return [];
      }
      const derived = deriveCharacter(character, activePack, STATIC_RULE_CONTEXT);
      if (!derived.ok) {
        executionsHolder.current = new Map();
        return [];
      }
      const { capabilities, executions } = deriveActionCapabilities(character, derived.value, activePack, idGenerator);
      executionsHolder.current = executions;
      return capabilities;
    }

    const rulesetRef = { id: activePack.manifest.id, version: activePack.manifest.version };
    const campaignDispatcher = createCampaignDispatcher({ campaignService: services.campaign, repository: campaignRepository, idGenerator, clock, rulesetRef });
    const campaignRecordDispatcher = createCampaignRecordDispatcher({ campaignService: services.campaign });
    const journalDispatcher = createJournalDispatcher({ campaignService: services.campaign, repository: campaignRepository, idGenerator, clock });
    const backup = createBackupService({
      characters: characterRepository,
      campaigns: campaignRepository,
      assets: assetRepository,
      appVersion: "0.0.0",
      now: () => clock.now(),
      idGenerator,
      availableRulesets: [rulesetRef],
      commitImport: (input) => commitBackupEnvelope(database, clock, input),
    });
    const dataManagement = new DataManagementService({
      backup,
      reset: (request) => resetLocalData(database, clock, request),
      recovery: recoveryRepository,
    });

    const registry = createFeatureRegistry({
      services,
      compendiumService,
      diceOverlayController,
      actionDispatcher,
      inventoryDispatcher,
      creationService,
      campaignDispatcher,
      campaignRecordDispatcher,
      journalDispatcher,
      listCharacters: () => characterRepository.list(),
      listCharacterDrafts: () => characterRepository.listDrafts(),
      listJournalEntries: (campaignId) => campaignRepository.listJournalEntries(campaignId),
      journalDraftState: () => journalDispatcher.getDraftState(),
      dataManagement: { service: dataManagement, previewImport: (envelope) => backup.previewImport(envelope) },
      auth,
      authAvailability,
      membership: membershipWithSync,
      session,
      publishLocalCharacters: async () => {
        const current = auth?.currentSession();
        if (!current) return Promise.resolve(err(appError.validation("account", "Entre em uma conta antes de enviar fichas para a nuvem.")));
        const published = await publishLocalCharacters({ characters: characterRepository, outbox: gatedOutboxRepository, ownerUid: asAccountId(current.uid), clock });
        // Um clique explícito em "Salvar perfil" também reativa operações pendentes
        // de uma tentativa anterior, inclusive as já deduplicadas.
        syncRuntime?.notifyPending();
        return published;
      },
    });

    syncRuntime = auth
      ? createSyncRuntime({
          auth,
          outbox: outboxRepository,
          clock,
          hydration: remoteHydration,
          createAdapter: (uid) => {
            if (!firebaseApp) return undefined;
            try {
              const firestore = getFirestoreClient(firebaseApp).firestore;
              return createFirebaseFirestoreSyncAdapter({ firestore, ownerUid: uid });
            } catch {
              return undefined;
            }
          },
        })
      : undefined;

    return { database, services, membership: membershipWithSync, session, assets, diceOverlayController, registry, computeActionCapabilities, pack: activePack, createDraft, auth, authAvailability, sync: syncRuntime, onCharacterCreated: (character: Character) => { void services.character.select(character.id); } };
  } catch (cause) {
    services.character.dispose();
    services.campaign.dispose();
    services.settings.dispose();
    services.dice.dispose();
    syncRuntime?.dispose();
    database.close();
    throw cause;
  }
}

function errorMessage(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : undefined;
}

const PENDING_STORE_STATUSES = new Set(["dirty", "saving", "conflict", "error"]);

/** Predicado conservador: só libera atualização quando stores e rascunhos locais estão resolvidos. */
export function hasPendingApplicationWork(services: ApplicationServices, journalDraftState?: () => JournalDraftState | undefined): boolean {
  const storesHavePendingWork = [services.character.store, services.campaign.store, services.settings.store, services.dice.store].some((store) => {
    const snapshot = store.getSnapshot();
    return snapshot.hasPendingChanges || PENDING_STORE_STATUSES.has(snapshot.status);
  });
  if (storesHavePendingWork) return true;

  const journalState = journalDraftState?.();
  // `error` também mantém texto não persistido no dispatcher; só clean/saved
  // significam que o draft foi descartado ou gravado com sucesso.
  return journalState !== undefined && journalState.status !== "clean" && journalState.status !== "saved";
}

function accountSyncState(snapshot: SyncRuntimeSnapshot): AccountSyncState {
  switch (snapshot.state) {
    case "syncing": return "pending";
    case "offline": return "offline";
    case "error": return "error";
    case "ready": return snapshot.lastReport && (snapshot.lastReport.failed > 0 || snapshot.lastReport.conflicts > 0) ? "error" : "synced";
    case "local-only":
    case "signed-out": return "local";
  }
}

function ReadyApplication({ services, diceOverlayController, registry, computeActionCapabilities, pack, createDraft, onCharacterCreated, sync, initialPath, onRetryBoot, pwaPlatform }: { readonly services: ApplicationServices; readonly diceOverlayController: DiceOverlayController; readonly registry: FeatureRegistry; readonly computeActionCapabilities: ApplicationRuntime["computeActionCapabilities"]; readonly pack: RulePack; readonly createDraft: () => CharacterDraft; readonly onCharacterCreated: (character: Character) => void; readonly sync?: SyncRuntime; readonly initialPath?: string; readonly onRetryBoot: () => void; readonly pwaPlatform?: PwaPlatform }) {
  const characterSnapshot = useExternalStore(services.character.store);
  const campaignSnapshot = useExternalStore(services.campaign.store);
  const syncSnapshot = useSyncExternalStore(
    sync?.subscribe ?? EMPTY_SYNC_SUBSCRIBE,
    sync ? () => sync.snapshot : () => EMPTY_SYNC_SNAPSHOT,
    sync ? () => sync.snapshot : () => EMPTY_SYNC_SNAPSHOT,
  );
  // Recalculado a cada revisão do personagem ativo — nunca reaproveita capacidades de outro
  // personagem/estado (achado #1 de QA-004: a lista não pode ficar presa a um snapshot velho).
  const actionCapabilities = useMemo(
    () => computeActionCapabilities(characterSnapshot.value),
    [computeActionCapabilities, characterSnapshot.value],
  );
  useEffect(() => {
    let active = true;
    let registered: RegisteredPwa | undefined;
    void registerPwa({ platform: pwaPlatform, hasPendingWork: () => hasPendingApplicationWork(services, registry.journey.getJournalDraftState) }).then((result) => {
      if (!result.ok) return;
      if (!active) {
        result.value.dispose();
        return;
      }
      registered = result.value;
    });
    return () => {
      active = false;
      registered?.dispose();
    };
  }, [pwaPlatform, services]);
  const character = {
    value: characterSnapshot.value,
    status: characterSnapshot.status,
    errorMessage: errorMessage(characterSnapshot.error),
  };

  return (
    <ApplicationServicesProvider services={services}>
      <AppRouter
        initialPath={initialPath}
        bootState="ready"
        navigate={() => undefined}
        character={character}
        campaign={{ value: campaignSnapshot.value, status: campaignSnapshot.status, errorMessage: errorMessage(campaignSnapshot.error) }}
        settingsStore={services.settings.store}
        diceOverlayController={diceOverlayController}
        registry={registry}
        actionCapabilities={actionCapabilities}
        pack={pack}
        createDraft={createDraft}
        onCharacterCreated={onCharacterCreated}
        syncState={accountSyncState(syncSnapshot)}
        syncMessage={syncSnapshot.lastError?.message}
        onRetryBoot={onRetryBoot}
      />
    </ApplicationServicesProvider>
  );
}

export function Bootstrap({ initialPath, runtime: suppliedRuntime, pwaPlatform }: BootstrapProps = {}) {
  const [attempt, setAttempt] = useState(0);
  const [runtime, setRuntime] = useState<ApplicationRuntime | undefined>(suppliedRuntime);
  const [bootState, setBootState] = useState<"booting" | "ready" | "error">(suppliedRuntime ? "ready" : "booting");
  const [bootErrorMessage, setBootErrorMessage] = useState<string>();

  useEffect(() => {
    if (suppliedRuntime) return;
    let active = true;
    let openedRuntime: ApplicationRuntime | undefined;

    setBootState("booting");
    setBootErrorMessage(undefined);
    void createApplicationRuntime().then(
      (nextRuntime) => {
        openedRuntime = nextRuntime;
        if (!active) {
          nextRuntime.sync?.dispose();
          nextRuntime.services.character.dispose();
          nextRuntime.services.campaign.dispose();
          nextRuntime.services.settings.dispose();
          nextRuntime.services.dice.dispose();
          nextRuntime.database.close();
          return;
        }
        setRuntime(nextRuntime);
        setBootState("ready");
      },
      (cause) => {
        if (!active) return;
        setBootErrorMessage(cause instanceof Error ? cause.message : "Não foi possível abrir os dados locais.");
        setBootState("error");
      },
    );

    return () => {
      active = false;
      if (openedRuntime) {
        openedRuntime.sync?.dispose();
        openedRuntime.services.character.dispose();
        openedRuntime.services.campaign.dispose();
        openedRuntime.services.settings.dispose();
        openedRuntime.services.dice.dispose();
        openedRuntime.database.close();
      }
    };
  }, [attempt, suppliedRuntime]);

  const retry = () => {
    setRuntime(undefined);
    setBootErrorMessage(undefined);
    setBootState("booting");
    setAttempt((current) => current + 1);
  };

  if (runtime) return <ReadyApplication services={runtime.services} diceOverlayController={runtime.diceOverlayController} registry={runtime.registry} computeActionCapabilities={runtime.computeActionCapabilities} pack={runtime.pack} createDraft={runtime.createDraft} onCharacterCreated={runtime.onCharacterCreated} sync={runtime.sync} initialPath={initialPath} onRetryBoot={retry} pwaPlatform={pwaPlatform} />;

  return (
    <AppRouter
      initialPath={initialPath}
      bootState={bootState}
      navigate={() => undefined}
      bootErrorMessage={bootErrorMessage}
      onRetryBoot={retry}
    />
  );
}
