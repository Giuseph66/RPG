import { describe, expect, it } from "vitest";

import { DICE_FACES, type DiceFaces } from "@domain/contracts/primitives";

import { dicePerformancePolicy } from "./performance";

describe("dicePerformancePolicy", () => {
  it("o orçamento nunca corta o resultado textual, só a cena", () => {
    const policy = dicePerformancePolicy({ faces: 100, quantity: 100 });
    // O d100 já foi preso em 1 exemplar pelo casco de 196 vértices; com o
    // colisor de esfera, dez custam 38ms e o teto deixou de ser o gargalo.
    expect(policy.maxPhysicalInstances).toBeGreaterThan(1);
    // Mas o teto continua existindo: cena limitada, nunca o número de dados
    // que o Dice Engine resolve.
    expect(policy.maxPhysicalInstances).toBeLessThan(100);
    expect(policy.complexity).toBe("very-high");
    expect(policy.shadowMapSize).toBe(1024);
  });

  it("reduz pixel ratio, subpassos, sombras e nº de dados no mobile", () => {
    const policy = dicePerformancePolicy({ faces: 20, quantity: 100, mobile: true });
    const desktop = dicePerformancePolicy({ faces: 20, quantity: 100 });
    // O teto de instâncias é medido em desktop; o celular leva o dobro do tempo
    // na mesma pré-simulação, então entra com metade dos dados.
    expect(policy.maxPhysicalInstances).toBeLessThan(desktop.maxPhysicalInstances);
    expect(policy.maxPhysicalInstances).toBe(Math.ceil(desktop.maxPhysicalInstances / 2));
    expect(policy.pixelRatioCap).toBe(1.25);
    expect(policy.maxPhysicsSubsteps).toBe(3);
    expect(policy.shadowMapSize).toBe(512);
  });

  it("o teto acompanha o custo do colisor, não o número de faces", () => {
    const teto = (faces: DiceFaces) => dicePerformancePolicy({ faces, quantity: 100 }).maxPhysicalInstances;
    // d3 e d5 têm colisores de 611 e 687 vértices — mais pesados que o do d100
    // (196). Já tiveram teto 4, e quatro deles travavam a aba por minutos.
    expect(teto(3)).toBe(1);
    expect(teto(5)).toBe(1);
    // O d1 tem o colisor mais pesado de todos (642 vértices), mas é uma bola
    // (esfericidade 0,996): vira esfera e deixa de custar caro.
    expect(teto(1)).toBeGreaterThanOrEqual(20);
    // Poliedros baratos aguentam uma mão cheia de dados.
    expect(teto(6)).toBeGreaterThanOrEqual(20);
    expect(teto(20)).toBeGreaterThanOrEqual(20);
    // O d100 é quase esférico (0,963) e usa colisor de esfera: sai da conta do
    // O(V²) e acompanha os baratos. O d120 (0,905) é facetado demais para isso
    // e segue preso ao casco de 62 vértices.
    expect(teto(100)).toBeGreaterThanOrEqual(20);
    expect(teto(120)).toBeLessThanOrEqual(10);
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
