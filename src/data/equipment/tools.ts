import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { copper, definition, PHB_TOOLS } from "./common";

type ToolSpec = {
  id: string;
  name: string;
  toolCategory: "artisan" | "gaming-set" | "musical-instrument" | "other";
  valueGold: number;
  weightGrams: number;
};

function tool(spec: ToolSpec): EquipmentDefinition {
  return definition({
    id: spec.id,
    name: spec.name,
    tags: ["player-handbook", "equipment", "tool"],
    sourceRefs: [PHB_TOOLS],
    category: "tool",
    weightGrams: spec.weightGrams,
    valueCp: copper(spec.valueGold),
    stackable: false,
    properties: [],
    tool: { toolCategory: spec.toolCategory },
  });
}

const artisan: readonly (readonly [string, string, number, number])[] = [
  ["alchemist-supplies", "Suprimentos de alquimista", 3600, 4000],
  ["brewer-supplies", "Suprimentos de cervejeiro", 4100, 4500],
  ["calligrapher-supplies", "Suprimentos de caligrafia", 2300, 2500],
  ["carpenter-tools", "Ferramentas de carpinteiro", 2700, 3000],
  ["cartographer-tools", "Ferramentas de cartógrafo", 2700, 3000],
  ["cobbler-tools", "Ferramentas de sapateiro", 2300, 2500],
  ["cook-utensils", "Utensílios de cozinheiro", 3600, 4000],
  ["glassblower-tools", "Ferramentas de vidreiro", 2300, 2500],
  ["jeweler-tools", "Ferramentas de joalheiro", 900, 1000],
  ["leatherworker-tools", "Ferramentas de coureiro", 2300, 2500],
  ["mason-tools", "Ferramentas de pedreiro", 3600, 4000],
  ["painter-supplies", "Suprimentos de pintor", 2300, 2500],
  ["potter-tools", "Ferramentas de oleiro", 1400, 1500],
  ["smith-tools", "Ferramentas de ferreiro", 3600, 4000],
  ["tinker-tools", "Ferramentas de funileiro", 4500, 5000],
  ["weaver-tools", "Ferramentas de costureiro", 2300, 2500],
  ["woodcarver-tools", "Ferramentas de entalhador", 2300, 2500],
];

const otherTools: readonly (readonly [string, string, number, number])[] = [
  ["navigator-tools", "Ferramentas de navegação", 900, 1000],
  ["thieves-tools", "Ferramentas de ladrão", 450, 500],
  ["disguise-kit", "Kit de disfarce", 1400, 1500],
  ["forgery-kit", "Kit de falsificação", 2300, 2500],
  ["herbalism-kit", "Kit de herbalismo", 1400, 1500],
  ["poisoners-kit", "Kit de venenos", 900, 1000],
];

const gaming: readonly (readonly [string, string, number, number])[] = [
  ["dice-set", "Jogo de dados", 1 / 10, 0],
  ["playing-card-set", "Baralho", 5 / 10, 0],
  ["three-dragon-ante-set", "Três Dragões", 1 / 10, 0],
  ["dragonchess-set", "Xadrez do dragão", 0, 250],
];

const instruments: readonly (readonly [string, string, number, number])[] = [
  ["bagpipes", "Gaita de foles", 30, 3000],
  ["drum", "Tambor", 3000, 1500],
  ["dulcimer", "Saltério", 25, 5000],
  ["flute", "Flauta", 2, 500],
  ["lute", "Alaúde", 35, 1000],
  ["lyre", "Lira", 30, 1000],
  ["horn", "Trompa", 3, 1000],
  ["pan-flute", "Flauta de pã", 12, 1000],
  ["shawm", "Oboé", 2, 500],
  ["viol", "Violino", 30, 3000],
];

const toTool = ([id, name, valueGold, weightGrams]: readonly [string, string, number, number]): EquipmentDefinition => tool({ id, name, valueGold, weightGrams, toolCategory: "artisan" });
const toOther = ([id, name, valueGold, weightGrams]: readonly [string, string, number, number]): EquipmentDefinition => tool({ id, name, valueGold, weightGrams, toolCategory: "other" });
const toGaming = ([id, name, valueGold, weightGrams]: readonly [string, string, number, number]): EquipmentDefinition => tool({ id, name, valueGold, weightGrams, toolCategory: "gaming-set" });
const toInstrument = ([id, name, valueGold, weightGrams]: readonly [string, string, number, number]): EquipmentDefinition => tool({ id, name, valueGold, weightGrams, toolCategory: "musical-instrument" });

export const tools: readonly EquipmentDefinition[] = [
  ...artisan.map(toTool),
  ...otherTools.map(toOther),
  ...gaming.map(toGaming),
  ...instruments.map(toInstrument),
  // Alias de concessão usada pelos antecedentes; a escolha do tipo concreto fica para a mesa.
  tool({ id: "artisan-tools", name: "Ferramentas de artesão (à escolha)", toolCategory: "artisan", valueGold: 0, weightGrams: 0 }),
  tool({ id: "musical-instrument", name: "Instrumento musical (à escolha)", toolCategory: "musical-instrument", valueGold: 0, weightGrams: 0 }),
];
export const TOOL_DEFINITIONS = tools;
export const toolsById: ReadonlyMap<string, EquipmentDefinition> = new Map(tools.map((entry) => [entry.id, entry]));
export function findTool(toolId: string): EquipmentDefinition | undefined { return toolsById.get(toolId); }
