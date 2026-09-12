/**
 * Tipos dos dados 3D. Espelham exatamente o JSON gerado por
 * `blender/export_web.py` e publicado em `public/dice/<id>.json`.
 *
 * Convenções do formato (não alterar sem regerar os assets):
 * - Sistema de coordenadas **Y-up** (glTF), não o Z-up do Blender.
 * - Unidade: **centímetro**. Use gravidade `-981` no mesmo sistema.
 * - A origem de cada malha está no **centroide**. Isso não é detalhe estético:
 *   um corpo rígido cujo centro de massa não coincide com a origem se comporta
 *   como joão-bobo e cai sempre na mesma face.
 */

export type Vec3 = [number, number, number];

/** Quaternion no formato do three.js/cannon-es: `[x, y, z, w]`. */
export type Quat = readonly [number, number, number, number];

/**
 * Como se lê o resultado do dado depois que ele para.
 * - `top`: existe face oposta a cada face, lê-se a virada para cima (d6, d20…).
 * - `bottom`: nenhuma face fica para cima, lê-se a apoiada na mesa (d3, d5, d7).
 * - `apex`: números nos vértices, lê-se o do vértice mais alto (d4).
 */
export type DieReadout = "top" | "bottom" | "apex";

export interface DieCollider {
  /** Vértices do casco convexo, sem o bisel visual. */
  vertices: Vec3[];
  /** Faces como polígonos, anti-horário visto de fora (cannon-es aceita direto). */
  faces: number[][];
  /** As mesmas faces trianguladas, para motores que só aceitam triângulos. */
  indices: Vec3[];
}

export interface DieMeta {
  id: string;
  faces: number;
  /** Nome do sólido geométrico, ex. "Icosaedro (Platonico)". */
  solid: string;
  unit: "cm";
  gravity: number;
  mass: number;
  diameterCm: number;
  readout: DieReadout;
  collider: DieCollider;
  /** Normal externa de cada face numerada, alinhada índice a índice com `values`. */
  faceNormals: Vec3[];
  values: number[];
  /** Só no d4: posição dos vértices numerados. */
  vertexPoints?: Vec3[];
  /** Só no d4: número de cada vértice. */
  vertexValues?: number[];
  /**
   * Razão entre a menor e a maior área de face. `1` prova que o sólido é
   * isoedro — todas as faces congruentes, portanto o dado é honesto.
   */
  faceAreaRatio: number;
}

export interface DiceIndexEntry {
  id: string;
  faces: number;
  solid: string;
  readout: DieReadout;
  diameterCm: number;
  model: string;
  meta: string;
}

export interface DiceIndex {
  unit: "cm";
  gravity: number;
  dice: DiceIndexEntry[];
}
