/**
 * Garante que o dado tem TAMANHO FIXO na tela.
 *
 * O enquadramento anterior media a arena pela quantidade de dados, então um
 * lançamento de dez encolhia o dado para ~9% do quadro e um lançamento de um
 * o deixava em ~26%. Agora a distância de câmera sai só do diâmetro do dado:
 * mesma fatia da tela para qualquer tipo e qualquer quantidade.
 */

import * as THREE from "three";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import type { DieMeta } from "./types";

/** Mesma conta de `DiceTable.enquadrarParaDados`. */
const FRACAO_ALTURA_DADO = 0.12;
const FAIXA: readonly [number, number] = [0.26, 1.5];
const FOV = 42;

const alturaVisivelPorDistancia = () =>
  2 * Math.hypot(46, 34) * Math.tan((FOV * Math.PI) / 360);

function distancia(diametroCm: number): number {
  const ideal = diametroCm / (alturaVisivelPorDistancia() * FRACAO_ALTURA_DADO);
  return Math.min(FAIXA[1], Math.max(FAIXA[0], ideal));
}

/** Fatia da ALTURA da tela ocupada pelo dado, como o usuário enxerga. */
function fatiaDaTela(diametroCm: number, aspect: number): number {
  const d = distancia(diametroCm);
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.5, 500);
  camera.position.set(0, 46 * d, 34 * d);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  // Mede a SILHUETA, não a pegada no chão: a câmera olha inclinada, então um
  // segmento deitado no eixo Z aparece encurtado pela perspectiva enquanto a
  // silhueta do dado não encurta. O eixo X é perpendicular à visada e não
  // sofre esse encurtamento.
  const meio = diametroCm / 2;
  const a = new THREE.Vector3(-meio, meio, 0).project(camera);
  const b = new THREE.Vector3(meio, meio, 0).project(camera);
  // NDC em X cobre a LARGURA; converte para fração da ALTURA pelo aspect.
  return (Math.abs(b.x - a.x) / 2) * aspect;
}

const diametro = (id: string): number =>
  (JSON.parse(fs.readFileSync(`public/dice/${id}.json`, "utf8")) as DieMeta).diameterCm;

describe("tamanho fixo do dado", () => {
  it("não depende da quantidade de dados na mesa", () => {
    // A distância é função só do diâmetro — a contagem nem entra na fórmula.
    const umD20 = distancia(diametro("d20"));
    expect(distancia(diametro("d20"))).toBe(umD20);
    // E o mesmo tipo sempre cai na mesma distância, seja 1 ou 100 na mesa.
    expect(new Set([1, 2, 10, 50, 100].map(() => distancia(diametro("d20")))).size).toBe(1);
  });

  it("dados de tamanhos físicos diferentes ocupam a mesma fatia da tela", () => {
    const fatias = ["d6", "d20", "d100", "d120", "d4"].map((id) => fatiaDaTela(diametro(id), 375 / 812));
    for (const fatia of fatias) {
      expect(fatia).toBeCloseTo(FRACAO_ALTURA_DADO, 2);
    }
    // O d100 tem 4,56 cm contra 2,82 cm do d6 — 62% maior no mundo, igual na tela.
    expect(Math.max(...fatias) - Math.min(...fatias)).toBeLessThan(0.01);
  });

  it("a fatia é a mesma no celular em pé e no monitor deitado", () => {
    // O FOV vertical do three.js não muda com a proporção: só a arena muda.
    for (const id of ["d6", "d20", "d100"]) {
      const celular = fatiaDaTela(diametro(id), 375 / 812);
      const desktop = fatiaDaTela(diametro(id), 1280 / 720);
      expect(celular, id).toBeCloseTo(desktop, 5);
    }
  });

  it("a distância fica dentro dos limites para todo dado publicado", () => {
    for (const id of ["d1", "d4", "d6", "d20", "d100", "d120"]) {
      const d = distancia(diametro(id));
      expect(d, id).toBeGreaterThanOrEqual(FAIXA[0]);
      expect(d, id).toBeLessThanOrEqual(FAIXA[1]);
    }
  });
});
