/**
 * Descrições das ferramentas.
 *
 * A fonte descreve categorias ("Ferramentas de Artesão", "Instrumento Musical", "Kit de Jogo"),
 * não cada martelo ou flauta. Cada item do RulePack recebe o parágrafo da SUA categoria,
 * sem texto individual inventado.
 */
import { PHB_EQUIPMENT } from "@data/correto/equipment";

import { sliceNamedItem } from "./section-text";

const section = PHB_EQUIPMENT.find((entry) => entry.name === "Ferramentas");
if (!section) throw new Error('Seção "Ferramentas" ausente na extração do Livro do Jogador.');
const source = section.text;

/** Parágrafos de categoria, na ordem impressa; cada um termina no início do próximo. */
const CATEGORY_HEADINGS = [
  "Ferramentas de Artesão",
  "Ferramentas de Ladrão",
  "Ferramentas de Navegador",
  "Instrumento Musical",
  "Kit de Disfarce",
  "Kit de Falsificação",
  "Kit de Herbalismo",
  "Kit de Jogo",
  "Kit de Venenos",
] as const;

type CategoryHeading = (typeof CATEGORY_HEADINGS)[number];

function categoryText(heading: CategoryHeading): string {
  const stopNames = CATEGORY_HEADINGS.filter((candidate) => candidate !== heading);
  const text = sliceNamedItem(source, heading, stopNames);
  if (!text.trim()) throw new Error(`Descrição "${heading}" ausente na extração do Livro do Jogador.`);
  return text;
}

const ARTISAN_TOOL_IDS = [
  "alchemist-supplies", "brewer-supplies", "calligrapher-supplies", "carpenter-tools",
  "cartographer-tools", "cobbler-tools", "cook-utensils", "glassblower-tools", "jeweler-tools",
  "leatherworker-tools", "mason-tools", "painter-supplies", "potter-tools", "smith-tools",
  "tinker-tools", "weaver-tools", "woodcarver-tools", "artisan-tools",
] as const;

const INSTRUMENT_IDS = [
  "bagpipes", "drum", "dulcimer", "flute", "lute", "lyre", "horn", "pan-flute", "shawm", "viol",
  "musical-instrument",
] as const;

const GAMING_IDS = ["dice-set", "playing-card-set", "three-dragon-ante-set", "dragonchess-set"] as const;

const BY_CATEGORY: readonly (readonly [CategoryHeading, readonly string[]])[] = [
  ["Ferramentas de Artesão", ARTISAN_TOOL_IDS],
  ["Ferramentas de Ladrão", ["thieves-tools"]],
  ["Ferramentas de Navegador", ["navigator-tools"]],
  ["Instrumento Musical", INSTRUMENT_IDS],
  ["Kit de Disfarce", ["disguise-kit"]],
  ["Kit de Falsificação", ["forgery-kit"]],
  ["Kit de Herbalismo", ["herbalism-kit"]],
  ["Kit de Jogo", GAMING_IDS],
  ["Kit de Venenos", ["poisoners-kit"]],
];

export const PHB_TOOL_ITEM_DESCRIPTIONS = BY_CATEGORY.flatMap(([heading, ids]) => {
  const text = categoryText(heading);
  return ids.map((id) => ({
    id,
    category: "equipment" as const,
    equipmentKind: "tool" as const,
    name: heading,
    sourceHeading: heading.toLocaleUpperCase("pt-BR"),
    pdfPages: section.pdfPages,
    printedPages: section.printedPages,
    text,
  }));
});

export default PHB_TOOL_ITEM_DESCRIPTIONS;
