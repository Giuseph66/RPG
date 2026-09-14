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

import { LIMIAR_ESFERA, esfericidade, formaColisao, usaEsfera } from "./colliderShape";
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
