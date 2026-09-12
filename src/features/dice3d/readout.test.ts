import { describe, expect, it } from "vitest";

import { ehHonesto, lerDado, rotacionar } from "./readout";
import type { DieMeta, Quat, Vec3 } from "./types";

/** Quaternion unitário de rotação em torno de `eixo` (normalizado aqui). */
function eixoAngulo(eixo: Vec3, rad: number): Quat {
  const n = Math.hypot(eixo[0], eixo[1], eixo[2]);
  const s = Math.sin(rad / 2) / n;
  return [eixo[0] * s, eixo[1] * s, eixo[2] * s, Math.cos(rad / 2)];
}

const IDENT: Quat = [0, 0, 0, 1];

/** d6 mínimo: 6 normais nos eixos, opostas somando 7. */
const d6: DieMeta = {
  id: "d6",
  faces: 6,
  solid: "Hexaedro",
  unit: "cm",
  gravity: -981,
  mass: 0.1,
  diameterCm: 2,
  readout: "top",
  collider: { vertices: [], faces: [], indices: [] },
  faceNormals: [
    [0, 1, 0],
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ],
  values: [1, 6, 2, 5, 3, 4],
  faceAreaRatio: 1,
};

/** d4: tetraedro com números nos vértices. */
const d4: DieMeta = {
  id: "d4",
  faces: 4,
  solid: "Tetraedro",
  unit: "cm",
  gravity: -981,
  mass: 0.06,
  diameterCm: 2.8,
  readout: "apex",
  collider: { vertices: [], faces: [], indices: [] },
  // face de baixo apontando para -Y, as outras três inclinadas para cima
  faceNormals: [
    [0, -1, 0],
    [0, 1 / 3, Math.sqrt(8) / 3],
    [Math.sqrt(2 / 3), 1 / 3, -Math.sqrt(2) / 3],
    [-Math.sqrt(2 / 3), 1 / 3, -Math.sqrt(2) / 3],
  ],
  values: [1, 2, 3, 4],
  vertexPoints: [
    [0, 1, 0],
    [0, -1 / 3, Math.sqrt(8) / 3],
    [Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
    [-Math.sqrt(2 / 3), -1 / 3, -Math.sqrt(2) / 3],
  ],
  vertexValues: [7, 8, 9, 10],
  faceAreaRatio: 1,
};

describe("rotacionar", () => {
  it("mantém o vetor sob o quaternion identidade", () => {
    expect(rotacionar(IDENT, [0, 1, 0])).toEqual([0, 1, 0]);
  });

  it("gira +Y para +Z com 90° em torno de X", () => {
    const [x, y, z] = rotacionar(eixoAngulo([1, 0, 0], Math.PI / 2), [0, 1, 0]);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(1, 6);
  });

  it("preserva o comprimento", () => {
    const v: Vec3 = [0.3, -0.5, 0.81];
    const r = rotacionar(eixoAngulo([1, 2, 3], 1.1), v);
    const norma = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
    expect(norma(r)).toBeCloseTo(norma(v), 6);
  });
});

describe("lerDado — convenção de topo", () => {
  it("lê a face voltada para cima", () => {
    const r = lerDado(d6, IDENT);
    expect(r).toMatchObject({ value: 1, convention: "top", settled: true });
    expect(r.alignment).toBeCloseTo(1, 6);
  });

  it("segue a rotação do corpo", () => {
    // 180° em torno de X leva a face +Y para baixo e traz a -Y para cima
    const r = lerDado(d6, eixoAngulo([1, 0, 0], Math.PI));
    expect(r.value).toBe(6);
    expect(r.convention).toBe("top");
  });

  it("faces opostas somam 7 em todas as orientações de eixo", () => {
    const giros: Quat[] = [
      IDENT,
      eixoAngulo([1, 0, 0], Math.PI / 2),
      eixoAngulo([1, 0, 0], -Math.PI / 2),
      eixoAngulo([0, 0, 1], Math.PI / 2),
      eixoAngulo([0, 0, 1], -Math.PI / 2),
      eixoAngulo([1, 0, 0], Math.PI),
    ];
    const vistos = giros.map((q) => lerDado(d6, q).value);
    expect(new Set(vistos).size).toBe(6);
    expect(vistos.every((v) => v >= 1 && v <= 6)).toBe(true);
  });

  it("marca como não assentado quando o dado para de canto", () => {
    // 45° em torno de X: nenhuma face chega ao limiar
    const r = lerDado(d6, eixoAngulo([1, 0, 0], Math.PI / 4));
    expect(r.settled).toBe(false);
    expect(r.alignment).toBeLessThan(0.9);
  });
});

describe("lerDado — convenção de ápice (d4)", () => {
  it("lê o número do vértice mais alto, não o da face", () => {
    const r = lerDado(d4, IDENT);
    expect(r.convention).toBe("apex");
    expect(r.value).toBe(7);
    expect(r.settled).toBe(true);
    expect(r.alignment).toBeCloseTo(1, 6);
  });

  it("muda de vértice quando o tetraedro tomba", () => {
    const r = lerDado(d4, eixoAngulo([1, 0, 0], Math.PI));
    expect(r.convention).toBe("apex");
    expect(r.value).not.toBe(7);
    expect(d4.vertexValues).toContain(r.value);
  });

  it("falha claramente se o metadado apex vier sem vértices", () => {
    const quebrado: DieMeta = { ...d4, vertexPoints: undefined };
    expect(() => lerDado(quebrado, IDENT)).toThrow(/vertexPoints/);
  });
});

describe("ehHonesto", () => {
  it("aceita sólido isoedro", () => {
    expect(ehHonesto(d6)).toBe(true);
  });

  it("rejeita sólido de faces desiguais", () => {
    expect(ehHonesto({ ...d6, faceAreaRatio: 0.72 })).toBe(false);
  });
});
