import { describe, expect, it } from "vitest";

import { DICE_FACES } from "@domain/contracts/primitives";

import { dicePerformancePolicy } from "./performance";

describe("dicePerformancePolicy", () => {
  it("mantém o resultado textual completo e limita a física do d100", () => {
    const policy = dicePerformancePolicy({ faces: 100, quantity: 100 });
    expect(policy.maxPhysicalInstances).toBe(1);
    expect(policy.complexity).toBe("very-high");
    expect(policy.shadowMapSize).toBe(1024);
  });

  it("reduz pixel ratio, subpassos e sombras no mobile", () => {
    const policy = dicePerformancePolicy({ faces: 20, quantity: 100, mobile: true });
    expect(policy.maxPhysicalInstances).toBe(6);
    expect(policy.pixelRatioCap).toBe(1.25);
    expect(policy.maxPhysicsSubsteps).toBe(3);
    expect(policy.shadowMapSize).toBe(512);
  });

  it("desliga a animação quando reduced motion está ativo", () => {
    const policy = dicePerformancePolicy({ faces: 6, quantity: 10, reducedMotion: true });
    expect(policy.animate).toBe(false);
    expect(policy.maxPhysicalInstances).toBe(0);
    expect(policy.shadowMapSize).toBe(0);
  });

  it("tem orçamento definido para cada modelo publicado", () => {
    for (const faces of DICE_FACES) {
      const policy = dicePerformancePolicy({ faces, quantity: 1 });
      expect(policy.maxPhysicalInstances).toBe(1);
      expect(policy.animate).toBe(true);
    }
  });
});
