/**
 * Guarda o bug "no celular o dado sai da tela": prova que todo canto da área
 * jogável cai dentro do quadro, em proporção de tela larga e estreita.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { LIMITE_MINIMO, limitesVisiveis } from "./viewportBounds";

/** Câmera idêntica à da mesa, só mudando a proporção da tela. */
function camera(aspect: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(42, aspect, 0.5, 500);
  cam.position.set(0, 46, 34);
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return cam;
}

/** Coordenada de tela (NDC) de um ponto do chão. */
function paraTela(cam: THREE.PerspectiveCamera, x: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, 0, z).project(cam);
}

const DESKTOP = 1280 / 720;
const CELULAR = 375 / 812;

describe("limitesVisiveis", () => {
  it.each([
    ["desktop", DESKTOP],
    ["celular em pé", CELULAR],
  ])("em %s, os quatro cantos da área caem dentro do quadro", (_nome, aspect) => {
    const cam = camera(aspect);
    const { x, z } = limitesVisiveis(cam, 26);

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = paraTela(cam, sx * x, sz * z);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("tela estreita reduz a área em X — a causa do dado sumir no celular", () => {
    const largo = limitesVisiveis(camera(DESKTOP), 26);
    const estreito = limitesVisiveis(camera(CELULAR), 26);
    expect(estreito.x).toBeLessThan(largo.x);
  });

  it("nunca devolve área degenerada", () => {
    for (const aspect of [0.3, 0.5, 1, 2, 3]) {
      const l = limitesVisiveis(camera(aspect), 26);
      expect(l.x).toBeGreaterThanOrEqual(LIMITE_MINIMO);
      expect(l.z).toBeGreaterThanOrEqual(LIMITE_MINIMO);
    }
  });

  it("respeita o teto pedido", () => {
    const l = limitesVisiveis(camera(DESKTOP), 10);
    expect(l.x).toBeLessThanOrEqual(10);
    expect(l.z).toBeLessThanOrEqual(10);
  });
});
