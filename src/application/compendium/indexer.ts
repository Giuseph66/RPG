import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId, EntityType, RulesetRef } from "@domain/contracts/ids";
import type { SourceRef } from "@domain/contracts/primitives";
import type { CreatureStatBlock } from "@domain/creatures";

import { findCanonicalDescription } from "@data/correto/integracao";
import { normalizeSearchText } from "./search";
import { canonicalCategory, COMPENDIUM_CATEGORIES, COMPENDIUM_CATEGORY_SUBSET_TAG, type CompendiumBookCreatureDefinition, type CompendiumCatalogItem, type CompendiumIndexEntry, type CompendiumCategoryId } from "./types";

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
        const ruleset = { id: pack.manifest.id, version: pack.manifest.version };
        const enriched = enrichPackDefinition(category, definition as CompendiumCatalogItem["definition"], ruleset.id);
        items.push({ entityType: category, definition: enriched, ruleset, summary: packSummary(enriched) });
      }
    }
  }
  return items;
}

/**
 * Resumo mostrado na lista de resultados: capítulo e página impressa da primeira fonte.
 * Sem isso as entradas do rule pack apareciam só com a categoria, enquanto as entradas
 * estáticas do livro já mostravam a referência.
 */
function packSummary(definition: CompendiumCatalogItem["definition"]): string | undefined {
  const reference = definition.sourceRefs?.[0];
  if (!reference) return undefined;
  const chapter = reference.chapter.split(" — ")[0] ?? reference.chapter;
  return reference.printedPage === undefined ? chapter : `${chapter} · p. ${reference.printedPage}`;
}

function enrichPackDefinition(category: EntityType, definition: CompendiumCatalogItem["definition"], rulesetId: RulesetRef["id"]): CompendiumCatalogItem["definition"] {
  if (category !== "equipment" || !("id" in definition)) return definition;
  const canonical = findCanonicalDescription(category, String(definition.id));
  if (!canonical || canonical.category !== "equipment") return definition;
  const description = canonical.text.replace(/\uF0B7/g, "•").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  return {
    ...definition,
    description,
    sourceRefs: [
      ...definition.sourceRefs,
      { sourceId: rulesetId, chapter: "Capítulo 5", printedPage: canonical.printedPages[0], pdfPage: canonical.pdfPages[0], section: canonical.sourceHeading },
    ],
  } as CompendiumCatalogItem["definition"];
}

const CREATURE_TYPE_LABELS: Readonly<Record<CreatureStatBlock["creatureType"], string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };
const CREATURE_SIZE_LABELS: Readonly<Record<CreatureStatBlock["size"], string>> = { tiny: "Miúda", small: "Pequena", medium: "Média", large: "Grande", huge: "Enorme", gargantuan: "Imensa" };
/** Etiqueta interna do catálogo importado; não ajuda quem pesquisa nem entra nas tags exibidas. */
const CREATURE_NOISE_TAGS: ReadonlySet<string> = new Set(["monster-manual-appendix-a"]);

/** ND impresso: “1/4”, “2” ou “—” quando a fonte não informa. */
function creatureChallenge(challenge: CreatureStatBlock["challengeRating"]): string {
  if (!challenge) return "—";
  return challenge.denominator === 1 ? String(challenge.numerator) : `${challenge.numerator}/${challenge.denominator}`;
}

/**
 * Uma entrada de compêndio por bloco estatístico. O índice guarda o texto integral do bloco, então a busca
 * acha pelo nome, pelo tipo (“besta”), pelo ND (“nd 1/4”) e também por traços e ações (“visão no escuro”).
 */
export function catalogItemsFromCreatureStatBlocks(creatures: readonly CreatureStatBlock[], ruleset: RulesetRef): readonly CompendiumCatalogItem[] {
  return creatures.map((statBlock): CompendiumCatalogItem => {
    const type = CREATURE_TYPE_LABELS[statBlock.creatureType] ?? statBlock.creatureType;
    const size = CREATURE_SIZE_LABELS[statBlock.size] ?? statBlock.size;
    const challenge = creatureChallenge(statBlock.challengeRating);
    const tags = (statBlock.tags ?? []).filter((tag) => !CREATURE_NOISE_TAGS.has(tag) && !statBlock.sourceRefs.some((source) => source.sourceId === tag));
    return {
      kind: "static",
      category: "creature",
      ruleset,
      aliases: [type, `${type} ${size}`, `ND ${challenge}`],
      summary: `${type} · ${size} · ND ${challenge} · CA ${statBlock.armorClass} · PV ${statBlock.hitPoints.average}`,
      definition: { kind: "book-creature", id: String(statBlock.id), name: statBlock.name, tags, sourceRefs: statBlock.sourceRefs, statBlock },
    };
  });
}

function isBookCreatureItem(item: CompendiumCatalogItem): item is CompendiumCatalogItem & { readonly definition: CompendiumBookCreatureDefinition } {
  return "kind" in item.definition && item.definition.kind === "book-creature";
}

/**
 * O Livro do Jogador traz as mesmas criaturas do catálogo como texto cru (Apêndice D). Quando o animal já tem
 * bloco estruturado, o texto deixa de ser uma entrada própria — duas entradas iguais, uma menos detalhada,
 * só confundem a busca — e a referência do livro passa a constar no bloco, para a fonte não se perder.
 * Criaturas que existem só como texto (ex.: Zumbi) seguem como entradas de “Criaturas”.
 */
export function mergeCreatureBookEntries(items: readonly CompendiumCatalogItem[]): readonly CompendiumCatalogItem[] {
  const structured = new Set(items.filter(isBookCreatureItem).map((item) => normalizeSearchText(item.definition.name)));
  if (structured.size === 0) return items;
  const bookRefs = new Map<string, readonly SourceRef[]>();
  const kept = items.filter((item) => {
    if (item.category !== "creature" || !("kind" in item.definition) || item.definition.kind !== "book-rule") return true;
    const key = normalizeSearchText(item.definition.name);
    if (!structured.has(key)) return true;
    bookRefs.set(key, [...(bookRefs.get(key) ?? []), ...item.definition.sourceRefs.map((ref) => ({ ...ref, chapter: `Livro do Jogador · ${ref.chapter}` }))]);
    return false;
  });
  return kept.map((item) => {
    const refs = isBookCreatureItem(item) ? bookRefs.get(normalizeSearchText(item.definition.name)) : undefined;
    if (!refs || !isBookCreatureItem(item)) return item;
    const { definition } = item;
    return { ...item, definition: { ...definition, sourceRefs: [...definition.sourceRefs, ...refs], statBlock: { ...definition.statBlock, sourceRefs: [...definition.statBlock.sourceRefs, ...refs] } } };
  });
}

export function createIndexEntry(item: CompendiumCatalogItem): CompendiumIndexEntry {
  const definition = item.definition;
  const definitionId = "id" in definition ? definition.id : definition.templateId;
  const tags = "tags" in definition ? definition.tags : [];
  const searchableDefinitionText = collectText(definition).join(" ");
  const searchText = normalizeSearchText([item.summary, item.aliases?.join(" "), item.category, item.entityType, searchableDefinitionText].filter(Boolean).join(" "));
  if (item.kind === "static") {
    if (!item.category) throw new Error("Entrada estática do compêndio precisa de categoria.");
    return {
      key: `${item.ruleset.id}@${item.ruleset.version}:static:${item.category}:${String(definitionId)}`,
      ref: { kind: "static", rulesetId: item.ruleset.id, entityId: String(definitionId), category: item.category },
      ruleset: item.ruleset,
      category: item.category,
      title: definition.name,
      aliases: [...(item.aliases ?? [])],
      tags: [...tags],
      searchText,
      summary: item.summary,
      sourceRefs: [...definition.sourceRefs],
    };
  }
  if (!item.entityType) throw new Error("Entrada de rulepack do compêndio precisa de entityType.");
  return {
    key: itemKey(item.ruleset, item.entityType, String(definitionId)),
    ref: { rulesetId: item.ruleset.id, entityId: definitionId, entityType: item.entityType },
    ruleset: item.ruleset,
    category: item.entityType,
    title: definition.name,
    aliases: [...(item.aliases ?? [])],
    tags: [...tags],
    searchText,
    summary: item.summary,
    sourceRefs: [...definition.sourceRefs],
  };
}

function collectText(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectText);
  return [];
}

export function buildCompendiumIndex(items: readonly CompendiumCatalogItem[]): readonly CompendiumIndexEntry[] {
  return [...items].map(createIndexEntry).sort((a, b) => a.key.localeCompare(b.key, "en"));
}

export function categoryEntries(index: readonly CompendiumIndexEntry[], category: CompendiumCategoryId): readonly CompendiumIndexEntry[] {
  const canonical = canonicalCategory(category) ?? category;
  const descriptor = COMPENDIUM_CATEGORIES.find((candidate) => candidate.id === canonical);
  const target = descriptor?.targetId ?? canonical;
  const subsetTag = COMPENDIUM_CATEGORY_SUBSET_TAG[canonical];
  return index.filter((entry) => entry.category === target && (!subsetTag || entry.tags.includes(subsetTag)));
}
