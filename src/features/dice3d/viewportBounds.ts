/**
 * Área jogável que cabe dentro do enquadramento da câmera.
 *
 * Sem isso, a mesa tinha uma caixa fixa em centímetros: numa tela estreita
 * (celular em pé) o campo de visão horizontal é bem menor que o vertical, e o
 * dado ia parar numa região que existe na física mas não aparece na tela.
 */

import * as THREE from "three";

/** Folga entre a parede e a borda visível, para o dado nunca raspar a tela. */
export const MARGEM_PAREDE = 3; // cm
/** Piso de segurança: uma área menor que isso não caberia nem um dado grande. */
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
  return {
    x: Math.max(LIMITE_MINIMO, Math.min(maximo, minX - MARGEM_PAREDE)),
    z: Math.max(LIMITE_MINIMO, Math.min(maximo, minZ - MARGEM_PAREDE)),
  };
}
