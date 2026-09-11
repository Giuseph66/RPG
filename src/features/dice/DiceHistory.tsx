import type { DiceRoll } from "@domain/contracts/dice";
import { formatDiceFormula } from "@domain/dice";
import { Button } from "@components/ui";
import styles from "./dice.module.css";

export interface DiceHistoryProps {
  readonly entries: readonly DiceRoll[];
  readonly onReroll: (roll: DiceRoll) => void;
}

export function DiceHistory({ entries, onReroll }: DiceHistoryProps) {
  return (
    <section aria-labelledby="dice-history-title" className={styles.history}>
      <h3 id="dice-history-title">Histórico</h3>
      {entries.length === 0 ? <p className={styles.muted}>Nenhuma rolagem salva ainda.</p> : (
        <ol>
          {entries.slice(0, 20).map((entry) => (
            <li key={entry.id}>
              <span><strong>{formatDiceFormula(entry.expression)}</strong><small>{entry.rawDice.join(" · ")} → {entry.total}</small></span>
              <Button variant="ghost" size="sm" onClick={() => onReroll(entry)}>Rolar novamente</Button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
