import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { copper, definition, PHB_GEAR_TABLE, PHB_GEAR } from "./common";

type GearSpec = {
  id: string;
  name: string;
  valueGold: number;
  weightGrams: number;
  category?: "adventuring-gear" | "consumable" | "focus";
  stackable?: boolean;
  properties?: readonly [];
  effectDescription?: string;
  charges?: number;
  abstract?: boolean;
};

function makeGear(spec: GearSpec): EquipmentDefinition {
  const category = spec.category ?? "adventuring-gear";
  return definition({
    id: spec.id,
    name: spec.name,
    tags: ["player-handbook", "equipment", category, ...(spec.abstract ? ["background-grant"] : [])],
    sourceRefs: [spec.abstract ? PHB_GEAR : PHB_GEAR_TABLE],
    category,
    weightGrams: spec.weightGrams,
    valueCp: copper(spec.valueGold),
    stackable: spec.stackable ?? false,
    properties: spec.properties ?? [],
    ...(spec.effectDescription ? {
      consumable: {
        consumeOnUse: true,
        effectDescription: spec.effectDescription,
        ...(spec.charges === undefined ? {} : { charges: spec.charges }),
      },
    } : {}),
  });
}

const staticGear: readonly GearSpec[] = [
  { id: "abacus", name: "Ábaco", valueGold: 2, weightGrams: 1000 },
  { id: "manacles", name: "Algemas", valueGold: 2, weightGrams: 2000 },
  { id: "pouch", name: "Algibeira", valueGold: 0.5, weightGrams: 500 },
  { id: "quiver", name: "Aljava", valueGold: 1, weightGrams: 500 },
  { id: "hourglass", name: "Ampulheta", valueGold: 25, weightGrams: 500 },
  { id: "whistle", name: "Apito de advertência", valueGold: 25, weightGrams: 500 },
  { id: "portable-ram", name: "Aríete portátil", valueGold: 4, weightGrams: 17500 },
  { id: "hunting-trap", name: "Armadilha de caça", valueGold: 5, weightGrams: 12500, category: "consumable", effectDescription: "Ação; DEX 13 ou 1d4 perfurante e imobilização; libertar exige ação e FOR 13." },
  { id: "harpoon", name: "Arpão", valueGold: 2, weightGrams: 2000 },
  { id: "merchant-scale", name: "Balança de mercador", valueGold: 5, weightGrams: 1500 },
  { id: "bucket", name: "Balde", valueGold: 0.05, weightGrams: 1000 },
  { id: "barrel", name: "Barril", valueGold: 2, weightGrams: 35000 },
  { id: "chest", name: "Baú", valueGold: 5, weightGrams: 12500 },
  { id: "component-pouch", name: "Bolsa de componentes", valueGold: 25, weightGrams: 1000 },
  { id: "alms-box", name: "Caixa de esmolas", valueGold: 0, weightGrams: 0 },
  { id: "tinderbox", name: "Caixa de fogo", valueGold: 0.5, weightGrams: 500 },
  { id: "mug", name: "Caneca", valueGold: 0.02, weightGrams: 500 },
  { id: "ink-pen", name: "Caneta", valueGold: 0.02, weightGrams: 0 },
  { id: "waterskin", name: "Cantil", valueGold: 0.2, weightGrams: 2500 },
  { id: "basket", name: "Cesto", valueGold: 0.4, weightGrams: 1000 },
  { id: "blanket", name: "Cobertor de inverno", valueGold: 0.5, weightGrams: 1500 },
  { id: "hempen-rope", name: "Corda de cânhamo", valueGold: 1, weightGrams: 5000 },
  { id: "silk-rope", name: "Corda de seda", valueGold: 10, weightGrams: 2500 },
  { id: "string", name: "Linha", valueGold: 0, weightGrams: 0, stackable: true },
  { id: "chain", name: "Corrente", valueGold: 5, weightGrams: 5000 },
  { id: "fishing-tackle", name: "Equipamento de pescaria", valueGold: 1, weightGrams: 2000 },
  { id: "ladder", name: "Escada", valueGold: 0.1, weightGrams: 12500 },
  { id: "ball-bearings", name: "Esferas de metal", valueGold: 1, weightGrams: 1000, category: "consumable", stackable: true, effectDescription: "Ação; quadrado de 3 m; mover exige DEX 10 ou a criatura fica caída." },
  { id: "mirror-steel", name: "Espelho de aço", valueGold: 5, weightGrams: 250 },
  { id: "caltrops", name: "Estrepes", valueGold: 1, weightGrams: 1000, category: "consumable", stackable: true, effectDescription: "Ação; quadrado de 1,5 m; DEX 15 ou fica parado, sofre 1 perfurante e perde 3 m até recuperar 1 PV." },
  { id: "lock", name: "Fechadura", valueGold: 10, weightGrams: 500 },
  { id: "flask", name: "Frasco", valueGold: 0.02, weightGrams: 1000 },
  { id: "bottle", name: "Garrafa de vidro", valueGold: 1, weightGrams: 1000 },
  { id: "chalk", name: "Giz", valueGold: 0.01, weightGrams: 0 },
  { id: "spellbook", name: "Grimório", valueGold: 50, weightGrams: 1500 },
  { id: "jug", name: "Jarra", valueGold: 0.04, weightGrams: 2000 },
  { id: "climber-kit", name: "Kit de escalada", valueGold: 25, weightGrams: 6000 },
  { id: "healer-kit", name: "Kit de primeiros-socorros", valueGold: 5, weightGrams: 1500, stackable: false, category: "consumable", charges: 10, effectDescription: "Ação e 1 uso; estabiliza uma criatura a 0 PV sem teste de Medicina." },
  { id: "lamp", name: "Lâmpada", valueGold: 0.5, weightGrams: 500 },
  { id: "hooded-lantern", name: "Lanterna coberta", valueGold: 5, weightGrams: 1000 },
  { id: "bullseye-lantern", name: "Lanterna furta-fogo", valueGold: 10, weightGrams: 1000 },
  { id: "magnifying-glass", name: "Lente", valueGold: 100, weightGrams: 0 },
  { id: "book", name: "Livro", valueGold: 25, weightGrams: 2500 },
  { id: "spyglass", name: "Luneta", valueGold: 1000, weightGrams: 500 },
  { id: "cloak", name: "Manto", valueGold: 1, weightGrams: 2000 },
  { id: "sledgehammer", name: "Marreta", valueGold: 2, weightGrams: 5000 },
  { id: "hammer", name: "Martelo", valueGold: 1, weightGrams: 1500 },
  { id: "backpack", name: "Mochila", valueGold: 2, weightGrams: 2500 },
  { id: "oil", name: "Óleo", valueGold: 0.1, weightGrams: 500 },
  { id: "shovel", name: "Pá", valueGold: 2, weightGrams: 2500 },
  { id: "iron-pot", name: "Panela de ferro", valueGold: 2, weightGrams: 5000 },
  { id: "paper", name: "Papel", valueGold: 0.2, weightGrams: 0, stackable: true },
  { id: "paraffin", name: "Parafina", valueGold: 0.5, weightGrams: 0, stackable: true },
  { id: "crowbar", name: "Pé de cabra", valueGold: 2, weightGrams: 2500 },
  { id: "whetstone", name: "Pedra de amolar", valueGold: 0.01, weightGrams: 0 },
  { id: "perfume", name: "Perfume", valueGold: 5, weightGrams: 0 },
  { id: "parchment", name: "Pergaminho", valueGold: 0.1, weightGrams: 0, stackable: true },
  { id: "miner-pick", name: "Picareta de minerador", valueGold: 2, weightGrams: 5000 },
  { id: "piton", name: "Píton", valueGold: 0.05, weightGrams: 0 },
  { id: "map-case", name: "Porta-mapas", valueGold: 1, weightGrams: 500 },
  { id: "bolt-case", name: "Porta-virotes", valueGold: 1, weightGrams: 500 },
  { id: "nails", name: "Pregos", valueGold: 0.1, weightGrams: 2500, stackable: true },
  { id: "rations", name: "Rações de viagem (1 dia)", valueGold: 0.5, weightGrams: 1000, stackable: true },
  { id: "robes", name: "Robes", valueGold: 1, weightGrams: 2000 },
  { id: "pulley", name: "Roldana e polia", valueGold: 1, weightGrams: 2500 },
  { id: "clothes-common", name: "Roupas comuns", valueGold: 0.5, weightGrams: 1500 },
  { id: "clothes-costume", name: "Roupas de entretenimento", valueGold: 5, weightGrams: 2000 },
  { id: "clothes-fine", name: "Roupas finas", valueGold: 15, weightGrams: 3000 },
  { id: "clothes-travelers", name: "Roupas de viajante", valueGold: 2, weightGrams: 2000 },
  { id: "soap", name: "Sabão", valueGold: 0.02, weightGrams: 0, stackable: true },
  { id: "sack", name: "Saco", valueGold: 0.01, weightGrams: 250 },
  { id: "bedroll", name: "Saco de dormir", valueGold: 1, weightGrams: 3500 },
  { id: "signet-ring", name: "Sinete", valueGold: 5, weightGrams: 0 },
  { id: "bell", name: "Sino", valueGold: 1, weightGrams: 0 },
  { id: "tent", name: "Tenda para duas pessoas", valueGold: 2, weightGrams: 10000 },
  { id: "torch", name: "Tocha", valueGold: 0.01, weightGrams: 500, stackable: true },
  { id: "ink", name: "Tinta", valueGold: 10, weightGrams: 0 },
  { id: "sealing-wax", name: "Cera de lacre", valueGold: 0.5, weightGrams: 0, stackable: true },
  { id: "sand-bag", name: "Saco de areia", valueGold: 0.01, weightGrams: 450, stackable: true },
  { id: "censer", name: "Turíbulo", valueGold: 0, weightGrams: 0 },
  { id: "vestments", name: "Vestimentas", valueGold: 0, weightGrams: 0 },
  { id: "mess-kit", name: "Kit de refeição", valueGold: 0.2, weightGrams: 450 },
  { id: "pole", name: "Vara", valueGold: 0.05, weightGrams: 3500 },
  { id: "candle", name: "Vela", valueGold: 0.01, weightGrams: 0, stackable: true },
];

const ammunition: readonly GearSpec[] = [
  { id: "arrows", name: "Flechas (20)", valueGold: 1, weightGrams: 500, stackable: true },
  { id: "crossbow-bolts", name: "Virotes (20)", valueGold: 1, weightGrams: 750, stackable: true },
  { id: "blowgun-needles", name: "Agulhas de zarabatana (50)", valueGold: 1, weightGrams: 500, stackable: true },
  { id: "sling-bullets", name: "Balas de funda (20)", valueGold: 0.04, weightGrams: 750, stackable: true },
  { id: "ammunition", name: "Munições (à escolha)", valueGold: 0, weightGrams: 0, stackable: true, abstract: true },
];

const active: readonly GearSpec[] = [
  { id: "acid", name: "Ácido", valueGold: 25, weightGrams: 500, category: "consumable", stackable: true, effectDescription: "Ação; ataque improvisado a 1,5 m ou 6 m; acerto causa 2d6 de dano ácido." },
  { id: "holy-water", name: "Água benta", valueGold: 25, weightGrams: 500, category: "consumable", stackable: true, effectDescription: "Ação; ataque improvisado a 1,5 m ou 6 m; causa 2d6 radiante a corruptor ou morto-vivo." },
  { id: "antitoxin", name: "Antídoto", valueGold: 50, weightGrams: 0, category: "consumable", stackable: true, effectDescription: "Beber concede vantagem em resistências contra veneno por 1 hora; não afeta mortos-vivos ou constructos." },
  { id: "alchemists-fire", name: "Fogo alquímico", valueGold: 50, weightGrams: 500, category: "consumable", stackable: true, effectDescription: "Ação; ataque improvisado a 6 m; 1d4 de fogo no início do turno até apagar com ação e DEX 10." },
  { id: "healing-potion", name: "Poção de cura", valueGold: 50, weightGrams: 250, category: "consumable", stackable: true, effectDescription: "Ação para beber ou administrar; recupera 2d4+2 pontos de vida." },
  { id: "basic-poison", name: "Veneno básico", valueGold: 100, weightGrams: 0, category: "consumable", stackable: true, effectDescription: "Ação; cobre arma cortante/perfurante ou 3 munições por 1 minuto; CON 10 ou 1d4 de veneno." },
];

const focus: readonly GearSpec[] = [
  { id: "arcane-focus-staff", name: "Foco arcano: bastão", valueGold: 10, weightGrams: 1000, category: "focus" },
  { id: "arcane-focus-rod", name: "Foco arcano: cajado", valueGold: 5, weightGrams: 2000, category: "focus" },
  { id: "arcane-focus-crystal", name: "Foco arcano: cristal", valueGold: 10, weightGrams: 500, category: "focus" },
  { id: "arcane-focus-orb", name: "Foco arcano: orbe", valueGold: 20, weightGrams: 1500, category: "focus" },
  { id: "arcane-focus-wand", name: "Foco arcano: varinha", valueGold: 10, weightGrams: 500, category: "focus" },
  { id: "druidic-focus-staff", name: "Foco druídico: cajado", valueGold: 5, weightGrams: 2000, category: "focus" },
  { id: "druidic-focus-sprig", name: "Foco druídico: ramo de visco", valueGold: 1, weightGrams: 0, category: "focus" },
  { id: "druidic-focus-totem", name: "Foco druídico: totem", valueGold: 1, weightGrams: 0, category: "focus" },
  { id: "druidic-focus-wand", name: "Foco druídico: varinha", valueGold: 10, weightGrams: 500, category: "focus" },
  { id: "holy-symbol-amulet", name: "Símbolo sagrado: amuleto", valueGold: 5, weightGrams: 500, category: "focus" },
  { id: "holy-symbol-emblem", name: "Símbolo sagrado: emblema", valueGold: 5, weightGrams: 0, category: "focus" },
  { id: "holy-symbol-reliquary", name: "Símbolo sagrado: relicário", valueGold: 5, weightGrams: 1000, category: "focus" },
  { id: "holy-symbol", name: "Símbolo sagrado (à escolha)", valueGold: 5, weightGrams: 450, category: "focus", abstract: true },
];

/** Concessão de antecedente → linha equivalente da tabela de equipamento (peso impresso). */
const PRINTED_EQUIVALENT: Readonly<Record<string, string>> = {
  "common-clothes": "clothes-common",
  "dark-common-clothes": "clothes-common",
  "travelers-clothes": "clothes-travelers",
  "fine-clothes": "clothes-fine",
  costume: "clothes-costume",
  "winter-blanket": "blanket",
  "scroll-case": "map-case",
  "prayer-book": "book",
};

const backgroundGrants: readonly GearSpec[] = [
  ["prayer-book", "Livro de orações"], ["incense", "Incenso"], ["guild-letter", "Carta da guilda"], ["admirers-token", "Favor de um admirador"],
  ["costume", "Traje de artista"], ["con-tools", "Ferramentas de charlatão"], ["dark-common-clothes", "Roupas comuns escuras"], ["animal-trophy", "Troféu de animal"],
  ["winter-blanket", "Cobertor de inverno"], ["lucky-charm", "Amuleto da sorte"], ["lineage-scroll", "Pergaminho de linhagem"], ["small-knife", "Faca pequena"],
  ["city-map", "Mapa da cidade"], ["pet-rat", "Rato de estimação"], ["parents-memento", "Lembrança dos pais"], ["dead-colleague-letter", "Carta de colega falecido"],
  ["rank-insignia", "Insígnia de patente"], ["trophy", "Troféu"], ["bone-dice", "Dados de osso"],
  ["scroll-case", "Porta-pergaminhos"],
  ["common-clothes", "Roupas comuns"], ["travelers-clothes", "Roupas de viajante"], ["fine-clothes", "Roupas finas"],
].map(([id, name]) => {
  // Concessões que são o mesmo objeto de uma linha impressa herdam o peso dessa linha;
  // as demais (cartas, lembranças, troféus…) não têm peso publicado no livro.
  const printed = PRINTED_EQUIVALENT[id!];
  const weightGrams = printed ? staticGear.find((entry) => entry.id === printed)?.weightGrams ?? 0 : 0;
  return { id: id!, name: name!, valueGold: 0, weightGrams, abstract: true };
});

export const gear: readonly EquipmentDefinition[] = [
  ...staticGear.map(makeGear),
  ...ammunition.map(makeGear),
  ...active.map(makeGear),
  ...focus.map(makeGear),
  ...backgroundGrants.map(makeGear),
];
export const GEAR_DEFINITIONS = gear;
export const gearById: ReadonlyMap<string, EquipmentDefinition> = new Map(gear.map((entry) => [entry.id, entry]));
export function findGear(gearId: string): EquipmentDefinition | undefined { return gearById.get(gearId); }
