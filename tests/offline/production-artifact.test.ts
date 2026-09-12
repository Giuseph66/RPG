import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PWA_VERSION } from "@infrastructure/pwa";

const dist = (file: string) => resolve(process.cwd(), "dist", file);

describe("production offline artifact", () => {
  it("contains manifest, local icons, offline fallback and versioned worker", () => {
    const html = readFileSync(dist("index.html"), "utf8");
    const manifest = JSON.parse(readFileSync(dist("manifest.webmanifest"), "utf8")) as {
      start_url: string;
      scope: string;
      icons: readonly { src: string; sizes: string; type: string }[];
    };
    const worker = readFileSync(dist("pwa-worker.js"), "utf8");

    expect(html).toContain('rel="manifest"');
    expect(manifest).toMatchObject({ start_url: "/", scope: "/" });
    expect(manifest.icons).toEqual([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }),
    ]);
    expect(readFileSync(dist("icons/icon-192.png")).subarray(0, 8)).toEqual(Buffer.from("89504e470d0a1a0a", "hex"));
    expect(readFileSync(dist("icons/icon-512.png")).subarray(0, 8)).toEqual(Buffer.from("89504e470d0a1a0a", "hex"));
    expect(readFileSync(dist("offline.html"), "utf8")).toContain("Você está offline");
    expect(worker).toContain(`const VERSION = "${PWA_VERSION}"`);
    expect(worker).toContain("const SHELL_CACHE = `${PREFIX}-shell-${VERSION}`");
    expect(worker).toContain("const CORPUS_CACHE = `${PREFIX}-corpus-${VERSION}`");
  });

  it("preserves production routing and offline fallback strategy", () => {
    const worker = readFileSync(dist("pwa-worker.js"), "utf8");

    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('shell.match("/index.html")');
    expect(worker).toContain('shell.match("/offline.html")');
    expect(worker).toContain('path.startsWith("/assets/")');
    expect(worker).toContain('path.startsWith("/corpus/")');
    expect(worker).toContain("name.startsWith(`${PREFIX}-`)");
    expect(worker).toContain("self.clients.claim()");
  });
});
