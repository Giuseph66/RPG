/**
 * Camada física por cima do app: quando um `DiceRoll` novo chega, larga os
 * dados 3D correspondentes (mesmo tipo e quantidade) numa mesa com física
 * real — quicam, colidem entre si e assentam mostrando o resultado que o
 * motor de dados do domínio já decidiu (ver `orientationFor.ts`).
 *
 * Puramente decorativo: `DiceResult`/`LiveRegion` continuam sendo a fonte
 * acessível do resultado. Se o WebGL falhar ou os assets não carregarem, o
 * app segue funcionando normalmente sem esta camada.
 */

import { useEffect, useRef } from "react";

import type { DiceFaces } from "@domain/contracts/primitives";
import type { DiceRoll } from "@domain/contracts/dice";

import { DiceTable } from "./DiceTable";
import styles from "./PhysicalDiceStage.module.css";

export interface PhysicalDiceStageProps {
  /** Última rolagem do domínio. Uma nova `id` dispara um novo lançamento físico. */
  readonly roll?: DiceRoll;
  /** Monta/desmonta a mesa (a cena WebGL só existe enquanto `true`). */
  readonly active: boolean;
  /** Fonte de aleatoriedade só para o giro visual (yaw) — nunca decide o valor. */
  readonly random?: () => number;
}

const ID_POR_FACES: Record<DiceFaces, string> = {
  4: "d4",
  6: "d6",
  8: "d8",
  10: "d10",
  12: "d12",
  20: "d20",
  100: "d100",
};

/** Acima desse tanto, só os primeiros são tossados fisicamente (custo de física). */
const MAX_DADOS_FISICOS = 24;

export function PhysicalDiceStage({ roll, active, random }: PhysicalDiceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mesaRef = useRef<DiceTable | null>(null);
  const ultimaRolagem = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let mesa: DiceTable;
    try {
      mesa = new DiceTable({ canvas, background: null, random });
    } catch {
      // WebGL indisponível ou contexto perdido: a camada física é so
      // decorativa, o resto do app (DiceResult, histórico) segue intacto
      return undefined;
    }
    mesaRef.current = mesa;

    const aoRedimensionar = () => mesa.resize();
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      window.removeEventListener("resize", aoRedimensionar);
      mesa.dispose();
      mesaRef.current = null;
    };
  }, [active, random]);

  useEffect(() => {
    const mesa = mesaRef.current;
    if (!mesa || !roll || roll.id === ultimaRolagem.current) return;
    ultimaRolagem.current = roll.id;

    const id = ID_POR_FACES[roll.expression.faces];
    const valores = roll.rawDice.slice(0, MAX_DADOS_FISICOS);
    if (!id || valores.length === 0) return;

    let cancelado = false;
    void (async () => {
      mesa.clear();
      try {
        for (let i = 0; i < valores.length; i += 1) {
          if (cancelado) return;
          await mesa.add(id);
        }
      } catch {
        return; // asset nao carregou: fica so o resultado textual mesmo
      }
      if (cancelado) return;
      await mesa.roll(undefined, { results: valores });
    })();

    return () => {
      cancelado = true;
    };
  }, [roll]);

  if (!active) return null;
  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
