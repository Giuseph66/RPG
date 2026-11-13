import { type CharacterDraft, type Character, type HitPointsState } from "@domain/contracts/character";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";
import { type IdGenerator } from "@application/ports/id-generator";
import { toJsonSnapshot, type SyncOutboxService } from "@application/sync";
import { asCommandId } from "@domain/contracts/ids";
import { exitReasonFromState, resolveExitWildShape } from "@domain/rules/wild-shape";

import { CharacterStore, createCharacterStore } from "./store";
import { CharacterCommandService, type CharacterCommandServiceDependencies, type CharacterCommittedListener } from "./commands";

export interface CharacterApplicationServiceOptions {
  readonly repository: CharacterRepository;
  readonly debounceMs?: number;
  readonly ownerUid?: OwnerUid;
  readonly commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">;
}

/** Conta dona das fichas privadas; função quando a sessão muda (login/logout) durante o uso. */
type OwnerUid = AccountId | (() => AccountId | undefined);

interface CharacterSyncOptions {
  /** Namespace immutable for private-character deletes. */
  readonly ownerUid?: OwnerUid;
  readonly syncOutbox?: SyncOutboxService;
  readonly unitOfWork?: UnitOfWork;
  readonly clock?: import("@application/ports/clock").Clock;
  readonly idGenerator?: IdGenerator;
  readonly onCommitted?: CharacterCommittedListener;
}

function withCharacterSync(repository: CharacterRepository, options: CharacterSyncOptions): CharacterRepository {
  const { syncOutbox, unitOfWork, clock, idGenerator } = options;
  if (!syncOutbox || !clock || !idGenerator) return repository;
  const outbox = syncOutbox;
  const writeClock = clock;
  const writeIds = idGenerator;
  const resolveOwner = (): AccountId | undefined => typeof options.ownerUid === "function" ? options.ownerUid() : options.ownerUid;

  async function enqueue(
    operation: Parameters<SyncOutboxService["enqueue"]>[0],
    context?: TransactionContext,
  ): Promise<Result<void, AppError>> {
    const queued = await outbox.enqueue(operation, context);
    return queued.ok ? { ok: true, value: undefined } : err(queued.error);
  }

  async function save(character: Character, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>> {
    // Versão anterior para o histórico da mesa e para detectar saída de campanha;
    // lida fora da transação (ver `remove`).
    const previous = !context ? await repository.get(character.id) : undefined;
    // A ficha mora em `campaigns/{id}/characters` enquanto vinculada. Ao sair da campanha,
    // a cópia remota antiga precisa sumir; senão o mestre (e o próximo pull) a veem vinculada.
    const leftCampaign = previous?.ok && previous.value.campaignId !== undefined && previous.value.campaignId !== character.campaignId
      ? previous.value.campaignId
      : undefined;
    // O inverso: ao entrar numa campanha, a cópia privada do dono deixa de ser a fonte.
    const owner = resolveOwner();
    const leftPrivate = previous?.ok && previous.value.campaignId === undefined && character.campaignId !== undefined &&
      owner !== undefined && (previous.value.ownerUid === undefined || previous.value.ownerUid === owner)
      ? owner
      : undefined;
    const notify = (saved: Result<Revision, AppError>) => {
      if (saved.ok && options.onCommitted && !context) options.onCommitted(previous?.ok ? previous.value : undefined, { ...character, revision: saved.value });
      return saved;
    };
    const commit = async (transaction?: TransactionContext) => {
      const saved = await repository.save(character, expectedRevision, undefined, transaction);
      if (!saved.ok) return saved;
      const createdAt = writeClock.now();
      const formerScope = leftCampaign !== undefined ? { campaignId: leftCampaign } : leftPrivate !== undefined ? { ownerUid: leftPrivate } : undefined;
      if (formerScope !== undefined) {
        const removed = await enqueue({
          operationId: writeIds.commandId(),
          aggregateType: "character",
          aggregateId: character.id,
          mutation: "delete",
          baseRevision: expectedRevision,
          scope: formerScope,
          createdAt,
        }, transaction);
        if (!removed.ok) return err(removed.error);
      }
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
    return notify(await (unitOfWork ? unitOfWork.run((transaction) => commit(transaction)) : commit()));
  }

  async function remove(id: Character["id"], expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    // A leitura acontece ANTES da transação: dentro do UnitOfWork, uma leitura fora do contexto
    // deixaria a transação sem requisição pendente e ela se encerraria sozinha.
    const current = await repository.get(id);
    if (!current.ok) return current;
    const owner = resolveOwner();
    const scope = current.value.campaignId !== undefined
      ? { campaignId: current.value.campaignId }
      : owner !== undefined
        ? { ownerUid: owner }
        : undefined;
    const commit = async (transaction?: TransactionContext) => {
      const deleted = await repository.delete(id, expectedRevision, transaction);
      if (!deleted.ok) return deleted;
      // Sem conta conectada e sem campanha, a ficha nunca foi enviada: só a cópia local existe.
      if (scope === undefined) return deleted;
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

function normalizeWildShapeExit(character: Character): Character {
  if (!character.transformation) return character;
  const reason = character.transformation.formHp.current <= 0 ? "zero-hit-points" : exitReasonFromState(character);
  if (!reason) return character;
  const exited = resolveExitWildShape(character, {
    commandId: asCommandId("direct-update-wild-shape-exit"),
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "exit-wild-shape",
    payload: { reason },
  }, { availableActions: [] });
  // An invalid snapshot stays available for review; never restore an old full snapshot.
  return exited.status === "success" ? exited.nextState : character;
}

/** Fachada de aplicação usada pela UI; o repositório continua atrás do port. */
export class CharacterApplicationService {
  readonly store: CharacterStore;
  readonly commands?: CharacterCommandService;
  private readonly writeRepository: CharacterRepository;

  constructor(private readonly repository: CharacterRepository, debounceMs = 500, commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">, private readonly ownerUid?: OwnerUid) {
    this.writeRepository = withCharacterSync(repository, { ...commandDependencies, ownerUid });
    this.store = createCharacterStore(this.writeRepository, { debounceMs });
    if (commandDependencies) this.commands = new CharacterCommandService({ ...commandDependencies, characterRepository: repository });
  }

  private resolveOwner(): AccountId | undefined {
    return typeof this.ownerUid === "function" ? this.ownerUid() : this.ownerUid;
  }

  select(id: Uuid | undefined): Promise<Result<void, AppError>> {
    return this.store.select(id);
  }

  hydrate(id?: Uuid): Promise<Result<void, AppError>> {
    return id === undefined ? this.store.hydrate() : this.store.hydrate(id);
  }

  /** Read-only aggregate lookup for campaign views that summarize several characters. */
  get(id: Uuid): Promise<Result<Character, AppError>> {
    return this.repository.get(id);
  }

  update(updater: (current: Character) => Character, immediate = false): Result<Character, AppError> {
    return this.store.update((current) => {
      // Atualizações diretas da ficha (ex.: aplicar Sono) não consomem ação.
      return normalizeWildShapeExit(updater(current));
    }, { immediate });
  }

  save(): ReturnType<CharacterStore["save"]> {
    return this.store.save();
  }

  /** Grava um personagem criado fora do store e registra o snapshot no outbox quando configurado. */
  saveCharacter(character: Character, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.writeRepository.save(normalizeWildShapeExit(character), expectedRevision);
  }

  /** Persiste campos editáveis da ficha sem deixar uma forma alterar o pool original de PV. */
  async saveSheetState(
    id: Uuid,
    expectedRevision: Revision,
    patch: {
      readonly hp?: HitPointsState;
      readonly conditions?: Character["conditions"];
      readonly manualAdjustments?: Character["manualAdjustments"];
    },
  ): Promise<Result<Revision, AppError>> {
    const current = await this.repository.get(id);
    if (!current.ok) return current;
    if (current.value.revision !== expectedRevision) return err(appError.conflict(expectedRevision, current.value.revision));
    const { hp, ...otherFields } = patch;
    const updated: Character = {
      ...current.value,
      ...otherFields,
      ...(hp === undefined ? {} : current.value.transformation
        ? { transformation: { ...current.value.transformation, formHp: hp } }
        : { hp }),
    };
    return this.writeRepository.save(normalizeWildShapeExit(updated), expectedRevision);
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
    // Ficha de outro jogador: o mestre só tira a cópia da mesa. Salvá-la sem campanha
    // criaria uma cópia privada na conta do mestre; a original segue com o dono.
    const actor = this.resolveOwner();
    if (current.value.ownerUid !== undefined && actor !== undefined && current.value.ownerUid !== actor) {
      const removed = await this.writeRepository.delete(id, expectedRevision);
      return removed.ok ? ok(current.value.revision) : removed;
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
