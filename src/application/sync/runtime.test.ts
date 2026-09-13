import { describe, expect, it, vi } from "vitest";

import { type AuthPort, type AuthSession } from "@application/ports/auth-port";
import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { type RemoteSyncAdapter } from "@application/ports/remote-sync-adapter";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { createSessionGatedOutboxRepository } from "./index";
import { createSyncRuntime, type SyncRuntimeEventTarget } from "./runtime";

const clock: Clock = { now: () => asIsoTimestamp("2026-09-12T12:00:00.000Z") };

class FakeAuth implements AuthPort {
  private session: AuthSession | null = null;
  private readonly listeners = new Set<(session: AuthSession | null) => void>();

  currentSession(): AuthSession | null { return this.session; }
  observeSession(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  setSession(session: AuthSession | null): void {
    this.session = session;
    for (const listener of this.listeners) listener(session);
  }
  registerWithEmailAndPassword = vi.fn();
  signInWithEmailAndPassword = vi.fn();
  signOut = vi.fn();
}

function events(): SyncRuntimeEventTarget & { emit(type: "online" | "offline"): void } {
  const handlers = new Map<string, Set<() => void>>();
  return {
    addEventListener(type, listener) { const set = handlers.get(type) ?? new Set(); set.add(listener); handlers.set(type, set); },
    removeEventListener(type, listener) { handlers.get(type)?.delete(listener); },
    emit(type) { for (const listener of handlers.get(type) ?? []) listener(); },
  };
}

function emptyOutbox(): OutboxRepository {
  return {
    enqueue: vi.fn(async (operation) => ({ ok: true as const, value: operation })),
    get: vi.fn(),
    listPending: vi.fn(async () => ({ ok: true as const, value: [] })),
    markSyncing: vi.fn(),
    markAcked: vi.fn(),
    markConflict: vi.fn(),
    markFailed: vi.fn(),
  } as unknown as OutboxRepository;
}

const session = (uid: string): AuthSession => ({ uid, email: `${uid}@example.test` });

describe("SyncRuntime", () => {
  it("fica signed-out e não enfileira operação cloud sem sessão", async () => {
    const auth = new FakeAuth();
    const raw = emptyOutbox();
    const gated = createSessionGatedOutboxRepository(raw, auth);
    const operation = { operationId: "op", aggregateType: "campaign", aggregateId: "campaign", mutation: "delete", baseRevision: 0, createdAt: clock.now() } as never;

    await gated.enqueue(operation);
    expect(raw.enqueue).not.toHaveBeenCalled();
    auth.setSession(session("owner"));
    await gated.enqueue(operation);
    expect(raw.enqueue).toHaveBeenCalledWith(expect.objectContaining({ ownerUid: "owner" }), undefined);
    auth.setSession(null);
    const runtime = createSyncRuntime({ auth, outbox: raw, clock, createAdapter: vi.fn(() => undefined), isOnline: () => true });
    expect(runtime.snapshot.state).toBe("signed-out");
    expect(runtime.snapshot.uid).toBeUndefined();
    runtime.dispose();
  });

  it("cria worker no login, drena pendências e troca o escopo no logout/login", async () => {
    const auth = new FakeAuth();
    const outbox = emptyOutbox();
    const adapters: string[] = [];
    const adapter = (uid: string): RemoteSyncAdapter => ({
      isAvailable: () => true,
      apply: vi.fn(),
    });
    const createAdapter = vi.fn((uid: string) => { adapters.push(uid); return adapter(uid); });
    const runtime = createSyncRuntime({ auth, outbox, clock, createAdapter, isOnline: () => true });

    auth.setSession(session("master"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(createAdapter).toHaveBeenCalledWith("master");
    expect(outbox.listPending).toHaveBeenCalled();
    expect(runtime.snapshot.state).toBe("ready");

    auth.setSession(null);
    expect(runtime.snapshot.state).toBe("signed-out");
    auth.setSession(session("player"));
    expect(runtime.snapshot.uid).toBe("player");
    expect(adapters).toEqual(["master", "player"]);
    runtime.dispose();
  });

  it("pausa offline, retoma no evento online e remove handlers ao encerrar", async () => {
    const auth = new FakeAuth();
    const target = events();
    let online = false;
    const createAdapter = vi.fn((): RemoteSyncAdapter => ({ isAvailable: () => true, apply: vi.fn() }));
    const runtime = createSyncRuntime({ auth, outbox: emptyOutbox(), clock, createAdapter, isOnline: () => online, events: target });
    auth.setSession(session("uid"));
    expect(runtime.snapshot.state).toBe("offline");
    online = true;
    target.emit("online");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(runtime.snapshot.state).toBe("ready");
    online = false;
    target.emit("offline");
    expect(runtime.snapshot.state).toBe("offline");
    runtime.dispose();
    target.emit("online");
    expect(createAdapter).toHaveBeenCalledTimes(1);
  });

  it("puxa após login, reage ao listener remoto e encerra listener no logout", async () => {
    const auth = new FakeAuth();
    const outbox = emptyOutbox();
    let notifyRemote: (() => void) | undefined;
    const stopRemote = vi.fn();
    const adapter: RemoteSyncAdapter = {
      isAvailable: () => true,
      apply: vi.fn(async () => ({ ok: true as const, value: { kind: "acked" as const, remoteRevision: 1 as never } })),
      pull: vi.fn(async () => ({ ok: true as const, value: { records: [] } })),
      subscribe: vi.fn((listener: () => void) => { notifyRemote = listener; return stopRemote; }),
    };
    const hydration = {
      hydrate: vi.fn(async () => ({ ok: true as const, value: { received: 0, applied: 0, skipped: 0, conflicts: [] } })),
    };
    const runtime = createSyncRuntime({ auth, outbox, clock, createAdapter: () => adapter, hydration, isOnline: () => true });
    auth.setSession(session("player"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adapter.pull).toHaveBeenCalledTimes(1);
    expect(hydration.hydrate).toHaveBeenCalledWith(expect.objectContaining({ ownerUid: "player", pull: { records: [] } }));
    notifyRemote?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adapter.pull).toHaveBeenCalledTimes(2);
    auth.setSession(null);
    expect(stopRemote).toHaveBeenCalledTimes(1);
    runtime.dispose();
  });
});
