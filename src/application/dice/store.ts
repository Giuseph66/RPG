import { type DiceHistoryEntry } from "@domain/contracts/dice";
import { type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type DiceHistoryFilter, type DiceHistoryPage, type DiceHistoryRepository } from "@application/ports/dice-history-repository";

import { ExternalStore, immutableSnapshot, type StoreSnapshot } from "@application/state/external-store";

interface HistoryEntryState {
  page: DiceHistoryPage;
  pending: Map<string, DiceHistoryEntry>;
  error?: AppError;
  version: number;
}

/** Store de histórico, separado dos stores de Character e Campaign. */
export class DiceHistoryStore extends ExternalStore<DiceHistoryPage> {
  private readonly states = new Map<string, HistoryEntryState>();
  private selectedKey = "free";
  private selectedCharacterId?: Uuid;
  private requestToken = 0;
  private writeChain: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly repository: DiceHistoryRepository) {
    super({ status: "idle", hasPendingChanges: false });
  }

  get characterId(): Uuid | undefined { return this.selectedCharacterId; }

  async hydrate(characterId?: Uuid, filter: Omit<DiceHistoryFilter, "characterId"> = {}): Promise<Result<DiceHistoryPage, AppError>> {
    if (this.disposed) return err(appError.storageUnavailable("Store encerrado."));
    this.selectedCharacterId = characterId;
    this.selectedKey = characterId ?? "free";
    const state = this.state(this.selectedKey);
    const token = ++this.requestToken;
    this.publish({ status: "hydrating", value: state.page, selectedId: characterId, hasPendingChanges: state.pending.size > 0, error: undefined });
    const result = await this.repository.list({ ...filter, ...(characterId === undefined ? {} : { characterId }) });
    if (token !== this.requestToken || this.disposed) return result;
    if (!result.ok) {
      state.error = result.error;
      this.publish({ status: "error", value: state.page, selectedId: characterId, hasPendingChanges: state.pending.size > 0, error: result.error });
      return result;
    }
    if (state.pending.size > 0) {
      state.page = immutableSnapshot({ ...result.value, entries: mergePending(result.value.entries, state.pending) });
    } else {
      state.page = immutableSnapshot(result.value);
    }
    state.error = undefined;
    this.publish({ status: "clean", value: state.page, selectedId: characterId, hasPendingChanges: state.pending.size > 0, error: undefined });
    return ok(state.page);
  }

  append(entry: DiceHistoryEntry): Promise<Result<void, AppError>> {
    const key = this.selectedKey;
    const characterId = this.selectedCharacterId;
    const state = this.state(key);
    const id = entry?.roll?.id;
    if (typeof id !== "string") return Promise.resolve(err(appError.validation("entry", "Registro de rolagem inválido.")));
    if (!state.page.entries.some((candidate) => candidate.roll.id === id)) {
      state.page = immutableSnapshot({ ...state.page, entries: [...state.page.entries, entry] });
    }
    state.pending.set(id, entry);
    state.version += 1;
    state.error = undefined;
    this.publishFor(key, { status: "dirty", value: state.page, selectedId: characterId, hasPendingChanges: true, error: undefined });
    const version = state.version;
    const task = this.writeChain.then(async () => {
      if (version === state.version) this.publishFor(key, { status: "saving", value: state.page, selectedId: characterId, hasPendingChanges: true });
      const result = await this.repository.append(entry);
      if (result.ok) {
        state.pending.delete(id);
        if (version === state.version) this.publishFor(key, { status: "clean", value: state.page, selectedId: characterId, hasPendingChanges: state.pending.size > 0, error: undefined });
      } else {
        state.error = result.error;
        this.publishFor(key, { status: "error", value: state.page, selectedId: characterId, hasPendingChanges: true, error: result.error });
      }
      return result;
    });
    this.writeChain = task.then(() => undefined, () => undefined);
    return task;
  }

  retry(): Promise<Result<void, AppError>> {
    const state = this.state(this.selectedKey);
    const pending = [...state.pending.values()];
    if (pending.length === 0) return Promise.resolve(ok(undefined));
    return (async () => {
      for (const entry of pending) {
        const result = await this.append(entry);
        if (!result.ok) return result;
      }
      return ok(undefined);
    })();
  }

  async clear(): Promise<Result<void, AppError>> {
    const result = await this.repository.clear(this.selectedCharacterId);
    if (!result.ok) {
      const state = this.state(this.selectedKey);
      state.error = result.error;
      this.publish({ status: "error", value: state.page, selectedId: this.selectedCharacterId, hasPendingChanges: state.pending.size > 0, error: result.error });
      return result;
    }
    const state = this.state(this.selectedKey);
    state.page = immutableSnapshot({ ...state.page, entries: [] });
    this.publish({ status: "clean", value: state.page, selectedId: this.selectedCharacterId, hasPendingChanges: state.pending.size > 0, error: undefined });
    return ok(undefined);
  }

  async flush(): Promise<Result<void, AppError>> {
    await this.writeChain;
    const error = this.getSnapshot().error;
    return error ? err(error as AppError) : ok(undefined);
  }

  dispose(): void { this.disposed = true; this.requestToken += 1; this.states.clear(); }

  private state(key: string): HistoryEntryState {
    const existing = this.states.get(key);
    if (existing) return existing;
    const created: HistoryEntryState = { page: { entries: [] }, pending: new Map(), version: 0 };
    this.states.set(key, created);
    return created;
  }

  private publishFor(key: string, snapshot: Partial<StoreSnapshot<DiceHistoryPage>> & Pick<StoreSnapshot<DiceHistoryPage>, "status" | "hasPendingChanges">): void {
    if (this.selectedKey === key) this.publish(snapshot);
  }
}

function mergePending(entries: readonly DiceHistoryEntry[], pending: Map<string, DiceHistoryEntry>): readonly DiceHistoryEntry[] {
  const known = new Set(entries.map((entry) => entry.roll.id));
  return [...entries, ...[...pending.values()].filter((entry) => !known.has(entry.roll.id))];
}

export function createDiceHistoryStore(repository: DiceHistoryRepository): DiceHistoryStore {
  return new DiceHistoryStore(repository);
}

export const createDiceStateStore = createDiceHistoryStore;
