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

const convencoesPorFace = new WeakMap<DieMeta, DieReadout[]>();

/**
 * Convenção que `lerDado` vai realmente aplicar quando o número `indice` for o
 * resultado — e ela é **por face**, não por dado.
 *
 * `meta.readout` descreve o projeto do sólido, mas a leitura é adaptativa: o
 * topo só perde para a base quando nenhuma face passa do limiar. Então, para
 * uma face marcada `bottom`, a pergunta certa é: deitando ESTA face, sobra
 * alguma virada para cima acima do limiar? Se sobra, quem `lerDado` vai
 * devolver é a de cima — logo, para exibir este número, ele tem que ir para o
 * topo, não para o apoio.
 *
 * Dois casos reais no catálogo:
 * - d100 (Zocchiedro) e d50: toda face tem parceira quase oposta (0.977 e
 *   0.964), então todas viram leitura de topo, apesar do asset dizer `bottom`.
 * - d7 (prisma pentagonal): as duas tampas são exatamente opostas e leem pelo
 *   topo; os cinco lados não têm oposta (0.809) e leem pelo apoio. Mesmo dado,
 *   convenções diferentes por face.
 *
 * Quem inverte a leitura (`upDirectionForValue`) precisa consultar isto. Com as
 * pontas em convenções opostas, o dado assenta exibindo um número que não é o
 * sorteado — era o que acontecia no d100 e nas tampas do d7.
 */
export function convencaoDaFace(
  meta: DieMeta,
  indice: number,
  limiar = LIMIAR_ASSENTADO,
): DieReadout {
  if (meta.readout !== "bottom") return meta.readout;

  let tabela = convencoesPorFace.get(meta);
  if (!tabela) {
    const normais = meta.faceNormals.map((n) => {
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      return [n[0] / l, n[1] / l, n[2] / l] as Vec3;
    });
    tabela = normais.map((apoiada) => {
      let melhorTopo = -Infinity;
      for (const outra of normais) {
        const alinhamento = -(apoiada[0] * outra[0] + apoiada[1] * outra[1] + apoiada[2] * outra[2]);
        if (alinhamento > melhorTopo) melhorTopo = alinhamento;
      }
      return melhorTopo >= limiar ? "top" : "bottom";
    });
    convencoesPorFace.set(meta, tabela);
  }
  return tabela[indice] ?? meta.readout;
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
