import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type Revision } from "@domain/contracts/versioning";

import { ExternalStore, immutable, immutableSnapshot, type StoreSnapshot } from "./external-store";

export interface RevisableAggregate {
  readonly id: string;
  readonly revision: Revision;
}

export interface AggregateRepository<T extends RevisableAggregate> {
  get(id: T["id"]): Promise<Result<T, AppError>>;
  save(value: T, expectedRevision: Revision): Promise<Result<Revision, AppError>>;
}

export interface AggregateStoreOptions {
  /** 500 ms segue a política de narrativa; use 0 ou `save` para gravação imediata. */
  readonly debounceMs?: number;
  /** Limite entre gravações enquanto o usuário mantém o agregado em edição. */
  readonly maxDebounceMs?: number;
}

interface Entry<T extends RevisableAggregate> {
  value?: T;
  status: StoreSnapshot<T>["status"];
  error?: AppError;
  dirty: boolean;
  version: number;
  loadToken: number;
  queuedVersion?: number;
  scheduled?: ReturnType<typeof setTimeout>;
  maxScheduled?: ReturnType<typeof setTimeout>;
}

/**
 * Store de um tipo de agregado. Cada ID mantém seu próprio draft/estado de gravação;
 * assim trocar o personagem durante uma escrita nunca permite que a resposta antiga
 * publique um snapshot para o agregado atualmente selecionado.
 */
export class AggregateStore<T extends RevisableAggregate> extends ExternalStore<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly debounceMs: number;
  private readonly maxDebounceMs: number;
  private writeChain: Promise<void> = Promise.resolve();
  private nextToken = 0;
  private selected?: T["id"];
  private disposed = false;

  constructor(
    private readonly repository: AggregateRepository<T>,
    options: AggregateStoreOptions = {},
  ) {
    super({ status: "idle", hasPendingChanges: false });
    this.debounceMs = Math.max(0, options.debounceMs ?? 500);
    this.maxDebounceMs = Math.max(this.debounceMs, options.maxDebounceMs ?? 2_000);
  }

  get selectedId(): T["id"] | undefined {
    return this.selected;
  }

  /** Seleciona e hidrata um ID. A gravação em andamento continua em segundo plano. */
  async select(id: T["id"] | undefined): Promise<Result<void, AppError>> {
    if (this.disposed) return err(appError.storageUnavailable("Store encerrado."));
    this.selected = id;
    if (id === undefined) {
      this.publish({ status: "idle", value: undefined, selectedId: undefined, error: undefined, hasPendingChanges: false });
      return ok(undefined);
    }

    const entry = this.entry(id);
    if (entry.value !== undefined && (entry.dirty || entry.status === "saving" || entry.status === "conflict")) {
      this.publishEntry(id);
      return ok(undefined);
    }
    return this.hydrate(id);
  }

  /** Alias semântico para consumidores que preferem `hydrate`. */
  hydrate(id: T["id"] = this.selected as T["id"]): Promise<Result<void, AppError>> {
    if (id === undefined) return Promise.resolve(err(appError.validation("id", "Agregado não selecionado.")));
    const entry = this.entry(id);
    if (entry.value !== undefined && entry.dirty) {
      return Promise.resolve(ok(undefined));
    }
    const token = ++this.nextToken;
    entry.loadToken = token;
    entry.status = "hydrating";
    entry.error = undefined;
    if (this.selected === id) this.publishEntry(id);

    return this.repository.get(id).then((result) => {
      const current = this.entries.get(id);
      if (!current || current.loadToken !== token || this.selected !== id || this.disposed) return ok(undefined);
      if (!result.ok) {
        current.status = "error";
        current.error = result.error;
        this.publishEntry(id);
        return result;
      }
      if (current.dirty) {
        this.publishEntry(id);
        return ok(undefined);
      }
      current.value = immutableSnapshot(result.value);
      current.status = "clean";
      current.dirty = false;
      current.error = undefined;
      this.publishEntry(id);
      return ok(undefined);
    });
  }

  /** Edição otimista; o snapshot publicado é sempre uma cópia profundamente congelada. */
  update(
    updater: (current: T) => T,
    options: { readonly immediate?: boolean } = {},
  ): Result<T, AppError> {
    if (this.selected === undefined) return err(appError.validation("id", "Agregado não selecionado."));
    const entry = this.entry(this.selected);
    if (!entry.value) return err(appError.validation("value", "Agregado ainda não foi hidratado."));
    let next: T;
    try {
      next = immutable(updater(entry.value));
    } catch (cause) {
      return err(appError.validation("value", cause instanceof Error ? cause.message : "Edição inválida."));
    }
    if (next.id !== entry.value.id) return err(appError.validation("id", "Uma edição não pode trocar o ID do agregado."));
    entry.value = next;
    entry.version += 1;
    entry.dirty = true;
    entry.status = "dirty";
    entry.error = undefined;
    this.publishEntry(this.selected);
    this.schedule(this.selected, options.immediate === true);
    return ok(next);
  }

  replace(value: T, options: { readonly immediate?: boolean } = {}): Result<T, AppError> {
    return this.update(() => value, options);
  }

  /** Solicita uma gravação imediata da seleção atual e aguarda o commit do port. */
  save(): Promise<Result<Revision, AppError>> {
    if (this.selected === undefined) return Promise.resolve(err(appError.validation("id", "Agregado não selecionado.")));
    const entry = this.entry(this.selected);
    if (entry.value !== undefined && !entry.dirty && entry.queuedVersion === undefined) return Promise.resolve(ok(entry.value.revision));
    return this.enqueue(this.selected);
  }

  retry(): Promise<Result<Revision, AppError>> {
    if (this.selected === undefined) return Promise.resolve(err(appError.validation("id", "Agregado não selecionado.")));
    const entry = this.entry(this.selected);
    if (!entry.value) return this.hydrate(this.selected).then(() => err(appError.validation("value", "Agregado não hidratado.")));
    entry.error = undefined;
    entry.status = "dirty";
    entry.dirty = true;
    this.publishEntry(this.selected);
    return this.enqueue(this.selected);
  }

  /** Cancela o debounce e aguarda todas as escritas já enfileiradas. */
  async flush(): Promise<Result<void, AppError>> {
    if (this.disposed) return err(appError.storageUnavailable("Store encerrado."));
    const pending: Promise<Result<Revision, AppError>>[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.scheduled !== undefined) {
        clearTimeout(entry.scheduled);
        entry.scheduled = undefined;
      }
      if (entry.maxScheduled !== undefined) {
        clearTimeout(entry.maxScheduled);
        entry.maxScheduled = undefined;
      }
      if (entry.value !== undefined && entry.dirty && entry.queuedVersion !== entry.version) {
        pending.push(this.enqueue(id));
      }
    }
    await this.writeChain;
    const results = await Promise.all(pending);
    const failure = results.find((result): result is { readonly ok: false; readonly error: AppError } => !result.ok);
    return failure ? failure : ok(undefined);
  }

  dispose(): void {
    this.disposed = true;
    for (const entry of this.entries.values()) {
      if (entry.scheduled !== undefined) clearTimeout(entry.scheduled);
      if (entry.maxScheduled !== undefined) clearTimeout(entry.maxScheduled);
    }
    this.entries.clear();
  }

  private entry(id: T["id"]): Entry<T> {
    const existing = this.entries.get(id);
    if (existing) return existing;
    const created: Entry<T> = { status: "idle", dirty: false, version: 0, loadToken: 0 };
    this.entries.set(id, created);
    return created;
  }

  private schedule(id: T["id"], immediate: boolean): void {
    const entry = this.entry(id);
    if (entry.scheduled !== undefined) clearTimeout(entry.scheduled);
    if (immediate || this.debounceMs === 0) {
      if (entry.maxScheduled !== undefined) clearTimeout(entry.maxScheduled);
      entry.scheduled = undefined;
      entry.maxScheduled = undefined;
      void this.enqueue(id);
      return;
    }
    if (entry.maxScheduled === undefined) {
      entry.maxScheduled = setTimeout(() => {
        entry.maxScheduled = undefined;
        if (entry.scheduled !== undefined) clearTimeout(entry.scheduled);
        entry.scheduled = undefined;
        void this.enqueue(id);
      }, this.maxDebounceMs);
    }
    entry.scheduled = setTimeout(() => {
      entry.scheduled = undefined;
      if (entry.maxScheduled !== undefined) clearTimeout(entry.maxScheduled);
      entry.maxScheduled = undefined;
      void this.enqueue(id);
    }, this.debounceMs);
  }

  private enqueue(id: T["id"]): Promise<Result<Revision, AppError>> {
    const entry = this.entry(id);
    if (!entry.value) return Promise.resolve(err(appError.validation("value", "Agregado não hidratado.")));
    const version = entry.version;
    if (entry.queuedVersion === version) {
      return this.writeChain.then(() => {
        const current = this.entry(id);
        return current.error ? err(current.error) : ok(current.value?.revision ?? entry.value!.revision);
      });
    }
    entry.queuedVersion = version;
    const value = entry.value;
    const task = this.writeChain.then(() => this.performSave(id, version, value));
    this.writeChain = task.then(() => undefined, () => undefined);
    return task;
  }

  private async performSave(id: T["id"], version: number, value: T): Promise<Result<Revision, AppError>> {
    const entry = this.entry(id);
    if (entry.version === version) {
      entry.status = "saving";
      if (this.selected === id) this.publishEntry(id);
    }
    const result = await this.repository.save(value, value.revision);
    if (result.ok) {
      entry.queuedVersion = undefined;
      entry.error = undefined;
      entry.value = immutableSnapshot({ ...entry.value ?? value, revision: result.value });
      entry.loadToken = ++this.nextToken;
      if (entry.version === version) {
        entry.dirty = false;
        entry.status = "clean";
      } else {
        entry.dirty = true;
        entry.status = "dirty";
      }
    } else {
      entry.error = result.error;
      entry.status = result.error.code === "conflict" ? "conflict" : "error";
      entry.dirty = true;
      entry.queuedVersion = undefined;
    }
    if (this.selected === id) this.publishEntry(id);
    return result;
  }

  private publishEntry(id: T["id"]): void {
    if (this.selected !== id) return;
    const entry = this.entry(id);
    const value = entry.value;
    this.publish({
      status: entry.status,
      value,
      selectedId: id,
      error: entry.error,
      hasPendingChanges: entry.dirty,
    });
  }
}
