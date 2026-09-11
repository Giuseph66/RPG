import { describe, expect, it } from "vitest";

import {
  assertInRange,
  createPlatformRandomSource,
  createSequenceRandomSource,
  RandomSourceContractError,
  RNG_VERSION,
} from "./random-source";

describe("RNG_VERSION", () => {
  it("é a constante de versão do algoritmo de RNG de plataforma", () => {
    expect(RNG_VERSION).toBe("platform-rejection-v1");
  });
});

describe("assertInRange", () => {
  it("devolve o valor quando inteiro dentro do intervalo", () => {
    expect(assertInRange(5, 1, 20)).toBe(5);
    expect(assertInRange(1, 1, 20)).toBe(1);
    expect(assertInRange(20, 1, 20)).toBe(20);
  });

  it("lança RandomSourceContractError para valor fora do intervalo", () => {
    expect(() => assertInRange(21, 1, 20)).toThrow(RandomSourceContractError);
    expect(() => assertInRange(0, 1, 20)).toThrow(RandomSourceContractError);
  });

  it("lança RandomSourceContractError para valor não-inteiro", () => {
    expect(() => assertInRange(5.5, 1, 20)).toThrow(RandomSourceContractError);
  });
});

describe("createSequenceRandomSource", () => {
  it("devolve valores da sequência em ordem e conta chamadas", () => {
    const rng = createSequenceRandomSource([4, 6, 2]);
    expect(rng.calls).toBe(0);
    expect(rng.nextInt(1, 6)).toBe(4);
    expect(rng.calls).toBe(1);
    expect(rng.nextInt(1, 6)).toBe(6);
    expect(rng.nextInt(1, 6)).toBe(2);
    expect(rng.calls).toBe(3);
  });

  it("lança erro quando a sequência se esgota", () => {
    const rng = createSequenceRandomSource([1]);
    rng.nextInt(1, 6);
    expect(() => rng.nextInt(1, 6)).toThrow(/esgotada/);
  });
});

describe("createPlatformRandomSource", () => {
  it("nextInt(1,6) sempre devolve inteiro em [1,6] em 1000 amostras", () => {
    const rng = createPlatformRandomSource();
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.nextInt(1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it("nextInt(1,100) sempre devolve inteiro em [1,100] em 1000 amostras", () => {
    const rng = createPlatformRandomSource();
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.nextInt(1, 100);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
