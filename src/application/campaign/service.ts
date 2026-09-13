import { type Asset, type Campaign, type MapPin, type MapRecord } from "@domain/contracts/campaign";
import { err, type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { type CampaignRepository } from "@application/ports/campaign-repository";
import { type UnitOfWork, type TransactionContext } from "@application/ports/unit-of-work";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { emptyCampaignCleanupManifest, toJsonSnapshot, type CampaignCleanupManifestReader, type SyncOutboxService } from "@application/sync";
import { asRevision, type Revision } from "@domain/contracts/versioning";

import { CampaignStore, createCampaignStore } from "./store";

export interface CampaignApplicationServiceOptions {
  readonly repository: CampaignRepository;
  readonly debounceMs?: number;
  readonly syncOutbox?: SyncOutboxService;
  readonly unitOfWork?: UnitOfWork;
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
  /** Captura referências remotas antes de a campanha ser removida localmente. */
  readonly cleanupManifestReader?: CampaignCleanupManifestReader;
}

interface CampaignWriteOptions {
  readonly syncOutbox?: SyncOutboxService;
  readonly unitOfWork?: UnitOfWork;
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
  readonly cleanupManifestReader?: CampaignCleanupManifestReader;
}

/**
 * Adapters que declaram o argumento contextual reutilizam a transação do UoW. Adapters
 * legados sem contexto continuam podendo gravar localmente, mas ficam explicitamente
 * local-only: publicar depois do commit criaria uma janela de perda.
 */
function supportsContext(method: (...args: never[]) => unknown, minimumParameters = 3): boolean {
  return method.length >= minimumParameters;
}

function createSyncCampaignRepository(repository: CampaignRepository, options: CampaignWriteOptions): CampaignRepository {
  const { syncOutbox, unitOfWork, clock, idGenerator, cleanupManifestReader } = options;
  if (!syncOutbox || !clock || !idGenerator) return repository;
  const outbox = syncOutbox;
  const writeClock = clock;
  const writeIds = idGenerator;

  async function queue(input: Parameters<SyncOutboxService["enqueue"]>[0], context?: TransactionContext): Promise<Result<void, AppError>> {
    const result = await outbox.enqueue(input, context);
    return result.ok ? { ok: true, value: undefined } : err(result.error);
  }

  async function queueCampaignSnapshot(
    campaignId: Uuid,
    baseRevision: Revision,
    context: TransactionContext,
  ): Promise<Result<void, AppError>> {
    const current = await repository.get(campaignId, context);
    if (!current.ok) return err(current.error);
    const createdAt = writeClock.now();
    return queue({
      operationId: writeIds.commandId(),
      aggregateType: "campaign",
      aggregateId: campaignId,
      mutation: "upsert",
      baseRevision,
      payload: toJsonSnapshot({ ...current.value, updatedAt: createdAt }),
      createdAt,
    }, context);
  }

  async function runWrite<T>(
    write: (context?: TransactionContext) => Promise<Result<T, AppError>>,
    contextual: boolean,
  ): Promise<Result<T, AppError>> {
    if (contextual && unitOfWork) return unitOfWork.run((context) => write(context));
    return write();
  }

  const save: CampaignRepository["save"] = (campaign, expectedRevision) => runWrite(async (context) => {
    const saveMethod = repository.save.bind(repository) as unknown as (value: Campaign, revision: Revision, context?: TransactionContext) => Promise<Result<Revision, AppError>>;
    const saved = await saveMethod(campaign, expectedRevision, context);
    if (!saved.ok) return saved;
    if (context === undefined) return saved;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "campaign", aggregateId: campaign.id,
      mutation: "upsert", baseRevision: expectedRevision,
      payload: toJsonSnapshot({ ...campaign, revision: saved.value, updatedAt: createdAt }),
      createdAt,
    }, context);
    return queued.ok ? saved : err(queued.error);
  }, supportsContext(repository.save as (...args: never[]) => unknown));

  const remove: CampaignRepository["delete"] = (id, expectedRevision) => runWrite(async (context) => {
    const manifest = await captureCleanupManifest(id, expectedRevision, context);
    if (!manifest.ok) return manifest;
    const deleteMethod = repository.delete.bind(repository) as unknown as (value: Uuid, revision: Revision, context?: TransactionContext) => Promise<Result<void, AppError>>;
    const deleted = await deleteMethod(id, expectedRevision, context);
    if (!deleted.ok) return deleted;
    if (context === undefined) return deleted;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "campaign-cleanup", aggregateId: id,
      mutation: "upsert", baseRevision: expectedRevision,
      payload: toJsonSnapshot(manifest.value), createdAt,
    }, context);
    return queued.ok ? deleted : err(queued.error);
  }, supportsContext(repository.delete as (...args: never[]) => unknown));

  const deleteWithContent: CampaignRepository["deleteCampaignAndContent"] = (id, expectedRevision) => runWrite(async (context) => {
    const manifest = await captureCleanupManifest(id, expectedRevision, context);
    if (!manifest.ok) return manifest;
    const deleteMethod = repository.deleteCampaignAndContent.bind(repository) as unknown as (value: Uuid, revision: Revision, context?: TransactionContext) => Promise<Result<void, AppError>>;
    const deleted = await deleteMethod(id, expectedRevision, context);
    if (!deleted.ok) return deleted;
    if (context === undefined) return deleted;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "campaign-cleanup", aggregateId: id,
      mutation: "upsert", baseRevision: expectedRevision,
      payload: toJsonSnapshot(manifest.value), createdAt,
    }, context);
    return queued.ok ? deleted : err(queued.error);
  }, supportsContext(repository.deleteCampaignAndContent as (...args: never[]) => unknown));

  async function captureCleanupManifest(
    campaignId: Uuid,
    campaignRevision: Revision,
    context?: TransactionContext,
  ): Promise<Result<import("@domain/contracts/cloud-sync").CampaignCleanupManifest, AppError>> {
    if (!cleanupManifestReader) return { ok: true, value: emptyCampaignCleanupManifest(campaignId, campaignRevision) };
    const captured = await cleanupManifestReader.read(campaignId, campaignRevision, context);
    if (!captured.ok) return captured;
    if (captured.value.campaignId !== campaignId || captured.value.campaignRevision !== campaignRevision) {
      return err({ code: "validation-error", field: "cleanupManifest", message: "Manifesto de limpeza não corresponde à campanha/revisão removida." });
    }
    return captured;
  }

  const saveJournalEntry: CampaignRepository["saveJournalEntry"] = (entry) => runWrite(async (context) => {
    const saveMethod = repository.saveJournalEntry.bind(repository) as unknown as (value: import("@domain/contracts/campaign").JournalEntry, context?: TransactionContext) => Promise<Result<import("@domain/contracts/campaign").JournalEntry, AppError>>;
    const saved = await saveMethod(entry, context);
    if (!saved.ok) return saved;
    if (context === undefined) return saved;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "journal", aggregateId: entry.id,
      mutation: "upsert", baseRevision: asRevision(0), payload: toJsonSnapshot(saved.value), createdAt,
    }, context);
    return queued.ok ? saved : err(queued.error);
  }, supportsContext(repository.saveJournalEntry as (...args: never[]) => unknown, 2));

  const deleteJournalEntry: CampaignRepository["deleteJournalEntry"] = (id) => runWrite(async (context) => {
    const current = await repository.getJournalEntry(id, context);
    if (!current.ok) return current;
    const deleteMethod = repository.deleteJournalEntry.bind(repository) as unknown as (value: Uuid, context?: TransactionContext) => Promise<Result<void, AppError>>;
    const deleted = await deleteMethod(id, context);
    if (!deleted.ok) return deleted;
    if (context === undefined) return deleted;
    const createdAt = writeClock.now();
    const queued = await queue({ operationId: writeIds.commandId(), aggregateType: "journal", aggregateId: id, mutation: "delete", baseRevision: asRevision(0), scope: { campaignId: current.value.campaignId }, createdAt }, context);
    return queued.ok ? deleted : err(queued.error);
  }, supportsContext(repository.deleteJournalEntry as (...args: never[]) => unknown, 2));

  const saveMap: CampaignRepository["saveMap"] = (map, expectedRevision) => runWrite(async (context) => {
    const saveMethod = repository.saveMap.bind(repository) as unknown as (value: MapRecord, revision: Revision, context?: TransactionContext) => Promise<Result<Revision, AppError>>;
    const saved = await saveMethod(map, expectedRevision, context);
    if (!saved.ok) return saved;
    if (context === undefined) return saved;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "map", aggregateId: map.id,
      mutation: "upsert", baseRevision: expectedRevision,
      payload: toJsonSnapshot({ ...map, revision: saved.value }), createdAt,
    }, context);
    return queued.ok ? saved : err(queued.error);
  }, supportsContext(repository.saveMap as (...args: never[]) => unknown));

  const deleteMap: CampaignRepository["deleteMap"] = (id, expectedRevision) => runWrite(async (context) => {
    const current = await repository.getMap(id, context);
    if (!current.ok) return current;
    const deleteMethod = repository.deleteMap.bind(repository) as unknown as (value: Uuid, revision: Revision, context?: TransactionContext) => Promise<Result<void, AppError>>;
    const deleted = await deleteMethod(id, expectedRevision, context);
    if (!deleted.ok) return deleted;
    if (context === undefined) return deleted;
    const createdAt = writeClock.now();
    const queued = await queue({ operationId: writeIds.commandId(), aggregateType: "map", aggregateId: id, mutation: "delete", baseRevision: expectedRevision, scope: { campaignId: current.value.campaignId }, createdAt }, context);
    return queued.ok ? deleted : err(queued.error);
  }, supportsContext(repository.deleteMap as (...args: never[]) => unknown));

  async function mutateMapPin(
    operation: (context?: TransactionContext) => Promise<Result<Revision, AppError>>,
    mapId: Uuid,
    expectedRevision: Revision,
    context?: TransactionContext,
  ): Promise<Result<Revision, AppError>> {
    const saved = await operation(context);
    if (!saved.ok) return saved;
    if (context === undefined) return saved;
    const map = await repository.getMap(mapId, context);
    if (!map.ok) return map;
    const createdAt = writeClock.now();
    const queued = await queue({
      operationId: writeIds.commandId(), aggregateType: "map", aggregateId: mapId,
      mutation: "upsert", baseRevision: expectedRevision,
      payload: toJsonSnapshot(map.value), createdAt,
    }, context);
    return queued.ok ? saved : err(queued.error);
  }

  const addMapPin: CampaignRepository["addMapPin"] = (mapId, pin, expectedRevision) => runWrite(
    (context) => mutateMapPin(
      (transaction) => (repository.addMapPin.bind(repository) as unknown as (id: Uuid, value: MapPin, revision: Revision, context?: TransactionContext) => Promise<Result<Revision, AppError>>)(mapId, pin, expectedRevision, transaction),
      mapId, expectedRevision, context,
    ),
    supportsContext(repository.addMapPin as (...args: never[]) => unknown),
  );
  const updateMapPin: CampaignRepository["updateMapPin"] = (mapId, pin, expectedRevision) => runWrite(
    (context) => mutateMapPin(
      (transaction) => (repository.updateMapPin.bind(repository) as unknown as (id: Uuid, value: MapPin, revision: Revision, context?: TransactionContext) => Promise<Result<Revision, AppError>>)(mapId, pin, expectedRevision, transaction),
      mapId, expectedRevision, context,
    ),
    supportsContext(repository.updateMapPin as (...args: never[]) => unknown),
  );
  const removeMapPin: CampaignRepository["removeMapPin"] = (mapId, pinId, expectedRevision) => runWrite(
    (context) => mutateMapPin(
      (transaction) => (repository.removeMapPin.bind(repository) as unknown as (id: Uuid, pin: Uuid, revision: Revision, context?: TransactionContext) => Promise<Result<Revision, AppError>>)(mapId, pinId, expectedRevision, transaction),
      mapId, expectedRevision, context,
    ),
    supportsContext(repository.removeMapPin as (...args: never[]) => unknown),
  );

  async function mutateCampaignRecord<TResult>(
    operation: (context?: TransactionContext) => Promise<Result<TResult, AppError>>,
    campaignId: Uuid,
    expectedRevision: Revision,
    context?: TransactionContext,
  ): Promise<Result<TResult, AppError>> {
    const mutated = await operation(context);
    if (!mutated.ok || context === undefined) return mutated;
    const queued = await queueCampaignSnapshot(campaignId, expectedRevision, context);
    return queued.ok ? mutated : err(queued.error);
  }

  const saveQuest: CampaignRepository["saveQuest"] = (campaignId, quest, expectedRevision) => runWrite(
    (context) => mutateCampaignRecord(
      (transaction) => repository.saveQuest(campaignId, quest, expectedRevision, transaction),
      campaignId,
      expectedRevision,
      context,
    ),
    supportsContext(repository.saveQuest as (...args: never[]) => unknown) && supportsContext(repository.get as (...args: never[]) => unknown, 2),
  );
  const deleteQuest: CampaignRepository["deleteQuest"] = (campaignId, questId, expectedRevision) => runWrite(
    (context) => mutateCampaignRecord(
      (transaction) => repository.deleteQuest(campaignId, questId, expectedRevision, transaction),
      campaignId,
      expectedRevision,
      context,
    ),
    supportsContext(repository.deleteQuest as (...args: never[]) => unknown) && supportsContext(repository.get as (...args: never[]) => unknown, 2),
  );
  const saveNpc: CampaignRepository["saveNpc"] = (campaignId, npc, expectedRevision) => runWrite(
    (context) => mutateCampaignRecord(
      (transaction) => repository.saveNpc(campaignId, npc, expectedRevision, transaction),
      campaignId,
      expectedRevision,
      context,
    ),
    supportsContext(repository.saveNpc as (...args: never[]) => unknown) && supportsContext(repository.get as (...args: never[]) => unknown, 2),
  );
  const deleteNpc: CampaignRepository["deleteNpc"] = (campaignId, npcId, expectedRevision) => runWrite(
    (context) => mutateCampaignRecord(
      (transaction) => repository.deleteNpc(campaignId, npcId, expectedRevision, transaction),
      campaignId,
      expectedRevision,
      context,
    ),
    supportsContext(repository.deleteNpc as (...args: never[]) => unknown) && supportsContext(repository.get as (...args: never[]) => unknown, 2),
  );

  const importAtomic: CampaignRepository["importAtomic"] = async (input: { readonly map: MapRecord; readonly asset: Asset }) => runWrite(async (context) => {
    const importMethod = repository.importAtomic.bind(repository) as unknown as (value: { readonly map: MapRecord; readonly asset: Asset }, context?: TransactionContext) => Promise<Result<{ readonly map: MapRecord; readonly asset: Asset }, AppError>>;
    const imported = await importMethod(input, context);
    if (!imported.ok) return imported;
    if (context === undefined) return imported;
    const createdAt = writeClock.now();
    const mapQueued = await queue({
      operationId: writeIds.commandId(), aggregateType: "map", aggregateId: input.map.id,
      mutation: "upsert", baseRevision: input.map.revision,
      payload: toJsonSnapshot(input.map), createdAt,
    }, context);
    if (!mapQueued.ok) return err(mapQueued.error);
    const assetQueued = await queue({
      operationId: writeIds.commandId(), aggregateType: "asset", aggregateId: input.asset.id,
      mutation: "upsert", baseRevision: asRevision(0),
      payload: toJsonSnapshot({ id: input.asset.id, mediaType: input.asset.mediaType, hash: input.asset.hash, width: input.asset.width, height: input.asset.height, originalName: input.asset.originalName }),
      createdAt,
    }, context);
    return assetQueued.ok ? imported : err(assetQueued.error);
  }, supportsContext(repository.importAtomic as (...args: never[]) => unknown, 2));

  return {
    get: (id, context) => repository.get(id, context),
    list: (filter) => repository.list(filter),
    save,
    delete: remove,
    deleteCampaignAndContent: deleteWithContent,
    getJournalEntry: (id) => repository.getJournalEntry(id),
    listJournalEntries: (campaignId) => repository.listJournalEntries(campaignId),
    saveJournalEntry,
    deleteJournalEntry,
    getMap: (id) => repository.getMap(id),
    listMaps: (campaignId) => repository.listMaps(campaignId),
    saveMap,
    deleteMap,
    addMapPin,
    updateMapPin,
    removeMapPin,
    saveQuest,
    deleteQuest,
    saveNpc,
    deleteNpc,
    importAtomic,
  };
}

export class CampaignApplicationService {
  readonly store: CampaignStore;
  private readonly writeRepository: CampaignRepository;

  constructor(private readonly repository: CampaignRepository, debounceMs = 500, writeOptions: CampaignWriteOptions = {}) {
    this.writeRepository = createSyncCampaignRepository(repository, writeOptions);
    this.store = createCampaignStore(this.writeRepository, { debounceMs });
  }

  select(id: Uuid | undefined): Promise<Result<void, AppError>> {
    return this.store.select(id);
  }

  list(): ReturnType<CampaignRepository["list"]> {
    return this.repository.list();
  }

  hydrate(id?: Uuid): Promise<Result<void, AppError>> {
    // `AggregateStore.hydrate(id)` pressupõe que o ID já esteja selecionado para
    // publicar o snapshot. A fachada deve manter essa pré-condição explícita.
    return id === undefined ? this.store.hydrate() : this.store.select(id);
  }

  update(updater: (current: Campaign) => Campaign, immediate = false): Result<Campaign, AppError> {
    return this.store.update(updater, { immediate });
  }

  save(): ReturnType<CampaignStore["save"]> {
    return this.store.save();
  }

  saveCampaign(campaign: Campaign, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.writeRepository.save(campaign, expectedRevision);
  }

  deleteCampaign(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return this.writeRepository.delete(id, expectedRevision);
  }

  deleteCampaignAndContent(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return this.writeRepository.deleteCampaignAndContent(id, expectedRevision);
  }

  saveJournalEntry(entry: import("@domain/contracts/campaign").JournalEntry): ReturnType<CampaignRepository["saveJournalEntry"]> {
    return this.writeRepository.saveJournalEntry(entry);
  }

  deleteJournalEntry(id: Uuid): ReturnType<CampaignRepository["deleteJournalEntry"]> {
    return this.writeRepository.deleteJournalEntry(id);
  }

  saveMap(map: MapRecord, expectedRevision: Revision): ReturnType<CampaignRepository["saveMap"]> {
    return this.writeRepository.saveMap(map, expectedRevision);
  }

  deleteMap(id: Uuid, expectedRevision: Revision): ReturnType<CampaignRepository["deleteMap"]> {
    return this.writeRepository.deleteMap(id, expectedRevision);
  }

  importMapWithAsset(input: { readonly map: MapRecord; readonly asset: Asset }): ReturnType<CampaignRepository["importAtomic"]> {
    return this.writeRepository.importAtomic(input);
  }

  retry(): ReturnType<CampaignStore["retry"]> {
    return this.store.retry();
  }

  flush(): ReturnType<CampaignStore["flush"]> {
    return this.store.flush();
  }

  dispose(): void {
    this.store.dispose();
  }
}

/**
 * Escolhe uma campanha persistida quando não existe preferência de seleção no contrato de
 * settings. A ordenação não depende da ordem de `getAll()` do adapter: atualização mais recente,
 * depois criação mais recente e, por fim, ID ascendente para desempate estável.
 */
export function chooseCampaignForRestore(campaigns: readonly Campaign[]): Campaign | undefined {
  return [...campaigns].sort((left, right) => {
    const updated = right.updatedAt.localeCompare(left.updatedAt);
    if (updated !== 0) return updated;
    const created = right.createdAt.localeCompare(left.createdAt);
    if (created !== 0) return created;
    return String(left.id).localeCompare(String(right.id));
  })[0];
}

export function createCampaignApplicationService(options: CampaignApplicationServiceOptions): CampaignApplicationService {
  return new CampaignApplicationService(options.repository, options.debounceMs, {
    syncOutbox: options.syncOutbox,
    unitOfWork: options.unitOfWork,
    clock: options.clock,
    idGenerator: options.idGenerator,
    cleanupManifestReader: options.cleanupManifestReader,
  });
}
