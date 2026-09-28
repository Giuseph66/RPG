// @vitest-environment node
/**
 * Segundo passo de `npm run test --aplica`: depois que a auditoria SRD grava correções em
 * `src/data/**`, os checksums declarados no manifesto do pack deixam de bater. Este passo roda
 * em processo novo (módulos recarregados), lê o que o validador calculou e atualiza
 * `src/data/rulepacks/manifest.ts`. Fora do modo --aplica ele não faz nada.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

const APLICA = process.env.SRD_APLICA === "1";
const MANIFEST = resolve(__dirname, "../../src/data/rulepacks/manifest.ts");
const MISMATCH = /Manifesto checksums\.([\w-]+) divergente: declarado=([0-9a-f]{8}), calculado=([0-9a-f]{8})/g;

describe("manifesto do pack após --aplica", () => {
  it.runIf(APLICA)("atualiza checksums dos catálogos corrigidos", () => {
    const before = loadPhbPtBrLocal2017();
    if (before.ok) return;
    let text = readFileSync(MANIFEST, "utf8");
    const updated: string[] = [];
    for (const [, key, declared, computed] of before.error.message.matchAll(MISMATCH)) {
      const property = new RegExp(`(\\n\\s*"?${key}"?: )"${declared}"`);
      expect(property.test(text), `checksum ${key} não encontrado no manifesto`).toBe(true);
      text = text.replace(property, `$1"${computed}"`);
      updated.push(`${key}: ${declared} → ${computed}`);
    }
    writeFileSync(MANIFEST, text);
    console.log(`Manifesto atualizado: ${updated.join(", ") || "nada"}`);
  });
});
