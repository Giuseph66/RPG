import { useMemo, useState, type ReactNode } from "react";
import { GiDiceTwentyFacesTwenty, GiHearts, GiPoisonBottle, GiRun, GiScrollUnfurled, GiUpgrade } from "react-icons/gi";

import type { CampaignLogEntry, CampaignLogKind } from "@domain/contracts/campaign-log";
import { InlineStatus } from "@components/ui";
import styles from "./campaign-log.module.css";

export interface CampaignLogProps {
  readonly entries: readonly CampaignLogEntry[];
  readonly status: "loading" | "ready" | "error";
  readonly errorMessage?: string;
  /** Ficha em destaque (ex.: a do jogador) na ordem de iniciativa. */
  readonly focusCharacterId?: string;
}

const KIND_ICONS: Readonly<Record<CampaignLogKind, ReactNode>> = {
  roll: <GiDiceTwentyFacesTwenty aria-hidden="true" />,
  "hit-points": <GiHearts aria-hidden="true" />,
  conditions: <GiPoisonBottle aria-hidden="true" />,
  adjustments: <GiUpgrade aria-hidden="true" />,
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === new Date().toDateString() ? time : `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`;
}

/** Última iniciativa de cada personagem, da maior para a menor (empate: quem rolou antes). */
export function initiativeOrder(entries: readonly CampaignLogEntry[]): readonly CampaignLogEntry[] {
  const latest = new Map<string, CampaignLogEntry>();
  for (const entry of entries) {
    if (entry.kind !== "roll" || entry.rollPurpose !== "initiative" || entry.rollTotal === undefined) continue;
    const current = latest.get(entry.characterId);
    if (!current || entry.createdAt > current.createdAt) latest.set(entry.characterId, entry);
  }
  return [...latest.values()].sort((left, right) => (right.rollTotal ?? 0) - (left.rollTotal ?? 0) || left.createdAt.localeCompare(right.createdAt));
}

export function CampaignLog({ entries, status, errorMessage, focusCharacterId }: CampaignLogProps) {
  const [filter, setFilter] = useState<string>("all");
  const characters = useMemo(() => {
    const names = new Map<string, string>();
    for (const entry of entries) if (!names.has(entry.characterId)) names.set(entry.characterId, entry.characterName);
    return [...names.entries()].sort((left, right) => left[1].localeCompare(right[1], "pt-BR"));
  }, [entries]);
  const initiative = useMemo(() => initiativeOrder(entries), [entries]);
  const visible = filter === "all" ? entries : entries.filter((entry) => entry.characterId === filter);

  return (
    <section className={styles.panel} aria-labelledby="campaign-log-title">
      <span className={styles.cornerTl} aria-hidden="true" /><span className={styles.cornerTr} aria-hidden="true" /><span className={styles.cornerBl} aria-hidden="true" /><span className={styles.cornerBr} aria-hidden="true" />
      <div className={styles.header}>
        <h2 id="campaign-log-title" className={styles.title}>Histórico da mesa</h2>
        <span className={styles.tagline}><span className={styles.live} aria-hidden="true" /> Ao vivo</span>
      </div>
      <span className={styles.rule} aria-hidden="true" />

      {initiative.length ? (
        <div className={styles.initiative} aria-label="Ordem de iniciativa">
          <span className={styles.initiativeLabel}><GiRun aria-hidden="true" /> Iniciativa</span>
          <ol>
            {initiative.map((entry) => <li key={entry.characterId} data-focus={entry.characterId === focusCharacterId || undefined}><strong>{entry.rollTotal}</strong> {entry.characterName}</li>)}
          </ol>
        </div>
      ) : null}

      {characters.length > 1 ? (
        <div className={styles.filters} role="group" aria-label="Filtrar por personagem">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
          {characters.map(([id, name]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{name}</button>)}
        </div>
      ) : null}

      {status === "error" ? <InlineStatus tone="error">{errorMessage ?? "Não foi possível abrir o histórico da mesa."}</InlineStatus> : null}
      {status === "loading" ? <p className={styles.muted}>Abrindo o histórico…</p> : null}
      {status === "ready" && visible.length === 0 ? (
        <div className={styles.empty}><GiScrollUnfurled aria-hidden="true" /><p>Nada registrado ainda. Rolagens e mudanças de PV e condições das fichas da campanha aparecem aqui na hora.</p></div>
      ) : null}
      {visible.length ? (
        <ol className={styles.list} aria-live="polite">
          {visible.map((entry) => (
            <li key={entry.id} className={styles.entry} data-kind={entry.kind}>
              <span className={styles.icon}>{KIND_ICONS[entry.kind]}</span>
              <span className={styles.body}>
                <span className={styles.line}>
                  <strong>{entry.characterName}</strong>
                  {entry.byMaster ? <span className={styles.badge}>pelo mestre</span> : null}
                  <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
                </span>
                <span className={styles.summary}>{entry.summary}</span>
                {entry.detail ? <small className={styles.detail}>{entry.detail}</small> : null}
              </span>
              {entry.kind === "roll" && entry.rollTotal !== undefined ? <span className={styles.total} aria-hidden="true">{entry.rollTotal}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
