import { type DiceFaces } from "@domain/contracts/primitives";

/** Nível de custo aproximado do colisor e da malha publicados para cada dado. */
export type DiceComplexity = "low" | "medium" | "high" | "very-high";

export interface DicePerformanceInput {
  readonly faces: DiceFaces;
  readonly quantity: number;
  readonly mobile?: boolean;
  readonly reducedMotion?: boolean;
}

export interface DicePerformancePolicy {
  readonly complexity: DiceComplexity;
  /** Quantos exemplares deste tipo podem entrar na cena física. */
  readonly maxPhysicalInstances: number;
  /** Quantidade máxima de subpassos por frame para o mundo cannon-es. */
  readonly maxPhysicsSubsteps: number;
  /** Teto do pixel ratio usado no renderer. */
  readonly pixelRatioCap: number;
  /** 0 desliga sombras; os demais valores são o tamanho do shadow map. */
  readonly shadowMapSize: 0 | 512 | 1024 | 2048;
  readonly animate: boolean;
}

/**
 * Teto de exemplares na cena física, por tipo de dado.
 *
 * O custo que manda aqui é o **colisor**, não o número de faces: a colisão
 * convexo-convexo do cannon-es compara vértice a vértice, então o par custa
 * O(V²) e a leva de `n` dados custa O(n²·V²). Medido (pré-simulação de uma
 * queda de 4 s, um núcleo):
 *
 * | vértices | 10 dados | 20 dados | 30 dados |
 * |----------|----------|----------|----------|
 * | 8–32     | ~30–70ms | ~50–120ms| ~63–281ms|
 * | 62       | 273ms    | 2.326ms  | 16.249ms |
 * | 196      | 9.188ms  | —        | —        |
 * | 611–687  | *2 dados não terminaram em 170s* |
 *
 * Os quase esféricos escapam dessa conta trocando o casco por uma esfera
 * (`colliderShape.ts`): o d100 passou a 38ms com dez exemplares.
 *
 * Orçamento adotado: ~300ms de pré-simulação, que é a pausa antes de a
 * animação começar.
 *
 * Os tetos antigos vinham de quando a camada 3D era decorativa e o número saía
 * do RNG — mostrar 6 de 10 dados não tinha custo nenhum. Eram conservadores
 * demais nos dados baratos (d20 em 6, sendo que 30 d20 custam 118ms) e, pior,
 * **perigosos nos caros**: d3 e d5 tinham teto 4 apesar de colisores de 611 e
 * 687 vértices — mais pesados que o do d100, que tinha teto 1. Quatro d5
 * travariam a aba por minutos.
 */
const MAX_INSTANCES: Readonly<Record<DiceFaces, number>> = {
  // Colisores de 611–687 vértices em formas IRREGULARES (esfericidade 0,80 e
  // 0,90): nem dois exemplares terminam em tempo utilizável, e são facetados
  // demais para a esfera substituí-los sem falsear a queda.
  3: 1,
  5: 1,
  // Quase esferas (esfericidade ≥ 0,95): trocam o casco por um colisor de
  // esfera, que custa O(1) por par. O d100 caiu de 9.188ms para 38ms com dez
  // exemplares, e de 4.200ms para 13ms com três. Ver `colliderShape.ts`.
  1: 30,
  100: 30,
  // 128 vértices, mas esfericidade 0,15 — é uma moeda, não uma esfera.
  2: 2,
  // 62 vértices: 10 cabem em 273ms, 20 estouram para 2,3 s.
  50: 4,
  60: 8,
  120: 8,
  // Até 32 vértices: 30 exemplares ficam dentro do orçamento.
  4: 30,
  6: 30,
  7: 30,
  8: 30,
  10: 30,
  12: 24,
  14: 30,
  16: 30,
  20: 30,
  24: 30,
  30: 30,
  48: 30,
};

function complexityFor(faces: DiceFaces): DiceComplexity {
  if (faces >= 100) return "very-high";
  if (faces >= 30) return "high";
  if (faces >= 14) return "medium";
  return "low";
}

/**
 * Retorna um orçamento determinístico para a camada física.
 *
 * O resultado textual nunca passa por esta política: `quantity` continua
 * sendo resolvido integralmente pelo Dice Engine. O orçamento só limita
 * instâncias decorativas e o custo do renderer.
 */
export function dicePerformancePolicy(input: DicePerformanceInput): DicePerformancePolicy {
  const mobile = input.mobile === true;
  const reducedMotion = input.reducedMotion === true;
  const complexity = complexityFor(input.faces);
  const quantity = Number.isFinite(input.quantity) ? Math.trunc(input.quantity) : 0;
  const maxPhysicalInstances = Math.min(Math.max(0, quantity), MAX_INSTANCES[input.faces]);

  if (reducedMotion) {
    return {
      complexity,
      maxPhysicalInstances: 0,
      maxPhysicsSubsteps: 0,
      pixelRatioCap: 1,
      shadowMapSize: 0,
      animate: false,
    };
  }

  if (mobile) {
    return {
      complexity,
      // Os tetos foram medidos num núcleo de desktop; um celular leva bem mais
      // para a mesma pré-simulação, e ela é a pausa antes da animação começar.
      maxPhysicalInstances: Math.max(1, Math.ceil(maxPhysicalInstances / 2)),
      maxPhysicsSubsteps: complexity === "very-high" ? 2 : 3,
      pixelRatioCap: 1.25,
      shadowMapSize: complexity === "low" ? 1024 : 512,
      animate: true,
    };
  }

  return {
    complexity,
    maxPhysicalInstances,
    maxPhysicsSubsteps: complexity === "very-high" ? 3 : 4,
    pixelRatioCap: 2,
    shadowMapSize: complexity === "very-high" ? 1024 : 2048,
    animate: true,
  };
}
