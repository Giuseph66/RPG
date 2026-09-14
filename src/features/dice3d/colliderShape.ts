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
export function formaColisao(meta: DieMeta): CANNON.Shape {
  if (usaEsfera(meta)) return new CANNON.Sphere(raioEquivalente(meta));
  return new CANNON.ConvexPolyhedron({
    vertices: meta.collider.vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z)),
    faces: meta.collider.faces as number[][],
  });
}
