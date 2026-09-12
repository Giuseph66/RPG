/**
 * Carregamento dos assets dos dados publicados em `public/dice/`.
 *
 * Cada dado é um par independente: `<id>.glb` (malha do corpo + malha dos
 * números, materiais separados) e `<id>.json` (colisor, mapa face → número).
 * Dá para usar um dado sozinho sem baixar os outros.
 */

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { DiceIndex, DieMeta } from "./types";

export const CAMINHO_PADRAO = "/dice";

const cacheMeta = new Map<string, Promise<DieMeta>>();
const cacheModelo = new Map<string, Promise<GLTF>>();
const carregador = new GLTFLoader();

async function buscarJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Falha ao carregar ${url}: ${r.status} ${r.statusText}`);
  }
  return (await r.json()) as T;
}

/** Catálogo com todos os dados disponíveis. */
export function carregarIndice(base = CAMINHO_PADRAO): Promise<DiceIndex> {
  return buscarJson<DiceIndex>(`${base}/index.json`);
}

/** Metadados de um dado (colisor, normais, valores). Memoizado por id. */
export function carregarMeta(id: string, base = CAMINHO_PADRAO): Promise<DieMeta> {
  const chave = `${base}/${id}`;
  const existente = cacheMeta.get(chave);
  if (existente) return existente;
  const p = buscarJson<DieMeta>(`${base}/${id}.json`);
  cacheMeta.set(chave, p);
  return p;
}

/** Malha glTF de um dado. Memoizado por id. */
export function carregarModelo(id: string, base = CAMINHO_PADRAO): Promise<GLTF> {
  const chave = `${base}/${id}`;
  const existente = cacheModelo.get(chave);
  if (existente) return existente;
  const p = carregador.loadAsync(`${base}/${id}.glb`);
  cacheModelo.set(chave, p);
  return p;
}

export interface AssetDado {
  meta: DieMeta;
  gltf: GLTF;
}

export async function carregarDado(
  id: string,
  base = CAMINHO_PADRAO,
): Promise<AssetDado> {
  const [meta, gltf] = await Promise.all([
    carregarMeta(id, base),
    carregarModelo(id, base),
  ]);
  return { meta, gltf };
}

/** Esvazia os caches. Útil em testes e em hot reload. */
export function limparCache(): void {
  cacheMeta.clear();
  cacheModelo.clear();
}
