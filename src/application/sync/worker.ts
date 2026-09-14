import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import {
  type RemoteSyncAdapter,
  type RemoteSyncApplyResult,
} from "@application/ports/remote-sync-adapter";
import { err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { type SyncOperation } from "@domain/contracts/cloud-sync";

export interface SyncWorkerOptions {
  readonly outbox: OutboxRepository;
  readonly adapter: RemoteSyncAdapter;
  readonly clock: Clock;
  /** Retorna false sem tentar rede; em produção normalmente usa navigator.onLine. */
  readonly isOnline?: () => boolean;
  readonly maxOperations?: number;
  readonly retryBaseMs?: number;
  /** Escopo da conta atual; operações de outra conta/legadas são ignoradas. */
  readonly ownerUid?: string;
  /** Interrompe a drenagem quando a sessão muda ou fica offline. */
  readonly isActive?: () => boolean;
}

export interface SyncWorkerReport {
  readonly attempted: number;
  readonly acked: number;
  readonly conflicts: number;
  readonly failed: number;
  readonly skipped: number;
  readonly unavailable: boolean;
  /** Última falha tratada pela fila, pronta para apresentação sem expor o SDK remoto. */
  readonly lastErrorMessage?: string;
}

const emptyReport = (unavailable = false): SyncWorkerReport => ({
  attempted: 0,
  acked: 0,
  conflicts: 0,
  failed: 0,
  skipped: 0,
  unavailable,
});

function aggregateKey(operation: SyncOperation): string {
  return `${operation.aggregateType}:${operation.aggregateId}`;
}

function retryAt(clock: Clock, attempts: number, baseMs: number) {
  const now = clock.now();
  const delay = Math.min(baseMs * 2 ** Math.max(0, attempts - 1), 15 * 60 * 1000);
  return asIsoTimestamp(new Date(Date.parse(now) + delay).toISOString());
}

function mergeReport(report: SyncWorkerReport, patch: Partial<SyncWorkerReport>): SyncWorkerReport {
  return { ...report, ...patch };
}

/**
 * Drena a fila somente quando explicitamente chamado e quando o transporte está
 * disponível. Agregados diferentes podem continuar após uma falha, mas a fila de
 * cada agregado para no primeiro conflito/falha, preservando FIFO e CAS.
 */
export class SyncWorker {
  constructor(private readonly options: SyncWorkerOptions) {}

  async run(): Promise<Result<SyncWorkerReport, AppError>> {
    const { adapter, outbox, clock } = this.options;
    if (this.options.isActive?.() === false) return ok(emptyReport(true));
    if (this.options.isOnline?.() === false) return ok(emptyReport(true));
    if (!adapter.isAvailable()) return ok(emptyReport(true));

    const listed = await outbox.listPending({ limit: this.options.maxOperations });
    if (!listed.ok) return listed;

    const grouped = new Map<string, SyncOperation[]>();
    let skipped = 0;
    for (const operation of listed.value) {
      const ownerUid = (operation as SyncOperation & { readonly ownerUid?: unknown }).ownerUid;
      if (this.options.ownerUid !== undefined && ownerUid !== this.options.ownerUid) {
        skipped += 1;
        continue;
      }
      // Uma fila eventualmente consistente pode devolver um registro já finalizado;
      // jamais reenviar uma operação que já recebeu ack.
      if (operation.status !== "pending" && operation.status !== "failed") {
        skipped += 1;
        continue;
      }
      const key = aggregateKey(operation);
      const current = grouped.get(key) ?? [];
      current.push(operation);
      current.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.operationId.localeCompare(right.operationId));
      grouped.set(key, current);
    }

    let report = mergeReport(emptyReport(), { skipped });
    const retryBaseMs = this.options.retryBaseMs ?? 1_000;
    for (const operations of grouped.values()) {
      for (const operation of operations) {
        if (this.options.isActive?.() === false) return ok(mergeReport(report, { unavailable: true }));
        const syncing = await outbox.markSyncing(operation.operationId);
        if (!syncing.ok) return err(syncing.error);
        report = mergeReport(report, { attempted: report.attempted + 1 });
        console.info("[sync] Enviando operação ao Firebase", {
          aggregateType: syncing.value.aggregateType,
          aggregateId: String(syncing.value.aggregateId),
          mutation: syncing.value.mutation,
          baseRevision: syncing.value.baseRevision,
        });

        const applied = await adapter.apply(syncing.value);
        if (!applied.ok) {
          console.error("[sync] Firebase recusou a operação", {
            aggregateType: syncing.value.aggregateType,
            aggregateId: String(syncing.value.aggregateId),
            mutation: syncing.value.mutation,
            code: applied.error.code,
            message: applied.error.message,
            retryable: applied.error.retryable,
          });
          const failure = await outbox.markFailed(syncing.value.operationId, {
            message: applied.error.message,
            nextRetryAt: applied.error.retryable
              ? retryAt(clock, syncing.value.attempts, retryBaseMs)
              : undefined,
          });
          if (!failure.ok) return err(failure.error);
          report = mergeReport(report, { failed: report.failed + 1, lastErrorMessage: applied.error.message });
          // Operações posteriores do mesmo agregado dependem desta revisão.
          break;
        }

        const result: RemoteSyncApplyResult = applied.value;
        if (result.kind === "conflict") {
          console.error("[sync] Conflito remoto", {
            aggregateType: syncing.value.aggregateType,
            aggregateId: String(syncing.value.aggregateId),
            message: result.conflict.message,
          });
          const conflict = await outbox.markConflict(syncing.value.operationId, result.conflict);
          if (!conflict.ok) return err(conflict.error);
          report = mergeReport(report, { conflicts: report.conflicts + 1, lastErrorMessage: result.conflict.message });
          break;
        }

        // O adapter só retorna ack depois do commit Firestore. Portanto este é o
        // primeiro ponto em que a confirmação local pode ser persistida.
        const acked = await outbox.markAcked(syncing.value.operationId);
        if (!acked.ok) return err(acked.error);
        console.info("[sync] Firebase confirmou a operação", {
          aggregateType: syncing.value.aggregateType,
          aggregateId: String(syncing.value.aggregateId),
          revision: result.remoteRevision,
        });
        report = mergeReport(report, { acked: report.acked + 1 });
      }
    }
    return ok(report);
  }

  process(): Promise<Result<SyncWorkerReport, AppError>> {
    return this.run();
  }
}

export function createSyncWorker(options: SyncWorkerOptions): SyncWorker {
  return new SyncWorker(options);
}
