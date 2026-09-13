import { describe, expect, it } from "vitest";

import { asAccountId, asCommandId, asIsoTimestamp, asUuid } from "./ids";
import { asRevision } from "./versioning";
import { isJsonValue, isSyncOperation, syncOperationDedupeKey, type SyncOperation } from "./cloud-sync";

const operation: SyncOperation = {
  operationId: asCommandId("op-1"),
  aggregateType: "membership",
  aggregateId: asUuid("11111111-1111-4111-8111-111111111111"),
  mutation: "upsert",
  baseRevision: asRevision(2),
  payload: { accountId: "acct-1", role: "player" },
  status: "pending",
  attempts: 0,
  createdAt: asIsoTimestamp("2026-09-12T10:00:00.000Z"),
  updatedAt: asIsoTimestamp("2026-09-12T10:00:00.000Z"),
  dedupeKey: "op-1|membership|11111111-1111-4111-8111-111111111111|upsert|2",
};

describe("contratos cloud-sync", () => {
  it("mantém IDs de conta distintos de UUIDs locais e cria chave determinística", () => {
    const accountId = asAccountId("firebase-uid");

    expect(accountId).toBe("firebase-uid");
    expect(syncOperationDedupeKey(operation)).toBe(operation.dedupeKey);
    expect(syncOperationDedupeKey({ ...operation, scope: { campaignId: operation.aggregateId as never } })).not.toBe(operation.dedupeKey);
  });

  it("aceita apenas snapshots JSON finitos e reconhece operação serializável", () => {
    expect(isJsonValue({ nested: ["ok", 1, null] })).toBe(true);
    expect(isJsonValue({ value: Number.NaN })).toBe(false);
    expect(isJsonValue(new Date())).toBe(false);
    expect(isSyncOperation(operation)).toBe(true);
    expect(isSyncOperation({ ...operation, dedupeKey: "wrong" })).toBe(false);
  });

  it("representa membership com papel fechado e timestamps serializáveis", () => {
    const membership = {
      campaignId: asUuid("22222222-2222-4222-8222-222222222222"),
      accountId: asAccountId("player-1"),
      role: "player" as const,
      status: "active" as const,
      revision: asRevision(0),
      createdAt: asIsoTimestamp("2026-09-12T10:00:00.000Z"),
      updatedAt: asIsoTimestamp("2026-09-12T10:00:00.000Z"),
    };

    expect(JSON.parse(JSON.stringify(membership))).toEqual(membership);
  });
});
