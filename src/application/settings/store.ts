import { type AppSettings, type SettingsRepository } from "@application/ports/settings-repository";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { ExternalStore, immutableSnapshot } from "@application/state/external-store";

export class SettingsStore extends ExternalStore<AppSettings> {
  private value?: AppSettings;
  private dirty = false;
  private version = 0;
  private pendingPatch: Partial<AppSettings> = {};
  private writeChain: Promise<void> = Promise.resolve();
  private loadToken = 0;
  private disposed = false;

  constructor(private readonly repository: SettingsRepository) {
    super({ status: "idle", hasPendingChanges: false });
  }

  async hydrate(): Promise<Result<AppSettings, AppError>> {
    if (this.disposed) return err(appError.storageUnavailable("Store encerrado."));
    if (this.value !== undefined && this.dirty) return ok(this.value);
    const token = ++this.loadToken;
    this.publish({ status: "hydrating", value: this.value, hasPendingChanges: this.dirty, error: undefined });
    const result = await this.repository.get();
    if (token !== this.loadToken || this.disposed) return result;
    if (!result.ok) {
      this.publish({ status: "error", value: this.value, hasPendingChanges: this.dirty, error: result.error });
      return result;
    }
    if (this.dirty) return ok(this.value ?? immutableSnapshot(result.value));
    this.value = immutableSnapshot(result.value);
    this.publish({ status: "clean", value: this.value, hasPendingChanges: false, error: undefined });
    return ok(this.value);
  }

  get settings(): AppSettings | undefined {
    return this.value;
  }

  update(patch: Partial<AppSettings>): Promise<Result<AppSettings, AppError>> {
    if (!this.value) {
      return this.hydrate().then((loaded) => loaded.ok ? this.update(patch) : loaded);
    }
    const next = immutableSnapshot({ ...this.value, ...patch });
    this.value = next;
    this.pendingPatch = { ...this.pendingPatch, ...patch };
    this.version += 1;
    this.dirty = true;
    this.publish({ status: "dirty", value: next, hasPendingChanges: true, error: undefined });
    return this.enqueue(this.version, this.pendingPatch);
  }

  reset(): Promise<Result<AppSettings, AppError>> {
    this.pendingPatch = {};
    const version = ++this.version;
    this.dirty = true;
    this.publish({ status: "dirty", value: this.value, hasPendingChanges: true, error: undefined });
    const task = this.writeChain.then(async () => {
      if (this.version === version) this.publish({ status: "saving", value: this.value, hasPendingChanges: true });
      const result = await this.repository.reset();
      if (result.ok) {
        if (this.version === version) {
          this.value = immutableSnapshot(result.value);
          this.dirty = false;
          this.publish({ status: "clean", value: this.value, hasPendingChanges: false, error: undefined });
        }
      } else {
        this.dirty = true;
        if (this.version === version) this.publish({ status: "error", value: this.value, hasPendingChanges: true, error: result.error });
      }
      return result;
    });
    this.writeChain = task.then(() => undefined, () => undefined);
    return task;
  }

  retry(): Promise<Result<AppSettings, AppError>> {
    if (!this.value) return this.hydrate();
    if (Object.keys(this.pendingPatch).length === 0) return okAsync(this.value);
    return this.enqueue(this.version, this.pendingPatch);
  }

  async flush(): Promise<Result<void, AppError>> {
    await this.writeChain;
    const error = this.getSnapshot().error;
    return error ? err(error as AppError) : ok(undefined);
  }

  dispose(): void {
    this.disposed = true;
    this.loadToken += 1;
  }

  private enqueue(version: number, patch: Partial<AppSettings>): Promise<Result<AppSettings, AppError>> {
    const task = this.writeChain.then(async () => {
      if (this.version === version) this.publish({ status: "saving", value: this.value, hasPendingChanges: true });
      const result = await this.repository.update(patch);
      if (result.ok) {
        if (this.version === version) {
          this.value = immutableSnapshot(result.value);
          this.pendingPatch = {};
          this.dirty = false;
          this.publish({ status: "clean", value: this.value, hasPendingChanges: false, error: undefined });
        }
      } else {
        this.dirty = true;
        this.publish({ status: "error", value: this.value, hasPendingChanges: true, error: result.error });
      }
      return result;
    });
    this.writeChain = task.then(() => undefined, () => undefined);
    return task;
  }
}

function okAsync<T>(value: T): Promise<Result<T, never>> {
  return Promise.resolve(ok(value));
}

export function createSettingsStore(repository: SettingsRepository): SettingsStore {
  return new SettingsStore(repository);
}

export const createSettingsStateStore = createSettingsStore;
