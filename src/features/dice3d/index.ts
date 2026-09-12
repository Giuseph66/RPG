/**
 * Dados 3D com física. Camada de **apresentação** — não substitui o Dice
 * Engine de `@domain/dice`, que continua sendo a autoridade sobre expressões,
 * rerolls e `rngVersion`.
 *
 * Assets em `public/dice/`: um `.glb` e um `.json` por dado, independentes.
 * Regerar com `blender/export_web.py`.
 */

export { Dice3D, type Dice3DHandle, type Dice3DProps } from "./Dice3D";
export {
  DiceTable,
  type DiceTableOptions,
  type RollOptions,
  type RollOutcome,
} from "./DiceTable";
export {
  APARENCIA_PADRAO,
  atualizarMaterialCorpo,
  carregarTextura,
  criarMaterialCorpo,
  criarMaterialNumeros,
  type DieAppearance,
} from "./appearance";
export {
  CAMINHO_PADRAO,
  carregarDado,
  carregarIndice,
  carregarMeta,
  carregarModelo,
  limparCache,
  type AssetDado,
} from "./assets";
export { ehHonesto, lerDado, LIMIAR_ASSENTADO, rotacionar, type LeituraDado } from "./readout";
export { useDiceTable, type UseDiceTableOptions, type UseDiceTableResult } from "./useDiceTable";
export type {
  DiceIndex,
  DiceIndexEntry,
  DieCollider,
  DieMeta,
  DieReadout,
  Quat,
  Vec3,
} from "./types";
