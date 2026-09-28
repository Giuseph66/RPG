// @vitest-environment node
/**
 * Auditoria das regras do nosso pack contra a SRD 5.1 (dnd5eapi.co), a partir do snapshot
 * offline `tests/srd/snapshot.json` (atualize com `npm run srd:snapshot`).
 *
 * - `npm run test`: só avalia; imprime o resumo e grava `tests/srd/relatorio.md`.
 * - `npm run test --aplica`: grava em `src/data/**` as correções de literais simples.
 *
 * Divergência não reprova o teste: o livro pt-BR é a fonte canônica e a SRD é referência.
 * O teste reprova apenas quando a própria auditoria quebra (snapshot ausente, casamento
 * de IDs perdido ou patch impossível de aplicar).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { EXTRACTED_PHB_SPELLS } from "@data/spells/spells-book-catalog";
import { SKILLS } from "@data/skills/skills";
import { auditAgainstSrd, type SrdSnapshot } from "./lib/audit";
import { applyPatches } from "./lib/patch";
import { consoleReport, markdownReport, type ApplyOutcome } from "./lib/report";

const DIR = resolve(__dirname);
const SNAPSHOT = resolve(DIR, "snapshot.json");
const REPORT = resolve(DIR, "relatorio.md");
const APLICA = process.env.SRD_APLICA === "1";

describe("regras × SRD 5.1 (dnd5eapi.co)", () => {
  it("compara o pack com a API e relata divergências", () => {
    expect(existsSync(SNAPSHOT), "snapshot ausente: rode `npm run srd:snapshot`").toBe(true);
    const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as SrdSnapshot;
    const pack = loadPhbPtBrLocal2017();
    if (!pack.ok) throw new Error(pack.error.message);

    const result = auditAgainstSrd({ pack: pack.value, bookSpells: EXTRACTED_PHB_SPELLS, skills: SKILLS, snapshot });

    // Guarda do próprio casamento: se cair, a auditoria deixou de olhar o que devia.
    const compared = Object.fromEntries(result.coverage.map((entry) => [entry.domain, entry.compared]));
    expect(compared.classes).toBe(12);
    expect(compared.racas).toBe(9);
    expect(compared.pericias).toBe(18);
    expect(compared.condicoes).toBe(15);
    expect(compared["magias-livro"]).toBe(snapshot.spells.length);
    expect(compared.equipamento).toBeGreaterThanOrEqual(100);

    let outcome: ApplyOutcome | undefined;
    if (APLICA) {
      const patches = result.divergences.flatMap((entry) => (entry.patch ? [entry.patch] : []));
      outcome = applyPatches(patches.map((patch) => ({ ...patch, file: resolve(DIR, "../..", patch.file) })));
    }

    writeFileSync(REPORT, markdownReport(result, snapshot, outcome));
    console.log(consoleReport(result, outcome));
    expect(outcome?.failed ?? []).toEqual([]);
  });
});
