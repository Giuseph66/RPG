/**
 * Prova que a face exibida no fim da queda é exatamente o valor pedido.
 *
 * Usa os colisores REAIS exportados do Blender (`public/dice/*.json`) e um
 * mundo cannon-es montado igual ao da mesa — sem three.js, sem WebGL. É o
 * teste que guarda o bug de "o número no dado não bate com o resultado".
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as CANNON from "cannon-es";
import { describe, expect, it } from "vitest";

import { lerDado } from "./readout";
import {
  aplicarInerciaIsotropica,
  simularAlinhado,
  type DadoSimulavel,
  type PoseInicial,
} from "./rollSimulation";
import type { DieMeta, Quat } from "./types";

function carregarMeta(id: string): DieMeta {
  const caminho = join(process.cwd(), "public", "dice", `${id}.json`);
  return JSON.parse(readFileSync(caminho, "utf8")) as DieMeta;
}

/** Mundo equivalente ao de `DiceTable.montarMundo`. */
function montarMundo(limite = 20): CANNON.World {
  const world = new CANNON.World();
  world.gravity.set(0, -981, 0);
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);
  (world.solver as CANNON.GSSolver).iterations = 14;
  world.defaultContactMaterial.friction = 0.45;
  world.defaultContactMaterial.restitution = 0.28;

  const chao = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  chao.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(chao);

  const paredes: Array<[CANNON.Vec3, [number, number, number]]> = [
    [new CANNON.Vec3(-limite, 0, 0), [0, Math.PI / 2, 0]],
    [new CANNON.Vec3(limite, 0, 0), [0, -Math.PI / 2, 0]],
    [new CANNON.Vec3(0, 0, -limite), [0, 0, 0]],
    [new CANNON.Vec3(0, 0, limite), [0, Math.PI, 0]],
  ];
  for (const [pos, rot] of paredes) {
    const p = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    p.position.copy(pos);
    p.quaternion.setFromEuler(rot[0], rot[1], rot[2]);
    world.addBody(p);
  }
  return world;
}

function criarDado(world: CANNON.World, meta: DieMeta): DadoSimulavel {
  const corpo = new CANNON.Body({
    mass: meta.mass,
    shape: new CANNON.ConvexPolyhedron({
      vertices: meta.collider.vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
      faces: meta.collider.faces as number[][],
    }),
    allowSleep: true,
    linearDamping: 0.06,
    angularDamping: 0.12,
  });
  corpo.sleepSpeedLimit = 0.9;
  corpo.sleepTimeLimit = 0.35;
  aplicarInerciaIsotropica(corpo, meta);
  world.addBody(corpo);
  return { corpo, meta };
}

/** Gerador determinístico, para o teste não ficar instável entre execuções. */
function rngSemente(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sortearPose(random: () => number, indice: number, total: number): PoseInicial {
  const ang = (indice / total) * Math.PI * 2 + random();
  const raio = 8 * (0.35 + 0.65 * random());
  const u1 = random();
  const u2 = random();
  const u3 = random();
  const s1 = Math.sqrt(1 - u1);
  const s2 = Math.sqrt(u1);
  const faixa = (m: number) => (random() * 2 - 1) * m;
  return {
    pos: new CANNON.Vec3(Math.cos(ang) * raio, 22 + random() * 6, Math.sin(ang) * raio),
    quat: new CANNON.Quaternion(
      s1 * Math.sin(2 * Math.PI * u2),
      s1 * Math.cos(2 * Math.PI * u2),
      s2 * Math.sin(2 * Math.PI * u3),
      s2 * Math.cos(2 * Math.PI * u3),
    ),
    vel: new CANNON.Vec3(faixa(45), -12, faixa(45)),
    angVel: new CANNON.Vec3(faixa(22), faixa(22), faixa(22)),
  };
}

const OPCOES = { maxPassos: 480 };

function valorFinal(dado: DadoSimulavel): number {
  const q = dado.corpo.quaternion;
  return lerDado(dado.meta, [q.x, q.y, q.z, q.w] as Quat).value;
}

describe("simularAlinhado — o dado assenta no valor pedido", () => {
  it.each(["d6", "d20", "d8", "d12", "d10", "d4"])(
    "%s termina exibindo cada valor pedido",
    (id) => {
      const meta = carregarMeta(id);
      const alvos = meta.readout === "apex" ? meta.vertexValues! : meta.values;

      for (let i = 0; i < alvos.length; i += 1) {
        const desejado = alvos[i];
        const world = montarMundo();
        const dado = criarDado(world, meta);
        const random = rngSemente(1000 + i);
        const pose = sortearPose(random, 0, 1);

        const r = simularAlinhado(world, [dado], [pose], [desejado], OPCOES);

        expect(r.alinhado).toBe(true);
        expect(valorFinal(dado)).toBe(desejado);
      }
    },
  );

  it("resolve com uma única simulação, sem repetir a queda", () => {
    const meta = carregarMeta("d20");
    const world = montarMundo();
    const dado = criarDado(world, meta);
    const pose = sortearPose(rngSemente(7), 0, 1);

    const r = simularAlinhado(world, [dado], [pose], [13], OPCOES);

    expect(r.alinhado).toBe(true);
    // a correção é aplicada na gravação (rotação de simetria do casco), então
    // a física roda uma vez só — não há busca iterativa que possa divergir
    expect(r.simulacoes).toBe(1);
  });

  it("vários dados colidindo entre si terminam todos no valor pedido", () => {
    const meta = carregarMeta("d6");
    const world = montarMundo();
    const dados = [0, 1, 2, 3].map(() => criarDado(world, meta));
    const random = rngSemente(99);
    const poses = dados.map((_, k) => sortearPose(random, k, dados.length));
    const desejados = [1, 4, 6, 3];

    const r = simularAlinhado(world, dados, poses, desejados, OPCOES);

    expect(r.alinhado).toBe(true);
    expect(dados.map(valorFinal)).toEqual(desejados);
  });

  it("a gravação termina na mesma pose que produziu o valor lido", () => {
    const meta = carregarMeta("d20");
    const world = montarMundo();
    const dado = criarDado(world, meta);
    const pose = sortearPose(rngSemente(5), 0, 1);

    const r = simularAlinhado(world, [dado], [pose], [20], OPCOES);
    const t = r.gravacao.trilhas[0];
    const base = (r.gravacao.passos - 1) * 7;
    const doUltimoQuadro: Quat = [t[base + 3], t[base + 4], t[base + 5], t[base + 6]];

    // o que a tela vai exibir no último quadro é o mesmo que o corpo reporta
    expect(lerDado(meta, doUltimoQuadro).value).toBe(20);
    expect(valorFinal(dado)).toBe(20);
  });

  it("sem valores pedidos, deixa a física decidir livremente", () => {
    const meta = carregarMeta("d20");
    const world = montarMundo();
    const dado = criarDado(world, meta);
    const pose = sortearPose(rngSemente(3), 0, 1);

    const r = simularAlinhado(world, [dado], [pose], undefined, OPCOES);

    expect(r.simulacoes).toBe(1);
    expect(meta.values).toContain(r.valores[0]);
  });
});
