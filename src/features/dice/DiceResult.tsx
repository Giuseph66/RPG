import type { DiceRoll } from "@domain/contracts/dice";
import { formatDiceFormula } from "@domain/dice";
import styles from "./dice.module.css";

export interface DiceResultProps { readonly roll?: DiceRoll; }

/**
 * Selo puramente visual do d20 solo: 20 natural vira "Sucesso crítico",
 * 1 natural vira "Falha crítica". Não é regra — quem decide crítico em
 * ataque é `domain/rules/combat`; aqui é só leitura do dado que ficou em pé.
 */
function criticalTag(roll: DiceRoll): { readonly label: string; readonly tone: "success" | "failure" } | undefined {
  if (roll.expression.faces !== 20) return undefined;
  const kept = roll.selectedIndexes.map((index) => roll.rawDice[index]).filter((value) => value !== undefined);
  if (kept.length !== 1) return undefined;
  if (kept[0] === 20) return { label: "Sucesso crítico!", tone: "success" };
  if (kept[0] === 1) return { label: "Falha crítica!", tone: "failure" };
  return undefined;
}

export function DiceResult({ roll }: DiceResultProps) {
  if (!roll) {
    return (
      <section className={styles.result} aria-labelledby="dice-result-title">
        <h3 id="dice-result-title" className={styles.resultFormula}>Pronto para rolar</h3>
        <p className={styles.muted}>O resultado aparecerá aqui.</p>
      </section>
    );
  }

  const critical = criticalTag(roll);
  const showsModifier = roll.modifier !== 0;

  return (
    <section aria-labelledby="dice-result-title" className={styles.result}>
      <h3 id="dice-result-title" className={styles.resultFormula}>{formatDiceFormula(roll.expression)}</h3>
      <p className={styles.resultTotal}>{roll.total}</p>
      {critical ? <p className={critical.tone === "success" ? styles.critSuccess : styles.critFailure}>{critical.label}</p> : null}
      <div className={styles.diceFaces} aria-label={`Dados individuais: ${roll.rawDice.join(", ")}`}>
        {roll.rawDice.map((face, index) => {
          const discarded = roll.discardedIndexes.includes(index);
          return <span key={`${roll.id}-${index}`} className={discarded ? styles.discarded : styles.face} aria-label={`Dado ${index + 1}: ${face}${discarded ? ", descartado" : ", selecionado"}`}>{face}</span>;
        })}
        {showsModifier ? <span className={styles.modifierChip}>{roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}</span> : null}
      </div>
      {showsModifier ? <p className={styles.muted}>Subtotal {roll.subtotal} · modificador {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}</p> : null}
    </section>
  );
}
