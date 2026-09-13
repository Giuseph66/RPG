import { describe, expect, it, vi } from "vitest";

import { asCommandId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { ok, type Result } from "@domain/contracts/errors";
import { type SyncOperation } from "@domain/contracts/cloud-sync";
import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { type RemoteSyncAdapter } from "@application/ports/remote-sync-adapter";

import { createSyncWorker } from "./worker";

const firstId = asUuid("00000000-0000-4000-8000-000000000001");
const secondId = asUuid("00000000-0000-4000-8000-000000000002");
const time = asIsoTimestamp("2026-09-12T10:00:00.000Z");

function makeOperation(id: string, aggregateId = firstId, createdAt = time): SyncOperation {
  return {
    operationId: asCommandId(id),
    aggregateType: "campaign",
    aggregateId,
    mutation: "upsert",
    baseRevision: asRevision(0),
    payload: { id: aggregateId, name: id },
    status: "pending",
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
    dedupeKey: `${id}|campaign|${aggregateId}|upsert|0`,
  };
}

function fakeOutbox(initial: readonly SyncOperation[]) {
  const records = new Map(initial.map((operation) => [operation.operationId, operation]));
  const applied: string[] = [];
  const outbox: OutboxRepository = {
    enqueue: async () => { throw new Error("unused"); },
    get: async (id) => ok(records.get(id)!),
    listPending: async () => ok([...records.values()].filter((operation) => operation.status === "pending" || operation.status === "failed")),
    markSyncing: async (id) => {
      const current = records.get(id)!;
      const next = { ...current, status: "syncing" as const, attempts: current.attempts + 1 };
      records.set(id, next);
      applied.push(`syncing:${id}`);
      return ok(next);
    },
    markAcked: async (id) => {
      const current = records.get(id)!;
      const next = { ...current, status: "acked" as const };
      records.set(id, next);
      applied.push(`acked:${id}`);
      return ok(next);
    },
    markConflict: async (id, conflict) => {
      const current = records.get(id)!;
      const next = { ...current, status: "conflict" as const, conflict: { ...conflict, detectedAt: time } };
      records.set(id, next);
      applied.push(`conflict:${id}`);
      return ok(next);
    },
    markFailed: async (id, failure) => {
      const current = records.get(id)!;
      const next = { ...current, status: "failed" as const, lastError: failure.message, nextRetryAt: failure.nextRetryAt };
      records.set(id, next);
      applied.push(`failed:${id}`);
      return ok(next);
    },
  };
  return { records, applied, outbox };
}

const clock: Clock = { now: () => time };

describe("SyncWorker", () => {
  it("confirma localmente somente depois do ack e preserva FIFO por agregado", async () => {
    const first = makeOperation("first");
    const second = makeOperation("second", firstId, asIsoTimestamp("2026-09-12T10:01:00.000Z"));
    const other = makeOperation("other", secondId);
    const store = fakeOutbox([second, other, first]);
    const apply = vi.fn(async (_operation: SyncOperation) => ok({ kind: "acked" as const, remoteRevision: asRevision(1) }));
    const adapter: RemoteSyncAdapter = { isAvailable: () => true, apply };

    const result = await createSyncWorker({ outbox: store.outbox, adapter, clock }).run();

    expect(result).toEqual({ ok: true, value: { attempted: 3, acked: 3, conflicts: 0, failed: 0, skipped: 0, unavailable: false } });
    expect(apply.mock.calls.map(([item]) => (item as SyncOperation).operationId)).toEqual(["first", "second", "other"]);
    expect(store.applied).toEqual(["syncing:first", "acked:first", "syncing:second", "acked:second", "syncing:other", "acked:other"]);
  });

  it("persiste conflito e para a fila do agregado afetado", async () => {
    const first = makeOperation("first");
    const second = makeOperation("second", firstId, asIsoTimestamp("2026-09-12T10:01:00.000Z"));
    const other = makeOperation("other", secondId);
    const store = fakeOutbox([first, second, other]);
    let calls = 0;
    const adapter: RemoteSyncAdapter = {
      isAvailable: () => true,
      apply: async () => {
        calls += 1;
        return calls === 1
          ? ok({ kind: "conflict" as const, conflict: { remoteRevision: asRevision(2), remoteSnapshot: { name: "remote" }, message: "divergência" } })
          : ok({ kind: "acked" as const, remoteRevision: asRevision(1) });
      },
    };

    const result = await createSyncWorker({ outbox: store.outbox, adapter, clock }).run();

    expect(result).toEqual({ ok: true, value: { attempted: 2, acked: 1, conflicts: 1, failed: 0, skipped: 0, unavailable: false } });
    expect(calls).toBe(2);
    expect(store.records.get(first.operationId)?.status).toBe("conflict");
    expect(store.records.get(second.operationId)?.status).toBe("pending");
    expect(store.records.get(other.operationId)?.status).toBe("acked");
  });

  it("marca falha de rede como retryable e não tenta a operação seguinte do mesmo agregado", async () => {
    const first = makeOperation("first");
    const second = makeOperation("second", firstId, asIsoTimestamp("2026-09-12T10:01:00.000Z"));
    const other = makeOperation("other", secondId);
    const store = fakeOutbox([first, second, other]);
    const adapter: RemoteSyncAdapter = {
      isAvailable: () => true,
      apply: async (operation) => operation.operationId === "first"
        ? { ok: false, error: { code: "remote-network", message: "offline", retryable: true } }
        : ok({ kind: "acked" as const, remoteRevision: asRevision(1) }),
    };

    const result = await createSyncWorker({ outbox: store.outbox, adapter, clock, retryBaseMs: 500 }).run();

    expect(result).toEqual({ ok: true, value: { attempted: 2, acked: 1, conflicts: 0, failed: 1, skipped: 0, unavailable: false } });
    expect(store.records.get(first.operationId)?.status).toBe("failed");
    expect(store.records.get(first.operationId)?.nextRetryAt).toBe("2026-09-12T10:00:00.500Z");
    expect(store.records.get(second.operationId)?.status).toBe("pending");
    expect(store.records.get(other.operationId)?.status).toBe("acked");
  });

  it("não lista nem chama o adapter quando está offline ou Firebase indisponível", async () => {
    const store = fakeOutbox([makeOperation("first")]);
    const listPending = vi.spyOn(store.outbox, "listPending");
    const apply = vi.fn();
    const adapter: RemoteSyncAdapter = { isAvailable: () => false, apply };

    const offline = await createSyncWorker({ outbox: store.outbox, adapter, clock, isOnline: () => false }).run();
    expect(offline).toEqual({ ok: true, value: { attempted: 0, acked: 0, conflicts: 0, failed: 0, skipped: 0, unavailable: true } });
    expect(listPending).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();

    const unavailable = await createSyncWorker({ outbox: store.outbox, adapter, clock }).run();
    expect(unavailable).toEqual({ ok: true, value: { attempted: 0, acked: 0, conflicts: 0, failed: 0, skipped: 0, unavailable: true } });
    expect(listPending).not.toHaveBeenCalled();
  });
});
