/**
 * Identidade e roteamento dos caches pertencentes ao shell PWA.
 *
 * O worker usa estes nomes para nunca tocar em caches de domínio ou em
 * IndexedDB. A versão precisa mudar quando o shell/worker publicado mudar.
 */
export const PWA_VERSION = "2026.09.11";
export const PWA_WORKER_URL = "/pwa-worker.js";
export const PWA_MANIFEST_URL = "/manifest.webmanifest";

export const PWA_CACHE_PREFIX = "rpg-companion-pwa";
export const PWA_CACHE_NAMES = {
  shell: `${PWA_CACHE_PREFIX}-shell-${PWA_VERSION}`,
  corpus: `${PWA_CACHE_PREFIX}-corpus-${PWA_VERSION}`,
} as const;

export const PWA_SHELL_URLS = [
  "/",
  "/index.html",
  PWA_MANIFEST_URL,
  "/offline.html",
] as const;

export type PwaCacheBucket = "shell" | "corpus" | "network";

export interface PwaRequestDescriptor {
  readonly url: string;
  readonly method?: string;
  readonly destination?: string;
  readonly origin?: string;
}

/** Classifica apenas recursos que o worker pode atender com segurança. */
export function classifyPwaRequest(request: PwaRequestDescriptor): PwaCacheBucket {
  if ((request.method ?? "GET").toUpperCase() !== "GET") return "network";

  let url: URL;
  try {
    url = new URL(request.url, request.origin ?? "http://localhost");
  } catch {
    return "network";
  }

  if (request.origin && url.origin !== request.origin) return "network";
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === PWA_MANIFEST_URL || url.pathname === "/offline.html") return "shell";
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/corpus/")) return "corpus";
  return "network";
}

/** Só caches criados por este worker são candidatos à limpeza na ativação. */
export function isPwaCache(cacheName: string): boolean {
  return cacheName.startsWith(`${PWA_CACHE_PREFIX}-`);
}

export function isCurrentPwaCache(cacheName: string): boolean {
  return cacheName === PWA_CACHE_NAMES.shell || cacheName === PWA_CACHE_NAMES.corpus;
}

export function shouldDeletePwaCache(cacheName: string): boolean {
  return isPwaCache(cacheName) && !isCurrentPwaCache(cacheName);
}
