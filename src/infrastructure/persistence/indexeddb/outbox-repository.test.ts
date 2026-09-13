import { beforeEach, describe, expect, it } from "vitest";

import { createPendingSyncOperation } from "@application/sync";
import { asAccountId, asCommandId, asIsoTimestamp } from "@domain/contracts/ids";
import { appError, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";

import { openDatabase } from "./open-database";
import { IndexedDbOutboxRepository } from "./outbox-repository";
import { STORE_NAMES } from "./schema";
import { IndexedDbUnitOfWork } from "./unit-of-work";

let sequence = 0;
let databaseName = "";
let now = asIsoTimestamp("2026-09-12T10:00:00.000Z");
const clock = { now: () => now };

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function operation(number: number, createdAt = now) {
  return unwrap(createPendingSyncOperation({
    operationId: asCommandId(`sync-${number}`),
    aggregateType: "account",
    aggregateId: asAccountId(`account-${number}`),
    mutation: "upsert",
    baseRevision: asRevision(0),
    payload: { name: `Account ${number}` },
    createdAt,
  }));
}

async function createDb(): Promise<IDBDatabase> {
  databaseName = `rpg-cloud-outbox-${sequence++}`;
  const result = await openDatabase({ name: databaseName });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("IndexedDbOutboxRepository", () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    now = asIsoTimestamp("2026-09-12T10:00:00.000Z");
    db = await createDb();
  });

  it("grava offline, deduplica e mantém a primeira operação", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const first = operation(1);
    const second = await repository.enqueue(first);
    const duplicate = await repository.enqueue({ ...first, updatedAt: asIsoTimestamp("2026-09-12T11:00:00.000Z") });

    expect(second).toEqual({ ok: true, value: first });
    expect(duplicate).toEqual({ ok: true, value: first });
    expect(unwrap(await repository.listPending())).toHaveLength(1);
    expect(db.objectStoreNames.contains(STORE_NAMES.outbox)).toBe(true);
  });

  it("rejeita colisão de dedupe com snapshot diferente", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const first = operation(1);
    await repository.enqueue(first);

    const collision = await repository.enqueue({ ...first, payload: { name: "outra conta" } });

    expect(collision.ok).toBe(false);
    if (!collision.ok) expect(collision.error.code).toBe("validation-error");
  });

  it("lista pending e retryable em ordem FIFO e respeita limite", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const early = operation(1, asIsoTimestamp("2026-09-12T09:00:00.000Z"));
    const late = operation(2, asIsoTimestamp("2026-09-12T11:00:00.000Z"));
    await repository.enqueue(late);
    await repository.enqueue(early);
    await repository.markSyncing(late.operationId);
    await repository.markFailed(late.operationId, { message: "offline", nextRetryAt: asIsoTimestamp("2026-09-12T10:30:00.000Z") });

    now = asIsoTimestamp("2026-09-12T10:15:00.000Z");
    expect(unwrap(await repository.listPending())).toEqual([early]);
    now = asIsoTimestamp("2026-09-12T11:00:00.000Z");
    expect(unwrap(await repository.listPending({ limit: 1 }))).toEqual([early]);
    expect(unwrap(await repository.listPending())).toEqual([early, expect.objectContaining({ operationId: late.operationId, status: "failed" })]);
  });

  it("persiste estados, tentativas, falha, conflito e ack sem sobrescrever silenciosamente", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const item = operation(1);
    await repository.enqueue(item);
    const syncing = unwrap(await repository.markSyncing(item.operationId));
    expect(syncing).toMatchObject({ status: "syncing", attempts: 1, lastAttemptAt: now });
    const failed = unwrap(await repository.markFailed(item.operationId, { message: "timeout", nextRetryAt: asIsoTimestamp("2026-09-12T12:00:00.000Z") }));
    expect(failed).toMatchObject({ status: "failed", attempts: 1, lastError: "timeout" });
    const retrying = unwrap(await repository.markSyncing(item.operationId));
    expect(retrying).toMatchObject({ status: "syncing", attempts: 2 });
    const acked = unwrap(await repository.markAcked(item.operationId));
    expect(acked).toMatchObject({ status: "acked", attempts: 2 });
    expect((await repository.markFailed(item.operationId, { message: "late failure" })).ok).toBe(false);

    const conflicted = await repository.enqueue(operation(2));
    expect(conflicted.ok).toBe(true);
    const conflict = unwrap(await repository.markConflict(asCommandId("sync-2"), {
      remoteRevision: asRevision(1),
      remoteSnapshot: { name: "remote" },
      message: "revisão divergente",
    }));
    expect(conflict).toMatchObject({ status: "conflict", conflict: { remoteRevision: 1, message: "revisão divergente" } });
  });

  it("faz enqueue no mesmo UoW e aborta junto com a transação local", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const uow = new IndexedDbUnitOfWork(db);
    const item = operation(1);
    const aborted = await uow.run(async (context) => {
      const queued = await repository.enqueue(item, context);
      if (!queued.ok) return queued;
      return { ok: false as const, error: appError.validation("test", "rollback") };
    });

    expect(aborted.ok).toBe(false);
    expect((await repository.get(item.operationId)).ok).toBe(false);
  });

  it("reabre o banco e conserva a operação confirmada", async () => {
    const repository = new IndexedDbOutboxRepository(db, clock);
    const item = operation(1);
    await repository.enqueue(item);
    db.close();
    const reopened = await openDatabase({ name: databaseName });
    if (!reopened.ok) throw new Error(reopened.error.message);
    expect(await new IndexedDbOutboxRepository(reopened.value, clock).get(item.operationId)).toEqual({ ok: true, value: item });
    reopened.value.close();
  });

  it("adiciona a store ao atualizar um banco v1 sem tocar stores legadas", async () => {
    const legacyName = `rpg-cloud-legacy-${sequence++}`;
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(legacyName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAMES.characters, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    legacy.close();
    const upgraded = await openDatabase({ name: legacyName });
    if (!upgraded.ok) throw new Error(upgraded.error.message);
    expect(upgraded.value.objectStoreNames.contains(STORE_NAMES.characters)).toBe(true);
    expect(upgraded.value.objectStoreNames.contains(STORE_NAMES.outbox)).toBe(true);
    upgraded.value.close();
  });
});
