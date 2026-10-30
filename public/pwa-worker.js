/* RPG Companion PWA worker. Version bump is deliberate and reviewed with the shell. */
const VERSION = "2026.10.05";
const PREFIX = "rpg-companion-pwa";
const SHELL_CACHE = `${PREFIX}-shell-${VERSION}`;
const CORPUS_CACHE = `${PREFIX}-corpus-${VERSION}`;
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/offline.html"];
// Publicados em public/dice; a lista explícita evita seguir caminhos vindos
// de dados remotos durante o prewarm do worker.
const DICE_ASSET_IDS = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d10", "d12", "d14", "d16", "d20", "d24", "d30", "d48", "d50", "d60", "d100", "d120"];
const DICE_ASSET_PATHS = ["/dice/index.json", ...DICE_ASSET_IDS.flatMap((id) => [`/dice/${id}.json`, `/dice/${id}.glb`])];

// Vite emits the route chunks as references in the entry module.  Walking
// those references during activation keeps an installed shell useful offline
// even when the user has not opened Compendium/Data/Dice yet.
const ASSET_REFERENCE = /(?:^|["'(`\/])((?:(?:\.{1,2}\/)+(?:assets|icons)\/|(?:assets|icons)\/|(?:\.{1,2}\/)+)[A-Za-z0-9._~/-]+\.(?:js|css|woff2?|png|svg|webp|jpg|jpeg|gif|avif))/g;

function assetPaths(source, basePath = "/") {
  const paths = [];
  let match;
  while ((match = ASSET_REFERENCE.exec(source)) !== null) {
    const reference = match[1];
    const path = reference.startsWith(".")
      ? new URL(reference, `https://rpg.local${basePath.slice(0, basePath.lastIndexOf("/") + 1)}`).pathname
      : `/${reference}`;
    if (path.startsWith("/assets/") || path.startsWith("/icons/")) paths.push(path);
  }
  ASSET_REFERENCE.lastIndex = 0;
  return [...new Set(paths)];
}

async function prewarmApplicationAssets() {
  let corpus;
  try { corpus = await caches.open(CORPUS_CACHE); } catch { return; }

  const queue = [];
  const visited = new Set();
  const responses = [];
  try {
    const indexResponse = await fetch("/index.html");
    if (!indexResponse.ok) return;
    queue.push(...assetPaths(await indexResponse.text(), "/index.html"));
    const manifestResponse = await fetch("/manifest.webmanifest");
    if (manifestResponse.ok) queue.push(...assetPaths(await manifestResponse.text(), "/manifest.webmanifest"));
    queue.push(...DICE_ASSET_PATHS);
    while (queue.length) {
      const path = queue.shift();
      if (!path || visited.has(path) || (!path.startsWith("/assets/") && !path.startsWith("/icons/") && !path.startsWith("/dice/"))) continue;
      visited.add(path);
      let response;
      try { response = await fetch(path); } catch { continue; }
      if (!response.ok) continue;
      const clone = response.clone();
      let source = "";
      if (!path.endsWith(".glb")) {
        try { source = await response.text(); } catch { /* binary asset */ }
      }
      responses.push([path, clone]);
      queue.push(...assetPaths(source, path));
    }
  } catch {
    return;
  }

  await Promise.all(responses.map(async ([path, response]) => {
    try { await corpus.put(path, response); } catch { /* quota/private mode */ }
  }));
}

function sameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isStaticAsset(request) {
  const path = new URL(request.url).pathname;
  return path.startsWith("/assets/") || path.startsWith("/corpus/") || path.startsWith("/icons/") || path.startsWith("/dice/");
}

async function networkNavigation(request) {
  let shell;
  try { shell = await caches.open(SHELL_CACHE); } catch { shell = undefined; }
  try {
    const response = await fetch(request);
    return response;
  } catch {
    return (shell && (await shell.match(request))) || (shell && (await shell.match("/index.html"))) || (shell && (await shell.match("/offline.html"))) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheStaticAsset(request) {
  let corpus;
  try { corpus = await caches.open(CORPUS_CACHE); } catch { corpus = undefined; }
  const cached = corpus && await corpus.match(request, { ignoreVary: true });
  if (cached) return cached;
  // Uma aba aberta ainda pode pedir um chunk com hash da versão anterior.
  // Só assets imutáveis do próprio aplicativo usam este fallback.
  if (new URL(request.url).pathname.startsWith("/assets/")) {
    for (const name of await caches.keys()) {
      if (!name.startsWith(`${PREFIX}-corpus-`) || name === CORPUS_CACHE) continue;
      const previous = await (await caches.open(name)).match(request, { ignoreVary: true });
      if (previous) return previous;
    }
  }
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
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith(`${PREFIX}-shell-`) && name !== SHELL_CACHE).map((name) => caches.delete(name))))
    .then(() => self.clients.claim())
    .then(() => prewarmApplicationAssets()));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING" && event.data.version === VERSION) self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !sameOrigin(request)) return;
  if (isNavigation(request)) event.respondWith(networkNavigation(request));
  // Chunks publicados em /assets/ são atendidos pelo corpus; a ativação já
  // preaquece o grafo emitido pelo entry, e este caminho cobre atualizações.
  // A fronteira continua explícita: API, navegação e downloads pessoais não entram aqui.
  else if (isStaticAsset(request)) event.respondWith(cacheStaticAsset(request));
  else if (["/", "/index.html", "/manifest.webmanifest", "/offline.html"].includes(new URL(request.url).pathname)) event.respondWith(cacheShell(request));
});
