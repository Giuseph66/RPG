import { describe, expect, it, vi } from "vitest";

import { FirebaseFirestoreSyncAdapter } from "./firestore-sync-adapter";

function fakeRemote() {
  const docs: Record<string, Record<string, unknown>> = {
    "users/player/characters/private": { id: "private", schemaVersion: 1, revision: 1, campaignId: "c1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1/members/player": { campaignId: "c1", accountId: "player", role: "player", status: "active", revision: 2, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c2/members/player": { campaignId: "c2", accountId: "player", role: "player", status: "invited", revision: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1": { id: "c1", schemaVersion: 1, revision: 1, name: "Mesa", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1/journals/j1": { id: "j1", campaignId: "c1", title: "Sessão", body: "Resumo" },
    "campaigns/c1/maps/m1": { id: "m1", campaignId: "c1", assetId: "a1", pins: [], revision: 1 },
    "campaigns/c1/sessions/s1": { id: "s1", campaignId: "c1", schemaVersion: 1, revision: 1, number: 1, title: "Abertura", notes: "", summary: "", status: "planned", attendance: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  };
  const pathOf = (target: { path?: string }) => target.path ?? "";
  const deps = {
    doc: vi.fn((_db: never, path: string) => ({ path }) as never),
    getDoc: vi.fn(async (ref: { path: string }) => ({ exists: () => docs[ref.path] !== undefined, data: () => docs[ref.path] })),
    collection: vi.fn((_db: never, path: string) => ({ path, kind: "collection" })),
    collectionGroup: vi.fn((_db: never, id: string) => ({ path: id, kind: "group" })),
    where: vi.fn((field: string, op: string, value: string) => ({ field, op, value })),
    query: vi.fn((target: { path: string }, ...constraints: unknown[]) => ({ ...target, kind: "membership-query", constraints })),
    getDocs: vi.fn(async (target: { path: string; kind?: string }) => {
      const entries = Object.entries(docs).filter(([path]) => {
        if (target.kind === "membership-query") return path.includes("/members/");
        return path.startsWith(`${target.path}/`) && path.split("/").length === target.path.split("/").length + 1;
      });
      return { docs: entries.map(([path, data]) => ({ ref: { path }, exists: () => true, data: () => data })) };
    }),
    onSnapshot: vi.fn(() => () => undefined),
  };
  return { deps, docs, pathOf };
}

describe("FirebaseFirestoreSyncAdapter.pull", () => {
  it("traz conta, personagens privados, vínculos e somente conteúdo de membros ativos", async () => {
    const remote = fakeRemote();
    remote.docs["users/player"] = { id: "player", uid: "player", email: "p@example.test", schemaVersion: 1, revision: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "player", deps: remote.deps as never });
    const result = await adapter.pull();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.records.map((item) => `${item.aggregateType}:${item.aggregateId}`)).toEqual([
      "account:player", "campaign:c1", "character:private", "journal:j1", "map:m1", "membership:c1:player", "membership:c2:player", "session:s1",
    ]);
    expect(result.value.records.some((item) => item.aggregateId === "c2" && item.aggregateType === "campaign")).toBe(false);
    expect(remote.deps.getDocs).toHaveBeenCalled();
  });

  it("subscrição é encerrável e não registra listener quando indisponível", () => {
    const remote = fakeRemote();
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "player", deps: remote.deps as never });
    const stop = adapter.subscribe?.(vi.fn());
    stop?.();
    expect(remote.deps.onSnapshot).toHaveBeenCalledTimes(2);
    const unavailable = new FirebaseFirestoreSyncAdapter({ firestore: null, ownerUid: "player", deps: remote.deps as never });
    unavailable.subscribe?.(vi.fn());
    expect(remote.deps.onSnapshot).toHaveBeenCalledTimes(2);
  });
});
