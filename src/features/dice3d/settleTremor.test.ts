/**
 * Guarda o bug "o d100 fica tremendo antes de parar".
 *
 * O Zocchiedro é quase esférico: ele não desacelera, vibra. O detector de
 * parada antigo olhava a velocidade instantânea e zerava o contador a cada
 * quadro acima do limiar, então a saída antecipada nunca disparava e a
 * gravação seguia até o teto — medido: 4,25 s, 11 de 12 lançamentos batendo no
 * teto de passos, com ~1°/quadro de tremor sustentado.
 */

import * as CANNON from "cannon-es";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { PASSO, aplicarInerciaIsotropica, simularEGravar, valorExibido } from "./rollSimulation";
import type { DieMeta } from "./types";

/** Mundo equivalente ao da `DiceTable`, sem three.js. */
function mundo(limite: number) {
  const w = new CANNON.World();
  w.gravity.set(0, -981, 0);
  w.allowSleep = true;
  w.broadphase = new CANNON.SAPBroadphase(w);
  (w.solver as CANNON.GSSolver).iterations = 14;
  w.defaultContactMaterial.friction = 0.45;
  w.defaultContactMaterial.restitution = 0.28;
  const dado = new CANNON.Material("dado");
  const mesa = new CANNON.Material("mesa");
  w.addContactMaterial(new CANNON.ContactMaterial(dado, mesa, { friction: 0.55, restitution: 0.3 }));
  const chao = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: mesa });
  chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  w.addBody(chao);
  const rots: Array<[number, number, number]> = [[0, Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, 0, 0], [0, Math.PI, 0]];
  const dest: Array<[number, number, number]> = [[-limite, 0, 0], [limite, 0, 0], [0, 0, -limite], [0, 0, limite]];
  rots.forEach((r, i) => {
    const p = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: mesa });
    p.quaternion.setFromEuler(r[0], r[1], r[2]);
    p.position.set(...dest[i]);
    w.addBody(p);
  });
  return { w, dado };
}

function corpoDe(meta: DieMeta, material: CANNON.Material) {
  const c = new CANNON.Body({
    mass: meta.mass,
    shape: new CANNON.ConvexPolyhedron({
      vertices: meta.collider.vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
      faces: meta.collider.faces as number[][],
    }),
    material, allowSleep: true, linearDamping: 0.06, angularDamping: 0.12,
  });
  c.sleepSpeedLimit = 0.9;
  c.sleepTimeLimit = 0.35;
  aplicarInerciaIsotropica(c, meta);
  return c;
}

function lancamentos(id: string, n: number, limite: number, seed: number) {
  const meta: DieMeta = JSON.parse(fs.readFileSync(`public/dice/${id}.json`, "utf8"));
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const faixa = (m: number) => (rnd() * 2 - 1) * m;
  const maxPassos = Math.round(4 / PASSO);
  const saidas: Array<{ passos: number; estavel: boolean }> = [];

  for (let t = 0; t < n; t += 1) {
    const { w, dado } = mundo(limite);
    const c = corpoDe(meta, dado);
    w.addBody(c);
    // Shoemake: orientação inicial uniforme em SO(3), como `quatUniforme`.
    const [u1, u2, u3] = [rnd(), rnd(), rnd()];
    const [s1, s2] = [Math.sqrt(1 - u1), Math.sqrt(u1)];
    const [t2, t3] = [2 * Math.PI * u2, 2 * Math.PI * u3];
    const imp = limite * 3;
    const { passos } = simularEGravar(
      w, [{ corpo: c, meta }],
      [{
        pos: new CANNON.Vec3(faixa(limite * 0.55), Math.max(16, limite * 1.1), faixa(limite * 0.55)),
        quat: new CANNON.Quaternion(s1 * Math.sin(t2), s1 * Math.cos(t2), s2 * Math.sin(t3), s2 * Math.cos(t3)),
        vel: new CANNON.Vec3(faixa(imp), -imp * 0.25, faixa(imp)),
        angVel: new CANNON.Vec3(faixa(34), faixa(34), faixa(34)),
      }],
      [new CANNON.Quaternion(0, 0, 0, 1)], maxPassos,
    );
    const valor = valorExibido({ corpo: c, meta });
    // A pose entregue tem de ser de repouso: simular mais não pode virar o dado.
    for (let k = 0; k < 180; k += 1) w.step(PASSO);
    saidas.push({ passos, estavel: valorExibido({ corpo: c, meta }) === valor });
  }
  return saidas;
}

describe("assentamento sem tremor", () => {
  it("o d100 para em ~1s em vez de vibrar até o teto de passos", () => {
    const saidas = lancamentos("d100", 24, 19, 777);
    const media = saidas.reduce((a, s) => a + s.passos, 0) / saidas.length;
    const teto = Math.round(4 / PASSO);

    // Antes: média de 255 passos, com 11/12 batendo no teto.
    expect(media).toBeLessThan(120);
    expect(saidas.filter((s) => s.passos >= teto)).toHaveLength(0);
  });

  it("a pose final do d100 é de repouso, não um quadro no meio da vibração", () => {
    // Cortar também o trecho de assentamento economizava tempo mas devolvia
    // pose instável: 16 de 120 dados mudavam de face ao seguir simulando.
    const saidas = lancamentos("d100", 24, 19, 4242);
    expect(saidas.filter((s) => !s.estavel)).toHaveLength(0);
  });

  it("dados poliédricos não são afetados — já paravam sozinhos", () => {
    for (const id of ["d6", "d20"]) {
      const saidas = lancamentos(id, 12, 6, 99);
      const media = saidas.reduce((a, s) => a + s.passos, 0) / saidas.length;
      expect(media, id).toBeLessThan(70); // medido: ~48 passos, antes e depois
      expect(saidas.filter((s) => !s.estavel), id).toHaveLength(0);
    }
  });
});
