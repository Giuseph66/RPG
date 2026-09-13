import { useState } from "react";
import type { ReactNode } from "react";

import { Badge, Button, InlineStatus, Input, SectionCard } from "@components/ui";
import { ArrowLeft, BookOpen, BookmarkSimple, Books, Brain, Crosshair, FirstAidKit, MagnifyingGlass, Shield, Sparkle, Sword, UsersThree } from "@phosphor-icons/react";
import type { CompendiumDetail } from "@application/compendium";

import type { CompendiumDetailProps, CompendiumProps } from "./types";
import styles from "./compendium.module.css";

const DEFAULT_FILTERS = { query: "" } as const;

function categoryIcon(id: string): ReactNode {
  if (id === "combat") return <Sword size={19} weight="duotone" aria-hidden="true" />;
  if (id === "conditions") return <Shield size={19} weight="duotone" aria-hidden="true" />;
  if (id === "attributes") return <Brain size={19} weight="duotone" aria-hidden="true" />;
  if (id === "skills") return <Crosshair size={19} weight="duotone" aria-hidden="true" />;
  if (id === "races" || id === "classes") return <UsersThree size={19} weight="duotone" aria-hidden="true" />;
  if (id === "spells" || id === "magia" || id === "magias") return <Sparkle size={19} weight="duotone" aria-hidden="true" />;
  if (id === "rest") return <FirstAidKit size={19} weight="duotone" aria-hidden="true" />;
  return <BookOpen size={19} weight="duotone" aria-hidden="true" />;
}

function formatSource(source: CompendiumDetail["sourceRefs"][number]): string {
  const page = source.printedPage === undefined ? "" : `, p. ${source.printedPage}`;
  return `${source.chapter}${page}`;
}

function formatTechnicalReference(detail: CompendiumDetail): string {
  return detail.ref.kind === "static"
    ? `${detail.ref.category} · ${String(detail.ref.entityId)}`
    : `${detail.ref.entityType} · ${String(detail.ref.entityId)}`;
}

export function CompendiumDetailPanel({ detail, favorite = false, onToggleFavorite }: CompendiumDetailProps) {
  return <article className={styles.detail} aria-labelledby="compendium-detail-title"><div className={styles.detailHeading}><div><p className={styles.eyebrow}>Detalhe local</p><h2 id="compendium-detail-title">{detail.title}</h2><span className={styles.technicalId}>{formatTechnicalReference(detail)}</span></div>{onToggleFavorite ? <Button variant={favorite ? "secondary" : "ghost"} size="sm" aria-pressed={favorite} onClick={onToggleFavorite}><BookmarkSimple size={17} weight={favorite ? "fill" : "regular"} aria-hidden="true" /> {favorite ? "Remover favorito" : "Favoritar"}</Button> : null}</div>{detail.summary ? <p className={styles.summary}>{detail.summary}</p> : <p className={styles.summary}>Definição local disponível para consulta.</p>}<div className={styles.detailMeta}><span>Pack: {String(detail.ruleset.id)}@{String(detail.ruleset.version)}</span><span>Fonte: {detail.sourceRefs.length === 0 ? "Fonte não registrada" : detail.sourceRefs.map(formatSource).join(" · ")}</span></div><div className={styles.tagList}>{detail.tags.length === 0 ? <span className={styles.muted}>Sem tags</span> : detail.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></article>;
}

export function Compendium({ entries, filters = DEFAULT_FILTERS, categories = [], selected, favorites = [], status = "idle", error, offline = true, onFiltersChange, onSelect, onToggleFavorite, onLoadCategory, className }: CompendiumProps) {
  const [mobileDetail, setMobileDetail] = useState(Boolean(selected));
  const favoriteKeys = new Set(favorites.filter((favorite) => favorite.exists).map((favorite) => favorite.key));
  const orphanFavorites = favorites.filter((favorite) => !favorite.exists);
  const updateFilter = (patch: Partial<typeof filters>) => onFiltersChange?.({ ...filters, ...patch, query: patch.query ?? filters.query });
  return <section className={[styles.page, mobileDetail ? styles.mobileDetail : "", className ?? ""].filter(Boolean).join(" ")} aria-labelledby="compendium-title">
    <header className={styles.header}><div className={styles.titleBlock}><span className={styles.titleIcon} aria-hidden="true"><Books size={25} weight="duotone" /></span><div><p className={styles.eyebrow}>Conhecimento local</p><h1 id="compendium-title">Compêndio</h1><p>Conhecimento para grandes aventuras.</p></div></div>{offline ? <Badge tone="xp">Offline disponível</Badge> : <Badge tone="warning">Modo local indisponível</Badge>}</header>
    <div className={styles.search}><div className={styles.searchField}><MagnifyingGlass size={19} aria-hidden="true" /><Input label="Buscar por nome, categoria ou tag" value={filters.query} onChange={(event) => updateFilter({ query: event.currentTarget.value })} /></div><label className={styles.favoriteFilter}><input type="checkbox" checked={filters.favoriteOnly ?? false} onChange={(event) => updateFilter({ favoriteOnly: event.currentTarget.checked })} /> <BookmarkSimple size={17} aria-hidden="true" /><span>Somente favoritos</span></label></div>
    {status === "loading" ? <InlineStatus tone="info">Carregando índice local…</InlineStatus> : null}
    {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar o compêndio local."}</InlineStatus> : null}
    <div className={styles.layout}>
      <aside className={styles.filters} aria-labelledby="compendium-categories-title"><h2 id="compendium-categories-title">Categorias</h2>{categories.length === 0 ? <p className={styles.muted}>Categorias indisponíveis.</p> : <ul>{categories.map((category) => <li key={category.id}><button type="button" className={filters.category === category.id ? styles.activeCategory : undefined} aria-current={filters.category === category.id ? "true" : undefined} disabled={category.status === "pending" && !onLoadCategory} onClick={() => category.status === "pending" ? onLoadCategory?.(category.id) : updateFilter({ category: category.id })}><span className={styles.categoryLabel}>{categoryIcon(category.id)}<span>{category.label}</span></span>{category.status === "pending" ? <small>Pendente</small> : null}</button></li>)}</ul>}</aside>
      <section className={styles.results} aria-labelledby="compendium-results-title"><div className={styles.resultsHeading}><h2 id="compendium-results-title">Resultados</h2><span aria-live="polite">{entries.length} encontrado(s)</span></div>{entries.length === 0 ? <p className={styles.empty}><Books size={28} weight="duotone" aria-hidden="true" /><span>Nenhum resultado para estes filtros.</span></p> : <ul>{entries.map((entry) => <li key={entry.key}><button type="button" onClick={() => { onSelect?.(entry); setMobileDetail(true); }}><span><strong>{entry.title}</strong><small>{entry.category}{entry.summary ? ` · ${entry.summary}` : ""}</small></span>{favoriteKeys.has(entry.key) ? <BookmarkSimple size={17} weight="fill" aria-label="Favorito" /> : null}</button></li>)}</ul>}</section>
      <section className={styles.detailColumn} aria-label="Detalhe da definição">{selected ? <><Button className={styles.detailBack} size="sm" variant="ghost" onClick={() => setMobileDetail(false)}><ArrowLeft size={17} aria-hidden="true" /> Voltar aos resultados</Button><CompendiumDetailPanel detail={selected} favorite={favoriteKeys.has(selected.key)} onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(selected) : undefined} /></> : <SectionCard heading="Selecione uma definição"><p className={styles.muted}>Escolha um resultado para consultar a fonte e os metadados locais.</p></SectionCard>}{orphanFavorites.length > 0 ? <SectionCard heading="Favoritos órfãos"><p className={styles.muted}>Alguns favoritos não existem no pack atual.</p><ul className={styles.orphans}>{orphanFavorites.map((favorite) => <li key={favorite.key}>{favorite.ref.kind === "static" ? favorite.ref.category : favorite.ref.entityType} · {favorite.ref.entityId}</li>)}</ul></SectionCard> : null}</section>
    </div>
  </section>;
}

export const CompendiumPage = Compendium;
export const CompendiumBrowser = Compendium;
