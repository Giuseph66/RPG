import type { CompendiumCategory, CompendiumCategoryId, CompendiumDetail, CompendiumFavoriteState, CompendiumFilters, CompendiumIndexEntry } from "@application/compendium";
import type { ReactNode } from "react";

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
  /** Integra o catálogo de criaturas na mesma rota sem criar um destino de navegação. */
  readonly creaturePanel?: ReactNode;
}

export interface CompendiumDetailProps {
  readonly detail: CompendiumDetail;
  readonly favorite?: boolean;
  readonly onToggleFavorite?: () => void;
}
