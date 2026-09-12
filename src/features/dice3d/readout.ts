/**
 * Leitura do resultado de um dado 3D a partir da sua orientação final.
 *
 * Módulo **puro**: sem three.js, sem cannon-es, sem DOM. Recebe o metadado do
 * dado e um quaternion e devolve o número — o que torna a regra testável sem
 * subir cena nenhuma.
 */

import type { DieMeta, DieReadout, Quat, Vec3 } from "./types";

/**
 * Alinhamento mínimo (produto escalar com o eixo vertical) para considerar que
 * uma face está de fato virada para cima. Abaixo disso o dado ou está tombado
 * ou é de um tipo que não tem face superior.
 */
export const LIMIAR_ASSENTADO = 0.9;

/** Rotaciona um vetor por um quaternion `[x, y, z, w]`. */
export function rotacionar(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  // t = 2 * (qv x v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

export interface LeituraDado {
  /** Número sorteado. */
  value: number;
  /** Quão bem a face de referência está alinhada ao eixo vertical (0..1). */
  alignment: number;
  /** Convenção efetivamente usada nesta leitura. */
  convention: DieReadout;
  /** `false` quando o dado parou torto (encostado em algo, por exemplo). */
  settled: boolean;
}

/**
 * Lê o dado assentado.
 *
 * A convenção não é fixa por tipo: tenta-se sempre a face superior e só se cai
 * para a face de apoio quando nenhuma face aponta para cima. É assim que o d4
 * (tetraedro) e o d7 (prisma) funcionam de verdade — neles nunca há face no
 * topo. O `meta.readout === "apex"` é o único caso decidido de antemão, porque
 * ali os números estão nos vértices, não nas faces.
 */
export function lerDado(
  meta: DieMeta,
  q: Quat,
  limiar = LIMIAR_ASSENTADO,
): LeituraDado {
  const normaisY = meta.faceNormals.map((n) => rotacionar(q, n)[1]);

  let iTopo = 0;
  let iBase = 0;
  for (let i = 1; i < normaisY.length; i += 1) {
    if (normaisY[i] > normaisY[iTopo]) iTopo = i;
    if (normaisY[i] < normaisY[iBase]) iBase = i;
  }
  const apoio = -normaisY[iBase];

  if (meta.readout === "apex") {
    const pontos = meta.vertexPoints;
    const valores = meta.vertexValues;
    if (!pontos || !valores || pontos.length === 0) {
      throw new Error(`Dado "${meta.id}" é apex mas não traz vertexPoints`);
    }
    let melhor = 0;
    let alturaMax = -Infinity;
    for (let i = 0; i < pontos.length; i += 1) {
      const y = rotacionar(q, pontos[i])[1];
      if (y > alturaMax) {
        alturaMax = y;
        melhor = i;
      }
    }
    return {
      value: valores[melhor],
      alignment: apoio,
      convention: "apex",
      settled: apoio >= limiar,
    };
  }

  if (normaisY[iTopo] >= limiar) {
    return {
      value: meta.values[iTopo],
      alignment: normaisY[iTopo],
      convention: "top",
      settled: true,
    };
  }

  return {
    value: meta.values[iBase],
    alignment: apoio,
    convention: "bottom",
    settled: apoio >= limiar,
  };
}

/**
 * `true` quando o sólido é isoedro (todas as faces congruentes) e portanto o
 * dado é matematicamente honesto. Dados como o d7 (prisma) e os d3/d5
 * arredondados são `false`: a probabilidade depende da geometria, não da
 * contagem de faces.
 */
export function ehHonesto(meta: DieMeta, tolerancia = 1e-3): boolean {
  return Math.abs(1 - meta.faceAreaRatio) <= tolerancia;
}
