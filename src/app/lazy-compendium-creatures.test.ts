import { describe, expect, it, vi } from "vitest";

import { catalogItemsFromCreatureStatBlocks, createCompendiumService } from "@application/compendium";
import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts/ids";
import { asCentimeters } from "@domain/contracts/primitives";
import type { CreatureStatBlock } from "@domain/creatures";

import { createLazyCompendiumLoader } from "./lazy-compendium";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };
const owl: CreatureStatBlock = {
  id: asEntityId("coruja"), name: "Coruja", creatureType: "beast", size: "tiny", armorClass: 11, hitPoints: { average: 1 }, speeds: { walkCm: asCentimeters(100) },
  abilityScores: { str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7 }, challengeRating: { numerator: 0, denominator: 1 }, sourceRefs: [],
};

describe("catálogo lazy do compêndio com criaturas", () => {
  it("indexa as criaturas junto com o livro, uma única vez", async () => {
    const service = createCompendiumService();
    const extra = vi.fn(() => catalogItemsFromCreatureStatBlocks([owl], ruleset));
    const loader = createLazyCompendiumLoader(service, extra);
    expect(service.search({ category: "creature" }).entries).toHaveLength(0);
    await Promise.all([loader(), loader()]);
    await loader();
    expect(extra).toHaveBeenCalledTimes(1);
    const titles = service.search({ category: "creature" }).entries.map((entry) => entry.title);
    expect(titles).toContain("Coruja");
    // O livro traz 31 criaturas como texto; sem bloco estruturado correspondente, elas seguem listadas.
    expect(titles).toContain("Zumbi");
    expect(service.search({ query: "atributo" }).entries.length).toBeGreaterThan(0);
  });

  it("sem fonte de criaturas, o carregamento do livro segue igual", async () => {
    const service = createCompendiumService();
    await createLazyCompendiumLoader(service)();
    // Sem catálogo estruturado, as criaturas do livro aparecem como texto em Criaturas (nunca em Aventura).
    const book = service.search({ category: "creature" }).entries;
    expect(book).toHaveLength(31);
    expect(book.every((entry) => entry.ref.kind === "static")).toBe(true);
    expect(service.search({ category: "adventure" }).entries.some((entry) => entry.tags.includes("criatura"))).toBe(false);
  });
});
