/**
 * Guarda a troca do casco convexo por esfera nos dados quase esféricos.
 *
 * Motivo: a colisão convexo-convexo do cannon-es custa O(V²) por par. O casco
 * de 196 vértices do d100 levava 4,2 s para três exemplares e 9,2 s para dez —
 * a mesa ficava presa a um dado só. Com a esfera: 13 ms e 38 ms.
 */

import * as CANNON from "cannon-es";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { GRUPO_MESA, LADOS_MOEDA, LIMIAR_ESFERA, adicionarFormasColisao, esfericidade, formaColisao, usaEsfera, usaProxyEntreDados } from "./colliderShape";
import { aplicarInerciaIsotropica } from "./rollSimulation";
import type { DieMeta } from "./types";

const meta = (id: string): DieMeta =>
  JSON.parse(fs.readFileSync(`public/dice/${id}.json`, "utf8"));

describe("forma de colisão", () => {
  it("mede esfericidade como raio inscrito sobre circunscrito", () => {
    // Comparar raios de VÉRTICES daria 1,0 para todo poliedro regular — um cubo
    // pontuaria como esfera. Inscrito/circunscrito separa de verdade:
    expect(esfericidade(meta("d6"))).toBeCloseTo(1 / Math.sqrt(3), 3); // cubo
    expect(esfericidade(meta("d20"))).toBeCloseTo(0.795, 2);
    expect(esfericidade(meta("d100"))).toBeCloseTo(0.963, 2); // Zocchiedro
    expect(esfericidade(meta("d1"))).toBeGreaterThan(0.99); // bola
  });

  it("só os quase esféricos viram esfera", () => {
    for (const id of ["d1", "d100"]) {
      expect(usaEsfera(meta(id)), id).toBe(true);
      expect(formaColisao(meta(id)), id).toBeInstanceOf(CANNON.Sphere);
    }
    // O d120 (0,905), o d50 (0,926) e o d60 (0,925) são facetados demais: a
    // esfera mudaria como tombam. O d5 (0,898) tem casco pesado de 687
    // vértices, mas trocá-lo falsearia a queda — o custo se resolve pelo teto
    // de instâncias, não mentindo sobre a forma.
    for (const id of ["d120", "d50", "d60", "d5", "d3", "d20", "d6", "d2"]) {
      expect(usaEsfera(meta(id)), id).toBe(false);
      expect(formaColisao(meta(id)), id).toBeInstanceOf(CANNON.ConvexPolyhedron);
    }
  });

  it("o raio da esfera fica entre o inscrito e o circunscrito do casco", () => {
    const m = meta("d100");
    const forma = formaColisao(m) as CANNON.Sphere;
    const circunscrito = Math.max(...m.collider.vertices.map(([x, y, z]) => Math.hypot(x, y, z)));
    const inscrito = circunscrito * esfericidade(m);

    expect(forma.radius).toBeGreaterThan(inscrito);
    expect(forma.radius).toBeLessThan(circunscrito);
    // A folga que sobra é menor que 1 mm num dado de 4,56 cm: invisível.
    expect(circunscrito - forma.radius).toBeLessThan(0.1);
  });

  it("o limiar exclui tudo que desvia mais de 5% da esfera", () => {
    for (const id of ["d1", "d2", "d3", "d4", "d5", "d6", "d20", "d50", "d100", "d120"]) {
      const m = meta(id);
      expect(usaEsfera(m), id).toBe(esfericidade(m) >= LIMIAR_ESFERA);
    }
  });
});

describe("colisor da moeda (d2)", () => {
  const moeda = meta("d2");

  function mesa(): CANNON.World {
    const world = new CANNON.World();
    world.gravity.set(0, -981, 0);
    world.allowSleep = true;
    (world.solver as CANNON.GSSolver).iterations = 14;
    world.defaultContactMaterial.friction = 0.45;
    world.defaultContactMaterial.restitution = 0.28;
    const chao = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(chao);
    return world;
  }

  function corpoMoeda(world: CANNON.World): CANNON.Body {
    const corpo = new CANNON.Body({ mass: moeda.mass, shape: formaColisao(moeda), allowSleep: true, linearDamping: 0.06, angularDamping: 0.12 });
    corpo.sleepSpeedLimit = 0.9;
    corpo.sleepTimeLimit = 0.35;
    aplicarInerciaIsotropica(corpo, moeda);
    world.addBody(corpo);
    return corpo;
  }

  const deitada = (corpo: CANNON.Body) => Math.abs(corpo.quaternion.vmult(new CANNON.Vec3(0, 1, 0)).y) > 0.9;

  it("tomba quando é largada em pé, em vez de se equilibrar na borda", () => {
    const world = mesa();
    const corpo = corpoMoeda(world);
    corpo.position.set(0, 1.75, 0);
    corpo.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    for (let i = 0; i < 180; i += 1) world.step(1 / 60);
    expect(deitada(corpo)).toBe(true);
  });

  it("quatro moedas lançadas juntas terminam deitadas e paradas", () => {
    let semente = 7;
    const r = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
    for (let lance = 0; lance < 15; lance += 1) {
      const world = mesa();
      const moedas = Array.from({ length: 4 }, (_, k) => {
        const corpo = corpoMoeda(world);
        corpo.position.set((k - 1.5) * 4.5, 5 + r() * 4, (r() - 0.5) * 3);
        corpo.quaternion.setFromEuler(r() * 6.28, r() * 6.28, r() * 6.28);
        corpo.velocity.set((r() - 0.5) * 80, -r() * 30, (r() - 0.5) * 80);
        corpo.angularVelocity.set((r() - 0.5) * 40, (r() - 0.5) * 40, (r() - 0.5) * 40);
        return corpo;
      });
      for (let i = 0; i < 300; i += 1) world.step(1 / 60);
      for (const corpo of moedas) {
        expect(deitada(corpo)).toBe(true);
        // Na mesa, a moeda deitada não balança (inclinação = eixos X e Z). Moeda que caiu em
        // cima de outra ainda pode oscilar; esse caso é assentado pela fase final da simulação.
        const naMesa = corpo.position.y < 0.35;
        if (naMesa) expect(Math.hypot(corpo.angularVelocity.x, corpo.angularVelocity.z)).toBeLessThan(0.6);
      }
    }
  });

  it("usa poucos lados para não gerar dezenas de contatos com a mesa", () => {
    const forma = formaColisao(moeda) as CANNON.ConvexPolyhedron;
    expect(forma.vertices).toHaveLength(LADOS_MOEDA * 3);
  });
});

describe("colisão entre dados pesados", () => {
  it("d120 bate na mesa com o casco fiel e em outros dados com uma esfera", () => {
    const d120 = meta("d120");
    expect(usaProxyEntreDados(d120)).toBe(true);
    const corpo = new CANNON.Body({ mass: d120.mass });
    adicionarFormasColisao(corpo, d120);
    const [casco, esfera] = corpo.shapes;
    expect(casco).toBeInstanceOf(CANNON.ConvexPolyhedron);
    expect(casco?.collisionFilterMask).toBe(GRUPO_MESA);
    expect(esfera).toBeInstanceOf(CANNON.Sphere);
    expect((esfera!.collisionFilterMask & GRUPO_MESA)).toBe(0);
  });

  it("dados leves e a moeda continuam com uma forma só, colidindo com tudo", () => {
    for (const id of ["d20", "d6", "d2"]) {
      const corpo = new CANNON.Body({ mass: 1 });
      adicionarFormasColisao(corpo, meta(id));
      expect(corpo.shapes).toHaveLength(1);
      expect(corpo.shapes[0]?.collisionFilterMask).toBe(-1);
    }
  });

  it("onze d120 lançados juntos assentam na mesa sem atravessar uns aos outros", () => {
    const d120 = meta("d120");
    const world = new CANNON.World();
    world.gravity.set(0, -981, 0);
    (world.solver as CANNON.GSSolver).iterations = 14;
    const chao = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(chao);
    const corpos = Array.from({ length: 11 }, (_, k) => {
      const corpo = new CANNON.Body({ mass: d120.mass });
      adicionarFormasColisao(corpo, d120);
      aplicarInerciaIsotropica(corpo, d120);
      corpo.position.set((k % 4) * 1.2, 4 + Math.floor(k / 4) * 5, 0);
      world.addBody(corpo);
      return corpo;
    });
    for (let i = 0; i < 240; i += 1) world.step(1 / 60);
    for (const corpo of corpos) expect(corpo.position.y).toBeGreaterThan(0);
    for (let a = 0; a < corpos.length; a += 1) {
      for (let b = a + 1; b < corpos.length; b += 1) {
        expect(corpos[a]!.position.distanceTo(corpos[b]!.position)).toBeGreaterThan(d120.diameterCm * 0.8);
      }
    }
  });
});
