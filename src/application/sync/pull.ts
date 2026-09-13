import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import {
  type RemoteSyncAdapter,
  type RemoteSyncPullRecord,
  type RemoteSyncPullResult,
} from "@application/ports/remote-sync-adapter";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

export interface RemoteHydrationConflict {
  readonly aggregateType: RemoteSyncPullRecord["aggregateType"];
  readonly aggregateId: string;
  readonly remoteRevision: number;
  readonly message: string;
}

export interface RemoteHydrationReport {
  readonly received: number;
  readonly applied: number;
  readonly skipped: number;
  readonly conflicts: readonly RemoteHydrationConflict[];
}

export interface RemoteHydrationPort {
  hydrate(input: {
    readonly ownerUid: string;
    readonly pull: RemoteSyncPullResult;
    readonly pending: readonly SyncOperation[];
    readonly clock: Clock;
  }): Promise<Result<RemoteHydrationReport, AppError>>;
}

export interface RemotePullWorkerOptions {
  readonly adapter: RemoteSyncAdapter;
  readonly outbox: OutboxRepository;
  readonly hydration: RemoteHydrationPort;
  readonly ownerUid: string;
  readonly clock: Clock;
  readonly isOnline?: () => boolean;
  readonly isActive?: () => boolean;
}

/** Leitura remota é opt-in pela presença do adapter e nunca cria operações de upload. */
export class RemotePullWorker {
  constructor(private readonly options: RemotePullWorkerOptions) {}

  async run(): Promise<Result<RemoteHydrationReport, AppError> | undefined> {
    const { adapter, hydration, outbox, clock } = this.options;
    if (!adapter.pull || this.options.isActive?.() === false || this.options.isOnline?.() === false) return undefined;
    const pulled = await adapter.pull();
    if (!pulled.ok) return err(appError.storageUnavailable(pulled.error.message, pulled.error.cause));
    const pending = await outbox.listPending();
    if (!pending.ok) return pending;
    return hydration.hydrate({ ownerUid: this.options.ownerUid, pull: pulled.value, pending: pending.value, clock });
  }
}

export function createRemotePullWorker(options: RemotePullWorkerOptions): RemotePullWorker {
  return new RemotePullWorker(options);
}
