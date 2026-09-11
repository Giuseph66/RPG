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
  ["alchemist-supplies", "Suprimentos de alquimista", 50, 3600],
  ["brewer-supplies", "Suprimentos de cervejeiro", 20, 4100],
  ["calligrapher-supplies", "Suprimentos de caligrafia", 10, 2300],
  ["carpenter-tools", "Ferramentas de carpinteiro", 8, 2700],
  ["cartographer-tools", "Ferramentas de cartógrafo", 15, 2700],
  ["cobbler-tools", "Ferramentas de sapateiro", 5, 2300],
  ["cook-utensils", "Utensílios de cozinheiro", 1, 3600],
  ["glassblower-tools", "Ferramentas de vidreiro", 30, 2300],
  ["jeweler-tools", "Ferramentas de joalheiro", 25, 900],
  ["leatherworker-tools", "Ferramentas de coureiro", 5, 2300],
  ["mason-tools", "Ferramentas de pedreiro", 10, 3600],
  ["painter-supplies", "Suprimentos de pintor", 10, 2300],
  ["potter-tools", "Ferramentas de oleiro", 10, 1400],
  ["smith-tools", "Ferramentas de ferreiro", 20, 3600],
  ["tinker-tools", "Ferramentas de funileiro", 50, 4500],
  ["weaver-tools", "Ferramentas de costureiro", 1, 2300],
  ["woodcarver-tools", "Ferramentas de entalhador", 1, 2300],
];

const otherTools: readonly (readonly [string, string, number, number])[] = [
  ["navigator-tools", "Ferramentas de navegação", 25, 900],
  ["thieves-tools", "Ferramentas de ladrão", 25, 450],
  ["disguise-kit", "Kit de disfarce", 25, 1400],
  ["forgery-kit", "Kit de falsificação", 15, 2300],
  ["herbalism-kit", "Kit de herbalismo", 5, 1400],
  ["poisoners-kit", "Kit de venenos", 50, 900],
];

const gaming: readonly (readonly [string, string, number, number])[] = [
  ["dice-set", "Jogo de dados", 1 / 10, 0],
  ["playing-card-set", "Baralho", 5 / 10, 0],
  ["three-dragon-ante-set", "Três Dragões", 1 / 10, 0],
  ["dragonchess-set", "Xadrez do dragão", 1, 0],
];

const instruments: readonly (readonly [string, string, number, number])[] = [
  ["bagpipes", "Gaita de foles", 30, 3000],
  ["drum", "Tambor", 6, 3000],
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
