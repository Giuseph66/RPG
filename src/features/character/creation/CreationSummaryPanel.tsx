import type { ReactNode } from "react";

import type { CreationSummary, SummaryLine, SummarySource, SummaryStep } from "@domain/character/creation";

import { ABILITY_LABELS, formatWeight } from "./mapping";
import styles from "./creation-summary.module.css";

const KIND_LABELS: Readonly<Record<SummarySource["kind"], string>> = { race: "Raça", subrace: "Sub-raça", class: "Classe", subclass: "Subclasse", background: "Antecedente", choice: "Escolha" };
const STEP_LABELS: Readonly<Record<SummaryStep, string>> = { race: "Raça", class: "Classe", background: "Antecedente", "ability-scores": "Atributos", equipment: "Equipamento", spells: "Magias" };

function Sources({ sources }: { readonly sources: readonly SummarySource[] }) {
  const unique = [...new Map(sources.map((entry) => [`${entry.kind}:${entry.name}:${entry.via ?? ""}`, entry])).values()];
  return <span className={styles.sources}>{unique.map((entry, index) => <span key={index} className={[styles.tag, styles[`tag_${entry.kind}`]].join(" ")}>{KIND_LABELS[entry.kind]} · {entry.name}{entry.via ? ` (${entry.via})` : ""}</span>)}</span>;
}

function Section({ title, count, children }: { readonly title: string; readonly count?: number; readonly children: ReactNode }) {
  return <details className={styles.section} open><summary>{title}{count !== undefined ? <span className={styles.count}>{count}</span> : null}</summary>{children}</details>;
}

function Lines({ lines, extra, empty }: { readonly lines: readonly SummaryLine[]; readonly extra?: (line: SummaryLine) => string | undefined; readonly empty: string }) {
  if (lines.length === 0) return <p className={styles.empty}>{empty}</p>;
  return <ul className={styles.list}>{lines.map((line) => <li key={line.id}><span className={styles.name}>{line.name}{line.expertise ? <small> especialização</small> : null}{extra?.(line) ? <small> · {extra(line)}</small> : null}</span><Sources sources={line.sources} /></li>)}</ul>;
}

/** Tudo que já foi definido na criação, com a origem de cada item e os conflitos entre fontes. */
export function CreationSummaryPanel({ summary, showConflicts = true, onFix }: { readonly summary: CreationSummary; readonly showConflicts?: boolean; readonly onFix: (step: SummaryStep) => void }) {
  const warnings = summary.conflicts.filter((entry) => entry.severity === "warning");
  return (
    <section className={styles.panel} aria-label="O que você já definiu">
      <h2 className={styles.title}>O que você já definiu</h2>
      {showConflicts && summary.conflicts.length > 0 ? (
        <div className={styles.conflicts} role="status">
          <strong>{warnings.length > 0 ? `${warnings.length} ${warnings.length === 1 ? "conflito" : "conflitos"} para revisar` : "Avisos"}</strong>
          <ul>{summary.conflicts.map((entry) => <li key={entry.id} className={entry.severity === "warning" ? styles.warning : undefined}><span>{entry.message}</span><button type="button" onClick={() => onFix(entry.step)}>Ir para {STEP_LABELS[entry.step]}</button></li>)}</ul>
        </div>
      ) : null}
      <div className={styles.grid}>
        <Section title="Atributos">
          <ul className={styles.abilities}>
            {summary.abilities.map((entry) => (
              <li key={entry.ability}>
                <strong>{ABILITY_LABELS[entry.ability]}</strong>
                <span className={styles.final}>{entry.final} <small>({entry.modifier >= 0 ? "+" : "−"}{Math.abs(entry.modifier)})</small></span>
                <small className={styles.breakdown}>{entry.isDefault ? "padrão 10" : `base ${entry.base}`}{entry.parts.map((part) => ` · ${part.label} ${part.amount >= 0 ? "+" : "−"}${Math.abs(part.amount)}`).join("")}</small>
              </li>
            ))}
          </ul>
          {summary.hitPoints ? <p className={styles.note}>PV no 1º nível: d{summary.hitPoints.die} máximo {summary.hitPoints.conModifier >= 0 ? "+" : "−"} {Math.abs(summary.hitPoints.conModifier)} (CON) = <strong>{summary.hitPoints.total}</strong></p> : null}
        </Section>
        <Section title="Perícias" count={summary.skills.length}><Lines lines={summary.skills} empty="Nenhuma perícia ainda." /></Section>
        <Section title="Proficiências e idiomas" count={summary.proficiencies.length + summary.languages.length}>
          <Lines lines={summary.proficiencies} empty="Nenhuma proficiência ainda." />
          <Lines lines={summary.languages} empty="Nenhum idioma ainda." />
        </Section>
        <Section title="Equipamento" count={summary.equipment.length}>
          <Lines lines={summary.equipment} empty="Nenhum equipamento ainda." extra={(line) => `${line.quantity ?? 1}× · ${formatWeight((line.weightGrams ?? 0) * (line.quantity ?? 1))}`} />
          {summary.equipment.length ? <p className={styles.note}>Peso total: <strong>{formatWeight(summary.weightGrams)}</strong></p> : null}
        </Section>
        <Section title="Magias" count={summary.spells.length}><Lines lines={summary.spells} empty="Nenhuma magia escolhida." extra={(line) => (line.level === 0 ? "truque" : `${line.level}º círculo`)} /></Section>
        <Section title="Características" count={summary.features.length}><Lines lines={summary.features} empty="Escolha raça e classe para ver as características." /></Section>
      </div>
    </section>
  );
}
