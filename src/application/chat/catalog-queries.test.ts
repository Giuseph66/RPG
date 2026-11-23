// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { createLazyCompendiumLoader } from "@app/lazy-compendium";
import { catalogItemsFromCreatureStatBlocks, createCompendiumService } from "@application/compendium";
import { appendixACreatures } from "@data/creatures";
import { asPackVersion, asRulesetId } from "@domain/contracts/ids";
import { searchCreatures, searchSpells } from "./catalog-queries";

const ruleset = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const compendium = createCompendiumService();
beforeAll(async () => { await createLazyCompendiumLoader(compendium, () => catalogItemsFromCreatureStatBlocks(appendixACreatures, ruleset))(); });
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
    expect(list({ query: "mamute", detail: true })[0]).toMatchObject({ name: "MAMUTE", abilityScores: { str: 24 } });
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
});
