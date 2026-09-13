/**
 * Controle de aparência dos dados: cor, texturas e acabamento.
 *
 * O GLB traz duas malhas por dado — o corpo (`<id>`) e os números
 * (`<id>_num`) — cada uma com seu material, então dá para texturizar o corpo
 * sem mexer na cor dos números. O corpo vem com **UV** (Smart UV Project, uma
 * ilha por face) e com o atributo `COLOR_0` da rampa de cor por face, que só é
 * aplicado se `vertexColors` for ligado.
 */

import * as THREE from "three";

export interface DieAppearance {
  /** Cor base do corpo. Multiplica `map` quando há textura. */
  color?: THREE.ColorRepresentation;
  /** Textura difusa do corpo. */
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  /** Usa a rampa de cor por face que veio do Blender. */
  vertexColors?: boolean;
  roughness?: number;
  metalness?: number;
  /** Verniz por cima, como resina de dado real. */
  clearcoat?: number;
  clearcoatRoughness?: number;
  /** `> 0` deixa o dado translúcido, tipo gema. */
  transmission?: number;
  ior?: number;
  /** Cor e acabamento dos algarismos. */
  numberColor?: THREE.ColorRepresentation;
  numberRoughness?: number;
  numberMetalness?: number;
  /** Cor das arestas do corpo (destaque tipo "linha dourada"). `null` desliga. */
  edgeColor?: THREE.ColorRepresentation | null;
  edgeOpacity?: number;
}

export const APARENCIA_PADRAO: DieAppearance = {
  color: "#ffffff",
  vertexColors: true,
  roughness: 0.1,
  metalness: 0,
  clearcoat: 0.85,
  clearcoatRoughness: 0.04,
  numberColor: "#f7f7fa",
  numberRoughness: 0.35,
  numberMetalness: 0,
  edgeColor: "#ffe9b0",
  edgeOpacity: 0.55,
};

/**
 * Acabamento da mesa do app: obsidiana com algarismos em bronze, a mesma
 * dupla da moeda do d20 e do resto do mobiliário. Desliga a rampa de cor por
 * face que vem do GLB (`vertexColors`), senão o dado sai colorido de fábrica
 * e briga com a paleta.
 */
export const APARENCIA_MESA: DieAppearance = {
  color: "#14100d",
  vertexColors: false,
  roughness: 0.34,
  metalness: 0.32,
  clearcoat: 0.7,
  clearcoatRoughness: 0.12,
  numberColor: "#D0AB72",
  numberRoughness: 0.3,
  numberMetalness: 0.55,
  edgeColor: "#D0AB72",
  edgeOpacity: 0.85,
};

const carregadorTextura = new THREE.TextureLoader();

/**
 * Carrega uma textura já com o espaço de cor certo. Use `colorSpace: "srgb"`
 * para mapas de cor e o padrão linear para normal/roughness — trocar isso é a
 * causa mais comum de textura lavada ou relevo errado.
 */
export async function carregarTextura(
  url: string,
  opcoes: { colorSpace?: "srgb" | "linear"; repeat?: number } = {},
): Promise<THREE.Texture> {
  const tex = await carregadorTextura.loadAsync(url);
  tex.colorSpace =
    opcoes.colorSpace === "linear" ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (opcoes.repeat) tex.repeat.set(opcoes.repeat, opcoes.repeat);
  tex.needsUpdate = true;
  return tex;
}

export function criarMaterialCorpo(a: DieAppearance): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    color: a.color ?? "#ffffff",
    map: a.map ?? null,
    normalMap: a.normalMap ?? null,
    roughnessMap: a.roughnessMap ?? null,
    vertexColors: a.vertexColors ?? false,
    roughness: a.roughness ?? 0.1,
    metalness: a.metalness ?? 0,
    clearcoat: a.clearcoat ?? 0,
    clearcoatRoughness: a.clearcoatRoughness ?? 0.05,
  });
  if (a.transmission) {
    m.transmission = a.transmission;
    m.ior = a.ior ?? 1.5;
    m.thickness = 1;
  }
  return m;
}

export function criarMaterialNumeros(a: DieAppearance): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: a.numberColor ?? "#f7f7fa",
    roughness: a.numberRoughness ?? 0.35,
    metalness: a.numberMetalness ?? 0,
  });
}

/** Linha das arestas do corpo, por cima do material físico — dá contorno ao dado. */
export function criarMaterialArestas(a: DieAppearance): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: a.edgeColor ?? "#ffe9b0",
    transparent: true,
    opacity: a.edgeOpacity ?? 0.6,
    depthTest: true,
  });
}

/** Aplica mudanças de aparência num material já em cena, sem recriá-lo. */
export function atualizarMaterialCorpo(
  m: THREE.MeshPhysicalMaterial,
  a: DieAppearance,
): void {
  if (a.color !== undefined) m.color.set(a.color);
  if (a.map !== undefined) m.map = a.map;
  if (a.normalMap !== undefined) m.normalMap = a.normalMap;
  if (a.roughnessMap !== undefined) m.roughnessMap = a.roughnessMap;
  if (a.vertexColors !== undefined) m.vertexColors = a.vertexColors;
  if (a.roughness !== undefined) m.roughness = a.roughness;
  if (a.metalness !== undefined) m.metalness = a.metalness;
  if (a.clearcoat !== undefined) m.clearcoat = a.clearcoat;
  if (a.clearcoatRoughness !== undefined) m.clearcoatRoughness = a.clearcoatRoughness;
  if (a.transmission !== undefined) {
    m.transmission = a.transmission;
    m.thickness = a.transmission > 0 ? 1 : 0;
  }
  if (a.ior !== undefined) m.ior = a.ior;
  m.needsUpdate = true;
}

/** Aplica mudanças de cor/opacidade nas arestas sem recriar o material. */
export function atualizarMaterialArestas(m: THREE.LineBasicMaterial, a: DieAppearance): void {
  if (a.edgeColor !== undefined && a.edgeColor !== null) m.color.set(a.edgeColor);
  if (a.edgeOpacity !== undefined) m.opacity = a.edgeOpacity;
  m.needsUpdate = true;
}
