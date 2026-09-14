import { type CharacterDraft, type Character } from "@domain/contracts/character";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";
import { type IdGenerator } from "@application/ports/id-generator";
import { toJsonSnapshot, type SyncOutboxService } from "@application/sync";

import { CharacterStore, createCharacterStore } from "./store";
import { CharacterCommandService, type CharacterCommandServiceDependencies } from "./commands";

export interface CharacterApplicationServiceOptions {
  readonly repository: CharacterRepository;
  readonly debounceMs?: number;
  readonly ownerUid?: AccountId;
  readonly commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">;
}

interface CharacterSyncOptions {
  /** Namespace immutable for private-character deletes. */
  readonly ownerUid?: AccountId;
  readonly syncOutbox?: SyncOutboxService;
  readonly unitOfWork?: UnitOfWork;
  readonly clock?: import("@application/ports/clock").Clock;
  readonly idGenerator?: IdGenerator;
}

function withCharacterSync(repository: CharacterRepository, options: CharacterSyncOptions): CharacterRepository {
  const { syncOutbox, unitOfWork, clock, idGenerator } = options;
  if (!syncOutbox || !clock || !idGenerator) return repository;
  const outbox = syncOutbox;
  const writeClock = clock;
  const writeIds = idGenerator;
  const ownerUid = options.ownerUid;

  async function enqueue(
    operation: Parameters<SyncOutboxService["enqueue"]>[0],
    context?: TransactionContext,
  ): Promise<Result<void, AppError>> {
    const queued = await outbox.enqueue(operation, context);
    return queued.ok ? { ok: true, value: undefined } : err(queued.error);
  }

  async function save(character: Character, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>> {
    const commit = async (transaction?: TransactionContext) => {
      const saved = await repository.save(character, expectedRevision, undefined, transaction);
      if (!saved.ok) return saved;
      const createdAt = writeClock.now();
      const queued = await enqueue({
        operationId: writeIds.commandId(),
        aggregateType: "character",
        aggregateId: character.id,
        mutation: "upsert",
        baseRevision: expectedRevision,
        payload: toJsonSnapshot({ ...character, revision: saved.value, updatedAt: createdAt }),
        createdAt,
      }, transaction);
      return queued.ok ? saved : err(queued.error);
    };
    if (context) return commit(context);
    return unitOfWork ? unitOfWork.run((transaction) => commit(transaction)) : commit();
  }

  async function remove(id: Character["id"], expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    const commit = async (transaction?: TransactionContext) => {
      const current = await repository.get(id);
      if (!current.ok) return current;
      const scope = current.value.campaignId !== undefined
        ? { campaignId: current.value.campaignId }
        : ownerUid !== undefined
          ? { ownerUid }
          : undefined;
      if (scope === undefined) return err(appError.validation("scope", "Delete de personagem exige campaignId ou ownerUid."));
      const deleted = await repository.delete(id, expectedRevision, transaction);
      if (!deleted.ok) return deleted;
      const createdAt = writeClock.now();
      const queued = await enqueue({
        operationId: writeIds.commandId(),
        aggregateType: "character",
        aggregateId: id,
        mutation: "delete",
        baseRevision: expectedRevision,
        scope,
        createdAt,
      }, transaction);
      return queued.ok ? deleted : err(queued.error);
    };
    if (context) return commit(context);
    return unitOfWork ? unitOfWork.run((transaction) => commit(transaction)) : commit();
  }

  return {
    get: (id) => repository.get(id),
    list: (filter) => repository.list(filter),
    save: (character, expectedRevision, commandReceipt, context) => save(character, expectedRevision, context),
    delete: remove,
    getDraft: (id) => repository.getDraft(id),
    listDrafts: () => repository.listDrafts(),
    saveDraft: (draft) => repository.saveDraft(draft),
    deleteDraft: (id) => repository.deleteDraft(id),
  };
}

/** Fachada de aplicação usada pela UI; o repositório continua atrás do port. */
export class CharacterApplicationService {
  readonly store: CharacterStore;
  readonly commands?: CharacterCommandService;
  private readonly writeRepository: CharacterRepository;

  constructor(private readonly repository: CharacterRepository, debounceMs = 500, commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">, ownerUid?: AccountId) {
    this.writeRepository = withCharacterSync(repository, { ...commandDependencies, ownerUid });
    this.store = createCharacterStore(this.writeRepository, { debounceMs });
    if (commandDependencies) this.commands = new CharacterCommandService({ ...commandDependencies, characterRepository: repository });
  }

  select(id: Uuid | undefined): Promise<Result<void, AppError>> {
    return this.store.select(id);
  }

  hydrate(id?: Uuid): Promise<Result<void, AppError>> {
    return id === undefined ? this.store.hydrate() : this.store.hydrate(id);
  }

  update(updater: (current: Character) => Character, immediate = false): Result<Character, AppError> {
    return this.store.update(updater, { immediate });
  }

  save(): ReturnType<CharacterStore["save"]> {
    return this.store.save();
  }

  /** Grava um personagem criado fora do store e registra o snapshot no outbox quando configurado. */
  saveCharacter(character: Character, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.writeRepository.save(character, expectedRevision);
  }

  /** Links an unassigned character to a campaign using optimistic concurrency. */
  async linkToCampaign(id: Uuid, campaignId: Uuid, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    const current = await this.repository.get(id);
    if (!current.ok) return current;
    if (current.value.revision !== expectedRevision) return err(appError.conflict(expectedRevision, current.value.revision));
    if (current.value.campaignId !== undefined && current.value.campaignId !== campaignId) {
      return err(appError.validation("campaignId", "Este personagem já está vinculado a outra campanha."));
    }
    if (current.value.campaignId === campaignId) return ok(current.value.revision);
    return this.writeRepository.save({ ...current.value, campaignId }, expectedRevision);
  }

  /** Removes a campaign link only when it still belongs to the requested campaign. */
  async unlinkFromCampaign(id: Uuid, campaignId: Uuid, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    const current = await this.repository.get(id);
    if (!current.ok) return current;
    if (current.value.revision !== expectedRevision) return err(appError.conflict(expectedRevision, current.value.revision));
    if (current.value.campaignId === undefined) return ok(current.value.revision);
    if (current.value.campaignId !== campaignId) {
      return err(appError.validation("campaignId", "Este personagem pertence a outra campanha."));
    }
    const { campaignId: _campaignId, ...withoutCampaign } = current.value;
    return this.writeRepository.save(withoutCampaign, expectedRevision);
  }

  /** Remove um personagem e registra a deleção no outbox quando configurado. */
  deleteCharacter(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return this.writeRepository.delete(id, expectedRevision);
  }

  retry(): ReturnType<CharacterStore["retry"]> {
    return this.store.retry();
  }

  flush(): ReturnType<CharacterStore["flush"]> {
    return this.store.flush();
  }

  loadDraft(id: Uuid): Promise<Result<CharacterDraft, AppError>> {
    return this.repository.getDraft(id);
  }

  listDrafts(): Promise<Result<readonly CharacterDraft[], AppError>> {
    return this.repository.listDrafts();
  }

  saveDraft(draft: CharacterDraft): Promise<Result<CharacterDraft, AppError>> {
    return this.repository.saveDraft(draft);
  }

  deleteDraft(id: Uuid): Promise<Result<void, AppError>> {
    return this.repository.deleteDraft(id);
  }

  dispose(): void {
    this.store.dispose();
  }
}

export function createCharacterApplicationService(options: CharacterApplicationServiceOptions): CharacterApplicationService {
  return new CharacterApplicationService(options.repository, options.debounceMs, options.commandDependencies, options.ownerUid);
}

export type CharacterSaveResult = Result<Revision, AppError>;
