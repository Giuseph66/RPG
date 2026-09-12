import { describe, expect, it } from "vitest";

import { EQUIPMENT_DEFINITIONS } from "@data/equipment";
import { STATIC_COMPENDIUM_ITEMS } from "@data/compendium";
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

  it("lists Armas and Armaduras as available categories filtering the real installed equipment subsets", async () => {
    expect(COMPENDIUM_CATEGORIES.find((category) => category.id === "weapons")).toMatchObject({ status: "available" });
    expect(COMPENDIUM_CATEGORIES.find((category) => category.id === "armor")).toMatchObject({ status: "available" });

    const emptyService = createCompendiumService({ items: [] });
    expect(emptyService.getCategories().find((category) => category.id === "weapons")).toMatchObject({ status: "pending" });
    expect(emptyService.getCategories().find((category) => category.id === "armor")).toMatchObject({ status: "pending" });

    const realWeaponNames = new Set(EQUIPMENT_DEFINITIONS.filter((definition) => definition.category === "weapon").map((definition) => definition.name));
    const realArmorNames = new Set(EQUIPMENT_DEFINITIONS.filter((definition) => definition.category === "armor").map((definition) => definition.name));
    expect(realWeaponNames.size).toBeGreaterThan(0);
    expect(realArmorNames.size).toBeGreaterThan(0);

    const equipmentItems: CompendiumCatalogItem[] = EQUIPMENT_DEFINITIONS.map((definition) => ({ entityType: "equipment", ruleset, definition: definition as never }));
    const service = createCompendiumService({ items: equipmentItems });
    expect(service.getCategories().find((category) => category.id === "weapons")).toMatchObject({ status: "available" });
    expect(service.getCategories().find((category) => category.id === "armor")).toMatchObject({ status: "available" });

    const weapons = await service.loadCategory("weapons");
    expect(weapons.ok).toBe(true);
    if (weapons.ok) {
      expect(weapons.value.status).toBe("loaded");
      expect(weapons.value.entries.length).toBe(realWeaponNames.size);
      expect(weapons.value.entries.every((entry) => realWeaponNames.has(entry.title))).toBe(true);
      expect(weapons.value.entries.some((entry) => realArmorNames.has(entry.title))).toBe(false);
    }

    const armor = await service.loadCategory("armor");
    expect(armor.ok).toBe(true);
    if (armor.ok) {
      expect(armor.value.status).toBe("loaded");
      expect(armor.value.entries.length).toBe(realArmorNames.size);
      expect(armor.value.entries.every((entry) => realArmorNames.has(entry.title))).toBe(true);
      expect(armor.value.entries.some((entry) => realWeaponNames.has(entry.title))).toBe(false);
    }

    const filteredSearch = service.search({ category: "weapons", query: "espada" });
    expect(filteredSearch.filters).toMatchObject({ category: "weapons", query: "espada" });
    expect(filteredSearch.entries.length).toBeGreaterThan(0);
    expect(filteredSearch.entries.every((entry) => realWeaponNames.has(entry.title))).toBe(true);
  });

  it("loads only the injected initial index and returns an explicit local detail", () => {
    const service = createCompendiumService({ items: [items[0]!] });
    expect(service.getIndex()).toHaveLength(1);
    expect(service.getDetail({ rulesetId: "local-pack", version: "1.0.0", entityType: "spell", entityId: "cura" })).toMatchObject({ ok: true, value: { title: "Cura de ferimentos", sourceRefs: [{ chapter: "Capítulo 1" }] } });
  });

  it("indexes static attributes and skills without changing rulepack references", () => {
    const service = createCompendiumService({ items: [...items, ...STATIC_COMPENDIUM_ITEMS] });
    const attributes = service.search({ category: "attributes" }).entries;
    const skills = service.search({ category: "skills" }).entries;
    expect(attributes).toHaveLength(6);
    expect(skills).toHaveLength(18);
    expect(attributes[0]?.ref).toMatchObject({ kind: "static", category: "attributes" });

    const selected = attributes[0];
    expect(selected).toBeDefined();
    if (!selected) return;
    const detail = service.getDetail(selected.ref);
    expect(detail.ok).toBe(true);
    if (detail.ok) {
      expect(detail.value.title).toBe(selected.title);
      expect(detail.value.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
    }
    expect(service.toggleFavorite(selected)).toBe(true);
    expect(service.getFavorites()).toMatchObject([{ exists: true, ref: { kind: "static", category: "attributes", entityId: selected.ref.entityId } }]);
    expect(service.toggleFavorite(selected)).toBe(false);
    expect(service.getFavorites()).toHaveLength(0);
    expect(service.search({ category: "equipment" }).entries.some((entry) => entry.ref.kind === "static")).toBe(false);
  });

  it("makes source-backed static categories available with detail and favorites", () => {
    const service = createCompendiumService({ items: STATIC_COMPENDIUM_ITEMS });
    expect(service.getCategories().find((category) => category.id === "rules")).toMatchObject({ status: "available" });
    expect(service.getCategories().find((category) => category.id === "rest")).toMatchObject({ status: "available" });
    expect(service.getCategories().find((category) => category.id === "combat")).toMatchObject({ status: "available" });
    expect(service.getCategories().find((category) => category.id === "movement")).toMatchObject({ status: "available" });
    expect(service.getCategories().find((category) => category.id === "adventure")).toMatchObject({ status: "available" });

    const rule = service.search({ category: "rules", query: "d20" }).entries[0];
    const rest = service.search({ category: "rest", query: "descanso longo" }).entries[0];
    const combat = service.search({ category: "combat", query: "jogada de ataque" }).entries[0];
    const movement = service.search({ category: "movement", query: "ritmo de viagem" }).entries[0];
    const adventure = service.search({ category: "adventure", query: "tempo de jogo" }).entries[0];
    expect(rule?.ref).toMatchObject({ kind: "static", category: "rules", entityId: "d20-resolution" });
    expect(rest?.ref).toMatchObject({ kind: "static", category: "rest", entityId: "long-rest" });
    expect(combat?.ref).toMatchObject({ kind: "static", category: "combat", entityId: "attack-roll" });
    expect(movement?.ref).toMatchObject({ kind: "static", category: "movement", entityId: "travel-pace" });
    expect(adventure?.ref).toMatchObject({ kind: "static", category: "adventure", entityId: "game-time" });
    expect(rule && service.getDetail(rule.ref)).toMatchObject({ ok: true, value: { title: "Resolução com d20", sourceRefs: [{ printedPage: 7, pdfPage: 6 }] } });
    const combatDetail = combat && service.getDetail(combat.ref);
    expect(combatDetail).toMatchObject({ ok: true, value: { title: "Jogada de ataque" } });
    if (combatDetail?.ok) expect(combatDetail.value.sourceRefs.some((ref) => ref.printedPage === 196 && ref.pdfPage === 195)).toBe(true);
    expect(movement && service.getDetail(movement.ref)).toMatchObject({ ok: true, value: { title: "Ritmo de viagem", sourceRefs: [{ printedPage: 183, pdfPage: 182 }] } });
    expect(adventure && service.getDetail(adventure.ref)).toMatchObject({ ok: true, value: { title: "Tempo de jogo", sourceRefs: [{ printedPage: 183, pdfPage: 182 }] } });
    expect(rest && service.toggleFavorite(rest)).toBe(true);
    expect(combat && service.toggleFavorite(combat)).toBe(true);
    expect(movement && service.toggleFavorite(movement)).toBe(true);
    expect(adventure && service.toggleFavorite(adventure)).toBe(true);
    const favorites = service.getFavorites();
    expect(favorites).toHaveLength(4);
    for (const [category, entityId] of [["rest", "long-rest"], ["combat", "attack-roll"], ["movement", "travel-pace"], ["adventure", "game-time"]] as const) {
      expect(favorites.some((favorite) => favorite.exists && favorite.ref.kind === "static" && favorite.ref.category === category && favorite.ref.entityId === entityId)).toBe(true);
    }
  });
});
