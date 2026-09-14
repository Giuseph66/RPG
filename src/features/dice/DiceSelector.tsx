import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { GiD4, GiD10, GiD12, GiDiceEightFacesEight, GiDiceSixFacesSix, GiDiceTwentyFacesTwenty, Minus, Plus } from "../../assets/icons";
import type { DiceExpression, DiceMode } from "@domain/contracts/dice";
import { DICE_FACES, type DiceFaces } from "@domain/contracts/primitives";
import styles from "./dice.module.css";

/** Limites do domínio (`validateDiceExpression`), espelhados nos controles. */
export const QUANTIDADE_MINIMA = 1;
export const QUANTIDADE_MAXIMA = 100;
export const MODIFICADOR_MINIMO = -1000;
export const MODIFICADOR_MAXIMO = 1000;

/** Dados de uso diário; o resto do catálogo entra ao expandir. */
const FACES_RAPIDAS: readonly DiceFaces[] = [4, 6, 8, 20, 100];

/**
 * Fora do seletor: d1/d3/d5 têm o colisor mais pesado do catálogo (611–687
 * vértices, mais que o d100) e não são esféricos o bastante para o atalho de
 * esfera do `colliderShape.ts` — ficam presos a 1 exemplar na mesa física.
 * Continuam válidos no domínio (fórmula manual, ex. "2d3" no campo de texto);
 * só saem do catálogo de toque rápido.
 */
const FACES_OCULTAS: ReadonlySet<DiceFaces> = new Set([1, 3, 5]);

const GLIFOS: Partial<Record<DiceFaces, ReactNode>> = {
  4: <GiD4 aria-hidden="true" />,
  6: <GiDiceSixFacesSix aria-hidden="true" />,
  8: <GiDiceEightFacesEight aria-hidden="true" />,
  10: <GiD10 aria-hidden="true" />,
  12: <GiD12 aria-hidden="true" />,
  20: <GiDiceTwentyFacesTwenty aria-hidden="true" />,
  100: <GiD10 aria-hidden="true" />,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function formatarModificador(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

interface StepperProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly format?: (value: number) => string;
  readonly onChange: (value: number) => void;
}

/** Passo a passo simples: menos, valor, mais. */
function Stepper({ label, value, min, max, format, onChange }: StepperProps) {
  const texto = format ? format(value) : String(value);
  return (
    <div className={styles.stepper}>
      <span className={styles.stepperLabel} id={`stepper-${label}`}>{label}</span>
      <div className={styles.stepperRow} role="group" aria-labelledby={`stepper-${label}`}>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label={`Diminuir ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1, min, max))}
        >
          <Minus size={16} weight="bold" aria-hidden="true" />
        </button>
        <output className={styles.stepperValue} aria-live="polite">{texto}</output>
        <button
          type="button"
          className={styles.stepperButton}
          aria-label={`Aumentar ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1, min, max))}
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const MODOS: readonly { readonly value: DiceMode; readonly letra: string; readonly label: string }[] = [
  { value: "normal", letra: "N", label: "Normal" },
  { value: "advantage", letra: "V", label: "Vantagem" },
  { value: "disadvantage", letra: "D", label: "Desvantagem" },
];

/** Segurar antes de revelar o nome do modo (toque rápido só seleciona). */
const ATRASO_REVELACAO_MS = 380;

export interface DiceControlsProps {
  readonly expression: DiceExpression;
  readonly mode: DiceMode;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onModifierChange: (modifier: number) => void;
  readonly onModeChange: (mode: DiceMode) => void;
}

/**
 * Quantidade, modo e modificador — os três em controles diretos, sem
 * formulário, numa linha só, o modo no centro. Vantagem e desvantagem só
 * existem com um único dado (`validateDiceExpression`), então fora disso os
 * botões ficam desabilitados com o motivo à vista, em vez de deixar o usuário
 * errar e ler um erro depois.
 *
 * O modo mostra só a inicial (N/V/D) para não competir por espaço com o
 * dado — segurar o botão (ou passar o mouse) revela o nome completo; um
 * toque rápido apenas seleciona, sem esperar o rótulo aparecer.
 */
export function DiceControls({ expression, mode, onQuantityChange, onModifierChange, onModeChange }: DiceControlsProps) {
  const permiteModo = expression.quantity === 1;
  const [revelado, setRevelado] = useState<DiceMode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function segurar(valor: DiceMode) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevelado(valor), ATRASO_REVELACAO_MS);
  }

  function soltar() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setRevelado(null);
  }

  return (
    <div className={styles.controlBar}>
      <Stepper
        label="Dados"
        value={expression.quantity}
        min={QUANTIDADE_MINIMA}
        max={QUANTIDADE_MAXIMA}
        onChange={onQuantityChange}
      />
      <div className={styles.modeGroup}>
        <span className={styles.stepperLabel} id="dice-mode-label">Modo</span>
        <div className={styles.modeRow} role="group" aria-labelledby="dice-mode-label" aria-describedby={permiteModo ? undefined : "dice-mode-hint"}>
          {MODOS.map((opcao) => {
            const selecionado = opcao.value === mode;
            const bloqueado = opcao.value !== "normal" && !permiteModo;
            return (
              <button
                key={opcao.value}
                type="button"
                className={[styles.modeButton, selecionado ? styles.modeButtonActive : ""].filter(Boolean).join(" ")}
                aria-pressed={selecionado}
                aria-label={opcao.label}
                title={opcao.label}
                disabled={bloqueado}
                onClick={() => onModeChange(opcao.value)}
                onPointerDown={() => segurar(opcao.value)}
                onPointerUp={soltar}
                onPointerLeave={soltar}
                onPointerCancel={soltar}
              >
                {opcao.letra}
                {revelado === opcao.value ? <span className={styles.modeReveal} role="tooltip">{opcao.label}</span> : null}
              </button>
            );
          })}
        </div>
        {permiteModo ? null : <span className={styles.modeHint} id="dice-mode-hint">Só com 1 dado</span>}
      </div>
      <Stepper
        label="Modificador"
        value={expression.modifier}
        min={MODIFICADOR_MINIMO}
        max={MODIFICADOR_MAXIMO}
        format={formatarModificador}
        onChange={onModifierChange}
      />
    </div>
  );
}

export interface DiceQuickPickerProps {
  readonly faces: DiceFaces;
  readonly onFacesChange: (faces: DiceFaces) => void;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
}

/**
 * Tipo de dado em um toque. "Mais" abre o resto do catálogo na mesma grade —
 * `DICE_FACES` tem 20 entradas e mostrar todas de saída afogaria as cinco que
 * realmente se usam.
 */
export function DiceQuickPicker({ faces, onFacesChange, expanded, onToggleExpanded }: DiceQuickPickerProps) {
  const visiveis = (expanded ? DICE_FACES : DICE_FACES.filter((valor) => FACES_RAPIDAS.includes(valor) || valor === faces))
    .filter((valor) => !FACES_OCULTAS.has(valor) || valor === faces);

  return (
    <div className={styles.quickRow} role="group" aria-label="Tipo de dado">
      {visiveis.map((valor) => {
        const selecionado = valor === faces;
        return (
          <button
            key={valor}
            type="button"
            className={[styles.quickChip, selecionado ? styles.quickChipActive : ""].filter(Boolean).join(" ")}
            aria-pressed={selecionado}
            onClick={() => onFacesChange(valor)}
          >
            <span className={styles.quickGlyph}>{GLIFOS[valor] ?? <GiDiceTwentyFacesTwenty aria-hidden="true" />}</span>
            <span className={styles.quickLabel}>d{valor}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={[styles.quickChip, styles.quickChipMore].join(" ")}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        <span className={styles.quickGlyph} aria-hidden="true">{expanded ? "−" : "+"}</span>
        <span className={styles.quickLabel}>{expanded ? "menos" : "mais"}</span>
      </button>
    </div>
  );
}
