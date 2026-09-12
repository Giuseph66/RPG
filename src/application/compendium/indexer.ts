import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId, EntityType, RulesetRef } from "@domain/contracts/ids";

import { canonicalCategory, COMPENDIUM_CATEGORIES, type CompendiumCatalogItem, type CompendiumIndexEntry, type CompendiumCategoryId } from "./types";

const CATALOG_MAPS: Readonly<Record<EntityType, keyof RulePack>> = {
  race: "races", subrace: "subraces", class: "classes", subclass: "subclasses", background: "backgrounds", feat: "feats", feature: "features", resource: "resources", condition: "conditions", equipment: "equipment", spell: "spells", progression: "progression", "character-template": "characterTemplates",
};

export function itemKey(ruleset: RulesetRef, entityType: EntityType, entityId: string): string {
  return `${ruleset.id}@${ruleset.version}:${entityType}:${entityId}`;
}

export function catalogItemsFromPacks(packs: readonly RulePack[]): readonly CompendiumCatalogItem[] {
  const items: CompendiumCatalogItem[] = [];
  for (const pack of packs) {
    for (const category of Object.keys(CATALOG_MAPS) as EntityType[]) {
      const map = pack[CATALOG_MAPS[category]];
      const definitions = map instanceof Map ? [...map.values()] : [map];
      for (const definition of definitions) {
        if (!definition || typeof definition !== "object" || (!("id" in definition) && !("templateId" in definition)) || !("name" in definition)) continue;
        items.push({ entityType: category, definition: definition as CompendiumCatalogItem["definition"], ruleset: { id: pack.manifest.id, version: pack.manifest.version } });
      }
    }
  }
  return items;
}

export function createIndexEntry(item: CompendiumCatalogItem): CompendiumIndexEntry {
  const definition = item.definition;
  const definitionId = "id" in definition ? definition.id : definition.templateId;
  const tags = "tags" in definition ? definition.tags : [];
  return {
    key: itemKey(item.ruleset, item.entityType, String(definitionId)),
    ref: { rulesetId: item.ruleset.id, entityId: definitionId, entityType: item.entityType },
    ruleset: item.ruleset,
    category: item.entityType,
    title: definition.name,
    aliases: [...(item.aliases ?? [])],
    tags: [...tags],
    summary: item.summary,
    sourceRefs: [...definition.sourceRefs],
  };
}

export function buildCompendiumIndex(items: readonly CompendiumCatalogItem[]): readonly CompendiumIndexEntry[] {
  return [...items].map(createIndexEntry).sort((a, b) => a.key.localeCompare(b.key, "en"));
}

export function categoryEntries(index: readonly CompendiumIndexEntry[], category: CompendiumCategoryId): readonly CompendiumIndexEntry[] {
  const canonical = canonicalCategory(category) ?? category;
  const descriptor = COMPENDIUM_CATEGORIES.find((candidate) => candidate.id === canonical);
  const target = descriptor?.targetId ?? canonical;
  return index.filter((entry) => entry.category === target);
}
