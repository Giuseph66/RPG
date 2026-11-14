import type { CompendiumCategory, CompendiumCategoryId, CompendiumDetail, CompendiumFavoriteState, CompendiumFilters, CompendiumIndexEntry } from "@application/compendium";

export interface CompendiumProps {
  readonly entries: readonly CompendiumIndexEntry[];
  readonly filters?: CompendiumFilters;
  readonly categories?: readonly CompendiumCategory[];
  /** Total de entradas indexadas, independente do filtro ativo. */
  readonly totalEntries?: number;
  readonly selected?: CompendiumDetail;
  readonly favorites?: readonly CompendiumFavoriteState[];
  readonly status?: "idle" | "loading" | "error";
  readonly error?: string;
  readonly offline?: boolean;
  readonly onFiltersChange?: (filters: CompendiumFilters) => void;
  readonly onSelect?: (entry: CompendiumIndexEntry) => void;
  readonly onToggleFavorite?: (entry: CompendiumIndexEntry) => void;
  readonly onLoadCategory?: (category: CompendiumCategoryId) => void;
  readonly className?: string;
}

export interface CompendiumDetailProps {
  readonly detail: CompendiumDetail;
  readonly favorite?: boolean;
  readonly onToggleFavorite?: () => void;
}
