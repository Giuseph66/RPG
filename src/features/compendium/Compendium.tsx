import { Badge, Button, InlineStatus, Input, SectionCard } from "@components/ui";
import type { CompendiumDetail } from "@application/compendium";

import type { CompendiumDetailProps, CompendiumProps } from "./types";
import styles from "./compendium.module.css";

const DEFAULT_FILTERS = { query: "" } as const;

function formatSource(source: CompendiumDetail["sourceRefs"][number]): string {
  const page = source.printedPage === undefined ? "" : `, p. ${source.printedPage}`;
  return `${source.chapter}${page}`;
}

export function CompendiumDetailPanel({ detail, favorite = false, onToggleFavorite }: CompendiumDetailProps) {
  return <article className={styles.detail} aria-labelledby="compendium-detail-title"><div className={styles.detailHeading}><div><p className={styles.eyebrow}>Detalhe local</p><h2 id="compendium-detail-title">{detail.title}</h2><span className={styles.technicalId}>{detail.ref.entityType} · {String(detail.ref.entityId)}</span></div>{onToggleFavorite ? <Button variant={favorite ? "secondary" : "ghost"} size="sm" aria-pressed={favorite} onClick={onToggleFavorite}>{favorite ? "Remover favorito" : "Favoritar"}</Button> : null}</div>{detail.summary ? <p className={styles.summary}>{detail.summary}</p> : <p className={styles.summary}>Definição local disponível para consulta.</p>}<div className={styles.detailMeta}><span>Pack: {String(detail.ruleset.id)}@{String(detail.ruleset.version)}</span><span>Fonte: {detail.sourceRefs.length === 0 ? "Fonte não registrada" : detail.sourceRefs.map(formatSource).join(" · ")}</span></div><div className={styles.tagList}>{detail.tags.length === 0 ? <span className={styles.muted}>Sem tags</span> : detail.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></article>;
}

export function Compendium({ entries, filters = DEFAULT_FILTERS, categories = [], selected, favorites = [], status = "idle", error, offline = true, onFiltersChange, onSelect, onToggleFavorite, onLoadCategory, className }: CompendiumProps) {
  const favoriteKeys = new Set(favorites.filter((favorite) => favorite.exists).map((favorite) => favorite.key));
  const orphanFavorites = favorites.filter((favorite) => !favorite.exists);
  const updateFilter = (patch: Partial<typeof filters>) => onFiltersChange?.({ ...filters, ...patch, query: patch.query ?? filters.query });
  return <section className={[styles.page, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="compendium-title">
    <header className={styles.header}><div><p className={styles.eyebrow}>Fonte local</p><h1 id="compendium-title">Compêndio</h1><p>Consulte definições instaladas sem depender de rede.</p></div>{offline ? <Badge tone="xp">Offline disponível</Badge> : <Badge tone="warning">Modo local indisponível</Badge>}</header>
    <div className={styles.search}><Input label="Buscar por nome, categoria ou tag" value={filters.query} onChange={(event) => updateFilter({ query: event.currentTarget.value })} /><label className={styles.favoriteFilter}><input type="checkbox" checked={filters.favoriteOnly ?? false} onChange={(event) => updateFilter({ favoriteOnly: event.currentTarget.checked })} /> <span>Somente favoritos</span></label></div>
    {status === "loading" ? <InlineStatus tone="info">Carregando índice local…</InlineStatus> : null}
    {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar o compêndio local."}</InlineStatus> : null}
    <div className={styles.layout}>
      <aside className={styles.filters} aria-labelledby="compendium-categories-title"><h2 id="compendium-categories-title">Categorias</h2>{categories.length === 0 ? <p className={styles.muted}>Categorias indisponíveis.</p> : <ul>{categories.map((category) => <li key={category.id}><button type="button" className={filters.category === category.id ? styles.activeCategory : undefined} aria-current={filters.category === category.id ? "true" : undefined} disabled={category.status === "pending" && !onLoadCategory} onClick={() => category.status === "pending" ? onLoadCategory?.(category.id) : updateFilter({ category: category.id })}><span>{category.label}</span>{category.status === "pending" ? <small>Pendente</small> : null}</button></li>)}</ul>}</aside>
      <section className={styles.results} aria-labelledby="compendium-results-title"><div className={styles.resultsHeading}><h2 id="compendium-results-title">Resultados</h2><span aria-live="polite">{entries.length} encontrado(s)</span></div>{entries.length === 0 ? <p className={styles.empty}>Nenhum resultado para estes filtros.</p> : <ul>{entries.map((entry) => <li key={entry.key}><button type="button" onClick={() => onSelect?.(entry)}><span><strong>{entry.title}</strong><small>{entry.category}{entry.summary ? ` · ${entry.summary}` : ""}</small></span>{favoriteKeys.has(entry.key) ? <span aria-label="Favorito">★</span> : null}</button></li>)}</ul>}</section>
      <section className={styles.detailColumn} aria-label="Detalhe da definição">{selected ? <CompendiumDetailPanel detail={selected} favorite={favoriteKeys.has(selected.key)} onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(selected) : undefined} /> : <SectionCard heading="Selecione uma definição"><p className={styles.muted}>Escolha um resultado para consultar a fonte e os metadados locais.</p></SectionCard>}{orphanFavorites.length > 0 ? <SectionCard heading="Favoritos órfãos"><p className={styles.muted}>Alguns favoritos não existem no pack atual.</p><ul className={styles.orphans}>{orphanFavorites.map((favorite) => <li key={favorite.key}>{favorite.ref.entityType} · {favorite.ref.entityId}</li>)}</ul></SectionCard> : null}</section>
    </div>
  </section>;
}

export const CompendiumPage = Compendium;
export const CompendiumBrowser = Compendium;
