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

export interface PwaBroadcastMessageEvent {
  readonly data: unknown;
}

export interface PwaBroadcastChannel {
  readonly postMessage: (message: unknown) => void;
  readonly addEventListener?: (type: "message", listener: (event: PwaBroadcastMessageEvent) => void) => void;
  readonly removeEventListener?: (type: "message", listener: (event: PwaBroadcastMessageEvent) => void) => void;
  readonly close?: () => void;
}

export interface PwaServiceWorkerContainer {
  readonly register: (url: string, options?: { readonly scope?: string }) => Promise<PwaRegistration>;
}

export interface PwaPlatform {
  readonly serviceWorker?: PwaServiceWorkerContainer;
  /** Fábrica injetável para coordenar abas; ausência é um fallback suportado. */
  readonly createBroadcastChannel?: (name: string) => PwaBroadcastChannel;
}

export const PWA_UPDATE_CHANNEL = "rpg-companion-pwa-updates";

type PwaUpdateMessage =
  | { readonly type: "update-available"; readonly version: string }
  | { readonly type: "update-applied"; readonly version: string };

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
  const createBroadcastChannel = typeof BroadcastChannel === "undefined"
    ? undefined
    : (name: string): PwaBroadcastChannel => {
        const channel = new BroadcastChannel(name);
        return {
          postMessage: (message) => channel.postMessage(message),
          addEventListener: (_type, listener) => channel.addEventListener("message", listener as unknown as EventListener),
          removeEventListener: (_type, listener) => channel.removeEventListener("message", listener as unknown as EventListener),
          close: () => channel.close(),
        };
      };
  return { serviceWorker: navigator.serviceWorker, createBroadcastChannel };
}

function errorCause(cause: unknown): string | undefined {
  return cause instanceof Error ? cause.message : typeof cause === "string" ? cause : undefined;
}

function isPwaUpdateMessage(value: unknown): value is PwaUpdateMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { type?: unknown; version?: unknown };
  return (message.type === "update-available" || message.type === "update-applied") && typeof message.version === "string";
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
  let channel: PwaBroadcastChannel | undefined;
  try {
    channel = platform.createBroadcastChannel?.(PWA_UPDATE_CHANNEL);
  } catch {
    channel = undefined;
  }
  const announce = (message: PwaUpdateMessage) => {
    try {
      channel?.postMessage(message);
    } catch {
      // Falha de coordenação entre abas não pode impedir o PWA local.
    }
  };
  const onChannelMessage = (event: PwaBroadcastMessageEvent) => {
    if (!isPwaUpdateMessage(event.data)) return;
    if (event.data.type === "update-available") {
      updateState = hasPendingWork() ? "deferred" : "available";
      return;
    }
    // Outra aba pode ter aplicado a versão; esta aba ainda decide quando
    // aplicar, após verificar seu próprio trabalho pendente.
    updateState = hasPendingWork() ? "deferred" : "available";
  };
  channel?.addEventListener?.("message", onChannelMessage);
  if (registration.waiting) announce({ type: "update-available", version });
  const onUpdateFound = () => {
    updateState = hasPendingWork() ? "deferred" : "available";
    announce({ type: "update-available", version });
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
        announce({ type: "update-applied", version });
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
    dispose: () => {
      registration.removeEventListener?.("updatefound", onUpdateFound);
      channel?.removeEventListener?.("message", onChannelMessage);
      try {
        channel?.close?.();
      } catch {
        // Canal já encerrado ou indisponível não altera o ciclo de vida local.
      }
    },
  };
  return ok(handle);
}
