/* RPG Companion PWA worker. Version bump is deliberate and reviewed with the shell. */
const VERSION = "2026.09.11";
const PREFIX = "rpg-companion-pwa";
const SHELL_CACHE = `${PREFIX}-shell-${VERSION}`;
const CORPUS_CACHE = `${PREFIX}-corpus-${VERSION}`;
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/offline.html"];

function sameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isCorpus(request) {
  const path = new URL(request.url).pathname;
  return path.startsWith("/assets/") || path.startsWith("/corpus/");
}

async function networkNavigation(request) {
  let shell;
  try { shell = await caches.open(SHELL_CACHE); } catch { shell = undefined; }
  try {
    const response = await fetch(request);
    if (response.ok && shell) await shell.put(request, response.clone());
    return response;
  } catch {
    return (shell && (await shell.match(request))) || (shell && (await shell.match("/index.html"))) || (shell && (await shell.match("/offline.html"))) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheCorpus(request) {
  let corpus;
  try { corpus = await caches.open(CORPUS_CACHE); } catch { corpus = undefined; }
  const cached = corpus && await corpus.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && corpus) await corpus.put(request, response.clone());
    return response;
  } catch {
    return (corpus && (await corpus.match(request))) || new Response("Recurso local indisponível", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheShell(request) {
  let shell;
  try { shell = await caches.open(SHELL_CACHE); } catch { shell = undefined; }
  const cached = shell && await shell.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && shell) await shell.put(request, response.clone());
    return response;
  } catch {
    return (shell && (await shell.match("/offline.html"))) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith(`${PREFIX}-`) && name !== SHELL_CACHE && name !== CORPUS_CACHE).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING" && event.data.version === VERSION) self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !sameOrigin(request)) return;
  if (isNavigation(request)) event.respondWith(networkNavigation(request));
  else if (isCorpus(request)) event.respondWith(cacheCorpus(request));
  else if (["/", "/index.html", "/manifest.webmanifest", "/offline.html"].includes(new URL(request.url).pathname)) event.respondWith(cacheShell(request));
});
