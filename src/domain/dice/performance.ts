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

const MAX_INSTANCES: Readonly<Record<DiceFaces, number>> = {
  1: 1,
  2: 2,
  3: 4,
  4: 12,
  5: 4,
  6: 18,
  7: 6,
  8: 12,
  10: 12,
  12: 10,
  14: 8,
  16: 8,
  20: 6,
  24: 4,
  30: 3,
  48: 2,
  50: 2,
  60: 2,
  100: 1,
  120: 1,
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
      maxPhysicalInstances,
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
