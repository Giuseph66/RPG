import { useMemo, useState } from "react";
import { isBeastDefinition, type CreatureStatBlock } from "@domain/creatures";
import type { BeastSightingState } from "@domain/contracts/character";
import type { AppError, Result } from "@domain/contracts/errors";
import { AppModal, Button, InlineStatus, Input } from "@components/ui";
import { StatBlock } from "@components/creatures/StatBlock";
import styles from "./creature-catalog.module.css";

type Filter = "all" | "beasts" | "seen";
type CreatureTypeFilter = "all" | CreatureStatBlock["creatureType"];
type CreatureSizeFilter = "all" | CreatureStatBlock["size"];
const TYPE_LABELS: Readonly<Record<string, string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };
const SIZE_LABELS = { tiny: "Miúda", small: "Pequena", medium: "Média", large: "Grande", huge: "Enorme", gargantuan: "Imensa" } as const;

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function challengeLabel(creature: CreatureStatBlock): string {
  const challenge = creature.challengeRating;
  if (!challenge) return "ND —";
  return `ND ${challenge.denominator === 1 ? challenge.numerator : `${challenge.numerator}/${challenge.denominator}`}`;
}

function matchesRange(value: number, minimum: string, maximum: string): boolean {
  return (minimum === "" || value >= Number(minimum)) && (maximum === "" || value <= Number(maximum));
}

export interface CreatureCatalogProps {
  readonly creatures: readonly CreatureStatBlock[];
  readonly beastsOnly?: boolean;
  readonly showSightings?: boolean;
  readonly sightings?: readonly BeastSightingState[];
  readonly characterName?: string;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onMarkSeen?: (creature: CreatureStatBlock) => Promise<Result<unknown, AppError>>;
}

/** Catálogo pessoal: consultar é livre, registrar avistamento é sempre uma ação deliberada. */
export function CreatureCatalog({ creatures, sightings = [], characterName, loading, error, onMarkSeen, beastsOnly = false, showSightings = true }: CreatureCatalogProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [type, setType] = useState<CreatureTypeFilter>("all");
  const [size, setSize] = useState<CreatureSizeFilter>("all");
  const [minHitPoints, setMinHitPoints] = useState("");
  const [maxHitPoints, setMaxHitPoints] = useState("");
  const [minArmorClass, setMinArmorClass] = useState("");
  const [maxArmorClass, setMaxArmorClass] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ readonly tone: "success" | "error"; readonly text: string }>();
  const seen = useMemo(() => new Set(sightings.map((sighting) => String(sighting.beastRef.entityId))), [sightings]);
  const catalogCreatures = useMemo(() => beastsOnly ? creatures.filter((creature) => creature.creatureType === "beast") : creatures, [beastsOnly, creatures]);
  const visible = useMemo(() => catalogCreatures.filter((creature) => {
    if (!beastsOnly && filter === "beasts" && creature.creatureType !== "beast") return false;
    if (filter === "seen" && !seen.has(String(creature.id))) return false;
    if (type !== "all" && creature.creatureType !== type) return false;
    if (size !== "all" && creature.size !== size) return false;
    if (!matchesRange(creature.hitPoints.average, minHitPoints, maxHitPoints) || !matchesRange(creature.armorClass, minArmorClass, maxArmorClass)) return false;
    const normalized = normalizeSearch(query.trim());
    return !normalized || normalizeSearch(`${creature.name} ${TYPE_LABELS[creature.creatureType] ?? creature.creatureType} ${SIZE_LABELS[creature.size]} ${(creature.tags ?? []).join(" ")} ${JSON.stringify(creature)}`).includes(normalized);
  }), [beastsOnly, catalogCreatures, filter, maxArmorClass, maxHitPoints, minArmorClass, minHitPoints, query, seen, size, type]);
  const selected = catalogCreatures.find((creature) => String(creature.id) === selectedId);
  const selectedSeen = selected ? seen.has(String(selected.id)) : false;
  const selectedIsBeast = selected ? isBeastDefinition(selected) : false;
  const clearFilters = () => { setQuery(""); setFilter("all"); setType("all"); setSize("all"); setMinHitPoints(""); setMaxHitPoints(""); setMinArmorClass(""); setMaxArmorClass(""); };
  const markSeen = async () => {
    if (!selected || !onMarkSeen || busy || selectedSeen) return;
    setBusy(true); setMessage(undefined);
    const result = await onMarkSeen(selected);
    setBusy(false);
    setMessage(result.ok ? { tone: "success", text: `${selected.name} registrada como vista por ${characterName ?? "este personagem"}.` } : { tone: "error", text: result.error.message });
  };

  return <section className={styles.catalog} aria-labelledby="creature-catalog-title">
    <header className={styles.heading}><div><p className={styles.eyebrow}>Compêndio · Criaturas</p><h2 id="creature-catalog-title">{beastsOnly ? "Catálogo de bestas" : "Catálogo de criaturas"}</h2><p>{showSightings ? "Consulte os blocos completos. Uma criatura só fica marcada como vista quando você escolhe registrá-la." : "Consulte os blocos completos disponíveis para esta mesa."}</p></div><span className={styles.count}>{catalogCreatures.length} no catálogo{showSightings ? ` · ${seen.size} vistas` : ""}</span></header>
    {showSightings && !characterName ? <InlineStatus tone="info">Selecione uma ficha para salvar avistamentos pessoais.</InlineStatus> : null}
    {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
    {message ? <InlineStatus tone={message.tone} assertive={message.tone === "error"}>{message.text}</InlineStatus> : null}
    <div className={styles.controls}>
      <Input className={styles.search} label="Buscar criatura" placeholder="Nome, tipo, habilidade ou marcador" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      {!beastsOnly ? <label className={styles.filter}><span>Tipo de criatura</span><select aria-label="Tipo de criatura" value={type} onChange={(event) => setType(event.currentTarget.value as CreatureTypeFilter)}><option value="all">Todos os tipos</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      <label className={styles.filter}><span>Tamanho</span><select aria-label="Tamanho" value={size} onChange={(event) => setSize(event.currentTarget.value as CreatureSizeFilter)}><option value="all">Todos os tamanhos</option>{Object.entries(SIZE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Input type="number" min={0} step={1} label="PV mínimo" value={minHitPoints} onChange={(event) => setMinHitPoints(event.currentTarget.value)} />
      <Input type="number" min={0} step={1} label="PV máximo" value={maxHitPoints} onChange={(event) => setMaxHitPoints(event.currentTarget.value)} />
      <Input type="number" min={0} step={1} label="CA mínima" value={minArmorClass} onChange={(event) => setMinArmorClass(event.currentTarget.value)} />
      <Input type="number" min={0} step={1} label="CA máxima" value={maxArmorClass} onChange={(event) => setMaxArmorClass(event.currentTarget.value)} />
      {showSightings ? <label className={styles.filter}><span>Mostrar</span><select aria-label="Mostrar criaturas" value={filter} onChange={(event) => setFilter(event.currentTarget.value as Filter)}><option value="all">{beastsOnly ? "Todas as bestas" : "Todas"}</option>{!beastsOnly ? <option value="beasts">Bestas</option> : null}<option value="seen">Já vistas</option></select></label> : null}
      <Button className={styles.clearFilters} type="button" size="sm" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
    </div>
    {loading && catalogCreatures.length === 0 ? <p className={styles.empty} role="status">Carregando catálogo…</p> : visible.length === 0
      ? <div className={styles.empty}><strong>{catalogCreatures.length === 0 ? (beastsOnly ? "Nenhuma besta disponível" : "Nenhuma criatura disponível") : "Nenhuma correspondência"}</strong><span>{catalogCreatures.length === 0 ? "As fontes opcionais aparecem depois que o mestre as habilitar." : "Ajuste a busca ou o filtro."}</span></div>
      : <ul className={styles.grid}>{visible.map((creature) => <li key={String(creature.id)}><button type="button" className={styles.card} aria-haspopup="dialog" onClick={() => { setSelectedId(String(creature.id)); setMessage(undefined); }}>
        <span className={styles.cardMeta}><span>{TYPE_LABELS[creature.creatureType] ?? creature.creatureType}</span><span>{SIZE_LABELS[creature.size]}</span>{creature.isSwarm || (creature.tags ?? []).includes("swarm") ? <span>Enxame</span> : null}</span>
        <strong>{creature.name}</strong><span className={styles.cardStats}>{challengeLabel(creature)} · CA {creature.armorClass} · PV {creature.hitPoints.average}</span>
        {showSightings ? seen.has(String(creature.id)) ? <span className={styles.seen}>Vista por {characterName ?? "esta ficha"}</span> : <span className={styles.notSeen}>Ainda não registrada como vista</span> : null}
      </button></li>)}</ul>}
    <AppModal open={selected !== undefined} title={selected?.name ?? "Criatura"} onClose={() => { if (!busy) setSelectedId(undefined); }} className={styles.dialog}>
      {selected ? <div className={styles.detail}><StatBlock creature={selected} />
        {showSightings ? <div className={styles.actions}>{selectedIsBeast ? <Button type="button" variant={selectedSeen ? "secondary" : "primary"} disabled={!onMarkSeen || selectedSeen || busy} busy={busy} onClick={() => void markSeen()}>{selectedSeen ? "Já marcada como vista" : "Marcar como vista"}</Button> : <p>Somente bestas podem ser registradas para Forma Selvagem.</p>}</div> : null}
      </div> : null}
    </AppModal>
  </section>;
}
