import { describe, expect, it } from "vitest";

import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts";

import {
  COMPENDIUM_CATEGORIES,
  CompendiumFavorites,
  buildCompendiumIndex,
  canonicalCategory,
  createCompendiumService,
  normalizeSearchText,
  searchCompendium,
} from "./index";
import type { CompendiumCatalogItem } from "./types";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };

function item(entityType: CompendiumCatalogItem["entityType"], id: string, name: string, tags: readonly string[], summary = "Resumo local"): CompendiumCatalogItem {
  return { entityType, ruleset, summary, definition: { id: asEntityId(id), name, tags, sourceRefs: [{ sourceId: ruleset.id, chapter: "Capítulo 1", printedPage: 10 }] } as never };
}

const items = [item("spell", "cura", "Cura de ferimentos", ["cura", "curaçao"]), item("class", "fighter", "Guerreiro", ["combate"]), item("race", "elf", "Elfo", ["floresta"])];

describe("compendium application", () => {
  it("normalizes accents/case and ranks deterministic name/tag matches", () => {
    expect(normalizeSearchText("  CURAÇAO  ")).toBe("curacao");
    const result = searchCompendium(buildCompendiumIndex(items), { query: "CURA DE" });
    expect(result.entries[0]?.title).toBe("Cura de ferimentos");
    expect(searchCompendium(buildCompendiumIndex(items), { query: "floresta", tag: "floresta" }).entries[0]?.title).toBe("Elfo");
  });

  it("preserves filters and maps visual Regras aliases to one destination", () => {
    const result = searchCompendium(buildCompendiumIndex(items), { query: "guer", category: "class", favoriteOnly: true });
    expect(result.filters).toMatchObject({ query: "guer", category: "class", favoriteOnly: true });
    expect(canonicalCategory("Regras")).toBe("rules");
    expect(canonicalCategory("rules")).toBe(canonicalCategory("Regras"));
  });

  it("keeps orphan favorites explicit and never mutates the definition", () => {
    const index = buildCompendiumIndex(items);
    const favorites = new CompendiumFavorites([{ rulesetId: ruleset.id, rulesetVersion: ruleset.version, entityType: "spell", entityId: "missing" }]);
    const orphan = favorites.list(index)[0];
    expect(orphan).toMatchObject({ exists: false, ref: { entityId: "missing" } });
    const service = createCompendiumService({ items, initialFavorites: [orphan.ref] });
    const entry = index[0];
    const before = entry?.title;
    service.toggleFavorite(entry!);
    expect(entry?.title).toBe(before);
  });

  it("reports pending categories and supports lazy category loading without network", async () => {
    const service = createCompendiumService({ items });
    const pending = await service.loadCategory("regras");
    expect(pending).toMatchObject({ ok: true, value: { status: "pending", category: { id: "rules" } } });
    const lazy = createCompendiumService({ items: [], pendingCategories: ["spell"], loadCategory: async () => items.filter((candidate) => candidate.entityType === "spell") });
    const loaded = await lazy.loadCategory("magias");
    expect(loaded).toMatchObject({ ok: true, value: { status: "loaded" } });
    expect(COMPENDIUM_CATEGORIES.some((category) => category.id === "equipment")).toBe(true);
  });

  it("loads only the injected initial index and returns an explicit local detail", () => {
    const service = createCompendiumService({ items: [items[0]!] });
    expect(service.getIndex()).toHaveLength(1);
    expect(service.getDetail({ rulesetId: "local-pack", version: "1.0.0", entityType: "spell", entityId: "cura" })).toMatchObject({ ok: true, value: { title: "Cura de ferimentos", sourceRefs: [{ chapter: "Capítulo 1" }] } });
  });
});
