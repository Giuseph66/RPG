import type { ReactNode } from "react";

import type { DicePurpose, DiceRoll } from "@domain/contracts/dice";
import type { DiceFaces } from "@domain/contracts/primitives";
import { formatDiceFormula } from "@domain/dice";
import { ArrowsClockwise, GiD4, GiD10, GiD12, GiDiceEightFacesEight, GiDiceSixFacesSix, GiDiceTwentyFacesTwenty } from "../../assets/icons";
import styles from "./dice.module.css";

export interface DiceHistoryProps {
  readonly entries: readonly DiceRoll[];
  readonly onReroll: (roll: DiceRoll) => void;
}

const GLYPHS: Partial<Record<DiceFaces, ReactNode>> = {
  4: <GiD4 />,
  6: <GiDiceSixFacesSix />,
  8: <GiDiceEightFacesEight />,
  10: <GiD10 />,
  12: <GiD12 />,
  20: <GiDiceTwentyFacesTwenty />,
  100: <GiD10 />,
};

const PURPOSE_LABELS: Readonly<Record<DicePurpose, string>> = {
  free: "Livre",
  attack: "Ataque",
  damage: "Dano",
  healing: "Cura",
  "saving-throw": "Resistência",
  "skill-check": "Perícia",
  initiative: "Iniciativa",
  "death-save": "Contra a morte",
  "ability-score-generation": "Atributos",
};

const MODE_LABELS = { advantage: "Vantagem", disadvantage: "Desvantagem" } as const;

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? time : `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${time}`;
}

/** Destaque de 20/1 natural só vale para um d20 que contou no resultado. */
function dieTone(entry: DiceRoll, value: number, index: number): string {
  if (entry.discardedIndexes.includes(index)) return styles.historyDieDiscarded ?? "";
  if (entry.expression.faces !== 20) return "";
  if (value === 20) return styles.historyDieCrit ?? "";
  if (value === 1) return styles.historyDieFumble ?? "";
  return "";
}

export function DiceHistory({ entries, onReroll }: DiceHistoryProps) {
  return (
    <section aria-labelledby="dice-history-title" className={styles.history}>
      <h3 id="dice-history-title" className={styles.visuallyHidden}>Histórico</h3>
      {entries.length === 0 ? <p className={styles.historyEmpty}>Nenhuma rolagem salva ainda.</p> : (
        <ol className={styles.historyList}>
          {entries.slice(0, 20).map((entry) => {
            const formula = formatDiceFormula(entry.expression);
            const mode = entry.expression.mode === "normal" ? undefined : MODE_LABELS[entry.expression.mode];
            const modifier = entry.modifier === 0 ? undefined : `${entry.modifier > 0 ? "+" : "−"}${Math.abs(entry.modifier)}`;
            return (
              <li key={entry.id} className={styles.historyItem}>
                <span className={styles.historyGlyph} aria-hidden="true">{GLYPHS[entry.expression.faces] ?? <GiDiceTwentyFacesTwenty />}</span>
                <span className={styles.historyBody}>
                  <span className={styles.historyHead}>
                    <strong className={styles.historyFormula}>{formula}</strong>
                    {mode ? <span className={styles.historyTag}>{mode}</span> : null}
                    {entry.purpose !== "free" ? <span className={styles.historyTag}>{PURPOSE_LABELS[entry.purpose]}</span> : null}
                  </span>
                  <span className={styles.historyDice} aria-label={`Dados: ${entry.rawDice.join(", ")}${modifier ? `, modificador ${modifier}` : ""}`}>
                    {entry.rawDice.map((value, index) => <span key={index} className={[styles.historyDie, dieTone(entry, value, index)].join(" ")}>{value}</span>)}
                    {modifier ? <span className={styles.historyModifier}>{modifier}</span> : null}
                    <time className={styles.historyTime} dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
                  </span>
                </span>
                <span className={styles.historyTotal} aria-label={`Total ${entry.total}`}>{entry.total}</span>
                <button type="button" className={styles.historyReroll} aria-label={`Rolar novamente ${formula}`} title="Rolar novamente" onClick={() => onReroll(entry)}>
                  <ArrowsClockwise aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
