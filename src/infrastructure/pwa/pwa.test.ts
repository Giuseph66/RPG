import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  PWA_CACHE_NAMES,
  PWA_MANIFEST_URL,
  PWA_SHELL_URLS,
  PWA_VERSION,
  classifyPwaRequest,
  isCurrentPwaCache,
  precachePwaShell,
  registerPwa,
  shouldDeletePwaCache,
} from "./index";

describe("PWA infrastructure", () => {
  it("publica versão, manifesto e shell mínimo local", () => {
    expect(PWA_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(PWA_MANIFEST_URL).toBe("/manifest.webmanifest");
    expect(PWA_SHELL_URLS).toEqual(["/", "/index.html", "/manifest.webmanifest", "/offline.html"]);
    expect(PWA_CACHE_NAMES.shell).toContain(PWA_VERSION);
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "public/manifest.webmanifest"), "utf8")) as { icons: readonly { src: string; sizes: string }[] };
    expect(manifest.icons.map(({ src, sizes }) => ({ src, sizes }))).toEqual([{ src: "/icons/icon-192.png", sizes: "192x192" }, { src: "/icons/icon-512.png", sizes: "512x512" }]);
    expect(readFileSync(resolve(process.cwd(), "public/offline.html"), "utf8")).toContain("Você está offline");
  });

  it("mantém fallback de deep route e conserva corpus de abas anteriores", () => {
    const worker = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    expect(worker).toContain("shell.match(\"/index.html\")");
    expect(worker).toContain("SHELL_CACHE");
    expect(worker).toContain("name !== SHELL_CACHE");
    expect(worker).toContain("name === CORPUS_CACHE");
  });

  it("ignora Vary ao consultar o cache de corpus, evitando página em branco offline com CDNs que variam por Origin", () => {
    const worker = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    expect(worker).toContain("corpus.match(request, { ignoreVary: true })");
  });

  it("roteia navegação, corpus e métodos mutáveis sem confundir origem", () => {
    const origin = "https://rpg.local";
    expect(classifyPwaRequest({ url: "/character", origin })).toBe("network");
    expect(classifyPwaRequest({ url: "/index.html", origin })).toBe("shell");
    expect(classifyPwaRequest({ url: "/assets/app-123.js", origin })).toBe("corpus");
    expect(classifyPwaRequest({ url: "/assets/app-123.js", method: "POST", origin })).toBe("network");
    expect(classifyPwaRequest({ url: "https://cdn.example/app.js", origin })).toBe("network");
  });

  it("mantém chunk lazy já requisitado disponível offline sem capturar navegação ou API", async () => {
    const source = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    type Listener = (event: { readonly request: Request; readonly respondWith: (response: Promise<Response>) => void }) => void;
    const listeners = new Map<string, Listener>();
    const entries = new Map<string, Response>();
    const cache = {
      addAll: vi.fn(async () => undefined),
      put: vi.fn(async (request: Request | string, response: Response) => {
        entries.set(typeof request === "string" ? request : request.url, response);
      }),
      match: vi.fn(async (request: Request | string) => entries.get(typeof request === "string" ? request : request.url)),
    };
    const cacheStorage = {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    };
    const workerSelf = {
      location: { origin: "https://rpg.local" },
      addEventListener: (type: string, listener: Listener) => { listeners.set(type, listener); },
      clients: { claim: vi.fn(async () => undefined) },
      skipWaiting: vi.fn(async () => undefined),
    };
    let online = true;
    const fetcher = vi.fn(async () => {
      if (!online) throw new Error("offline");
      return new Response("lazy chunk", { status: 200, headers: { "Content-Type": "application/javascript" } });
    });
    const worker = new Function("self", "caches", "fetch", source) as (self: typeof workerSelf, caches: typeof cacheStorage, fetch: typeof fetcher) => void;
    worker(workerSelf, cacheStorage, fetcher);

    const lazyRequest = new Request("https://rpg.local/assets/journey-ABC.js", { method: "GET" });
    let firstResponse: Promise<Response> | undefined;
    listeners.get("fetch")?.({ request: lazyRequest, respondWith: (response) => { firstResponse = response; } });
    await expect(firstResponse).resolves.toMatchObject({ status: 200 });
    expect(cache.put).toHaveBeenCalledWith(lazyRequest, expect.any(Response));

    online = false;
    let offlineResponse: Promise<Response> | undefined;
    listeners.get("fetch")?.({ request: lazyRequest, respondWith: (response) => { offlineResponse = response; } });
    await expect(offlineResponse).resolves.toMatchObject({ status: 200 });

    const navigation = { url: "https://rpg.local/journey", method: "GET", mode: "navigate", destination: "document" } as unknown as Request;
    const api = new Request("https://rpg.local/api/session", { method: "GET" });
    const navigationEvent = { request: navigation, respondWith: vi.fn() };
    const apiEvent = { request: api, respondWith: vi.fn() };
    online = true;
    listeners.get("fetch")?.(navigationEvent);
    await expect(navigationEvent.respondWith).toHaveBeenCalled();
    listeners.get("fetch")?.(apiEvent);
    expect(apiEvent.respondWith).not.toHaveBeenCalled();
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it("atualiza o worker sem apagar chunks ainda usados pela aba anterior", async () => {
    const source = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    const oldName = "rpg-companion-pwa-corpus-2026.09.10";
    const chunk = "https://rpg.local/assets/creation-OLD.js";
    const buckets = new Map<string, Map<string, Response>>([
      [oldName, new Map([[chunk, new Response("old lazy chunk")]])],
      ["rpg-companion-pwa-shell-2026.09.10", new Map()],
      ["dados-do-usuario", new Map()],
    ]);
    const listeners = new Map<string, (event: any) => void>();
    const storage = {
      keys: async () => [...buckets.keys()],
      delete: async (name: string) => buckets.delete(name),
      open: async (name: string) => {
        if (!buckets.has(name)) buckets.set(name, new Map());
        const bucket = buckets.get(name)!;
        return { match: async (request: Request | string) => bucket.get(typeof request === "string" ? request : request.url), put: async (request: Request | string, value: Response) => { bucket.set(typeof request === "string" ? request : request.url, value); } };
      },
    };
    const self = { location: { origin: "https://rpg.local" }, clients: { claim: vi.fn(async () => undefined) }, addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener) };
    const offline = vi.fn(async () => { throw new Error("offline"); });
    new Function("self", "caches", "fetch", source)(self, storage, offline);
    let activated: Promise<unknown> | undefined;
    listeners.get("activate")!({ waitUntil: (promise: Promise<unknown>) => { activated = promise; } });
    await activated;
    expect(buckets.has(oldName)).toBe(true);
    expect(buckets.has("rpg-companion-pwa-shell-2026.09.10")).toBe(false);
    expect(buckets.has("dados-do-usuario")).toBe(true);
    let response: Promise<Response> | undefined;
    listeners.get("fetch")!({ request: new Request(chunk), respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe("old lazy chunk");
    expect(self.clients.claim).toHaveBeenCalledOnce();
  });

  it("preaquece chunks de rotas durante a ativação para suportar abertura offline sem visita prévia", async () => {
    const source = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    type ActivateListener = (event: { readonly waitUntil: (promise: Promise<unknown>) => void }) => void;
    const listeners = new Map<string, ActivateListener>();
    const entries = new Map<string, Response>();
    const cache = {
      addAll: vi.fn(async () => undefined),
      put: vi.fn(async (request: Request | string, response: Response) => {
        entries.set(typeof request === "string" ? request : new URL(request.url).pathname, response);
      }),
      match: vi.fn(async (request: Request | string) => entries.get(typeof request === "string" ? request : new URL(request.url).pathname)),
    };
    const cacheStorage = {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    };
    const workerSelf = {
      location: { origin: "https://rpg.local" },
      addEventListener: (type: string, listener: ActivateListener) => { listeners.set(type, listener); },
      clients: { claim: vi.fn(async () => undefined) },
      skipWaiting: vi.fn(async () => undefined),
    };
    const responses = new Map([
      ["/index.html", '<script type="module" src="/assets/index-entry.js"></script>'],
      ["/manifest.webmanifest", '{"icons":[{"src":"/icons/icon-192.png"},{"src":"/icons/icon-512.png"}]}'],
      ["/assets/index-entry.js", '"assets/compendium-route.js" "assets/data-management-route.js" "assets/gi-icons.js" "assets/DiceOverlay.js"'],
      ["/assets/compendium-route.js", '"assets/compendium.css"'],
      ["/assets/data-management-route.js", '"assets/data-management.css"'],
      ["/assets/gi-icons.js", "icons/icon-192.png"],
      ["/assets/DiceOverlay.js", 'await import(`./static-catalog.js`);'],
      ["/assets/static-catalog.js", 'await import("./static-catalog.css");'],
      ["/assets/static-catalog.css", ".catalog {}"],
      ["/assets/compendium.css", ".compendium {}"],
      ["/assets/data-management.css", ".data {}"],
      ["/icons/icon-192.png", "icon 192"],
      ["/icons/icon-512.png", "icon 512"],
      ["/dice/index.json", '{"dice":[{"id":"d20"}]}'],
      ["/dice/d20.json", "meta"],
      ["/dice/d20.glb", "model"],
    ]);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = typeof input === "string" ? input : new URL(input.toString()).pathname;
      const body = responses.get(path);
      return new Response(body ?? "missing", { status: body ? 200 : 404 });
    });
    const worker = new Function("self", "caches", "fetch", source) as (self: typeof workerSelf, caches: typeof cacheStorage, fetch: typeof fetcher) => void;
    worker(workerSelf, cacheStorage, fetcher);

    let activation: Promise<unknown> | undefined;
    listeners.get("activate")?.({ waitUntil: (promise) => { activation = promise; } });
    await activation;

    expect([...entries.keys()]).toEqual(expect.arrayContaining([
      "/assets/compendium-route.js",
      "/assets/data-management-route.js",
      "/assets/gi-icons.js",
      "/assets/DiceOverlay.js",
      "/assets/static-catalog.js",
      "/assets/static-catalog.css",
      "/assets/compendium.css",
      "/assets/data-management.css",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/dice/index.json",
      "/dice/d20.json",
      "/dice/d20.glb",
    ]));
    expect(fetcher).toHaveBeenCalledWith("/index.html");
    expect(workerSelf.clients.claim).toHaveBeenCalledOnce();
  });

  it("limpa só caches PWA antigos e preserva caches de aplicação", () => {
    expect(shouldDeletePwaCache("rpg-companion-pwa-shell-2026.09.10")).toBe(true);
    expect(isCurrentPwaCache(PWA_CACHE_NAMES.shell)).toBe(true);
    expect(shouldDeletePwaCache("rpg-companion-application-data")).toBe(false);
  });

  it("registra worker injetado e adia atualização durante operação local", async () => {
    let pending = true;
    const postMessage = vi.fn();
    const registration = {
      scope: "/",
      waiting: { postMessage },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      update: vi.fn(async () => undefined),
    };
    const result = await registerPwa({ platform: { serviceWorker: { register: vi.fn(async () => registration) } }, hasPendingWork: () => pending });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.getUpdateState()).toBe("available");
    expect(result.value.applyUpdate()).toMatchObject({ ok: false, error: { code: "update-deferred" } });
    expect(postMessage).not.toHaveBeenCalled();
    pending = false;
    expect(result.value.applyUpdate()).toMatchObject({ ok: true });
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING", version: PWA_VERSION });
    result.value.dispose();
  });

  it("coordena avisos entre abas sem compartilhar trabalho pendente", async () => {
    type Listener = (event: { readonly data: unknown }) => void;
    const channels = new Set<Set<Listener>>();
    const createBroadcastChannel = vi.fn(() => {
      const ownListeners = new Set<Listener>();
      channels.add(ownListeners);
      return {
        postMessage: (message: unknown) => {
          for (const otherListeners of channels) {
            if (otherListeners === ownListeners) continue;
            for (const listener of otherListeners) listener({ data: message });
          }
        },
        addEventListener: (_type: "message", listener: Listener) => {
          ownListeners.add(listener);
        },
        removeEventListener: (_type: "message", listener: Listener) => {
          ownListeners.delete(listener);
        },
        close: () => {
          channels.delete(ownListeners);
          ownListeners.clear();
        },
      };
    });
    let pendingFirst = true;
    let updateFoundFirst: (() => void) | undefined;
    let updateFoundSecond: (() => void) | undefined;
    const firstWorker = { postMessage: vi.fn() };
    const firstRegistration = {
      scope: "/",
      waiting: null as typeof firstWorker | null,
      addEventListener: vi.fn((_type: string, listener: () => void) => { updateFoundFirst = listener; }),
      removeEventListener: vi.fn(),
    };
    const secondRegistration = {
      scope: "/",
      waiting: null,
      addEventListener: vi.fn((_type: string, listener: () => void) => { updateFoundSecond = listener; }),
      removeEventListener: vi.fn(),
    };
    const register = vi.fn()
      .mockResolvedValueOnce(firstRegistration)
      .mockResolvedValueOnce(secondRegistration);
    const platform = { serviceWorker: { register }, createBroadcastChannel };
    const first = await registerPwa({ platform, hasPendingWork: () => pendingFirst });
    const second = await registerPwa({ platform });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    firstRegistration.waiting = firstWorker;
    updateFoundFirst?.();
    expect(first.value.getUpdateState()).toBe("deferred");
    expect(second.value.getUpdateState()).toBe("available");

    expect(first.value.applyUpdate()).toMatchObject({ ok: false, error: { code: "update-deferred" } });
    expect(firstWorker.postMessage).not.toHaveBeenCalled();
    pendingFirst = false;
    expect(first.value.applyUpdate()).toMatchObject({ ok: true });
    expect(firstWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING", version: PWA_VERSION });
    expect(second.value.getUpdateState()).toBe("available");
    expect(createBroadcastChannel).toHaveBeenCalledTimes(2);
    first.value.dispose();
    second.value.dispose();
    expect(updateFoundSecond).toBeDefined();
  });

  it("continua funcionando quando BroadcastChannel não está disponível", async () => {
    const postMessage = vi.fn();
    const result = await registerPwa({
      platform: {
        serviceWorker: {
          register: vi.fn(async () => ({ waiting: { postMessage } })),
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.applyUpdate()).toMatchObject({ ok: true });
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING", version: PWA_VERSION });
    result.value.dispose();
  });

  it("reporta ausência de suporte e falha de registro sem lançar", async () => {
    await expect(registerPwa({ platform: {} })).resolves.toMatchObject({ ok: false, error: { code: "unsupported" } });
    const failure = await registerPwa({ platform: { serviceWorker: { register: vi.fn(async () => { throw new Error("storage blocked"); }) } } });
    expect(failure).toMatchObject({ ok: false, error: { code: "registration-failed", cause: "storage blocked" } });
  });

  it("reporta falha de CacheStorage sem limpar estado da aplicação", async () => {
    const result = await precachePwaShell({ open: vi.fn(async () => { throw new Error("quota"); }) });
    expect(result).toMatchObject({ ok: false, error: { code: "cache-failed", cause: "quota" } });
  });
});
