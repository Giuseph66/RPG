import { type AuthPort, type AuthSession } from "@application/ports/auth-port";
import { type Clock } from "@application/ports/clock";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { type RemoteSyncAdapter, type RemoteSyncPullResult } from "@application/ports/remote-sync-adapter";
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
  /** Runs after remote data is hydrated and before queued local operations are pushed. */
  readonly afterHydration?: () => Promise<void>;
}

export interface SyncRuntime {
  readonly snapshot: SyncRuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  /** Solicita uma drenagem após uma mutação autenticada. */
  notifyPending(): void;
  /** Drena agora; usado pelo runtime e por hosts que querem feedback explícito. */
  run(options?: { readonly retryFailed?: boolean; readonly retryConflicts?: boolean }): Promise<Result<SyncWorkerReport, AppError> | undefined>;
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
  let retryFailedOnRerun = false;
  let retryConflictsOnRerun = false;
  const listeners = new Set<() => void>();
  const events = options.events ?? browserEvents();
  const online = options.isOnline ?? browserOnline;

  function publish(next: SyncRuntimeSnapshot): void {
    // Repetir o mesmo estado (ex.: a mesma falha de leitura a cada nova tentativa) não avisa ninguém:
    // cada aviso re-renderiza a aplicação inteira.
    if (current.state === next.state && current.uid === next.uid && current.lastReport === next.lastReport && current.lastHydration === next.lastHydration
      && current.lastError?.code === next.lastError?.code && current.lastError?.message === next.lastError?.message) return;
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

  // Atualizações em tempo real são hidratadas em fila, sem reler o Firestore inteiro.
  let remoteChain: Promise<void> = Promise.resolve();
  function applyRemote(update: RemoteSyncPullResult, uid: string): void {
    const hydration = options.hydration;
    if (!hydration) return;
    remoteChain = remoteChain.then(async () => {
      if (!active || session?.uid !== uid) return;
      const pending = await options.outbox.listPending();
      if (!pending.ok) return;
      const hydrated = await hydration.hydrate({ ownerUid: uid, pull: update, pending: pending.value, clock: options.clock });
      if (!hydrated.ok) {
        console.error("[sync] Atualização em tempo real não foi aplicada", { code: hydrated.error.code, message: hydrated.error.message });
        return;
      }
      if (hydrated.value.applied > 0 && active && session?.uid === uid) publish({ ...current, lastHydration: hydrated.value });
    }).catch((cause) => {
      console.error("[sync] Atualização em tempo real falhou", { message: cause instanceof Error ? cause.message : String(cause) });
    });
  }

  // Com os listeners de tempo real ativos, o remoto já chega sozinho: uma gravação local só
  // precisa ser enviada. Reler todas as coleções a cada clique esgotaria a cota de leituras.
  let pullRequested = false;
  function schedule(pull = true): void {
    if (pull || !unsubscribeRemote) pullRequested = true;
    if (!active || !session || !worker || !online() || scheduled !== undefined) return;
    scheduled = setTimeout(() => {
      scheduled = undefined;
      const withPull = pullRequested;
      pullRequested = false;
      void run({ retryFailed: retryFailedOnRerun, retryConflicts: retryConflictsOnRerun, pull: withPull });
    }, 0);
  }

  async function run(request: { readonly retryFailed?: boolean; readonly retryConflicts?: boolean; readonly pull?: boolean } = {}): Promise<Result<SyncWorkerReport, AppError> | undefined> {
    if (!active || !session || !worker) return undefined;
    if (!online()) {
      publish({ state: "offline", uid: session.uid, lastReport: current.lastReport });
      return undefined;
    }
    if (running) {
      rerun = true;
      if (request.pull !== false) pullRequested = true;
      if (request.retryFailed) retryFailedOnRerun = true;
      if (request.retryConflicts) retryConflictsOnRerun = true;
      return running;
    }
    const retryFailed = request.retryFailed || retryFailedOnRerun;
    const retryConflicts = request.retryConflicts || retryConflictsOnRerun;
    retryFailedOnRerun = false;
    retryConflictsOnRerun = false;

    const activeWorker = worker;
    const activePullWorker = pullWorker;
    publish({ state: "syncing", uid: session.uid, lastReport: current.lastReport, lastHydration: current.lastHydration });
    running = (async () => {
      const pulled = request.pull === false ? undefined : await activePullWorker?.run();
      if (pulled?.ok) {
        current = { ...current, lastHydration: pulled.value };
        try {
          await options.afterHydration?.();
        } catch (cause) {
          console.error("[sync] Pós-hidratação falhou", { message: cause instanceof Error ? cause.message : String(cause) });
        }
      }
      const pushed = await activeWorker!.run({ retryFailed, retryConflicts });
      // A falha na leitura (por exemplo, um índice ausente) não pode impedir
      // que alterações locais já autenticadas sejam enviadas ao Firebase.
      if (!pushed.ok) return pushed;
      if (pulled && !pulled.ok) return { ok: false, error: pulled.error } as Result<SyncWorkerReport, AppError>;
      return pushed;
    })().then((result) => {
      if (!active || !session) return result;
      if (!online()) {
        publish({ state: "offline", uid: session.uid, lastReport: current.lastReport });
        return result;
      }
      if (result.ok) {
        const hasFailures = result.value.failed > 0 || result.value.conflicts > 0;
        publish(hasFailures
          ? {
              state: "error",
              uid: session.uid,
              lastReport: result.value,
              lastHydration: current.lastHydration,
              lastError: {
                code: "storage-unavailable",
                message: result.value.lastErrorMessage ?? "O Firebase não confirmou uma alteração local.",
              },
            }
          : { state: result.value.unavailable ? "local-only" : "ready", uid: session.uid, lastReport: result.value, lastHydration: current.lastHydration });
      } else {
        console.error("[sync] Leitura remota falhou", {
          code: result.error.code,
          message: result.error.message,
        });
        publish({ state: "error", uid: session.uid, lastReport: current.lastReport, lastError: result.error });
      }
      return result;
    }).finally(() => {
      running = undefined;
      if (rerun) {
        rerun = false;
        schedule(false);
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
        unsubscribeRemote = adapter.subscribe?.((update) => { if (update) applyRemote(update, workerUid); else schedule(); });
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
    notifyPending: () => schedule(false),
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
