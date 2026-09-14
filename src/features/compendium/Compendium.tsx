import { useState } from "react";
import type { ReactNode } from "react";

import { AppModal, Badge, IconButton, InlineStatus, Input } from "@components/ui";
import { BookOpen, BookmarkSimple, Books, Brain, CaretDown, Crosshair, FirstAidKit, MagnifyingGlass, Shield, Sparkle, Sword, UsersThree } from "@phosphor-icons/react";
import type { CompendiumBookRuleDefinition, CompendiumBookSpellDefinition, CompendiumDetail } from "@application/compendium";
import type { SpellDefinition } from "@domain/contracts/definitions/spell";

import type { CompendiumDetailProps, CompendiumProps } from "./types";
import styles from "./compendium.module.css";

const DEFAULT_FILTERS = { query: "" } as const;

function categoryIcon(id: string): ReactNode {
  if (id === "combat") return <Sword size={19} weight="duotone" aria-hidden="true" />;
  if (id === "condition" || id === "conditions") return <Shield size={19} weight="duotone" aria-hidden="true" />;
  if (id === "attributes") return <Brain size={19} weight="duotone" aria-hidden="true" />;
  if (id === "skills") return <Crosshair size={19} weight="duotone" aria-hidden="true" />;
  if (id === "race" || id === "races" || id === "class" || id === "classes") return <UsersThree size={19} weight="duotone" aria-hidden="true" />;
  if (id === "spell" || id === "spells" || id === "magia" || id === "magias") return <Sparkle size={19} weight="duotone" aria-hidden="true" />;
  if (id === "rest") return <FirstAidKit size={19} weight="duotone" aria-hidden="true" />;
  return <BookOpen size={19} weight="duotone" aria-hidden="true" />;
}

function formatSource(source: CompendiumDetail["sourceRefs"][number]): string {
  const page = source.printedPage === undefined ? "" : `, p. ${source.printedPage}`;
  return `${source.chapter}${page}`;
}

function formatHumanReference(detail: CompendiumDetail): string {
  const categoryNames: Record<string, string> = { adventure: "Aventura", background: "Antecedente", class: "Classe", combat: "Combate", condition: "Condições", equipment: "Equipamento", feat: "Talento", race: "Raça", spell: "Magia", rules: "Regras" };
  return `${categoryNames[detail.category] ?? detail.category} · ${detail.title}`;
}

function isSpellDefinition(definition: CompendiumDetail["definition"]): definition is SpellDefinition {
  if (!definition || typeof definition !== "object") return false;
  const candidate = definition as Partial<SpellDefinition>;
  return typeof candidate.level === "number" && typeof candidate.school === "string" && candidate.castingTime !== null && typeof candidate.castingTime === "object" && candidate.range !== null && typeof candidate.range === "object" && candidate.components !== null && typeof candidate.components === "object" && candidate.duration !== null && typeof candidate.duration === "object" && typeof candidate.concentration === "boolean" && typeof candidate.ritual === "boolean";
}

function isBookSpellDefinition(definition: CompendiumDetail["definition"]): definition is CompendiumBookSpellDefinition {
  return Boolean(definition && typeof definition === "object" && "kind" in definition && definition.kind === "book-spell");
}

function isBookRuleDefinition(definition: CompendiumDetail["definition"]): definition is CompendiumBookRuleDefinition {
  return Boolean(definition && typeof definition === "object" && "kind" in definition && definition.kind === "book-rule");
}

function formatCastingTime(spell: SpellDefinition): string {
  const names = { action: "Ação", "bonus-action": "Ação bônus", reaction: "Reação", minutes: "Minutos", hours: "Horas" } as const;
  if (spell.castingTime.kind === "reaction" && spell.castingTime.reactionTrigger) return `Reação: ${spell.castingTime.reactionTrigger}`;
  return spell.castingTime.amount ? `${spell.castingTime.amount} ${names[spell.castingTime.kind].toLocaleLowerCase("pt-BR")}` : names[spell.castingTime.kind];
}

function formatRange(spell: SpellDefinition): string {
  if (spell.range.kind === "self") return "Você";
  if (spell.range.kind === "touch") return "Toque";
  if (spell.range.kind === "special") return "Especial";
  return spell.range.distanceCm === undefined ? "À distância" : `${Number(spell.range.distanceCm) / 100} m`;
}

function formatDuration(spell: SpellDefinition): string {
  if (spell.duration.kind === "instantaneous") return "Instantânea";
  if (spell.duration.kind === "until-dispelled") return "Até ser dissipada";
  if (spell.duration.kind === "special") return "Especial";
  return spell.duration.amount === undefined ? spell.duration.kind : `${spell.duration.amount} ${spell.duration.unit === "round" ? "rodada(s)" : spell.duration.unit === "minute" ? "minuto(s)" : "hora(s)"}`;
}

function SpellDetails({ spell }: { spell: SpellDefinition }) {
  const schools: Record<SpellDefinition["school"], string> = { abjuration: "Abjuração", conjuration: "Conjuração", divination: "Adivinhação", enchantment: "Encantamento", evocation: "Evocação", illusion: "Ilusão", necromancy: "Necromancia", transmutation: "Transmutação" };
  const components = [spell.components.verbal ? "V" : "", spell.components.somatic ? "S" : "", spell.components.material ? `M (${spell.components.material.descriptionSummary})` : ""].filter(Boolean).join(", ");
  return <section className={styles.spellDetails} aria-labelledby="spell-details-title"><h3 id="spell-details-title">Detalhes da magia</h3><dl><div><dt>Círculo</dt><dd>{spell.level === 0 ? "Truque" : `${spell.level}º`}</dd></div><div><dt>Escola</dt><dd>{schools[spell.school]}</dd></div><div><dt>Conjuração</dt><dd>{formatCastingTime(spell)}</dd></div><div><dt>Alcance</dt><dd>{formatRange(spell)}</dd></div><div><dt>Componentes</dt><dd>{components || "Não informado"}</dd></div><div><dt>Duração</dt><dd>{formatDuration(spell)}</dd></div><div><dt>Concentração</dt><dd>{spell.concentration ? "Sim" : "Não"}</dd></div><div><dt>Ritual</dt><dd>{spell.ritual ? "Sim" : "Não"}</dd></div></dl></section>;
}

function BookSpellDetails({ spell }: { spell: CompendiumBookSpellDefinition }) {
  const classNames: Readonly<Record<string, string>> = { bard: "Bardo", warlock: "Bruxo", cleric: "Clérigo", druid: "Druida", sorcerer: "Feiticeiro", wizard: "Mago", paladin: "Paladino", ranger: "Patrulheiro" };
  return <section className={styles.spellDetails} aria-labelledby="spell-details-title"><h3 id="spell-details-title">Detalhes da magia</h3><dl><div><dt>Círculo</dt><dd>{spell.level === 0 ? "Truque" : `${spell.level}º`}</dd></div><div><dt>Escola</dt><dd>{spell.school}</dd></div><div><dt>Conjuração</dt><dd>{spell.castingTime}</dd></div><div><dt>Alcance</dt><dd>{spell.range}</dd></div><div><dt>Componentes</dt><dd>{spell.components}</dd></div><div><dt>Duração</dt><dd>{spell.duration}</dd></div><div><dt>Concentração</dt><dd>{spell.concentration ? "Sim" : "Não"}</dd></div><div><dt>Ritual</dt><dd>{spell.ritual ? "Sim" : "Não"}</dd></div><div className={styles.spellWide}><dt>Classes</dt><dd>{spell.classes.map((classId) => classNames[classId] ?? classId).join(", ")}</dd></div></dl></section>;
}

export function CompendiumDetailPanel({ detail }: CompendiumDetailProps) {
  const bookSpell = isBookSpellDefinition(detail.definition) ? detail.definition : undefined;
  const bookRule = isBookRuleDefinition(detail.definition) ? detail.definition : undefined;
  return <article className={styles.detail} aria-labelledby="compendium-detail-title"><div className={styles.detailHeading}><h2 id="compendium-detail-title">{detail.title}</h2><span className={styles.technicalId}>{formatHumanReference(detail)}</span></div>{bookSpell ? <p className={styles.summary}>{bookSpell.description}</p> : !bookRule && detail.summary ? <p className={styles.summary}>{detail.summary}</p> : null}{isSpellDefinition(detail.definition) ? <SpellDetails spell={detail.definition} /> : bookSpell ? <BookSpellDetails spell={bookSpell} /> : null}{bookRule ? <section className={styles.bookRuleText} aria-label="Texto da regra"><h3>{bookRule.sourceHeading}</h3><p>{bookRule.text}</p></section> : null}{bookSpell?.higherLevels ? <section className={styles.higherLevels}><h3>Em níveis superiores</h3><p>{bookSpell.higherLevels}</p></section> : null}{detail.sourceRefs.length > 0 ? <div className={styles.detailMeta}><span>Fonte · {detail.sourceRefs.map(formatSource).join(" · ")}</span></div> : null}{detail.tags.length > 0 ? <div className={styles.tagList}>{detail.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div> : null}</article>;
}

export function Compendium({ entries, filters = DEFAULT_FILTERS, categories = [], selected, favorites = [], status = "idle", error, offline = true, onFiltersChange, onSelect, onToggleFavorite, onLoadCategory, className }: CompendiumProps) {
  const [selectedEntry, setSelectedEntry] = useState<CompendiumDetail | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(Boolean(selected));
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const favoriteKeys = new Set(favorites.filter((favorite) => favorite.exists).map((favorite) => favorite.key));
  const orphanFavorites = favorites.filter((favorite) => !favorite.exists);
  const activeDetail = selected ?? selectedEntry;
  const hasActiveFilter = Boolean(filters.query.trim() || filters.category || filters.favoriteOnly);
  const updateFilter = (patch: Partial<typeof filters>) => onFiltersChange?.({ ...filters, ...patch, query: patch.query ?? filters.query });
  return <section className={[styles.page, className ?? ""].filter(Boolean).join(" ")} aria-label="Compêndio de regras">
    <div className={styles.search}><div className={styles.searchField}><MagnifyingGlass size={19} aria-hidden="true" /><Input label="Buscar por nome, categoria ou tag" value={filters.query} onChange={(event) => updateFilter({ query: event.currentTarget.value })} /></div><label className={styles.favoriteFilter}><input type="checkbox" checked={filters.favoriteOnly ?? false} onChange={(event) => updateFilter({ favoriteOnly: event.currentTarget.checked })} /> <BookmarkSimple size={17} aria-hidden="true" /><span>Somente favoritos</span></label></div>
    {status === "loading" ? <InlineStatus tone="info">Carregando índice local…</InlineStatus> : null}
    {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível carregar o compêndio local."}</InlineStatus> : null}
    {!offline ? <InlineStatus tone="warning">Conhecimento offline indisponível.</InlineStatus> : null}
    <section className={styles.categories} aria-labelledby="compendium-categories-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Índice do grimório</p><h2 id="compendium-categories-title">Categorias</h2></div><button type="button" className={styles.categoryToggle} aria-expanded={categoriesExpanded} aria-controls="compendium-category-grid" aria-label={categoriesExpanded ? "Recolher categorias" : "Expandir categorias"} onClick={() => setCategoriesExpanded((expanded) => !expanded)}><span>{categories.length} seções</span><CaretDown size={17} aria-hidden="true" /></button></div>{categoriesExpanded ? (categories.length === 0 ? <p className={styles.muted}>Categorias indisponíveis.</p> : <ul id="compendium-category-grid">{categories.map((category) => { const isSelected = filters.category === category.id; return <li key={category.id}><button type="button" className={isSelected ? styles.activeCategory : undefined} aria-pressed={isSelected} disabled={category.status === "pending" && !onLoadCategory} onClick={() => category.status === "pending" ? onLoadCategory?.(category.id) : updateFilter({ category: isSelected ? undefined : category.id })}><span className={styles.categoryGlyph}>{categoryIcon(category.id)}</span><span className={styles.categoryLabel}><strong>{category.label}</strong>{category.status === "pending" ? <small className={styles.pendingHint}>Pendente</small> : <small className={styles.categoryHint}>{isSelected ? "Selecionada · toque para limpar" : "Explorar seção"}</small>}</span><span className={styles.categoryArrow} aria-hidden="true">›</span></button></li>; })}</ul>) : null}</section>
    {!hasActiveFilter && categoriesExpanded ? <section className={styles.instruction} aria-label="Como consultar"><BookOpen size={22} weight="duotone" aria-hidden="true" /><span>Escolha uma categoria ou busque por nome, categoria ou tag.</span></section> : hasActiveFilter ? <section className={styles.results} aria-labelledby="compendium-results-title"><div className={styles.resultsHeading}><div><p className={styles.eyebrow}>Correspondências locais</p><h2 id="compendium-results-title">Resultados</h2></div><span aria-live="polite">{entries.length} encontrado(s)</span></div>{entries.length === 0 ? <p className={styles.empty}><Books size={28} weight="duotone" aria-hidden="true" /><span>Nenhum resultado para estes filtros.</span></p> : <ul>{entries.map((entry) => <li key={entry.key}><button type="button" className={activeDetail?.key === entry.key ? styles.activeResult : undefined} aria-current={activeDetail?.key === entry.key ? "true" : undefined} aria-haspopup="dialog" onClick={() => { onSelect?.(entry); setSelectedEntry(entry as CompendiumDetail); setDetailOpen(true); }}><span><strong>{entry.title}</strong><small>{entry.category === "spell" ? "Magia" : entry.category}{entry.summary ? ` · ${entry.summary}` : ""}</small></span>{favoriteKeys.has(entry.key) ? <BookmarkSimple size={17} weight="fill" aria-label="Favorito" /> : null}</button></li>)}</ul>}</section> : null}
    {orphanFavorites.length > 0 ? <section className={styles.orphansPanel} aria-labelledby="orphan-favorites-title"><h2 id="orphan-favorites-title">Favoritos órfãos</h2><p className={styles.muted}>Alguns favoritos não existem no pack atual.</p><ul className={styles.orphans}>{orphanFavorites.map((favorite) => <li key={favorite.key}>{favorite.ref.kind === "static" ? favorite.ref.category : favorite.ref.entityType} · {favorite.ref.entityId}</li>)}</ul></section> : null}
    {activeDetail ? <AppModal open={detailOpen} title="Regra" titleClassName={styles.modalTitle} onClose={() => setDetailOpen(false)} closeClassName={styles.detailClose} headerActions={onToggleFavorite ? <IconButton className={styles.favoriteIcon} label={favoriteKeys.has(activeDetail.key) ? "Remover favorito" : "Favoritar"} icon={<BookmarkSimple size={19} weight={favoriteKeys.has(activeDetail.key) ? "fill" : "regular"} />} variant="ghost" aria-pressed={favoriteKeys.has(activeDetail.key)} onClick={() => onToggleFavorite(activeDetail)} /> : undefined} className={styles.detailModal}><CompendiumDetailPanel detail={activeDetail} /></AppModal> : null}
  </section>;
}

export const CompendiumPage = Compendium;
export const CompendiumBrowser = Compendium;
