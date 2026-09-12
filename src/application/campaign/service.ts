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
  return new CampaignApplicationService(options.repository, options.debounceMs);
}
