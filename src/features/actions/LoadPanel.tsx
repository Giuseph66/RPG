/**
 * Carga e a variação "Sobrecarga" do Livro do Jogador (cap. 7, p.176 e p.178):
 * acima de 2,5 kg × FOR o deslocamento cai 3 m; acima de 5 kg × FOR cai 6 m e há
 * desvantagem em FOR/DES/CON; o máximo é 7,5 kg × FOR.
 */
import { GiWeight } from "react-icons/gi";

import type { ActionCarrying } from "./types";
import styles from "./actions.module.css";

export type LoadTier = "light" | "encumbered" | "heavy" | "over";

export function loadTier(carrying: ActionCarrying): LoadTier {
  const { totalGrams, capacityGrams, encumberedGrams, heavilyEncumberedGrams } = carrying;
  if (totalGrams > capacityGrams) return "over";
  if (heavilyEncumberedGrams !== undefined && totalGrams > heavilyEncumberedGrams) return "heavy";
  if (encumberedGrams !== undefined && totalGrams > encumberedGrams) return "encumbered";
  return "light";
}

/** Penalidade de deslocamento em centímetros; `over` limita a 1,5 m (empurrar/arrastar). */
export function loadSpeedPenaltyCm(tier: LoadTier): number {
  return tier === "heavy" ? 600 : tier === "encumbered" ? 300 : 0;
}

export function formatKg(grams: number): string {
  const kg = grams / 1000;
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: kg < 10 ? 1 : 0 })} kg`;
}

const TIER_LABEL: Record<LoadTier, string> = { light: "Carga leve", encumbered: "Sobrecarga", heavy: "Sobrecarga pesada", over: "Acima da capacidade" };

function effectsOf(tier: LoadTier, carrying: ActionCarrying): string {
  if (tier === "over") return `Não dá para carregar: só empurrar ou arrastar (até ${formatKg(carrying.capacityGrams * 2)}), com deslocamento de 1,5 m.`;
  if (tier === "heavy") return "Deslocamento −6 m e desvantagem em testes de habilidade, jogadas de ataque e testes de resistência de Força, Destreza e Constituição.";
  if (tier === "encumbered") return "Deslocamento −3 m.";
  return "Sem penalidades de peso.";
}

export function LoadPanel({ carrying, onOpenInventory }: { readonly carrying: ActionCarrying; readonly onOpenInventory?: () => void }) {
  const tier = loadTier(carrying);
  const { totalGrams, capacityGrams, encumberedGrams, heavilyEncumberedGrams, strengthScore } = carrying;
  const percent = (grams: number) => capacityGrams > 0 ? Math.min(100, (grams / capacityGrams) * 100) : 100;
  return <div className={styles.load} data-tier={tier}>
    <div className={styles.loadHead}>
      <span className={styles.loadIcon} aria-hidden="true"><GiWeight /></span>
      <span className={styles.loadCopy}><strong>{TIER_LABEL[tier]}</strong><small>{effectsOf(tier, carrying)}</small></span>
      <span className={styles.loadValue}><strong>{formatKg(totalGrams)}</strong><small>de {formatKg(capacityGrams)}</small></span>
    </div>
    <div className={styles.loadTrack} role="meter" aria-label="Peso carregado" aria-valuemin={0} aria-valuemax={capacityGrams} aria-valuenow={Math.min(totalGrams, capacityGrams)} aria-valuetext={`${formatKg(totalGrams)} de ${formatKg(capacityGrams)}: ${TIER_LABEL[tier]}`}>
      <span className={styles.loadFill} style={{ width: `${percent(totalGrams)}%` }} />
      {encumberedGrams !== undefined ? <span className={styles.loadMarker} style={{ left: `${percent(encumberedGrams)}%` }} /> : null}
      {heavilyEncumberedGrams !== undefined ? <span className={styles.loadMarker} style={{ left: `${percent(heavilyEncumberedGrams)}%` }} /> : null}
    </div>
    {encumberedGrams !== undefined && heavilyEncumberedGrams !== undefined ? <ol className={styles.loadScale} aria-label="Limites de carga">
      <li data-active={tier === "light"}><span>Leve</span><small>até {formatKg(encumberedGrams)}</small></li>
      <li data-active={tier === "encumbered"}><span>Sobrecarga</span><small>&gt; {formatKg(encumberedGrams)}</small></li>
      <li data-active={tier === "heavy"}><span>Pesada</span><small>&gt; {formatKg(heavilyEncumberedGrams)}</small></li>
      <li data-active={tier === "over"}><span>Máximo</span><small>{formatKg(capacityGrams)}</small></li>
    </ol> : null}
    <p className={styles.loadNote}>Força {strengthScore} · variação Sobrecarga, Livro do Jogador p. 178{onOpenInventory ? <> · <button type="button" className={styles.panelLink} onClick={onOpenInventory}>Abrir inventário</button></> : null}</p>
  </div>;
}
