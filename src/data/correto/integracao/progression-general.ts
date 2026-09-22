/**
 * Lacuna identificada no Compêndio atual:
 * `totalLevelProgression` existe na extração do livro, mas `static.ts`
 * publica apenas progressões de classe e slots de multiclasse.
 *
 * Este arquivo preserva o texto do livro já extraído e acrescenta a tabela
 * estruturada para facilitar a fusão com `ProgressionDefinition`.
 */
import { PHB_PROGRESSION_DESCRIPTIONS } from "@data/correto/descricoes/progression";

export const PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION = {
  id: "total-level-progression",
  category: "progression",
  name: PHB_PROGRESSION_DESCRIPTIONS.totalLevelProgression.name,
  sourceHeading: PHB_PROGRESSION_DESCRIPTIONS.totalLevelProgression.sourceHeading,
  pdfPages: PHB_PROGRESSION_DESCRIPTIONS.totalLevelProgression.pdfPages,
  printedPages: PHB_PROGRESSION_DESCRIPTIONS.totalLevelProgression.printedPages,
  text: PHB_PROGRESSION_DESCRIPTIONS.totalLevelProgression.text,
  rows: [
    { level: 1, xpThreshold: 0, proficiencyBonus: 2 },
    { level: 2, xpThreshold: 300, proficiencyBonus: 2 },
    { level: 3, xpThreshold: 900, proficiencyBonus: 2 },
    { level: 4, xpThreshold: 2700, proficiencyBonus: 2 },
    { level: 5, xpThreshold: 6500, proficiencyBonus: 3 },
    { level: 6, xpThreshold: 14000, proficiencyBonus: 3 },
    { level: 7, xpThreshold: 23000, proficiencyBonus: 3 },
    { level: 8, xpThreshold: 34000, proficiencyBonus: 3 },
    { level: 9, xpThreshold: 48000, proficiencyBonus: 4 },
    { level: 10, xpThreshold: 64000, proficiencyBonus: 4 },
    { level: 11, xpThreshold: 85000, proficiencyBonus: 4 },
    { level: 12, xpThreshold: 100000, proficiencyBonus: 4 },
    { level: 13, xpThreshold: 120000, proficiencyBonus: 5 },
    { level: 14, xpThreshold: 140000, proficiencyBonus: 5 },
    { level: 15, xpThreshold: 165000, proficiencyBonus: 5 },
    { level: 16, xpThreshold: 195000, proficiencyBonus: 5 },
    { level: 17, xpThreshold: 225000, proficiencyBonus: 6 },
    { level: 18, xpThreshold: 265000, proficiencyBonus: 6 },
    { level: 19, xpThreshold: 305000, proficiencyBonus: 6 },
    { level: 20, xpThreshold: 355000, proficiencyBonus: 6 },
  ],
} as const;

export default PHB_TOTAL_LEVEL_PROGRESSION_DESCRIPTION;
