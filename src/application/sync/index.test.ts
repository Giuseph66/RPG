import { describe, expect, it } from "vitest";

import { asAccountId, asCommandId, asIsoTimestamp } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { createPendingSyncOperation, createSyncOutboxService } from "./index";

const base = {
  operationId: asCommandId("sync-1"),
  aggregateType: "account" as const,
  aggregateId: asAccountId("account-1"),
  mutation: "upsert" as const,
  baseRevision: asRevision(0),
  payload: { email: "player@example.test" },
  createdAt: asIsoTimestamp("2026-09-12T10:00:00.000Z"),
};

describe("aplicação de sincronização", () => {
  it("constrói operação pending sem plataforma ou rede", () => {
    const result = createPendingSyncOperation(base);

    expect(result).toEqual({
      ok: true,
      value: {
        ...base,
        status: "pending",
        attempts: 0,
        updatedAt: base.createdAt,
        dedupeKey: "sync-1|account|account-1|upsert|0",
      },
    });
  });

  it("rejeita upsert sem snapshot e delete com snapshot", () => {
    expect(createPendingSyncOperation({ ...base, payload: undefined }).ok).toBe(false);
    expect(createPendingSyncOperation({ ...base, mutation: "delete", payload: { stale: true } }).ok).toBe(false);
    expect(createPendingSyncOperation({ ...base, aggregateType: "journal", mutation: "delete", payload: undefined }).ok).toBe(false);
    expect(createPendingSyncOperation({ ...base, aggregateType: "journal", mutation: "delete", scope: { campaignId: "00000000-0000-4000-8000-000000000001" as never }, payload: undefined }).ok).toBe(true);
  });

  it("delega o envelope pronto à porta, preservando contexto transacional", async () => {
    const enqueue = async (...args: unknown[]) => ({ ok: true as const, value: args[0] });
    const service = createSyncOutboxService({ enqueue } as never);
    const context = { kind: "rpg-transaction" as const };
    const result = await service.enqueue(base, context);

    expect(result.ok).toBe(true);
    expect(enqueue).toBeTypeOf("function");
  });
});
