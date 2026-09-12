import { err, ok, type Result } from "@domain/contracts/errors";
import { PWA_CACHE_NAMES, PWA_SHELL_URLS } from "./cache-policy";
import type { PwaError } from "./register";

export interface PwaCache {
  readonly addAll: (urls: readonly string[]) => Promise<void>;
}

export interface PwaCacheStorage {
  readonly open: (cacheName: string) => Promise<PwaCache>;
}

/** Prepara apenas o cache do shell PWA; nunca recebe nem limpa dados da aplicação. */
export async function precachePwaShell(
  storage: PwaCacheStorage,
  urls: readonly string[] = PWA_SHELL_URLS,
): Promise<Result<void, PwaError>> {
  try {
    const cache = await storage.open(PWA_CACHE_NAMES.shell);
    await cache.addAll(urls);
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "cache-failed",
      message: "Cache do shell offline indisponível; o estado local da aplicação foi preservado.",
      cause: cause instanceof Error ? cause.message : typeof cause === "string" ? cause : undefined,
    });
  }
}
