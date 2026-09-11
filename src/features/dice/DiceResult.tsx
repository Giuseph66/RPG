import type { DiceRoll } from "@domain/contracts/dice";
import { formatDiceFormula } from "@domain/dice";
import styles from "./dice.module.css";

export interface DiceResultProps { readonly roll?: DiceRoll; }

export function DiceResult({ roll }: DiceResultProps) {
  if (!roll) return <p className={styles.muted}>O resultado aparecerá aqui.</p>;
  return (
    <section aria-labelledby="dice-result-title" className={styles.result}>
      <h3 id="dice-result-title">Resultado · {formatDiceFormula(roll.expression)}</h3>
      <div className={styles.diceFaces} aria-label={`Dados individuais: ${roll.rawDice.join(", ")}`}>
        {roll.rawDice.map((face, index) => {
          const discarded = roll.discardedIndexes.includes(index);
          return <span key={`${roll.id}-${index}`} className={discarded ? styles.discarded : styles.face} aria-label={`Dado ${index + 1}: ${face}${discarded ? ", descartado" : ", selecionado"}`}>{face}</span>;
        })}
      </div>
      <p className={styles.total}><span>Subtotal {roll.subtotal}</span><strong>Total {roll.total}</strong></p>
    </section>
  );
}
