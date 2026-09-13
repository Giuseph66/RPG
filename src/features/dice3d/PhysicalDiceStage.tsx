/**
 * Camada física dos dados: quando um `DiceRoll` novo chega, larga os dados 3D
 * correspondentes (mesmo tipo e quantidade) numa mesa com física real —
 * quicam, colidem entre si e assentam mostrando o resultado que o motor de
 * dados do domínio já decidiu (ver `orientationFor.ts`).
 *
 * Dois enquadramentos:
 * - `overlay` (padrão): tela cheia por cima do app, translúcido.
 * - `inline`: preenche o elemento pai, para virar o palco de um modal. A
 *   câmera chega mais perto e a área jogável encolhe junto, porque as paredes
 *   saem do que a câmera enxerga (ver `limitesVisiveis`).
 *
 * Puramente decorativo: `DiceResult`/`LiveRegion` continuam sendo a fonte
 * acessível do resultado. Se o WebGL falhar ou os assets não carregarem, o
 * app segue funcionando normalmente sem esta camada.
 */

import { useEffect, useRef, useState } from "react";

import { dicePerformancePolicy } from "@domain/dice";
import type { DiceFaces } from "@domain/contracts/primitives";
import type { DiceRoll } from "@domain/contracts/dice";

import { APARENCIA_MESA, type DieAppearance } from "./appearance";
import { DiceTable } from "./DiceTable";
import styles from "./PhysicalDiceStage.module.css";

export interface PhysicalDiceStageProps {
  /** Última rolagem do domínio. Uma nova `id` dispara um novo lançamento físico. */
  readonly roll?: DiceRoll;
  /** Monta/desmonta a mesa (a cena WebGL só existe enquanto `true`). */
  readonly active: boolean;
  /** Fonte de aleatoriedade só para o giro visual (yaw) — nunca decide o valor. */
  readonly random?: () => number;
  /** `overlay` cobre a tela; `inline` preenche o elemento pai. Padrão `overlay`. */
  readonly variant?: "overlay" | "inline";
  /** Acabamento dos dados. Padrão: obsidiana e bronze da paleta do app. */
  readonly appearance?: DieAppearance;
}

const ID_POR_FACES: Record<DiceFaces, string> = {
  1: "d1",
  2: "d2",
  3: "d3",
  4: "d4",
  5: "d5",
  6: "d6",
  7: "d7",
  8: "d8",
  10: "d10",
  12: "d12",
  14: "d14",
  16: "d16",
  20: "d20",
  24: "d24",
  30: "d30",
  48: "d48",
  50: "d50",
  60: "d60",
  100: "d100",
  120: "d120",
};

export function PhysicalDiceStage({ roll, active, random, variant = "overlay", appearance = APARENCIA_MESA }: PhysicalDiceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mesaRef = useRef<DiceTable | null>(null);
  const ultimaRolagem = useRef<string | undefined>(undefined);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 680px)");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMobile(media?.matches ?? window.innerWidth <= 680);
      setReducedMotion(reduced?.matches ?? false);
    };
    update();
    media?.addEventListener?.("change", update);
    reduced?.addEventListener?.("change", update);
    return () => {
      media?.removeEventListener?.("change", update);
      reduced?.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    if (!active || reducedMotion) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let mesa: DiceTable;
    try {
      mesa = new DiceTable({
        canvas,
        background: null,
        random,
        mobile,
        // Palco pequeno: aproxima a câmera para o dado ocupar o quadro.
        cameraDistance: variant === "inline" ? 0.26 : 1,
        // Arena curta para o dado ocupar o quadro; só faz sentido com o
        // enquadramento fechado do palco embutido.
        minBounds: variant === "inline" ? 4.5 : undefined,
      });
    } catch {
      // WebGL indisponível ou contexto perdido: a camada física é so
      // decorativa, o resto do app (DiceResult, histórico) segue intacto
      return undefined;
    }
    mesaRef.current = mesa;

    const aoRedimensionar = () => mesa.resize();
    window.addEventListener("resize", aoRedimensionar);
    // Embutido, o canvas muda de tamanho sem a janela mudar (modal abrindo,
    // painel avançado expandindo), então o resize vem do próprio elemento.
    const observador = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(aoRedimensionar);
    observador?.observe(canvas);

    return () => {
      window.removeEventListener("resize", aoRedimensionar);
      observador?.disconnect();
      mesa.dispose();
      mesaRef.current = null;
    };
  }, [active, mobile, random, reducedMotion, variant]);

  useEffect(() => {
    const mesa = mesaRef.current;
    if (!mesa || !roll || reducedMotion || roll.id === ultimaRolagem.current) return;
    ultimaRolagem.current = roll.id;

    const id = ID_POR_FACES[roll.expression.faces];
    const policy = dicePerformancePolicy({
      faces: roll.expression.faces,
      quantity: roll.rawDice.length,
      mobile,
      reducedMotion,
    });
    const valores = roll.rawDice.slice(0, policy.maxPhysicalInstances);
    if (!id || valores.length === 0) return;

    let cancelado = false;
    void (async () => {
      mesa.setMaxPhysicsSubsteps(policy.maxPhysicsSubsteps);
      mesa.clear();
      try {
        for (let i = 0; i < valores.length; i += 1) {
          if (cancelado) return;
          await mesa.add(id, appearance);
        }
      } catch {
        return; // asset nao carregou: fica so o resultado textual mesmo
      }
      if (cancelado) return;
      await mesa.roll(undefined, { results: valores });
    })();

    return () => {
      cancelado = true;
      // A marca só vale para um lançamento que chegou ao fim. Se este efeito
      // for desfeito antes disso — troca de dependência, ou o duplo disparo
      // do StrictMode em dev, que ainda descarta e recria a mesa — ela volta
      // atrás, senão a execução seguinte se acha repetida e a mesa fica vazia
      // (era o palco em branco ao reabrir o modal com uma rolagem na tela).
      if (ultimaRolagem.current === roll.id) ultimaRolagem.current = undefined;
    };
  }, [appearance, mobile, reducedMotion, roll]);

  if (!active || reducedMotion) return null;
  return <canvas ref={canvasRef} className={variant === "inline" ? styles.inline : styles.canvas} aria-hidden="true" />;
}
