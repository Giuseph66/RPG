/**
 * Área jogável que cabe dentro do enquadramento da câmera.
 *
 * Sem isso, a mesa tinha uma caixa fixa em centímetros: numa tela estreita
 * (celular em pé) o campo de visão horizontal é bem menor que o vertical, e o
 * dado ia parar numa região que existe na física mas não aparece na tela.
 */

import * as THREE from "three";

/**
 * Folga máxima entre a parede e a borda visível, para o dado nunca raspar a
 * tela. É um **teto**, não um valor fixo: numa área pequena, descontar 3 cm de
 * cada lado comia quase todo o chão jogável (numa meia-largura visível de
 * 4,4 cm sobravam 1,4 cm), então a folga vira proporcional abaixo desse ponto.
 */
export const MARGEM_PAREDE = 3; // cm
/** Fração da área visível usada como folga enquanto ela for menor que `MARGEM_PAREDE`. */
const FRACAO_MARGEM = 0.16;
/**
 * Piso de segurança padrão: uma área menor que isso não caberia nem um dado
 * grande. Um palco pequeno (um dado só, enquadramento de herói) pode baixar
 * este piso pelo parâmetro `minimo`.
 */
export const LIMITE_MINIMO = 7; // cm

export interface LimitesMesa {
  /** Meia-largura utilizável em X, em cm. */
  readonly x: number;
  /** Meia-profundidade utilizável em Z, em cm. */
  readonly z: number;
}

/**
 * Calcula a caixa jogável a partir do que a câmera enxerga no plano do chão.
 *
 * Lança um raio pelos quatro cantos da tela até `y = 0` e usa a caixa
 * INSCRITA — o menor |x| e o menor |z| entre os cantos. Assim todo ponto
 * dentro da caixa está garantidamente visível, em qualquer proporção de tela;
 * a caixa circunscrita cobriria regiões fora do quadro.
 */
export function limitesVisiveis(
  camera: THREE.PerspectiveCamera,
  maximo: number,
  minimo: number = LIMITE_MINIMO,
): LimitesMesa {
  camera.updateMatrixWorld();
  const origem = camera.position;
  let minX = Infinity;
  let minZ = Infinity;

  for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const dir = new THREE.Vector3(nx, ny, 0.5).unproject(camera).sub(origem).normalize();
    if (dir.y > -1e-4) continue; // raio não desce: nunca cruza o chão
    const t = -origem.y / dir.y;
    if (t <= 0) continue;
    minX = Math.min(minX, Math.abs(origem.x + dir.x * t));
    minZ = Math.min(minZ, Math.abs(origem.z + dir.z * t));
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return { x: maximo, z: maximo };
  }
  return { x: utilizavel(minX, maximo, minimo), z: utilizavel(minZ, maximo, minimo) };
}

/**
 * Converte uma extensão visível na meia-medida jogável.
 *
 * O piso `minimo` nunca pode ultrapassar o que a câmera enxerga: era assim que
 * a parede acabava fora do quadro num palco estreito (celular em pé, meia-
 * largura visível de 3,3 cm contra um piso de 4,5 cm) e o dado sumia da tela
 * sem ter saído da física.
 */
function utilizavel(extensao: number, maximo: number, minimo: number): number {
  const margem = Math.min(MARGEM_PAREDE, extensao * FRACAO_MARGEM);
  return Math.min(maximo, extensao, Math.max(minimo, extensao - margem));
}

/**
 * Meia-medida de arena necessária para `quantidade` dados de `larguraDado`
 * caberem com espaço para rolar.
 *
 * Cada dado recebe uma célula quadrada de `folga` larguras, então a **área**
 * cresce com a contagem e o **lado** com a raiz dela. Sem isso a arena teria de
 * ser escolhida para o pior caso e ficaria vazia demais no caso comum (um dado
 * só), que é quando o dado precisa parecer grande.
 */
export function alvoParaDados(
  larguraDado: number,
  quantidade: number,
  maximo: number,
  folga: number,
): number {
  if (quantidade <= 0 || larguraDado <= 0) return 0;
  return Math.min(maximo, (larguraDado * folga * Math.sqrt(quantidade)) / 2);
}

/**
 * Menor distância de câmera, dentro de `faixa`, cuja área visível comporta
 * `alvo`. Devolve o extremo distante quando nem ele alcança.
 *
 * É varredura e não fórmula fechada porque a área visível depende da proporção
 * da tela — a mesma distância rende arenas diferentes num palco largo e num
 * estreito, e `limitesVisiveis` já resolve isso.
 */
export function distanciaQueComporta(
  limitesEm: (distancia: number) => LimitesMesa,
  alvo: number,
  faixa: readonly [number, number],
  passo = 0.05,
): number {
  const [perto, longe] = faixa;
  for (let d = perto; d <= longe + 1e-9; d += passo) {
    const { x, z } = limitesEm(d);
    if (Math.min(x, z) >= alvo) return d;
  }
  return longe;
}
