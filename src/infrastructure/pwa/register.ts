import { err, ok, type Result } from "@domain/contracts/errors";
import {
  PWA_VERSION,
  PWA_WORKER_URL,
} from "./cache-policy";

export interface PwaWorker {
  readonly postMessage: (message: unknown) => void;
  readonly state?: string;
}

export interface PwaRegistration {
  readonly scope?: string;
  readonly waiting?: PwaWorker | null;
  readonly update?: () => Promise<unknown>;
  readonly addEventListener?: (type: string, listener: () => void) => void;
  readonly removeEventListener?: (type: string, listener: () => void) => void;
}

export interface PwaServiceWorkerContainer {
  readonly register: (url: string, options?: { readonly scope?: string }) => Promise<PwaRegistration>;
}

export interface PwaPlatform {
  readonly serviceWorker?: PwaServiceWorkerContainer;
}

export type PwaUpdateState = "current" | "available" | "deferred";

export type PwaError =
  | { readonly code: "unsupported"; readonly message: string }
  | { readonly code: "registration-failed"; readonly message: string; readonly cause?: string }
  | { readonly code: "update-deferred"; readonly message: string }
  | { readonly code: "cache-failed"; readonly message: string; readonly cause?: string };

export interface PwaRegistrationOptions {
  readonly version?: string;
  readonly workerUrl?: string;
  readonly scope?: string;
  readonly platform?: PwaPlatform;
  /** Retorna true enquanto save, import, draft ou outra operação não pode ser interrompida. */
  readonly hasPendingWork?: () => boolean;
}

export interface RegisteredPwa {
  readonly version: string;
  readonly scope: string | undefined;
  readonly registration: PwaRegistration;
  readonly getUpdateState: () => PwaUpdateState;
  readonly deferUpdate: () => PwaUpdateState;
  readonly applyUpdate: () => Result<void, PwaError>;
  readonly update: () => Promise<Result<PwaUpdateState, PwaError>>;
  readonly dispose: () => void;
}

function defaultPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return {};
  return { serviceWorker: navigator.serviceWorker };
}

function errorCause(cause: unknown): string | undefined {
  return cause instanceof Error ? cause.message : typeof cause === "string" ? cause : undefined;
}

/**
 * Registra o worker apenas quando o compositor chama esta função. Não faz
 * reload e não assume como descartar saves/drafts para aplicar atualização.
 */
export async function registerPwa(options: PwaRegistrationOptions = {}): Promise<Result<RegisteredPwa, PwaError>> {
  const platform = options.platform ?? defaultPlatform();
  if (!platform.serviceWorker) {
    return err({ code: "unsupported", message: "Instalação offline não suportada neste ambiente." });
  }

  const version = options.version ?? PWA_VERSION;
  const workerUrl = options.workerUrl ?? PWA_WORKER_URL;
  let registration: PwaRegistration;
  try {
    registration = await platform.serviceWorker.register(workerUrl, options.scope ? { scope: options.scope } : undefined);
  } catch (cause) {
    return err({ code: "registration-failed", message: "Registro do worker offline falhou; o estado local da aplicação foi preservado.", cause: errorCause(cause) });
  }

  let updateState: PwaUpdateState = registration.waiting ? "available" : "current";
  const hasPendingWork = options.hasPendingWork ?? (() => false);
  const onUpdateFound = () => {
    updateState = hasPendingWork() ? "deferred" : "available";
  };
  registration.addEventListener?.("updatefound", onUpdateFound);

  const handle: RegisteredPwa = {
    version,
    scope: registration.scope,
    registration,
    getUpdateState: () => updateState,
    deferUpdate: () => {
      updateState = "deferred";
      return updateState;
    },
    applyUpdate: () => {
      if (hasPendingWork()) {
        updateState = "deferred";
        return err({ code: "update-deferred", message: "Atualização adiada enquanto há uma operação local em andamento." });
      }
      const waiting = registration.waiting;
      if (waiting) {
        waiting.postMessage({ type: "SKIP_WAITING", version });
        updateState = "current";
      } else {
        updateState = "current";
      }
      return ok(undefined);
    },
    update: async () => {
      try {
        await registration.update?.();
        updateState = registration.waiting ? (hasPendingWork() ? "deferred" : "available") : "current";
        return ok(updateState);
      } catch (cause) {
        return err({ code: "registration-failed", message: "Verificação de atualização offline falhou.", cause: errorCause(cause) });
      }
    },
    dispose: () => registration.removeEventListener?.("updatefound", onUpdateFound),
  };
  return ok(handle);
}
