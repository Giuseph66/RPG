import { describe, expect, it } from "vitest";

import { lerDado } from "./readout";
import { orientationForValue } from "./orientationFor";
import type { DieMeta, Vec3 } from "./types";

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

// Tetraedro regular: vertices nos 4 cantos alternados de um cubo. A face
// oposta ao vertice V tem normal exatamente -normalize(V) (o centroide do
// tetraedro fica no meio, entao centro->face e sempre o oposto de centro->vertice).
// Gerar assim (em vez de digitar trigonometria a mao) garante que faceNormals
// e vertexPoints sejam mutuamente consistentes, como no export real do Blender.
function unit(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}
const tetraVertsBrutos: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];
const tetraVerts: Vec3[] = tetraVertsBrutos.map(unit);

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
  faceNormals: tetraVerts.map((v) => unit([-v[0], -v[1], -v[2]])),
  values: [1, 2, 3, 4],
  vertexPoints: tetraVerts,
  vertexValues: [7, 8, 9, 10],
  faceAreaRatio: 1,
};

const d3Belt: DieMeta = {
  id: "d3",
  faces: 3,
  solid: "Esfera com 3 facetas",
  unit: "cm",
  gravity: -981,
  mass: 0.06,
  diameterCm: 2.4,
  readout: "bottom",
  collider: { vertices: [], faces: [], indices: [] },
  faceNormals: [
    [0, 1, 0],
    [Math.sin((2 * Math.PI) / 3), -0.2, Math.cos((2 * Math.PI) / 3)],
    [Math.sin((4 * Math.PI) / 3), -0.2, Math.cos((4 * Math.PI) / 3)],
  ],
  values: [1, 2, 3],
  faceAreaRatio: 0.999,
};

describe("orientationForValue — dado com face superior (d6)", () => {
  it.each([1, 2, 3, 4, 5, 6])("produz orientação legível como %i", (valor) => {
    const q = orientationForValue(d6, valor, () => 0.37);
    const lido = lerDado(d6, q);
    expect(lido.value).toBe(valor);
    expect(lido.convention).toBe("top");
    expect(lido.alignment).toBeCloseTo(1, 6);
  });

  it("varia o giro (yaw) conforme o random, sem mudar o valor lido", () => {
    const qa = orientationForValue(d6, 4, () => 0.1);
    const qb = orientationForValue(d6, 4, () => 0.9);
    expect(qa).not.toEqual(qb);
    expect(lerDado(d6, qa).value).toBe(4);
    expect(lerDado(d6, qb).value).toBe(4);
  });

  it("rejeita valor fora do dado", () => {
    expect(() => orientationForValue(d6, 9, () => 0)).toThrow(/não tem o valor/);
  });
});

describe("orientationForValue — convenção de ápice (d4)", () => {
  it.each([7, 8, 9, 10])("produz orientação legível como %i", (valor) => {
    const q = orientationForValue(d4, valor, () => 0.6);
    const lido = lerDado(d4, q);
    expect(lido.convention).toBe("apex");
    expect(lido.value).toBe(valor);
    expect(lido.settled).toBe(true);
  });

  it("falha claramente se o metadado apex não trouxer vértices", () => {
    const quebrado: DieMeta = { ...d4, vertexPoints: undefined };
    expect(() => orientationForValue(quebrado, 7, () => 0)).toThrow(/vertexPoints/);
  });
});

describe("orientationForValue — convenção de base (d3 tipo referência)", () => {
  it.each([1, 2, 3])("produz orientação legível como %i", (valor) => {
    const q = orientationForValue(d3Belt, valor, () => 0.2);
    const lido = lerDado(d3Belt, q);
    expect(lido.convention).toBe("bottom");
    expect(lido.value).toBe(valor);
  });
});
