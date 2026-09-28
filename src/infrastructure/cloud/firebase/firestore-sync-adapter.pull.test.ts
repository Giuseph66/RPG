import { describe, expect, it, vi } from "vitest";

import { FirebaseFirestoreSyncAdapter } from "./firestore-sync-adapter";

function fakeRemote() {
  const docs: Record<string, Record<string, unknown>> = {
    "users/player/characters/private": { id: "private", schemaVersion: 1, revision: 1, campaignId: "c1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1/members/player": { campaignId: "c1", accountId: "player", role: "player", status: "active", revision: 2, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c2/members/player": { campaignId: "c2", accountId: "player", role: "player", status: "invited", revision: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1": { id: "c1", schemaVersion: 1, revision: 1, name: "Mesa", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    "campaigns/c1/journals/j1": { id: "j1", campaignId: "c1", title: "Sessão", body: "Resumo", ownerUid: "player" },
    "campaigns/c1/journals/j2": { id: "j2", campaignId: "c1", title: "Segredo do mestre", body: "Plano", ownerUid: "master" },
    "campaigns/c1/maps/m1": { id: "m1", campaignId: "c1", assetId: "a1", pins: [], revision: 1, visibleTo: ["*"] },
    "campaigns/c1/maps/m2": { id: "m2", campaignId: "c1", assetId: "a2", pins: [], revision: 1, visibleTo: ["player"] },
    "campaigns/c1/maps/m3": { id: "m3", campaignId: "c1", assetId: "a3", pins: [], revision: 1 },
    "campaigns/c1/creatures/k1": { id: "k1", campaignId: "c1", name: "Lobo", notes: "segredo" },
    "campaigns/c1/sightings/k1__player": { id: "k1__player", campaignId: "c1", creatureId: "k1", accountId: "player", revealed: {} },
    "campaigns/c1/sightings/k1__other": { id: "k1__other", campaignId: "c1", creatureId: "k1", accountId: "other", revealed: {} },
    "campaigns/c1/guesses/k1__other": { id: "k1__other", campaignId: "c1", creatureId: "k1", accountId: "other", name: "", note: "" },
    "campaigns/c1/sessions/s1": { id: "s1", campaignId: "c1", schemaVersion: 1, revision: 1, number: 1, title: "Abertura", notes: "", summary: "", status: "planned", attendance: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  };
  const pathOf = (target: { path?: string }) => target.path ?? "";
  const deps = {
    doc: vi.fn((_db: never, path: string) => ({ path }) as never),
    getDoc: vi.fn(async (ref: { path: string }) => ({ exists: () => docs[ref.path] !== undefined, data: () => docs[ref.path] })),
    collection: vi.fn((_db: never, path: string) => ({ path, kind: "collection" })),
    collectionGroup: vi.fn((_db: never, id: string) => ({ path: id, kind: "group" })),
    where: vi.fn((field: string, op: string, value: string) => ({ field, op, value })),
    query: vi.fn((target: { path: string; kind?: string }, ...constraints: unknown[]) => ({ ...target, base: target.kind, kind: "query", constraints })),
    getDocs: vi.fn(async (target: { path: string; kind?: string; base?: string; constraints?: readonly { field: string; op: string; value: string }[] }) => {
      const entries = Object.entries(docs).filter(([path, data]) => {
        const inScope = target.base === "group"
          ? path.includes(`/${target.path}/`)
          : path.startsWith(`${target.path}/`) && path.split("/").length === target.path.split("/").length + 1;
        // Emula o filtro da consulta, que é o mesmo que as regras exigem de jogadores.
        return inScope && (target.constraints ?? []).every((constraint) => constraint.op === "=="
          ? data[constraint.field] === constraint.value
          : Array.isArray(data[constraint.field]) && (data[constraint.field] as unknown[]).includes(constraint.value));
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
      "account:player", "campaign:c1", "character:private", "journal:j1", "map:m1", "map:m2", "membership:c1:player", "membership:c2:player", "session:s1", "sighting:k1__player",
    ]);
    expect(result.value.records.some((item) => item.aggregateId === "c2" && item.aggregateType === "campaign")).toBe(false);
    expect(result.value.visibleCampaigns).toEqual([{ campaignId: "c1", role: "player" }]);
    expect(result.value.records.find((item) => item.aggregateId === "j1")?.payload).toMatchObject({ authorId: "player" });
    expect(remote.deps.getDocs).toHaveBeenCalled();
  });

  it("o mestre lê o registro completo, todos os diários e os palpites dos jogadores", async () => {
    const remote = fakeRemote();
    remote.docs["campaigns/c1/members/player"] = { ...remote.docs["campaigns/c1/members/player"]!, role: "master" };
    const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "player", deps: remote.deps as never });
    const result = await adapter.pull();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.records.map((item) => `${item.aggregateType}:${item.aggregateId}`);
    expect(ids).toEqual(expect.arrayContaining(["creature:k1", "journal:j2", "map:m3", "sighting:k1__other", "guess:k1__other"]));
    expect(result.value.visibleCampaigns).toEqual([{ campaignId: "c1", role: "master" }]);
  });

  it("tempo real: escuta a campanha com os filtros do jogador e entrega updates sem pull", async () => {
    vi.useFakeTimers();
    try {
      const remote = fakeRemote();
      const callbacks = new Map<string, (snapshot?: unknown) => void>();
      const stopped: string[] = [];
      const keyOf = (target: { path: string; constraints?: readonly { field: string; value: string }[] }) => [target.path, ...(target.constraints ?? []).map((item) => `${item.field}=${item.value}`)].join("|");
      remote.deps.onSnapshot = vi.fn((target: never, next: (snapshot?: unknown) => void) => { const key = keyOf(target); callbacks.set(key, next); return () => stopped.push(key); }) as never;
      const adapter = new FirebaseFirestoreSyncAdapter({ firestore: {} as never, ownerUid: "player", deps: remote.deps as never });
      const updates: unknown[] = [];
      const stop = adapter.subscribe((update) => updates.push(update ?? "full-pull"));
      const docsOf = (prefix: string, filter: (data: Record<string, unknown>) => boolean = () => true, fromCache = false) => ({
        metadata: { fromCache },
        docs: Object.entries(remote.docs).filter(([path, data]) => path.startsWith(prefix) && filter(data)).map(([path, data]) => ({ ref: { path }, exists: () => true, data: () => data })),
      });
      callbacks.get("members|accountId=player")!(docsOf("campaigns/c1/members/player"));
      // Primeiro snapshot dos vínculos não repete o pull inicial; só liga os listeners da campanha.
      expect(updates).toEqual([]);
      expect([...callbacks.keys()]).toEqual(expect.arrayContaining(["campaigns/c1", "campaigns/c1/sightings|accountId=player", "campaigns/c1/maps|visibleTo=player", "campaigns/c1/maps|visibleTo=*", "campaigns/c1/journals|ownerUid=player"]));
      expect(callbacks.has("campaigns/c1/creatures")).toBe(false);

      callbacks.get("campaigns/c1/sightings|accountId=player")!(docsOf("campaigns/c1/sightings/", (data) => data.accountId === "player", true));
      await vi.advanceTimersByTimeAsync(200);
      const first = updates.at(-1) as { records: { aggregateType: string; aggregateId: string }[]; visibleCampaigns: unknown[] };
      expect(first.records.map((item) => `${item.aggregateType}:${item.aggregateId}`)).toEqual(["membership:c1:player", "sighting:k1__player"]);
      // Dados só do cache não autorizam remover nada deste aparelho.
      expect(first.visibleCampaigns).toEqual([]);

      // Só os avistamentos confirmados pelo servidor: já dá para remover avistamentos ocultados,
      // sem esperar mapas ou diário (com cache persistente eles podem nunca reemitir).
      callbacks.get("campaigns/c1/sightings|accountId=player")!(docsOf("campaigns/c1/sightings/", (data) => data.accountId === "player"));
      await vi.advanceTimersByTimeAsync(200);
      expect((updates.at(-1) as { visibleCampaigns: unknown[] }).visibleCampaigns).toEqual([{ campaignId: "c1", role: "player", types: ["sighting"] }]);

      for (const [key, next] of callbacks) {
        if (key.startsWith("members") || key.startsWith("users/")) continue;
        next(key === "campaigns/c1" ? { metadata: { fromCache: false }, exists: () => true, data: () => remote.docs["campaigns/c1"] } : { metadata: { fromCache: false }, docs: [] });
      }
      await vi.advanceTimersByTimeAsync(200);
      expect((updates.at(-1) as { visibleCampaigns: unknown[] }).visibleCampaigns).toEqual([{ campaignId: "c1", role: "player", types: expect.arrayContaining(["campaign", "character", "session", "journal", "map", "sighting", "guess"]) }]);

      callbacks.get("members|accountId=player")!({ docs: [] });
      expect(updates.at(-1)).toBe("full-pull");
      expect(stopped).toContain("campaigns/c1/sightings|accountId=player");
      stop();
    } finally {
      vi.useRealTimers();
    }
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
