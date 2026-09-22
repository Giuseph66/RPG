/**
 * Descrições individuais do equipamento de aventura.
 *
 * O RulePack já tem preço, peso, categoria e consumível de cada item; aqui só se recorta a
 * prosa da seção "Equipamento de Aventura" do Livro do Jogador para fundir no MESMO card.
 * Itens que a fonte descreve em conjunto (cordas, focos, símbolos sagrados) reutilizam o
 * parágrafo da categoria — o livro não traz texto individual e nada foi inventado.
 * Recipientes recebem também a linha correspondente da tabela "Capacidade de Recipientes".
 */
import { PHB_EQUIPMENT } from "@data/correto/equipment";

const section = PHB_EQUIPMENT.find((entry) => entry.name === "Equipamento De Aventura");
if (!section) throw new Error('Seção "Equipamento De Aventura" ausente na extração do Livro do Jogador.');
const source = section.text;

/** Cabeçalhos estruturais que encerram a última descrição antes deles. */
const STRUCTURAL_STOPS = ["ARMAS", "EQUIPAMENTO", "PACOTES DE EQUIPAMENTO", "CAPACIDADE DE RECIPIENTES"] as const;

/** Nomes das descrições, na ordem impressa; usados para achar o fim de cada parágrafo. */
const ITEM_HEADINGS = [
  "Ábaco", "Ácido", "Água Benta", "Algemas", "Algibeira", "Aljava", "Antídoto", "Aríete Portátil",
  "Armadilha de Caça", "Balança de Mercador", "Caixa de Fogo", "Bolsa de Componentes", "Corda",
  "Corrente", "Equipamento de Pescaria", "Esferas de Metal", "Estrepes", "Fechadura", "Fogo Alquímico",
  "Grimório", "Foco Arcano", "Foco Druídico", "Kit de Escalada", "Kit de Primeiros Socorros",
  "Kit de Refeição", "Lâmpada", "Lanterna Coberta", "Lanterna Furta-Fogo", "Lente de Aumento",
  "Luneta", "Livro", "Óleo", "Pé de Cabra", "Poção de Cura", "Porta Virotes",
  "Porta Mapas ou Pergaminhos", "Rações de Viagem", "Roldana e Polia", "Símbolo Sagrado", "Tenda",
  "Tocha", "Vela", "Veneno Básico",
] as const;

function markerIndex(heading: string): number {
  const withBreak = source.indexOf(`\n${heading}.`);
  return withBreak >= 0 ? withBreak + 1 : source.indexOf(`${heading}.`);
}

function structuralIndex(heading: string): number {
  const match = new RegExp(`^${heading}\\s*$`, "m").exec(source);
  return match?.index ?? -1;
}

/** Todos os limites do texto, ordenados: cada descrição termina no próximo limite. */
const BOUNDARIES: readonly number[] = [
  ...ITEM_HEADINGS.map(markerIndex),
  ...STRUCTURAL_STOPS.map(structuralIndex),
].filter((index) => index >= 0).sort((a, b) => a - b);

function paragraph(heading: string): string {
  const start = markerIndex(heading);
  if (start < 0) throw new Error(`Descrição "${heading}" ausente na extração do Livro do Jogador.`);
  const end = BOUNDARIES.find((index) => index > start) ?? source.length;
  return source.slice(start, end).trim();
}

const capacityTable = source.slice(structuralIndex("CAPACIDADE DE RECIPIENTES"));

/** Linha da tabela de capacidade; `Mochila*` carrega a nota de rodapé da própria tabela. */
function capacity(container: string): string {
  const line = capacityTable.split("\n").find((row) => row.startsWith(`${container} `) || row.startsWith(`${container}* `));
  if (!line) throw new Error(`Capacidade de "${container}" ausente na tabela do Livro do Jogador.`);
  const note = line.startsWith(`${container}*`) ? "\n* Você pode prender itens como um saco de dormir e um rolo de\ncorda do lado de fora da mochila." : "";
  return `CAPACIDADE DE RECIPIENTES\n${line}${note}`;
}

type GearSpec = { readonly id: string; readonly heading: string; readonly container?: string };

const SPECS: readonly GearSpec[] = [
  { id: "abacus", heading: "Ábaco" },
  { id: "acid", heading: "Ácido" },
  { id: "holy-water", heading: "Água Benta" },
  { id: "manacles", heading: "Algemas" },
  { id: "pouch", heading: "Algibeira", container: "Algibeira" },
  { id: "quiver", heading: "Aljava" },
  { id: "antitoxin", heading: "Antídoto" },
  { id: "portable-ram", heading: "Aríete Portátil" },
  { id: "hunting-trap", heading: "Armadilha de Caça" },
  { id: "merchant-scale", heading: "Balança de Mercador" },
  { id: "tinderbox", heading: "Caixa de Fogo" },
  { id: "component-pouch", heading: "Bolsa de Componentes" },
  { id: "hempen-rope", heading: "Corda" },
  { id: "silk-rope", heading: "Corda" },
  { id: "chain", heading: "Corrente" },
  { id: "fishing-tackle", heading: "Equipamento de Pescaria" },
  { id: "ball-bearings", heading: "Esferas de Metal" },
  { id: "caltrops", heading: "Estrepes" },
  { id: "lock", heading: "Fechadura" },
  { id: "alchemists-fire", heading: "Fogo Alquímico" },
  { id: "spellbook", heading: "Grimório" },
  { id: "arcane-focus-staff", heading: "Foco Arcano" },
  { id: "arcane-focus-rod", heading: "Foco Arcano" },
  { id: "arcane-focus-crystal", heading: "Foco Arcano" },
  { id: "arcane-focus-orb", heading: "Foco Arcano" },
  { id: "arcane-focus-wand", heading: "Foco Arcano" },
  { id: "druidic-focus-staff", heading: "Foco Druídico" },
  { id: "druidic-focus-sprig", heading: "Foco Druídico" },
  { id: "druidic-focus-totem", heading: "Foco Druídico" },
  { id: "druidic-focus-wand", heading: "Foco Druídico" },
  { id: "climber-kit", heading: "Kit de Escalada" },
  { id: "healer-kit", heading: "Kit de Primeiros Socorros" },
  { id: "mess-kit", heading: "Kit de Refeição" },
  { id: "lamp", heading: "Lâmpada" },
  { id: "hooded-lantern", heading: "Lanterna Coberta" },
  { id: "bullseye-lantern", heading: "Lanterna Furta-Fogo" },
  { id: "magnifying-glass", heading: "Lente de Aumento" },
  { id: "spyglass", heading: "Luneta" },
  { id: "book", heading: "Livro" },
  { id: "oil", heading: "Óleo" },
  { id: "crowbar", heading: "Pé de Cabra" },
  { id: "healing-potion", heading: "Poção de Cura" },
  { id: "bolt-case", heading: "Porta Virotes" },
  { id: "map-case", heading: "Porta Mapas ou Pergaminhos" },
  { id: "rations", heading: "Rações de Viagem" },
  { id: "pulley", heading: "Roldana e Polia" },
  { id: "holy-symbol-amulet", heading: "Símbolo Sagrado" },
  { id: "holy-symbol-emblem", heading: "Símbolo Sagrado" },
  { id: "holy-symbol-reliquary", heading: "Símbolo Sagrado" },
  { id: "holy-symbol", heading: "Símbolo Sagrado" },
  { id: "tent", heading: "Tenda" },
  { id: "torch", heading: "Tocha" },
  { id: "candle", heading: "Vela" },
  { id: "basic-poison", heading: "Veneno Básico" },
];

/** Recipientes descritos apenas pela tabela de capacidade. */
const CONTAINER_ONLY: readonly (readonly [string, string])[] = [
  ["bucket", "Balde"],
  ["barrel", "Barril"],
  ["chest", "Baú"],
  ["mug", "Caneca"],
  ["waterskin", "Cantil"],
  ["basket", "Cesto"],
  ["flask", "Frasco"],
  ["bottle", "Garrafa"],
  ["jug", "Jarra"],
  ["backpack", "Mochila"],
  ["iron-pot", "Panela de Ferro"],
  ["sack", "Saco"],
];

export const PHB_GEAR_ITEM_DESCRIPTIONS = [
  ...SPECS.map((spec) => ({
    id: spec.id,
    category: "equipment" as const,
    equipmentKind: "gear" as const,
    name: spec.heading,
    sourceHeading: spec.heading.toLocaleUpperCase("pt-BR"),
    pdfPages: section.pdfPages,
    printedPages: section.printedPages,
    text: spec.container ? `${paragraph(spec.heading)}\n\n${capacity(spec.container)}` : paragraph(spec.heading),
  })),
  ...CONTAINER_ONLY.map(([id, container]) => ({
    id,
    category: "equipment" as const,
    equipmentKind: "gear" as const,
    name: container,
    sourceHeading: "CAPACIDADE DE RECIPIENTES",
    pdfPages: section.pdfPages,
    printedPages: section.printedPages,
    text: capacity(container),
  })),
] as const;

export default PHB_GEAR_ITEM_DESCRIPTIONS;
