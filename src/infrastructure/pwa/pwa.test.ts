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

  it("mantém fallback de deep route e não mistura caches antigos no worker", () => {
    const worker = readFileSync(resolve(process.cwd(), "public/pwa-worker.js"), "utf8");
    expect(worker).toContain("shell.match(\"/index.html\")");
    expect(worker).toContain("SHELL_CACHE");
    expect(worker).toContain("name !== SHELL_CACHE");
    expect(worker).toContain("name !== CORPUS_CACHE");
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
