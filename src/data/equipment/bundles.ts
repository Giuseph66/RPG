import { asEntityId, type DefinitionRef } from "@domain/contracts/ids";
import { asCopperPieces, type DefinitionBase, type SourceRef, type CopperPieces } from "@domain/contracts/primitives";
import { PHB_BUNDLES, ref } from "./common";

export interface EquipmentBundleGrant {
  readonly equipmentRef: DefinitionRef;
  readonly quantity: number;
}

/** Escolha que permanece explícita quando a fonte diz “à escolha”. */
export interface EquipmentBundleChoice {
  readonly id: string;
  readonly label: string;
  readonly count: { readonly min: number; readonly max: number };
  readonly options: readonly DefinitionRef[];
  readonly sourceRefs: readonly SourceRef[];
}

export interface EquipmentBundleDefinition extends DefinitionBase {
  readonly valueCp: CopperPieces;
  readonly grants: readonly EquipmentBundleGrant[];
  readonly choices: readonly EquipmentBundleChoice[];
}

const grant = (equipmentId: string, quantity = 1): EquipmentBundleGrant => ({ equipmentRef: ref(equipmentId), quantity });
const choice = (id: string, label: string, optionIds: readonly string[]): EquipmentBundleChoice => ({
  id,
  label,
  count: { min: 1, max: 1 },
  options: optionIds.map(ref),
  sourceRefs: [PHB_BUNDLES],
});
const bundle = (id: string, name: string, valueGold: number, grants: readonly EquipmentBundleGrant[], choices: readonly EquipmentBundleChoice[] = []): EquipmentBundleDefinition => ({
  id: asEntityId(id),
  name,
  tags: ["player-handbook", "equipment", "equipment-bundle"],
  sourceRefs: [PHB_BUNDLES],
  valueCp: asCopperPieces(valueGold * 100),
  grants,
  choices,
});

/** Pacotes da tabela de equipamento (p.153/PDF152), cada um definido uma única vez. */
export const equipmentBundles: readonly EquipmentBundleDefinition[] = [
  bundle("entertainer-pack", "Pacote de artista", 40, [
    grant("backpack"), grant("bedroll"), grant("clothes-costume", 2), grant("candle", 5), grant("rations", 5),
    grant("waterskin"), grant("disguise-kit"),
  ]),
  bundle("burglar-pack", "Pacote de assaltante", 16, [
    grant("backpack"), grant("ball-bearings"), grant("string"), grant("bell"), grant("candle", 5), grant("crowbar"),
    grant("hammer"), grant("piton", 10), grant("hooded-lantern"), grant("oil", 2), grant("rations", 5), grant("tinderbox"), grant("waterskin"), grant("hempen-rope"),
  ]),
  bundle("dungeoneer-pack", "Pacote de aventureiro", 12, [
    grant("backpack"), grant("crowbar"), grant("hammer"), grant("piton", 10), grant("torch", 10), grant("tinderbox"),
    grant("rations", 10), grant("waterskin"), grant("hempen-rope"),
  ]),
  bundle("diplomat-pack", "Pacote de diplomata", 39, [
    grant("chest"), grant("map-case", 2), grant("clothes-fine"), grant("ink"), grant("ink-pen"), grant("lamp"),
    grant("oil", 2), grant("paper", 5), grant("perfume"), grant("paraffin"), grant("soap"),
  ]),
  bundle("scholar-pack", "Pacote de estudioso", 40, [
    grant("backpack"), grant("book"), grant("ink"), grant("ink-pen"), grant("parchment", 10), grant("sand-bag"), grant("small-knife"),
  ]),
  bundle("explorer-pack", "Pacote de explorador", 10, [
    grant("backpack"), grant("bedroll"), grant("mess-kit"), grant("tinderbox"), grant("torch", 10), grant("rations", 10), grant("waterskin"), grant("hempen-rope"),
  ]),
  bundle("priest-pack", "Pacote de sacerdote", 19, [
    grant("backpack"), grant("blanket"), grant("candle", 10), grant("tinderbox"), grant("alms-box"), grant("incense", 2),
    grant("censer"), grant("vestments"), grant("rations", 2), grant("waterskin"),
  ]),
];

export const EQUIPMENT_BUNDLES = equipmentBundles;
export const equipmentBundlesById: ReadonlyMap<string, EquipmentBundleDefinition> = new Map(equipmentBundles.map((entry) => [entry.id, entry]));
export function findEquipmentBundle(bundleId: string): EquipmentBundleDefinition | undefined { return equipmentBundlesById.get(bundleId); }
