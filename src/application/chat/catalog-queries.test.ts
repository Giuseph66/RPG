// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { createLazyCompendiumLoader } from "@app/lazy-compendium";
import { catalogItemsFromCreatureStatBlocks, createCompendiumService } from "@application/compendium";
import { appendixACreatures } from "@data/creatures";
import { asPackVersion, asRulesetId } from "@domain/contracts/ids";
import { bookCreatures, masterCreatures, plainNumber, playerCreatures, searchCreatures as search, searchSpells } from "./catalog-queries";

const ruleset = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const compendium = createCompendiumService();
beforeAll(async () => { await createLazyCompendiumLoader(compendium, () => catalogItemsFromCreatureStatBlocks(appendixACreatures, ruleset))(); });
const searchCreatures = (_compendium: unknown, _ruleset: unknown, input: Record<string, unknown>) => search(bookCreatures(compendium, ruleset), input);
const list = (input: Record<string, unknown>) => JSON.parse(searchCreatures(compendium, ruleset, input).content).criaturas as Record<string, unknown>[];

describe("consultas do Oráculo ao catálogo", () => {
  it("acha a besta com mais PV em uma consulta", () => {
    expect(list({ type: "beast", sortBy: "hitPoints", limit: 2 })).toMatchObject([{ nome: "GORILA GIGANTE", pv: 157, nd: "7" }, { pv: 126 }]);
  });

  it("devolve a de mais PV de cada ND, em ordem de ND e com empates", () => {
    const rows = list({ type: "beast", sortBy: "hitPoints", topPerChallenge: true });
    expect(rows[0].nd).toBe("0");
    expect(rows.find((row) => row.nd === "6")).toMatchObject({ nome: "MAMUTE", pv: 126 });
    expect(rows.at(-1)).toMatchObject({ nome: "GORILA GIGANTE" });
    const best = new Map<string, number>();
    for (const row of rows) { expect(best.get(String(row.nd)) ?? row.pv).toBe(row.pv); best.set(String(row.nd), Number(row.pv)); }
  });

  it("ordena por furtividade, usando Destreza quando a ficha não lista a perícia", () => {
    const rows = list({ type: "beast", sortBy: "stealth", limit: 5 });
    const values = rows.map((row) => Number(row.stealth));
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(values.every(Number.isFinite)).toBe(true);
    expect(rows[0]).toMatchObject({ nome: "ARANHA GIGANTE", stealth: 7 });
    expect(searchCreatures(compendium, ruleset, { type: "beast", sortBy: "stealth", limit: 1 }).content).toContain("Empatadas com a última listada");
    expect(searchCreatures(compendium, ruleset, { type: "beast", sortBy: "hitPoints", order: "desc", limit: 2 }).content).toContain("Empatadas com a última listada");
  });

  it("filtra por ND, nome e ficha completa, e avisa quando não há nada", () => {
    expect(list({ maxChallenge: 0.25, sortBy: "challengeRating" }).every((row) => ["0", "1/8", "1/4"].includes(String(row.nd)))).toBe(true);
    expect(list({ query: "mamute", detail: true })[0]).toMatchObject({ nome: "MAMUTE", origem: "livro", ficha: { abilityScores: { str: 24 } } });
    const empty = searchCreatures(compendium, ruleset, { query: "tiranossauro" });
    expect(empty.names).toEqual([]);
    expect(empty.content).toContain("não tente nomes ao acaso");
    expect(() => list({ sortBy: "vida" })).toThrow(/sortBy/);
  });

  it("lista magias por círculo, classe e concentração", () => {
    const rows = JSON.parse(searchSpells(compendium, ruleset, { level: 3, class: "wizard", concentration: true, limit: 30 }).content).magias as { circulo: number; classes: string[]; concentracao: boolean }[];
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.every((row) => row.circulo === 3 && row.classes.includes("wizard") && row.concentracao)).toBe(true);
    expect(searchSpells(compendium, ruleset, { query: "bola de fogo", detail: true, limit: 1 }).content).toContain("8d6");
  });

  it("lê números do elenco só quando são claros", () => {
    expect([plainNumber("40"), plainNumber("40 (6d8+13)"), plainNumber("15 (couro)"), plainNumber("40 PV")]).toEqual([40, 40, 15, 40]);
    expect([plainNumber("uns 40"), plainNumber("40/60"), plainNumber("40 ou 50"), plainNumber("?"), plainNumber("")]).toEqual(Array(5).fill(undefined));
  });

  const base = { campaignId: "m", schemaVersion: 1, revision: 0, createdAt: "", updatedAt: "2026-11-23", reveals: [] };
  const record = (name: string, extra = {}) => ({ ...base, id: name, kind: "enemy", name, appearance: "", race: "", description: "", hitPoints: "", armorClass: "", abilities: "", notes: "segredo do mestre", ...extra });
  const masters = masterCreatures([record("Colosso", { hitPoints: "999 (muitos)", kind: "animal" }), record("Sombra", { hitPoints: "uns 40" })] as never);

  it("compara livro e campanha para o mestre e diz a origem", () => {
    const result = JSON.parse(search([...masters, ...bookCreatures(compendium, ruleset)], { type: "beast", sortBy: "hitPoints", limit: 2 }).content);
    expect(result.criaturas).toMatchObject([{ nome: "Colosso", origem: "campanha", pv: 999 }, { nome: "GORILA GIGANTE", origem: "livro" }]);
    const all = search(masters, { sortBy: "hitPoints" });
    expect(all.content).toContain("sem valor conhecido para hitPoints e por isso fora da ordem: Sombra");
    expect(JSON.parse(search(masters, { query: "sombra", detail: true }).content).criaturas[0].detalhes).toMatchObject({ notasDoMestre: "segredo do mestre", pvInformado: "uns 40" });
  });

  it("para o jogador usa só os campos revelados, inclusive na ordem e nos filtros", () => {
    const seen = playerCreatures([{ ...base, id: "x", creatureId: "x", accountId: "u", revealed: { name: "Colosso", race: "Gigante" } }, { ...base, id: "y", creatureId: "y", accountId: "u", kind: "animal", revealed: { hitPoints: "12" } }] as never);
    const ranked = JSON.parse(search(seen, { sortBy: "hitPoints" }).content);
    expect(ranked.criaturas).toMatchObject([{ nome: "Criatura sem nome revelado", pv: 12 }]);
    expect(JSON.parse(search(seen, { minHitPoints: 1, sortBy: "name" }).content).criaturas).toHaveLength(1);
    expect(JSON.parse(search(seen, { type: "beast", sortBy: "name" }).content).criaturas).toHaveLength(1);
    expect(JSON.stringify(JSON.parse(search(seen, { detail: true, origin: "campaign" }).content))).not.toMatch(/999|segredo|notas/i);
  });
});
