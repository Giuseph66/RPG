/**
 * Pesos oficiais do equipamento, lidos das tabelas do Livro do Jogador.
 *
 * O catálogo mecânico foi escrito com conversões aproximadas do sistema imperial
 * (0,45 kg para "1 lb."), mas a edição em português imprime valores métricos próprios
 * (0,5 kg). A fonte é a autoridade: este módulo recorta o peso de cada linha impressa e o
 * teste de auditoria falha se algum `weightGrams` do rule pack divergir.
 *
 * `null` significa que a tabela traz "–" naquele item: o livro não informa peso. O catálogo
 * registra esses casos como `0`, que é o que a soma de carga precisa; a distinção fica aqui.
 */
import { PHB_EQUIPMENT } from "@data/correto/equipment";

function grams(token: string): number | null {
  const match = token.trim().match(/^([\d.,]+)\s*kg$/);
  return match ? Math.round(Number(match[1]!.replace(/\./g, "").replace(",", ".")) * 1000) : null;
}

const sectionText = (name: string): string => {
  const section = PHB_EQUIPMENT.find((entry) => entry.name === name);
  if (!section) throw new Error(`Seção "${name}" ausente na extração do Livro do Jogador.`);
  return section.text;
};

/** Peso por nome impresso, colhido das três tabelas (equipamento, ferramentas, armas, armaduras). */
const BY_PRINTED_NAME = new Map<string, number | null>();
const remember = (name: string, weight: number | null) => { if (!BY_PRINTED_NAME.has(name)) BY_PRINTED_NAME.set(name, weight); };

for (const text of [sectionText("Equipamento De Aventura"), sectionText("Ferramentas")]) {
  for (const raw of text.split("\n")) {
    // "Nome  Custo  Peso"
    const row = raw.trim().match(/^(.+?)\s+([\d.,]+\s*(?:po|pp|pc))\s+(–|-|[\d.,]+\s*kg)$/);
    if (row) remember(row[1]!.trim(), grams(row[3]!));
  }
}
for (const raw of sectionText("Equipamento De Aventura").split("\n")) {
  // "Nome  Preço  Dano  Peso  Propriedades"
  const row = raw.trim().match(/^(.+?)\s+([\d.,]+\s*(?:po|pp|pc))\s+(?:\d+d\d+\s+\S+|1\s+perfurante|–)\s+(–|[\d.,]+\s*kg)\s+(.+)$/);
  if (row) remember(row[1]!.trim(), grams(row[3]!));
}
for (const raw of sectionText("Armaduras E Escudos").split("\n")) {
  // "Nome  Preço  CA…  Peso"
  const row = raw.trim().match(/^(.+?)\s+([\d.]+\s*po)\s+(.+?)\s+([\d.,]+\s*kg)$/);
  if (row) remember(row[1]!.trim(), grams(row[4]!));
}

/**
 * Id do rule pack → nome impresso na tabela. Vários itens têm nome diferente do impresso
 * (o catálogo usa "Arpão" onde o livro imprime "Arpéu") ou são uma linha de um bloco
 * ("Foco arcano: bastão" é a linha "Bastão" sob "Foco arcano").
 */
const PRINTED_NAME_BY_ID: Readonly<Record<string, string>> = {
  // Armas
  dagger: "Adaga", javelin: "Azagaia", quarterstaff: "Bordão", greatclub: "Clava Grande",
  sickle: "Foice Curta", spear: "Lança", mace: "Maça", handaxe: "Machadinha",
  "light-hammer": "Martelo Leve", club: "Porrete", shortbow: "Arco Curto",
  "light-crossbow": "Beste Leve", dart: "Dardo", sling: "Funda", halberd: "Alabarda",
  glaive: "Glaive", scimitar: "Cimitarra", whip: "Chicote", shortsword: "Espada Curta",
  greatsword: "Espada Grande", longsword: "Espada Longa", lance: "Lança de Montaria",
  pike: "Lança Longa", morningstar: "Maça Estrela", greataxe: "Machado Grande",
  battleaxe: "Machado de Batalha", maul: "Malho", flail: "Mangual",
  warhammer: "Martelo de Guerra", "war-pick": "Picareta de Guerra", rapier: "Rapieira",
  trident: "Tridente", longbow: "Arco Longo", "hand-crossbow": "Besta de Mão",
  "heavy-crossbow": "Besta Pesada", net: "Rede", blowgun: "Zarabatana",
  // Armaduras
  "padded-armor": "Acolchoada", "leather-armor": "Couro", "studded-leather": "Couro Batido",
  "hide-armor": "Gibão de Peles", "chain-shirt": "Camisão de Malha", "scale-mail": "Brunea",
  breastplate: "Peitoral", "half-plate": "Meia-Armadura", "ring-mail": "Cota de anéis",
  "chain-mail": "Cota de malha", "splint-armor": "Cota de talas", "plate-armor": "Placas",
  shield: "Escudo",
  // Equipamento de aventura
  abacus: "Ábaco", acid: "Ácido (vidro)", "holy-water": "Água benta (frasco)", manacles: "Algemas",
  pouch: "Algibeira", quiver: "Aljava", hourglass: "Ampulheta", antitoxin: "Antídoto (vidro)",
  whistle: "Apito de advertência", "portable-ram": "Aríete portátil", "hunting-trap": "Armadilha de caça",
  harpoon: "Arpéu", "merchant-scale": "Balança de mercador", bucket: "Balde", barrel: "Barril",
  chest: "Baú", "component-pouch": "Bolsa de componentes", tinderbox: "Caixa de Fogo", mug: "Caneca",
  "ink-pen": "Caneta tinteiro", waterskin: "Cantil", basket: "Cesto", blanket: "Cobertor de inverno",
  "hempen-rope": "Corda de cânhamo (15 metros)", "silk-rope": "Corda de seda (15 metros)",
  chain: "Corrente (3 metros)", "fishing-tackle": "Equipamento de pescaria", ladder: "Escada (3 metros)",
  "ball-bearings": "Esferas (sacola com 1.000)", "mirror-steel": "Espelho de aço",
  caltrops: "Estrepes (bolsa com 20)", lock: "Fechadura", flask: "Frasco", bottle: "Garrafa de vidro",
  chalk: "Giz (1 peça)", "alchemists-fire": "Fogo alquímico (frasco)", spellbook: "Grimório", jug: "Jarra", "climber-kit": "Kit de escalada",
  "healer-kit": "Kit de primeiros-socorros", lamp: "Lâmpada", "hooded-lantern": "Lanterna coberta",
  "bullseye-lantern": "Lanterna furta-fogo", "magnifying-glass": "Lente de aumento", book: "Livro",
  spyglass: "Luneta", cloak: "Manto", sledgehammer: "Marreta", hammer: "Martelo", backpack: "Mochila",
  oil: "Óleo (frasco)", shovel: "Pá", "iron-pot": "Panela de ferro", paper: "Papel (uma folha)",
  paraffin: "Parafina", crowbar: "Pé de cabra", whetstone: "Pedra de amolar", perfume: "Perfume (frasco)",
  parchment: "Pergaminho (uma folha)", "miner-pick": "Picareta de minerador", piton: "Píton",
  "healing-potion": "Poção de cura", "map-case": "Porta mapas ou pergaminhos", "bolt-case": "Porta virotes",
  nails: "Pregos de ferro (10)", rations: "Rações de viagem (1 dia)", robes: "Robes",
  pulley: "Roldana e polia", "clothes-common": "Roupas comuns", "clothes-travelers": "Roupas de viajante",
  "clothes-costume": "Roupas de entretenimento", "clothes-fine": "Roupas finas", soap: "Sabão",
  sack: "Saco", bedroll: "Saco de dormir", "signet-ring": "Sinete", bell: "Sino",
  tent: "Tenda para duas pessoas", torch: "Tocha", ink: "Tinta (frasco de 30ml)", pole: "Vara (3 metros)",
  candle: "Vela", "basic-poison": "Veneno básico (frasco)",
  // Munições
  arrows: "Flechas (20)", "crossbow-bolts": "Virotes (20)", "sling-bullets": "Balas de Funda (20)",
  "blowgun-needles": "Zarabatana (50)",
  // Focos e símbolos (linhas sob um bloco da tabela)
  "arcane-focus-staff": "Bastão", "arcane-focus-rod": "Cajado", "arcane-focus-crystal": "Cristal",
  "arcane-focus-orb": "Orbe", "arcane-focus-wand": "Varinha",
  "druidic-focus-staff": "Cajado de madeira", "druidic-focus-sprig": "Ramo de visco",
  "druidic-focus-totem": "Totem", "druidic-focus-wand": "Varinha de teixo",
  "holy-symbol-amulet": "Amuleto", "holy-symbol-emblem": "Emblema", "holy-symbol-reliquary": "Relicário",
  // Ferramentas
  "alchemist-supplies": "Suprimentos de alquimista", "brewer-supplies": "Suprimentos de cervejeiro",
  "calligrapher-supplies": "Suprimentos de caligrafia", "carpenter-tools": "Ferramentas de carpinteiro",
  "cartographer-tools": "Ferramentas de cartógrafo", "cobbler-tools": "Ferramentas de sapateiro",
  "cook-utensils": "Utensílios de cozinheiro", "glassblower-tools": "Ferramentas de vidreiro",
  "jeweler-tools": "Ferramentas de joalheiro", "leatherworker-tools": "Ferramentas de coureiro",
  "mason-tools": "Ferramentas de pedreiro", "painter-supplies": "Ferramentas de pintor",
  "potter-tools": "Ferramentas de oleiro", "smith-tools": "Ferramentas de ferreiro",
  "tinker-tools": "Ferramentas de funileiro", "weaver-tools": "Ferramentas de costureiro",
  "woodcarver-tools": "Ferramentas de entalhador", "navigator-tools": "Ferramentas de navegação",
  "thieves-tools": "Ferramentas de ladrão", "disguise-kit": "Kit de disfarce",
  "forgery-kit": "Kit de falsificação", "herbalism-kit": "Kit de herbalismo",
  "poisoners-kit": "Kit de venenos", "dice-set": "Conjunto de dados",
  "playing-card-set": "Baralho de cartas", "three-dragon-ante-set": "Jogo dos três dragões",
  "dragonchess-set": "Xadrez do dragão", bagpipes: "Gaita de foles", drum: "Tambor",
  dulcimer: "Xilofone", flute: "Flauta", lute: "Alaúde", lyre: "Lira", horn: "Trombeta",
  "pan-flute": "Flauta de pã", shawm: "Oboé", viol: "Violino",
};

/** Peso impresso por id do rule pack. `null` = a tabela traz "–". */
export const PHB_EQUIPMENT_WEIGHT_GRAMS: ReadonlyMap<string, number | null> = new Map(
  Object.entries(PRINTED_NAME_BY_ID).map(([id, printedName]) => {
    if (!BY_PRINTED_NAME.has(printedName)) throw new Error(`Linha "${printedName}" ausente nas tabelas do Livro do Jogador (id "${id}").`);
    return [id, BY_PRINTED_NAME.get(printedName)!];
  }),
);

/** Peso que o catálogo deve gravar: "–" vira 0, que é neutro na soma de carga. */
export function catalogWeightGrams(id: string): number | undefined {
  const weight = PHB_EQUIPMENT_WEIGHT_GRAMS.get(id);
  return weight === undefined ? undefined : weight ?? 0;
}

/** Ids cuja tabela não informa peso; úteis para a UI não afirmar "0 g". */
export const PHB_EQUIPMENT_WITHOUT_PRINTED_WEIGHT: readonly string[] = [...PHB_EQUIPMENT_WEIGHT_GRAMS]
  .filter(([, weight]) => weight === null)
  .map(([id]) => id);
