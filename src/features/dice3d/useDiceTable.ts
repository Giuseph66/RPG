/**
 * Binding React para `DiceTable`.
 *
 * A mesa é criada uma vez por canvas e vive fora do ciclo de render do React —
 * recriá-la a cada render descartaria o contexto WebGL e os corpos rígidos.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { DieAppearance } from "./appearance";
import {
  DiceTable,
  type DiceTableOptions,
  type RollOptions,
  type RollOutcome,
} from "./DiceTable";

export interface UseDiceTableOptions
  extends Omit<DiceTableOptions, "canvas"> {
  /** Dados a colocar na mesa assim que ela sobe. */
  dice: string[];
  appearance?: DieAppearance;
  /** Não monta nada enquanto for `false`. */
  enabled?: boolean;
}

export interface UseDiceTableResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pronto: boolean;
  rolando: boolean;
  resultados: RollOutcome[];
  erro: Error | null;
  rolar: (ids?: string[], opts?: RollOptions) => Promise<RollOutcome[]>;
  mesa: () => DiceTable | null;
}

export function useDiceTable(opcoes: UseDiceTableOptions): UseDiceTableResult {
  const {
    dice,
    appearance,
    enabled = true,
    basePath,
    gravity,
    bounds,
    background,
    shadowColor,
    random,
    maxRollSeconds,
    cameraDistance,
  } = opcoes;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mesaRef = useRef<DiceTable | null>(null);
  const [pronto, setPronto] = useState(false);
  const [rolando, setRolando] = useState(false);
  const [resultados, setResultados] = useState<RollOutcome[]>([]);
  const [erro, setErro] = useState<Error | null>(null);

  // a lista entra na dependência por valor, não por identidade de array
  const chaveDados = dice.join(",");

  useEffect(() => {
    if (!enabled || !canvasRef.current) return undefined;

    let vivo = true;
    const mesa = new DiceTable({
      canvas: canvasRef.current,
      basePath,
      gravity,
      bounds,
      background,
      shadowColor,
      random,
      maxRollSeconds,
      cameraDistance,
    });
    mesaRef.current = mesa;
    setPronto(false);
    setErro(null);

    void (async () => {
      try {
        for (const id of chaveDados.split(",").filter(Boolean)) {
          if (!vivo) return;
          await mesa.add(id, appearance ?? {});
        }
        if (vivo) setPronto(true);
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e : new Error(String(e)));
      }
    })();

    const aoRedimensionar = () => mesa.resize();
    window.addEventListener("resize", aoRedimensionar);
    const observador =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(aoRedimensionar)
        : null;
    if (observador && canvasRef.current) observador.observe(canvasRef.current);

    return () => {
      vivo = false;
      window.removeEventListener("resize", aoRedimensionar);
      observador?.disconnect();
      mesa.dispose();
      mesaRef.current = null;
      setPronto(false);
    };
    // `appearance` é aplicada na criação; use `mesa().setAppearance` para trocar depois
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, chaveDados, basePath, gravity, bounds, background, random, maxRollSeconds, cameraDistance]);

  const rolar = useCallback(
    async (ids?: string[], opts?: RollOptions): Promise<RollOutcome[]> => {
      const mesa = mesaRef.current;
      if (!mesa) return [];
      setRolando(true);
      try {
        const r = await mesa.roll(ids, opts);
        setResultados(r);
        return r;
      } finally {
        setRolando(false);
      }
    },
    [],
  );

  const mesa = useCallback(() => mesaRef.current, []);

  return { canvasRef, pronto, rolando, resultados, erro, rolar, mesa };
}
