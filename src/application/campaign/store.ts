import { type Campaign } from "@domain/contracts/campaign";
import { type CampaignRepository } from "@application/ports/campaign-repository";

import { AggregateStore, type AggregateStoreOptions } from "@application/state/aggregate-store";

export class CampaignStore extends AggregateStore<Campaign> {
  constructor(repository: CampaignRepository, options: AggregateStoreOptions = {}) {
    super(repository, options);
  }
}

export function createCampaignStore(
  repository: CampaignRepository,
  options: AggregateStoreOptions = {},
): CampaignStore {
  return new CampaignStore(repository, options);
}

export const createCampaignStateStore = createCampaignStore;
