import { asEntityId } from "@domain/contracts/ids";
import { type ProgressionDefinition } from "@domain/contracts/definitions/progression";
import { PHB_PTBR_LOCAL_2017_SOURCE_REF } from "@data/rulepacks/manifest";

export const TOTAL_LEVEL_PROGRESSION: ProgressionDefinition = {
  id: asEntityId("total-level-progression"),
  name: "Progressão de nível total",
  tags: ["player-handbook", "xp", "proficiency-bonus"],
  sourceRefs: [
    {
      ...PHB_PTBR_LOCAL_2017_SOURCE_REF,
      chapter: "Capítulo 1 — Criação de Personagens",
      printedPage: 15,
      pdfPage: 14,
      section: "Além do 1º nível",
    },
  ],
  table: [
    [0, 2], [300, 2], [900, 2], [2700, 2], [6500, 3], [14000, 3], [23000, 3], [34000, 3], [48000, 4], [64000, 4],
    [85000, 4], [100000, 4], [120000, 5], [140000, 5], [165000, 5], [195000, 5], [225000, 6], [265000, 6], [305000, 6], [355000, 6],
  ].map(([xpThreshold, proficiencyBonus], index) => ({
    totalLevel: index + 1,
    xpThreshold,
    proficiencyBonus,
  })),
};

export const progression = TOTAL_LEVEL_PROGRESSION;

