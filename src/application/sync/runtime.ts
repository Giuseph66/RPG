import { type AuthPort, type AuthSession } from "@application/ports/auth-port";
import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { type RemoteSyncAdapter } from "@application/ports/remote-sync-adapter";
import { type AppError, type Result } from "@domain/contracts/errors";

import { createRemotePullWorker, type RemoteHydrationPort, type RemoteHydrationReport } from "./pull";
import { createSyncWorker, type SyncWorkerReport } from "./worker";

export type SyncRuntimeState = "local-only" | "signed-out" | "offline" | "ready" | "syncing" | "error";

export interface SyncRuntimeSnapshot {
  readonly state: SyncRuntimeState;
  readonly uid?: string;
  readonly lastReport?: SyncWorkerReport;
  readonly lastHydration?: RemoteHydrationReport;
  readonly lastError?: AppError;
}

export interface SyncRuntimeEventTarget {
  addEventListener(type: "online" | "offline", listener: () => void): void;
  removeEventListener(type: "online" | "offline", listener: () => void): void;
}

export interface SyncRuntimeOptions {
  readonly auth: AuthPort;
  readonly outbox: OutboxRepository;
  readonly clock: Clock;
  readonly createAdapter: (uid: string) => RemoteSyncAdapter | undefined;
  readonly isOnline?: () => boolean;
  readonly events?: SyncRuntimeEventTarget;
  /** Opt-in pull; omitted means the runtime remains push-only/local-first. */
  readonly hydration?: RemoteHydrationPort;
}

export interface SyncRuntime {
  readonly snapshot: SyncRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  /** Solicita uma drenagem após uma mutação autenticada. */
  notifyPending(): void;
  /** Drena agora; usado pelo runtime e por hosts que querem feedback explícito. */
  run(): Promise<Result<SyncWorkerReport, AppError> | undefined>;
  dispose(): void;
}

const browserEvents = (): SyncRuntimeEventTarget | undefined => {
  if (typeof window === "undefined") return undefined;
  return window;
};

const browserOnline = (): boolean => typeof navigator === "undefined" || navigator.onLine;

/** Coordinates one authenticated worker with auth and browser connectivity. */
export function createSyncRuntime(options: SyncRuntimeOptions): SyncRuntime {
  let active = true;
  let session: AuthSession | null = null;
  let worker: ReturnType<typeof createSyncWorker> | undefined;
  let pullWorker: ReturnType<typeof createRemotePullWorker> | undefined;
  let unsubscribeRemote: (() => void) | undefined;
  let current: SyncRuntimeSnapshot = { state: "signed-out" };
  let unsubscribeAuth: (() => void) | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<Result<SyncWorkerReport, AppError> | undefined> | undefined;
  let rerun = false;
  const listeners = new Set<() => void>();
  const events = options.events ?? browserEvents();
  const online = options.isOnline ?? browserOnline;

  function publish(next: SyncRuntimeSnapshot): void {
    current = Object.freeze(next);
    for (const listener of listeners) listener();
  }

  function pauseForConnectivity(): void {
    if (!session) {
      publish({ state: "signed-out" });
    } else if (!online()) {
      publish({ state: "offline", uid: session.uid });
    }
  }

  function schedule(): void {
    if (!active || !session || !worker || !online() || scheduled !== undefined) return;
    scheduled = setTimeout(() => {
      scheduled = undefined;
      void run();
    }, 0);
  }

  async function run(): Promise<Result<SyncWorkerReport, AppError> | undefined> {
    if (!active || !session || !worker) return undefined;
    if (!online()) {
      publish({ state: "offline", uid: session.uid, lastReport: current.lastReport });
      return undefined;
    }
    if (running) {
      rerun = true;
      return running;
    }

    const activeWorker = worker;
    const activePullWorker = pullWorker;
    publish({ state: "syncing", uid: session.uid, lastReport: current.lastReport, lastHydration: current.lastHydration });
    running = (async () => {
      const pulled = await activePullWorker?.run();
      if (pulled && !pulled.ok) return { ok: false, error: pulled.error } as Result<SyncWorkerReport, AppError>;
      const pushed = await activeWorker!.run();
      if (pulled?.ok) current = { ...current, lastHydration: pulled.value };
      return pushed;
    })().then((result) => {
      if (!active || !session) return result;
      if (!online()) {
        publish({ state: "offline", uid: session.uid, lastReport: current.lastReport });
        return result;
      }
      if (result.ok) {
        publish({ state: result.value.unavailable ? "local-only" : "ready", uid: session.uid, lastReport: result.value, lastHydration: current.lastHydration });
      } else {
        publish({ state: "error", uid: session.uid, lastReport: current.lastReport, lastError: result.error });
      }
      return result;
    }).finally(() => {
      running = undefined;
      if (rerun) {
        rerun = false;
        schedule();
      }
    });
    return running;
  }

  function onSession(next: AuthSession | null): void {
    if (!active) return;
    session = next;
    worker = undefined;
    pullWorker = undefined;
    unsubscribeRemote?.();
    unsubscribeRemote = undefined;
    if (!next) {
      publish({ state: "signed-out" });
      return;
    }
    if (!online()) {
      publish({ state: "offline", uid: next.uid });
      return;
    }
    try {
      const adapter = options.createAdapter(next.uid);
      if (!adapter) {
        publish({ state: "local-only", uid: next.uid });
        return;
      }
      const workerUid = next.uid;
      worker = createSyncWorker({
        outbox: options.outbox,
        adapter,
        clock: options.clock,
        isOnline: online,
        ownerUid: workerUid,
        isActive: () => active && session?.uid === workerUid && online(),
      });
      if (options.hydration && adapter.pull) {
        pullWorker = createRemotePullWorker({
          adapter,
          outbox: options.outbox,
          hydration: options.hydration,
          clock: options.clock,
          ownerUid: workerUid,
          isOnline: online,
          isActive: () => active && session?.uid === workerUid && online(),
        });
        unsubscribeRemote = adapter.subscribe?.(schedule);
      }
      publish({ state: "ready", uid: next.uid });
      schedule();
    } catch (cause) {
      publish({ state: "error", uid: next.uid, lastError: {
        code: "storage-unavailable",
        message: "Não foi possível preparar a sincronização remota.",
        cause: cause instanceof Error ? cause.message : String(cause),
      } });
    }
  }

  const onOnline = () => {
    if (!active || !session) return;
    // Offline login deliberately leaves no worker. Recompose it on the first
    // online event so the same path also refreshes a transient adapter.
    onSession(session);
  };
  const onOffline = () => pauseForConnectivity();

  if (events) {
    events.addEventListener("online", onOnline);
    events.addEventListener("offline", onOffline);
  }
  unsubscribeAuth = options.auth.observeSession(onSession);
  onSession(options.auth.currentSession());

  return {
    get snapshot() { return current; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notifyPending: schedule,
    run,
    dispose() {
      if (!active) return;
      active = false;
      if (scheduled !== undefined) clearTimeout(scheduled);
      unsubscribeAuth?.();
      unsubscribeAuth = undefined;
      unsubscribeRemote?.();
      unsubscribeRemote = undefined;
      if (events) {
        events.removeEventListener("online", onOnline);
        events.removeEventListener("offline", onOffline);
      }
      listeners.clear();
      worker = undefined;
    },
  };
}
