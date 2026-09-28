import type { ReactNode } from "react";
import { MagnifyingGlass, PawPrint, Question, Skull, UserCircle } from "@phosphor-icons/react";
import { CREATURE_KIND_LABELS, CREATURE_KINDS, type CreatureKind } from "@domain/campaign/creatures";

import type { CreatureFilter } from "./types";
import styles from "./creatures.module.css";

export function CreatureKindIcon({ kind, size = 20 }: { readonly kind: CreatureKind; readonly size?: number }) {
  if (kind === "enemy") return <Skull size={size} weight="duotone" aria-hidden="true" />;
  if (kind === "animal") return <PawPrint size={size} weight="duotone" aria-hidden="true" />;
  if (kind === "npc") return <UserCircle size={size} weight="duotone" aria-hidden="true" />;
  return <Question size={size} weight="duotone" aria-hidden="true" />;
}

export const FILTER_LABELS: Readonly<Record<CreatureFilter, string>> = {
  all: "Todos",
  npc: "NPCs",
  enemy: "Ameaças",
  animal: "Animais",
  unknown: "Não categorizados",
};

export function CreatureToolbar({ counts, filter, onFilter, query, onQuery, actions }: {
  readonly counts: Readonly<Record<CreatureFilter, number>>;
  readonly filter: CreatureFilter;
  readonly onFilter: (filter: CreatureFilter) => void;
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly actions?: ReactNode;
}) {
  return <div className={styles.toolbar}>
    <div className={styles.filters} role="group" aria-label="Filtrar por categoria">
      {(["all", ...CREATURE_KINDS] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => onFilter(value)}>
        {value === "all" ? null : <CreatureKindIcon kind={value} size={15} />}<span>{FILTER_LABELS[value]}</span><small>{counts[value]}</small>
      </button>)}
    </div>
    <div className={styles.toolbarEnd}>
      <label className={styles.search}><MagnifyingGlass size={16} aria-hidden="true" /><span className={styles.visuallyHidden}>Buscar criatura</span><input type="search" placeholder="Buscar" value={query} onChange={(event) => onQuery(event.currentTarget.value)} /></label>
      {actions}
    </div>
  </div>;
}

export function countByKind<T>(items: readonly T[], kindOf: (item: T) => CreatureKind): Record<CreatureFilter, number> {
  const counts: Record<CreatureFilter, number> = { all: items.length, npc: 0, enemy: 0, animal: 0, unknown: 0 };
  for (const item of items) counts[kindOf(item)] += 1;
  return counts;
}

export function kindLabel(kind: CreatureKind): string {
  return CREATURE_KIND_LABELS[kind];
}

export function matchesQuery(query: string, ...values: readonly (string | undefined)[]): boolean {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  return !normalized || values.some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalized));
}
