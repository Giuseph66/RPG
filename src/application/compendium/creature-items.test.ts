import { describe, expect, it } from "vitest";

import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts";
import { asCentimeters } from "@domain/contracts/primitives";
import type { CreatureStatBlock } from "@domain/creatures";

import { catalogItemsFromCreatureStatBlocks, createCompendiumService, mergeCreatureBookEntries, searchCompendium, buildCompendiumIndex, canonicalCategory, COMPENDIUM_CATEGORIES, type CompendiumCatalogItem } from "./index";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };
const source = [{ sourceId: ruleset.id, chapter: "Apêndice A", printedPage: 317 }];

const wolf: CreatureStatBlock = {
  id: asEntityId("lobo"), name: "LOBO", creatureType: "beast", size: "medium", tags: ["monster-manual-appendix-a", "local-pack", "matilha"], armorClass: 13,
  hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: asCentimeters(1200) },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
  traits: [{ id: "faro", name: "Faro apurado", description: "Vantagem em testes de Percepção baseados no olfato." }],
  actions: [{ id: "mordida", name: "Mordida", description: "Ataque corpo a corpo com arma." }], sourceRefs: source,
};
const dragon: CreatureStatBlock = { ...wolf, id: asEntityId("dragao-vermelho"), name: "DRAGÃO-VERMELHO ADULTO", creatureType: "dragon", size: "huge", tags: [], armorClass: 19, hitPoints: { average: 256 }, challengeRating: { numerator: 17, denominator: 1 }, traits: [{ id: "chama", name: "Sopro de fogo", description: "Exala fogo em um cone." }], actions: undefined };
const mystery: CreatureStatBlock = { ...wolf, id: asEntityId("sem-nd"), name: "CRIATURA SEM ND", challengeRating: null, tags: [] };

const items = catalogItemsFromCreatureStatBlocks([wolf, dragon, mystery], ruleset);

describe("categoria Criaturas do compêndio", () => {
  it("existe entre as categorias de Regras, com aliases em português", () => {
    expect(COMPENDIUM_CATEGORIES.find((category) => category.id === "creature")).toMatchObject({ label: "Criaturas", status: "available" });
    for (const alias of ["criaturas", "Criatura", "monstros", "creatures"]) expect(canonicalCategory(alias)).toBe("creature");
  });

  it("indexa uma entrada por bloco, com resumo, tags limpas e a categoria própria", () => {
    const index = buildCompendiumIndex(items);
    expect(index).toHaveLength(3);
    const entry = index.find((candidate) => candidate.title === "LOBO")!;
    expect(entry).toMatchObject({ category: "creature", summary: "Besta · Média · ND 1/4 · CA 13 · PV 11", tags: ["matilha"] });
    expect(entry.ref).toMatchObject({ kind: "static", category: "creature", entityId: "lobo" });
    expect(index.find((candidate) => candidate.title === "CRIATURA SEM ND")!.summary).toContain("ND —");
  });

  it("filtra a categoria e acha por nome, tipo, ND e pelo texto de traços e ações", () => {
    const index = buildCompendiumIndex(items);
    const titles = (query: string, category?: "creature") => searchCompendium(index, { query, category }).entries.map((entry) => entry.title);
    expect(titles("", "creature")).toHaveLength(3);
    expect(titles("lobo")).toEqual(["LOBO"]);
    expect(titles("DRAGAO vermelho")).toEqual(["DRAGÃO-VERMELHO ADULTO"]);
    expect(titles("dragão")).toEqual(["DRAGÃO-VERMELHO ADULTO"]);
    expect(titles("nd 17")).toEqual(["DRAGÃO-VERMELHO ADULTO"]);
    expect(titles("nd 1/4")).toEqual(["LOBO"]);
    expect(titles("olfato")).toEqual(expect.arrayContaining(["LOBO"]));
    expect(titles("sopro de fogo")).toEqual(["DRAGÃO-VERMELHO ADULTO"]);
    expect(titles("besta", "creature")).toContain("LOBO");
    expect(titles("besta", "creature")).not.toContain("DRAGÃO-VERMELHO ADULTO");
  });

  it("devolve o bloco completo no detalhe e não perturba as outras categorias", () => {
    const service = createCompendiumService({ items });
    const entry = service.search({ category: "creature", query: "lobo" }).entries[0]!;
    const detail = service.getDetail(entry.ref);
    expect(detail.ok && detail.value.definition).toMatchObject({ kind: "book-creature", statBlock: { id: "lobo", armorClass: 13 } });
    expect(service.getCategories().find((category) => category.id === "creature")).toMatchObject({ status: "available" });
    expect(service.search({ category: "spell" }).entries).toHaveLength(0);
  });

  it("sem criaturas carregadas, a categoria aparece como pendente em vez de vazia", () => {
    expect(createCompendiumService().getCategories().find((category) => category.id === "creature")).toMatchObject({ status: "pending" });
  });

  describe("texto do livro da mesma criatura", () => {
    const phb = { id: asRulesetId("phb-local"), version: asPackVersion("1.0.0") };
    const bookText = (id: string, name: string): CompendiumCatalogItem => ({
      kind: "static", category: "creature", ruleset: phb, summary: "Besta média, imparcial · CA 13 · PV 11",
      definition: { kind: "book-rule", id, name, tags: ["criatura"], sourceRefs: [{ sourceId: phb.id, chapter: "Apêndice D", printedPage: 305, section: name.toUpperCase() }], sourceHeading: name.toUpperCase(), text: `${name.toUpperCase()}\nBesta média, imparcial\nClasse de Armadura 13\nPontos de Vida 11 (2d8 + 2)` },
    });

    it("não duplica: o texto cru some e o bloco estruturado recebe a referência do livro", () => {
      const merged = mergeCreatureBookEntries([bookText("book-lobo", "Lobo"), ...items, bookText("book-zumbi", "Zumbi")]);
      const index = buildCompendiumIndex(merged);
      expect(index.filter((entry) => entry.title.toLocaleLowerCase("pt-BR") === "lobo")).toHaveLength(1);
      const wolfEntry = index.find((entry) => entry.title === "LOBO")!;
      expect(wolfEntry.ref).toMatchObject({ category: "creature" });
      expect(wolfEntry.sourceRefs.map((ref) => ref.chapter)).toEqual(["Apêndice A", "Livro do Jogador · Apêndice D"]);
      const service = createCompendiumService({ items: merged });
      const detail = service.getDetail(wolfEntry.ref);
      expect(detail.ok && detail.value.definition).toMatchObject({ kind: "book-creature", statBlock: { sourceRefs: [{ chapter: "Apêndice A" }, { chapter: "Livro do Jogador · Apêndice D", printedPage: 305 }] } });
    });

    it("mantém o que só existe como texto e não toca nas outras categorias", () => {
      const rule: CompendiumCatalogItem = { ...bookText("book-regra", "Lobo"), category: "adventure" };
      const merged = mergeCreatureBookEntries([bookText("book-zumbi", "Zumbi"), rule, ...items]);
      expect(merged.map((item) => item.definition.name)).toEqual(expect.arrayContaining(["Zumbi", "Lobo", "LOBO"]));
      expect(merged).toHaveLength(items.length + 2);
    });

    it("sem blocos estruturados devolve a lista como veio", () => {
      const only = [bookText("book-zumbi", "Zumbi")];
      expect(mergeCreatureBookEntries(only)).toBe(only);
    });
  });
});
