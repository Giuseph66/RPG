import { canonicalCategory, COMPENDIUM_CATEGORIES, COMPENDIUM_CATEGORY_SUBSET_TAG, type CompendiumFilters, type CompendiumIndexEntry, type CompendiumSearchResult } from "./types";

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
}

function score(entry: CompendiumIndexEntry, query: string): number | undefined {
  if (!query) return 0;
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  const title = normalizeSearchText(entry.title);
  const aliases = entry.aliases.map(normalizeSearchText);
  const tags = entry.tags.map(normalizeSearchText);
  const searchable = [title, ...aliases, ...tags, normalizeSearchText(entry.category)].join(" ");
  if (!terms.every((term) => searchable.includes(term))) return undefined;
  if (title === normalizeSearchText(query)) return 0;
  if (title.startsWith(normalizeSearchText(query))) return 1;
  if (title.includes(normalizeSearchText(query))) return 2;
  if (aliases.some((alias) => alias === normalizeSearchText(query))) return 3;
  if (aliases.some((alias) => alias.includes(normalizeSearchText(query)))) return 4;
  if (tags.some((tag) => terms.includes(tag))) return 5;
  return 6;
}

export function searchCompendium(index: readonly CompendiumIndexEntry[], requested: Partial<CompendiumFilters> = {}): CompendiumSearchResult {
  const filters: CompendiumFilters = { query: requested.query ?? "", category: canonicalCategory(requested.category), tag: requested.tag, favoriteOnly: requested.favoriteOnly };
  const normalizedTag = filters.tag ? normalizeSearchText(filters.tag) : undefined;
  const categoryDescriptor = filters.category ? COMPENDIUM_CATEGORIES.find((candidate) => candidate.id === filters.category) : undefined;
  const categoryTarget = categoryDescriptor?.targetId ?? filters.category;
  const categorySubsetTag = filters.category ? COMPENDIUM_CATEGORY_SUBSET_TAG[filters.category] : undefined;
  const ranked = index
    .filter((entry) => !filters.category || (entry.category === categoryTarget && (!categorySubsetTag || entry.tags.includes(categorySubsetTag))))
    .filter((entry) => !normalizedTag || entry.tags.some((tag) => normalizeSearchText(tag) === normalizedTag))
    .map((entry) => ({ entry, score: score(entry, filters.query) }))
    .filter((result): result is { readonly entry: CompendiumIndexEntry; readonly score: number } => result.score !== undefined)
    .sort((a, b) => a.score - b.score || normalizeSearchText(a.entry.title).localeCompare(normalizeSearchText(b.entry.title), "pt-BR") || a.entry.key.localeCompare(b.entry.key, "en"));
  return { entries: ranked.map(({ entry }) => entry), filters };
}
