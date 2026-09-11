import { type Campaign } from "@domain/contracts/campaign";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { type CampaignRepository } from "@application/ports/campaign-repository";

import { CampaignStore, createCampaignStore } from "./store";

export interface CampaignApplicationServiceOptions {
  readonly repository: CampaignRepository;
  readonly debounceMs?: number;
}

export class CampaignApplicationService {
  readonly store: CampaignStore;

  constructor(private readonly repository: CampaignRepository, debounceMs = 500) {
    this.store = createCampaignStore(repository, { debounceMs });
  }

  select(id: Uuid | undefined): Promise<Result<void, AppError>> {
    return this.store.select(id);
  }

  hydrate(id?: Uuid): Promise<Result<void, AppError>> {
    return id === undefined ? this.store.hydrate() : this.store.hydrate(id);
  }

  update(updater: (current: Campaign) => Campaign, immediate = false): Result<Campaign, AppError> {
    return this.store.update(updater, { immediate });
  }

  save(): ReturnType<CampaignStore["save"]> {
    return this.store.save();
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

export function createCampaignApplicationService(options: CampaignApplicationServiceOptions): CampaignApplicationService {
  return new CampaignApplicationService(options.repository, options.debounceMs);
}
