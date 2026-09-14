import type { EntityType } from "@domain/contracts/ids";

import { catalogItemsFromPacks, buildCompendiumIndex, categoryEntries, createIndexEntry, itemKey } from "./indexer";
import { CompendiumFavorites } from "./favorites";
import { searchCompendium } from "./search";
import { canonicalCategory, COMPENDIUM_CATEGORIES, type CompendiumCatalogItem, type CompendiumCategory, type CompendiumCategoryId, type CompendiumCategoryState, type CompendiumDetail, type CompendiumError, type CompendiumFilters, type CompendiumIndexEntry, type CompendiumFavoriteState, type CompendiumReference, type CompendiumServiceOptions, type LegacyCompendiumDetailReference, type StaticCompendiumReference, type StaticCompendiumCategory } from "./types";

export type CompendiumResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: CompendiumError };

export class CompendiumService {
  private readonly entriesByKey = new Map<string, CompendiumCatalogRecord>();
  private index: readonly CompendiumIndexEntry[];
  private readonly favorites: CompendiumFavorites;
  private readonly loader?: CompendiumServiceOptions["loadCategory"];
  private readonly pending: ReadonlySet<CompendiumCategoryId>;
  private readonly loadedCategories = new Set<CompendiumCategoryId>();

  constructor(options: CompendiumServiceOptions = {}) {
    const excluded = new Set(options.excludePackEntityTypes ?? []);
    const items: readonly CompendiumCatalogItem[] = [
      ...(options.packs ? catalogItemsFromPacks(options.packs).filter((item) => !item.entityType || !excluded.has(item.entityType)) : []),
      ...(options.items ?? []),
    ];
    this.index = buildCompendiumIndex(items);
    items.forEach((item) => { const entry = createIndexEntry(item); this.entriesByKey.set(entry.key, { entry, definition: item.definition }); });
    this.favorites = new CompendiumFavorites(options.initialFavorites);
    this.loader = options.loadCategory;
    this.pending = new Set(options.pendingCategories ?? COMPENDIUM_CATEGORIES.filter((category) => category.status === "pending").map((category) => category.id));
  }

  getIndex(): readonly CompendiumIndexEntry[] { return this.index; }
  getCategories(): readonly CompendiumCategory[] {
    return COMPENDIUM_CATEGORIES.map((category) => {
      const hasEntries = categoryEntries(this.index, category.id).length > 0;
      return this.loadedCategories.has(category.id) || hasEntries
        ? { ...category, status: "available" }
        : this.pending.has(category.id)
          ? { ...category, status: "pending" }
          : category.status === "available"
            ? { ...category, status: "pending" }
            : category;
    });
  }

  search(filters: Partial<CompendiumFilters> = {}) {
    const base = searchCompendium(this.index, filters);
    const entries = filters.favoriteOnly ? base.entries.filter((entry) => this.favorites.isFavorite(entry)) : base.entries;
    return { entries, filters: base.filters };
  }

  getDetail(ref: CompendiumReference | LegacyCompendiumDetailReference | { readonly kind: "static"; readonly rulesetId: string; readonly category: StaticCompendiumCategory; readonly entityId: string; readonly version?: string }): CompendiumResult<CompendiumDetail> {
    const isStatic = (value: typeof ref): value is StaticCompendiumReference & { readonly version?: string } => "kind" in value && value.kind === "static";
    const version = "version" in ref && ref.version ? ref.version : "";
    const requestedVersion = "version" in ref ? ref.version : undefined;
    const key = isStatic(ref)
      ? `${ref.rulesetId}@${version}:static:${ref.category}:${ref.entityId}`
      : `${ref.rulesetId}@${version}:${"entityType" in ref ? ref.entityType : ""}:${ref.entityId}`;
    const found = this.entriesByKey.get(key) ?? (requestedVersion === undefined ? [...this.entriesByKey.values()].find(({ entry }) => {
      if (String(entry.ref.rulesetId) !== ref.rulesetId || String(entry.ref.entityId) !== ref.entityId) return false;
      return isStatic(ref) ? entry.ref.kind === "static" && entry.ref.category === ref.category : entry.ref.kind !== "static" && "entityType" in ref && entry.ref.entityType === ref.entityType;
    }) : undefined);
    if (!found) return { ok: false, error: { code: "not-found", entity: "definition", id: ref.entityId, message: `Definição "${ref.entityId}" não encontrada no pack local.` } };
    return { ok: true, value: { ...found.entry, definition: found.definition } };
  }

  isFavorite(entry: CompendiumIndexEntry): boolean { return this.favorites.isFavorite(entry); }
  toggleFavorite(entry: CompendiumIndexEntry): boolean { return this.favorites.toggle(entry); }
  addFavorite(ref: Parameters<CompendiumFavorites["add"]>[0]): void { this.favorites.add(ref); }
  getFavorites(): readonly CompendiumFavoriteState[] { return this.favorites.list(this.index); }

  async loadCategory(requested: string): Promise<CompendiumResult<CompendiumCategoryState>> {
    const category = canonicalCategory(requested);
    if (!category) return { ok: false, error: { code: "not-found", entity: "category", id: requested, message: `Categoria "${requested}" não existe.` } };
    const hasEntries = this.index.some((entry) => entry.category === category);
    if (this.pending.has(category) && !hasEntries) {
      if (!this.loader || !["race", "subrace", "class", "subclass", "background", "feat", "feature", "resource", "condition", "equipment", "spell", "progression", "character-template"].includes(category)) return { ok: true, value: { category: this.getCategories().find((candidate) => candidate.id === category) ?? { id: category, label: category, status: "pending" }, status: "pending", entries: [] } };
      try {
        const items = await this.loader(category as EntityType);
        for (const item of items) {
          const entry = createIndexEntry(item);
          this.entriesByKey.set(entry.key, { entry, definition: item.definition });
        }
        this.index = [...this.entriesByKey.values()].map(({ entry }) => entry).sort((a, b) => a.key.localeCompare(b.key, "en"));
        this.loadedCategories.add(category);
        return { ok: true, value: { category: this.getCategories().find((candidate) => candidate.id === category) ?? { id: category, label: category, status: "available" }, status: "loaded", entries: buildCompendiumIndex(items) } };
      } catch (cause) {
        return { ok: false, error: { code: "category-load-failed", category, message: cause instanceof Error ? cause.message : "Não foi possível carregar a categoria local." } };
      }
    }
    return { ok: true, value: { category: this.getCategories().find((candidate) => candidate.id === category) ?? { id: category, label: category, status: "available" }, status: "loaded", entries: categoryEntries(this.index, category) } };
  }
}

interface CompendiumCatalogRecord { readonly entry: CompendiumIndexEntry; readonly definition: CompendiumCatalogItem["definition"] }

export function createCompendiumService(options: CompendiumServiceOptions = {}): CompendiumService { return new CompendiumService(options); }
export { buildCompendiumIndex, catalogItemsFromPacks, createIndexEntry, itemKey } from "./indexer";
export { normalizeSearchText, searchCompendium } from "./search";
export { CompendiumFavorites } from "./favorites";
