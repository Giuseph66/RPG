/**
 * Guarda o bug "no celular o dado sai da tela": prova que todo canto da área
 * jogável cai dentro do quadro, em proporção de tela larga e estreita.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { LIMITE_MINIMO, alvoParaDados, distanciaQueComporta, limitesVisiveis } from "./viewportBounds";

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

  it("mantém os cantos no quadro mesmo em proporções extremas", () => {
    // O piso `LIMITE_MINIMO` não pode passar por cima da visibilidade: numa
    // tela muito estreita a câmera enxerga menos que o piso, e devolvê-lo
    // colocaria a parede fora do quadro — o próprio bug que este arquivo guarda.
    for (const aspect of [0.3, 0.5, 1, 2, 3]) {
      const cam = camera(aspect);
      const { x, z } = limitesVisiveis(cam, 26);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const p = paraTela(cam, sx * x, sz * z);
          expect(Math.abs(p.x), `aspect ${aspect}`).toBeLessThanOrEqual(1);
          expect(Math.abs(p.y), `aspect ${aspect}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("nunca devolve área degenerada", () => {
    for (const aspect of [0.3, 0.5, 1, 2, 3]) {
      const l = limitesVisiveis(camera(aspect), 26);
      expect(l.x).toBeGreaterThan(0);
      expect(l.z).toBeGreaterThan(0);
    }
  });

  it("aplica o piso quando a câmera enxerga área suficiente", () => {
    const l = limitesVisiveis(camera(DESKTOP), 26, LIMITE_MINIMO);
    expect(l.x).toBeGreaterThanOrEqual(LIMITE_MINIMO);
    expect(l.z).toBeGreaterThanOrEqual(LIMITE_MINIMO);
  });

  it("a folga da parede não engole o chão de um palco pequeno", () => {
    // Com folga fixa de 3 cm por lado, uma meia-largura visível de ~4,4 cm
    // sobrava 1,4 cm de arena — o dado nascia encostado na parede.
    const perto = new THREE.PerspectiveCamera(42, 1.25, 0.5, 500);
    perto.position.set(0, 46 * 0.26, 34 * 0.26);
    perto.lookAt(0, 0, 0);
    perto.updateProjectionMatrix();
    perto.updateMatrixWorld();

    const l = limitesVisiveis(perto, 26, 0);
    expect(l.x).toBeGreaterThan(3);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const p = paraTela(perto, sx * l.x, sz * l.z);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("respeita o teto pedido", () => {
    const l = limitesVisiveis(camera(DESKTOP), 10);
    expect(l.x).toBeLessThanOrEqual(10);
    expect(l.z).toBeLessThanOrEqual(10);
  });
});

describe("enquadramento automático", () => {
  const D20 = 2.91;
  const D100 = 4.56;
  const FOLGA = 2.6;
  const FAIXA = [0.26, 1.5] as const;

  /** Mesma plataforma de câmera da mesa: (0, 46d, 34d) olhando para a origem. */
  function limitesEm(aspect: number) {
    return (d: number) => {
      const cam = new THREE.PerspectiveCamera(42, aspect, 0.5, 500);
      cam.position.set(0, 46 * d, 34 * d);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      return limitesVisiveis(cam, 26);
    };
  }

  it("mais dados exigem mais arena, crescendo com a raiz da contagem", () => {
    const um = alvoParaDados(D20, 1, 26, FOLGA);
    const quatro = alvoParaDados(D20, 4, 26, FOLGA);
    // Área × 4 significa lado × 2.
    expect(quatro / um).toBeCloseTo(2, 5);
  });

  it("um dado largo pede mais arena que um estreito na mesma contagem", () => {
    expect(alvoParaDados(D100, 5, 26, FOLGA)).toBeGreaterThan(alvoParaDados(D20, 5, 26, FOLGA));
  });

  it("respeita o teto da mesa por mais dados que sejam", () => {
    expect(alvoParaDados(D100, 500, 26, FOLGA)).toBe(26);
  });

  it("um dado só aproxima a câmera; muitos afastam", () => {
    const limites = limitesEm(1.25);
    const um = distanciaQueComporta(limites, alvoParaDados(D20, 1, 26, FOLGA), FAIXA);
    const dez = distanciaQueComporta(limites, alvoParaDados(D100, 10, 26, FOLGA), FAIXA);

    expect(um).toBe(FAIXA[0]); // o mais perto que a faixa permite
    expect(dez).toBeGreaterThan(um);
  });

  it("o dado ocupa uma fatia visível do quadro com poucos dados", () => {
    const limites = limitesEm(1.25);
    const d = distanciaQueComporta(limites, alvoParaDados(D20, 1, 26, FOLGA), FAIXA);
    const { x, z } = limites(d);
    const arena = 2 * Math.min(x, z);

    // Antes do enquadramento automático, uma câmera fixa longe deixava o d20
    // com ~10% do quadro — o "dados minúsculos".
    expect(D20 / arena).toBeGreaterThan(0.2);
    // E ainda sobra pista para correr: pelo menos 3 larguras de dado.
    expect(arena / D20).toBeGreaterThan(3);
  });

  it("a arena comporta os dados em uma camada, sem empilhar", () => {
    const limites = limitesEm(1.25);
    for (const [largura, n] of [[D20, 1], [D20, 5], [D100, 10], [D20, 20]] as const) {
      const d = distanciaQueComporta(limites, alvoParaDados(largura, n, 26, FOLGA), FAIXA);
      const { x, z } = limites(d);
      const lotacao = (n * largura * largura) / (2 * x * 2 * z);
      // A arena fixa antiga pedia 240% para dez d100: eles empilhavam no centro.
      expect(lotacao, `${n} dados de ${largura}cm`).toBeLessThan(0.6);
    }
  });

  it("devolve o extremo distante quando nem ele comporta o alvo", () => {
    expect(distanciaQueComporta(() => ({ x: 1, z: 1 }), 999, FAIXA)).toBe(FAIXA[1]);
  });
});
