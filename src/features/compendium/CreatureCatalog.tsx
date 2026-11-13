import { useMemo, useState } from "react";
import { isBeastDefinition, type CreatureStatBlock } from "@domain/creatures";
import type { BeastSightingState } from "@domain/contracts/character";
import type { AppError, Result } from "@domain/contracts/errors";
import { AppModal, Button, InlineStatus, Input } from "@components/ui";
import { StatBlock } from "@components/creatures/StatBlock";
import styles from "./creature-catalog.module.css";

type Filter = "all" | "beasts" | "seen";
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

export interface CreatureCatalogProps {
  readonly creatures: readonly CreatureStatBlock[];
  readonly sightings?: readonly BeastSightingState[];
  readonly characterName?: string;
  readonly loading?: boolean;
  readonly error?: string;
  readonly onMarkSeen?: (creature: CreatureStatBlock) => Promise<Result<unknown, AppError>>;
}

/** Catálogo pessoal: consultar é livre, registrar avistamento é sempre uma ação deliberada. */
export function CreatureCatalog({ creatures, sightings = [], characterName, loading, error, onMarkSeen }: CreatureCatalogProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ readonly tone: "success" | "error"; readonly text: string }>();
  const seen = useMemo(() => new Set(sightings.map((sighting) => String(sighting.beastRef.entityId))), [sightings]);
  const visible = useMemo(() => creatures.filter((creature) => {
    if (filter === "beasts" && !isBeastDefinition(creature)) return false;
    if (filter === "seen" && !seen.has(String(creature.id))) return false;
    const normalized = normalizeSearch(query.trim());
    return !normalized || normalizeSearch(`${creature.name} ${(creature.tags ?? []).join(" ")} ${TYPE_LABELS[creature.creatureType] ?? creature.creatureType}`).includes(normalized);
  }), [creatures, filter, query, seen]);
  const selected = creatures.find((creature) => String(creature.id) === selectedId);
  const selectedSeen = selected ? seen.has(String(selected.id)) : false;
  const selectedIsBeast = selected ? isBeastDefinition(selected) : false;
  const markSeen = async () => {
    if (!selected || !onMarkSeen || busy || selectedSeen) return;
    setBusy(true); setMessage(undefined);
    const result = await onMarkSeen(selected);
    setBusy(false);
    setMessage(result.ok ? { tone: "success", text: `${selected.name} registrada como vista por ${characterName ?? "este personagem"}.` } : { tone: "error", text: result.error.message });
  };

  return <section className={styles.catalog} aria-labelledby="creature-catalog-title">
    <header className={styles.heading}><div><p className={styles.eyebrow}>Compêndio · Criaturas</p><h2 id="creature-catalog-title">Catálogo de criaturas</h2><p>Consulte os blocos completos. Uma criatura só fica marcada como vista quando você escolhe registrá-la.</p></div><span className={styles.count}>{creatures.length} no catálogo · {seen.size} vistas</span></header>
    {!characterName ? <InlineStatus tone="info">Selecione uma ficha para salvar avistamentos pessoais.</InlineStatus> : null}
    {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
    {message ? <InlineStatus tone={message.tone} assertive={message.tone === "error"}>{message.text}</InlineStatus> : null}
    <div className={styles.controls}>
      <Input label="Buscar criatura" placeholder="Nome, tipo ou marcador" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      <label className={styles.filter}><span>Mostrar</span><select value={filter} onChange={(event) => setFilter(event.currentTarget.value as Filter)}><option value="all">Todas</option><option value="beasts">Bestas</option><option value="seen">Já vistas</option></select></label>
    </div>
    {loading && creatures.length === 0 ? <p className={styles.empty} role="status">Carregando catálogo…</p> : visible.length === 0
      ? <div className={styles.empty}><strong>{creatures.length === 0 ? "Nenhuma criatura disponível" : "Nenhuma correspondência"}</strong><span>{creatures.length === 0 ? "As fontes opcionais aparecem depois que o mestre as habilitar." : "Ajuste a busca ou o filtro."}</span></div>
      : <ul className={styles.grid}>{visible.map((creature) => <li key={String(creature.id)}><button type="button" className={styles.card} aria-haspopup="dialog" onClick={() => { setSelectedId(String(creature.id)); setMessage(undefined); }}>
        <span className={styles.cardMeta}><span>{TYPE_LABELS[creature.creatureType] ?? creature.creatureType}</span><span>{SIZE_LABELS[creature.size]}</span>{creature.isSwarm || (creature.tags ?? []).includes("swarm") ? <span>Enxame</span> : null}</span>
        <strong>{creature.name}</strong><span className={styles.cardStats}>{challengeLabel(creature)} · CA {creature.armorClass} · PV {creature.hitPoints.average}</span>
        {seen.has(String(creature.id)) ? <span className={styles.seen}>Vista por {characterName ?? "esta ficha"}</span> : <span className={styles.notSeen}>Ainda não registrada como vista</span>}
      </button></li>)}</ul>}
    <AppModal open={selected !== undefined} title={selected?.name ?? "Criatura"} onClose={() => { if (!busy) setSelectedId(undefined); }} className={styles.dialog}>
      {selected ? <div className={styles.detail}><StatBlock creature={selected} />
        <div className={styles.actions}>{selectedIsBeast ? <Button type="button" variant={selectedSeen ? "secondary" : "primary"} disabled={!onMarkSeen || selectedSeen || busy} busy={busy} onClick={() => void markSeen()}>{selectedSeen ? "Já marcada como vista" : "Marcar como vista"}</Button> : <p>Somente bestas podem ser registradas para Forma Selvagem.</p>}</div>
      </div> : null}
    </AppModal>
  </section>;
}
