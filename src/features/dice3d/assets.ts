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
  const p = buscarJson<DieMeta>(`${base}/${id}.json`).then(normalizarMeta);
  cacheMeta.set(chave, p);
  return p;
}

/**
 * O d10 físico grava "0" na face que vale 10. O asset segue o objeto real, mas
 * o resultado da rolagem tem de ficar em 1..N: sem isto o 10 virava 0 e a
 * validação recusava a rolagem inteira.
 */
export function normalizarMeta(meta: DieMeta): DieMeta {
  if (!meta.values.includes(0) || meta.values.includes(meta.faces)) return meta;
  return { ...meta, values: meta.values.map((v) => (v === 0 ? meta.faces : v)) };
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
