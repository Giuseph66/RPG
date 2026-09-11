import { type AppSettings, type SettingsRepository } from "@application/ports/settings-repository";
import { type AppError, type Result } from "@domain/contracts/errors";

import { SettingsStore, createSettingsStore } from "./store";

export class SettingsApplicationService {
  readonly store: SettingsStore;

  constructor(repository: SettingsRepository) {
    this.store = createSettingsStore(repository);
  }

  hydrate(): ReturnType<SettingsStore["hydrate"]> { return this.store.hydrate(); }
  update(patch: Partial<AppSettings>): ReturnType<SettingsStore["update"]> { return this.store.update(patch); }
  reset(): ReturnType<SettingsStore["reset"]> { return this.store.reset(); }
  retry(): ReturnType<SettingsStore["retry"]> { return this.store.retry(); }
  flush(): ReturnType<SettingsStore["flush"]> { return this.store.flush(); }
  dispose(): void { this.store.dispose(); }
}

export function createSettingsApplicationService(repository: SettingsRepository): SettingsApplicationService {
  return new SettingsApplicationService(repository);
}

export type SettingsResult = Result<AppSettings, AppError>;
