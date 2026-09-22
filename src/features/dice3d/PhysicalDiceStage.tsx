/**
 * Camada física dos dados: quando o controller entra em `awaitingPhysics`,
 * larga os dados 3D da expressão pedida numa mesa com física real — quicam,
 * colidem entre si e assentam. **A face que ficar para cima é o resultado**:
 * `mesa.roll()` é chamado sem `results`, então nada é encenado, e os valores
 * lidos por `lerDado()` voltam ao controller por `onResult`.
 *
 * Dois enquadramentos:
 * - `overlay` (padrão): tela cheia por cima do app, translúcido.
 * - `inline`: preenche o elemento pai, para virar o palco de um modal. A
 *   câmera chega mais perto e a área jogável encolhe junto, porque as paredes
 *   saem do que a câmera enxerga (ver `limitesVisiveis`).
 *
 * `DiceResult`/`LiveRegion` continuam sendo a fonte acessível do resultado. Se
 * o WebGL falhar ou os assets não carregarem, `onPhysicsAvailable(false)` avisa
 * o controller, que volta a decidir pelo RNG — o app segue funcionando.
 */

import { useEffect, useRef, useState } from "react";

import { dicePerformancePolicy } from "@domain/dice";
import type { DiceFaces } from "@domain/contracts/primitives";
import type { DiceExpression } from "@domain/contracts/dice";

import { APARENCIA_MESA, type DieAppearance } from "./appearance";
import { DiceTable } from "./DiceTable";
import styles from "./PhysicalDiceStage.module.css";

export interface PhysicalDiceStageProps {
  /** `true` dispara o lançamento: o controller está esperando a física decidir. */
  readonly awaitingPhysics?: boolean;
  /** O que lançar. Define o tipo de dado e quantas cópias caem na mesa. */
  readonly physicsExpression?: DiceExpression;
  /** Monta/desmonta a mesa (a cena WebGL só existe enquanto `true`). */
  readonly active: boolean;
  /** Fonte de aleatoriedade só para a pose inicial — a física faz o resto. */
  readonly random?: () => number;
  /**
   * - `overlay`: cobre a tela por trás do app, translúcido e decorativo.
   * - `inline`: preenche o elemento pai (palco embutido num modal).
   * - `fullscreen`: cobre a tela inteira POR CIMA do app, opaco nos dados. A
   *   arena vira a tela toda do aparelho, que é onde os dados podem cair.
   */
  readonly variant?: "overlay" | "inline" | "fullscreen";
  /** Acabamento dos dados. Padrão: obsidiana e bronze da paleta do app. */
  readonly appearance?: DieAppearance;
  /** Cor da sombra projetada pelos dados. */
  readonly shadowColor?: string;
  /** Peso da mão no arremesso. `1` é o padrão; acima disso o dado sai mais forte. */
  readonly forceScale?: number;
  /** Faces lidas depois que todos os dados pararam, uma por dado. */
  readonly onResult?: (values: number[]) => void;
  /**
   * Ciclo de vida da mesa: `true` quando a cena WebGL existe, `false` quando
   * falha ao montar ou é descartada. O controller usa isso para escolher entre
   * física e RNG **antes** de abrir a rolagem.
   */
  readonly onPhysicsAvailable?: (available: boolean) => void;
  /**
   * A mesa existe mas não dá conta *desta* rolagem (a política de performance
   * corta dados demais, o asset não carregou). Vale só para a rolagem
   * pendente — a próxima volta a tentar a física.
   */
  readonly onPhysicsDeclined?: () => void;
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

export function PhysicalDiceStage({ awaitingPhysics = false, physicsExpression, active, random, variant = "overlay", appearance = APARENCIA_MESA, shadowColor = "#090706", forceScale = 1, onResult, onPhysicsAvailable, onPhysicsDeclined }: PhysicalDiceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mesaRef = useRef<DiceTable | null>(null);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Guardados em ref para não reiniciar o lançamento quando o pai recria os
  // callbacks a cada render.
  const onResultRef = useRef(onResult);
  const onDisponivelRef = useRef(onPhysicsAvailable);
  const onRecusaRef = useRef(onPhysicsDeclined);
  onResultRef.current = onResult;
  onDisponivelRef.current = onPhysicsAvailable;
  onRecusaRef.current = onPhysicsDeclined;

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
    if (!active || reducedMotion) {
      // Sem mesa não há física para decidir: o controller usa o RNG.
      onDisponivelRef.current?.(false);
      return undefined;
    }
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let mesa: DiceTable;
    try {
      mesa = new DiceTable({
        canvas,
        background: null,
        shadowColor,
        random,
        mobile,
        // A câmera define a arena E o tamanho aparente do dado — é a mesma
        // escolha. Por isso os palcos não fixam distância: reenquadram a cada
        // lançamento, chegando perto com um dado só (fica grande) e afastando
        // só o necessário quando são muitos ou largos (d100).
        cameraDistance: variant === "overlay" ? 1 : 0.26,
        cameraDistanceRange: variant === "overlay" ? undefined : [0.26, 1.5],
        forceScale,
      });
    } catch {
      // WebGL indisponível ou contexto perdido: o controller volta ao RNG e o
      // resto do app (DiceResult, histórico) segue intacto.
      onDisponivelRef.current?.(false);
      return undefined;
    }
    mesaRef.current = mesa;
    onDisponivelRef.current?.(true);

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
      onDisponivelRef.current?.(false);
    };
  }, [active, forceScale, mobile, random, reducedMotion, shadowColor, variant]);

  useEffect(() => {
    const mesa = mesaRef.current;
    if (!mesa || !awaitingPhysics || !physicsExpression || reducedMotion) return undefined;

    const id = ID_POR_FACES[physicsExpression.faces];
    // Vantagem/desvantagem sempre caem dois dados, independente da quantidade
    // escrita na fórmula — é o par que `buildSelection` compara.
    const quantidade = physicsExpression.mode === "normal" ? physicsExpression.quantity : 2;
    const policy = dicePerformancePolicy({
      faces: physicsExpression.faces,
      quantity: quantidade,
      mobile,
      reducedMotion,
    });

    // TODOS os dados pedidos vão para a mesa, sem teto. O orçamento de
    // `dicePerformancePolicy` virou só recomendação: quem pede muito dado vê um
    // aviso de que pode travar (ver `DiceOverlay`) e decide por conta própria.
    // Cortar aqui não era opção — com a física decidindo o número, menos dados
    // na mesa significam menos valores do que a expressão pede.
    if (!id || quantidade === 0) {
      onRecusaRef.current?.();
      return undefined;
    }

    let cancelado = false;
    void (async () => {
      mesa.setMaxPhysicsSubsteps(policy.maxPhysicsSubsteps);
      mesa.clear();
      try {
        for (let i = 0; i < quantidade; i += 1) {
          if (cancelado) return;
          await mesa.add(id, appearance);
        }
      } catch {
        // Asset não carregou: sem dados na mesa não há o que ler, devolve
        // esta rolagem ao RNG.
        if (!cancelado) onRecusaRef.current?.();
        return;
      }
      if (cancelado) return;
      // Sem `results`: a física roda solta e a face que ficar para cima é o
      // resultado. É o ponto inteiro deste fluxo.
      const outcomes = await mesa.roll(undefined, {});
      if (cancelado) return;
      onResultRef.current?.(outcomes.map((outcome) => outcome.value));
    })();

    return () => { cancelado = true; };
  }, [appearance, awaitingPhysics, mobile, physicsExpression, reducedMotion]);

  if (!active || reducedMotion) return null;
  const classe = variant === "inline" ? styles.inline : variant === "fullscreen" ? styles.fullscreen : styles.canvas;
  return <canvas ref={canvasRef} className={classe} aria-hidden="true" />;
}
