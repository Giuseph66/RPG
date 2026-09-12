/**
 * Componente pronto: canvas com os dados 3D e uma função de lançar.
 *
 * Para controle fino (trocar textura em tempo real, acessar a cena three.js,
 * lançar tipos específicos) use `useDiceTable` direto.
 */

import { useEffect, useImperativeHandle, type Ref } from "react";

import type { DieAppearance } from "./appearance";
import type { RollOptions, RollOutcome } from "./DiceTable";
import { useDiceTable } from "./useDiceTable";

export interface Dice3DHandle {
  rolar: (ids?: string[], opts?: RollOptions) => Promise<RollOutcome[]>;
  setAppearance: (id: string, a: DieAppearance, slot?: number) => void;
}

export interface Dice3DProps {
  /** Ids dos dados, ex. `["d20", "d6", "d6"]`. Repetir cria várias cópias. */
  dice: string[];
  appearance?: DieAppearance;
  /** Onde estão os assets. Padrão `/dice`. */
  basePath?: string;
  /** Injete o RNG do domínio aqui para o lançamento não usar `Math.random`. */
  random?: () => number;
  background?: string | null;
  className?: string;
  onResult?: (resultados: RollOutcome[]) => void;
  ref?: Ref<Dice3DHandle>;
}

export function Dice3D({
  dice,
  appearance,
  basePath,
  random,
  background = "#12141b",
  className,
  onResult,
  ref,
}: Dice3DProps) {
  const { canvasRef, pronto, resultados, erro, rolar, mesa } = useDiceTable({
    dice,
    appearance,
    basePath,
    random,
    background,
  });

  useImperativeHandle(
    ref,
    () => ({
      rolar,
      setAppearance: (id, a, slot) => mesa()?.setAppearance(id, a, slot),
    }),
    [rolar, mesa],
  );

  useEffect(() => {
    if (resultados.length > 0) onResult?.(resultados);
  }, [resultados, onResult]);

  if (erro) {
    return (
      <div className={className} role="alert">
        Falha ao carregar os dados 3D: {erro.message}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Mesa de dados 3D"
      aria-busy={!pronto}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    />
  );
}
