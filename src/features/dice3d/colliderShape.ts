/**
 * Escolha da forma de colisão de cada dado.
 *
 * O casco convexo publicado é fiel, mas a colisão convexo-convexo do cannon-es
 * compara vértice a vértice: um par custa O(V²) e uma leva de `n` dados custa
 * O(n²·V²). Medido numa queda de 4 s, o d100 (196 vértices) gasta 9 ms com um
 * exemplar, 4,2 s com três e 9,2 s com dez — inviável em mesa cheia.
 *
 * Para um sólido quase esférico a esfera é um colisor honesto, não um atalho:
 * o desvio geométrico fica abaixo da folga de contato, e a colisão passa a
 * custar O(1) por par. O que decide o número não muda — `lerDado` mede a
 * orientação do corpo contra as normais das faces, sem consultar o colisor.
 */

import * as CANNON from "cannon-es";

import type { DieMeta } from "./types";

/**
 * Razão entre o raio inscrito (centro→face) e o circunscrito (centro→vértice)
 * a partir da qual o casco é trocado por uma esfera.
 *
 * É a medida certa de "parece uma esfera": comparar raios de vértices daria
 * 1,0 para qualquer poliedro regular, inclusive o cubo. Nesta escala o cubo dá
 * 0,577, o d20 dá 0,795, o Zocchiedro do d100 dá 0,963 e o d1 dá 0,996.
 *
 * Em 0,95 entram só o d1 (esfera de fato) e o d100. O d120 (0,905), o d60
 * (0,925) e o d50 (0,926) ficam de fora: com ~8% de desvio a esfera mudaria
 * como eles tombam. O d5 (0,898) e o d3 (0,797) também ficam de fora, apesar
 * dos colisores pesados — não são esféricos, e trocá-los seria falsear a queda.
 */
export const LIMIAR_ESFERA = 0.95;

/**
 * Quão perto de uma esfera o casco está: `raioInscrito / raioCircunscrito`.
 * `1` é a esfera exata; quanto menor, mais facetado o sólido.
 */
export function esfericidade(meta: DieMeta): number {
  const vertices = meta.collider.vertices;
  const circunscrito = Math.max(...vertices.map(([x, y, z]) => Math.hypot(x, y, z)));
  if (!Number.isFinite(circunscrito) || circunscrito <= 0) return 0;

  let inscrito = Infinity;
  for (const face of meta.collider.faces) {
    if (face.length < 3) continue;
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
    const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
    const n = [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0],
    ] as const;
    const comprimento = Math.hypot(n[0], n[1], n[2]);
    if (comprimento < 1e-9) continue;
    // Distância do centro ao plano da face.
    inscrito = Math.min(
      inscrito,
      Math.abs((a[0] * n[0] + a[1] * n[1] + a[2] * n[2]) / comprimento),
    );
  }
  return Number.isFinite(inscrito) ? inscrito / circunscrito : 0;
}

/** `true` quando o casco é esférico o bastante para a esfera substituí-lo. */
export function usaEsfera(meta: DieMeta): boolean {
  return esfericidade(meta) >= LIMIAR_ESFERA;
}

/**
 * Raio da esfera equivalente: a média entre o inscrito e o circunscrito.
 *
 * O sólido repousa apoiado numa face, com o centro a `inscrito` do chão, e sua
 * silhueta chega a `circunscrito`. A média divide a diferença — no d100 sobra
 * menos de 0,05 cm de folga num dado de 4,56 cm, abaixo do que a tela mostra.
 */
function raioEquivalente(meta: DieMeta): number {
  const vertices = meta.collider.vertices;
  const circunscrito = Math.max(...vertices.map(([x, y, z]) => Math.hypot(x, y, z)));
  return (circunscrito * esfericidade(meta) + circunscrito) / 2;
}

/**
 * Forma de colisão do dado: esfera para os quase esféricos, casco convexo para
 * o resto.
 *
 * As faces do casco já vêm como polígonos em ordem anti-horária vista de fora
 * — usar os polígonos em vez dos triângulos reduz pela metade o custo de
 * colisão em dados como o d120.
 */
/**
 * Lados do anel da moeda. Poucos vértices = poucos contatos com a mesa e colisão
 * moeda-moeda barata: com 11 moedas, 16 lados custavam ~0,8 s de pré-simulação
 * (pior caso 1,6 s) e 8 lados custam ~75 ms. A malha exibida continua redonda.
 */
export const LADOS_MOEDA = 10;
/** Raio das faces planas em relação ao da borda; o resto vira chanfro até a quina central. */
const RAIO_FACE_MOEDA = 0.86;

/**
 * Colisor do d2 (moeda). O casco publicado tem 64 lados de borda, cada um um
 * retângulo plano de ~0,17 × 0,5 cm: a moeda conseguia assentar em pé sobre um
 * deles — e aí não há face para cima para ler. As duas faces com 64 vértices
 * coplanares também geravam dezenas de contatos simultâneos, e o solver
 * alternava entre eles (o tremor ao assentar).
 *
 * Aqui a borda vira uma quina: dois chanfros que se encontram no equador. Em pé
 * a moeda se apoia numa linha e tomba; apoiada num chanfro, o centro de massa
 * cai fora da face e ela deita. As faces planas continuam na mesma altura, então
 * a moeda deitada fica igual na tela, e a leitura usa `faceNormals`, que não muda.
 */
function colisorMoeda(meta: DieMeta): CANNON.ConvexPolyhedron {
  const vertices = meta.collider.vertices;
  const raio = Math.max(...vertices.map(([x, , z]) => Math.hypot(x, z)));
  const meiaEspessura = Math.max(...vertices.map(([, y]) => Math.abs(y)));
  const aneis = [
    { y: meiaEspessura, r: raio * RAIO_FACE_MOEDA },
    { y: 0, r: raio },
    { y: -meiaEspessura, r: raio * RAIO_FACE_MOEDA },
  ];
  const pontos = aneis.flatMap(({ y, r }) => Array.from({ length: LADOS_MOEDA }, (_, i) => {
    const angulo = (2 * Math.PI * i) / LADOS_MOEDA;
    return new CANNON.Vec3(r * Math.cos(angulo), y, r * Math.sin(angulo));
  }));
  const idx = (anel: number, i: number) => anel * LADOS_MOEDA + (i % LADOS_MOEDA);
  const faces: number[][] = [
    Array.from({ length: LADOS_MOEDA }, (_, i) => idx(0, i)),
    Array.from({ length: LADOS_MOEDA }, (_, i) => idx(2, i)),
  ];
  for (let i = 0; i < LADOS_MOEDA; i += 1) {
    faces.push([idx(0, i), idx(0, i + 1), idx(1, i + 1), idx(1, i)]);
    faces.push([idx(1, i), idx(1, i + 1), idx(2, i + 1), idx(2, i)]);
  }
  // Cada face em ordem anti-horária vista de fora: normal (Newell) apontando para longe do centro.
  const orientadas = faces.map((face) => {
    let nx = 0; let ny = 0; let nz = 0; let cx = 0; let cy = 0; let cz = 0;
    face.forEach((a, k) => {
      const p = pontos[a];
      const q = pontos[face[(k + 1) % face.length]];
      nx += (p.y - q.y) * (p.z + q.z);
      ny += (p.z - q.z) * (p.x + q.x);
      nz += (p.x - q.x) * (p.y + q.y);
      cx += p.x; cy += p.y; cz += p.z;
    });
    return nx * cx + ny * cy + nz * cz >= 0 ? face : [...face].reverse();
  });
  return new CANNON.ConvexPolyhedron({ vertices: pontos, faces: orientadas });
}

export function formaColisao(meta: DieMeta): CANNON.Shape {
  if (meta.faces === 2) return colisorMoeda(meta);
  if (usaEsfera(meta)) return new CANNON.Sphere(raioEquivalente(meta));
  return new CANNON.ConvexPolyhedron({
    vertices: meta.collider.vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
    faces: meta.collider.faces as number[][],
  });
}

/**
 * Grupos de colisão. A mesa (chão e paredes) usa o grupo padrão do cannon-es.
 * `DADO` é o grupo de quem colide com tudo; `CASCO_SO_MESA` é o casco fiel de um
 * dado pesado, que só encosta na mesa.
 */
export const GRUPO_MESA = 1;
export const GRUPO_DADO = 2;
export const GRUPO_CASCO_SO_MESA = 8;

/**
 * Acima disto, o choque casco-contra-casco entre dados fica caro demais: a colisão
 * convexo-convexo do cannon-es cresce com vértices × vértices por par. Medido com 11
 * exemplares: d120 (62 vértices) levava ~2,5 s de pré-simulação, pior caso 5,7 s,
 * contra 35 ms do d20 (12 vértices).
 */
export const VERTICES_PROXY_ESFERA = 30;

/** `true` quando o dado usa esfera para bater em outros dados (casco só contra a mesa). */
export function usaProxyEntreDados(meta: DieMeta): boolean {
  return meta.faces !== 2 && !usaEsfera(meta) && meta.collider.vertices.length >= VERTICES_PROXY_ESFERA;
}

/**
 * Coloca no corpo as formas de colisão do dado.
 *
 * Dados pesados ganham duas formas: o casco fiel, que só colide com a mesa — é
 * ele que decide em que face o dado deita e, portanto, o resultado —, e uma
 * esfera equivalente, que só colide com outros dados. Dado contra dado vira
 * esfera contra esfera (O(1) por par); a diferença de silhueta (<5% do raio)
 * só aparece como uma folga mínima quando dois dados se encostam.
 */
export function adicionarFormasColisao(corpo: CANNON.Body, meta: DieMeta): void {
  const casco = formaColisao(meta);
  if (!usaProxyEntreDados(meta)) {
    casco.collisionFilterGroup = GRUPO_DADO;
    casco.collisionFilterMask = -1;
    corpo.addShape(casco);
    return;
  }
  casco.collisionFilterGroup = GRUPO_CASCO_SO_MESA;
  casco.collisionFilterMask = GRUPO_MESA;
  const esfera = new CANNON.Sphere(raioEquivalente(meta));
  esfera.collisionFilterGroup = GRUPO_DADO;
  esfera.collisionFilterMask = GRUPO_DADO;
  corpo.addShape(casco);
  corpo.addShape(esfera);
}
