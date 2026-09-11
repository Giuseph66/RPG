import { type CharacterTemplate } from "@domain/contracts/definitions/character-template";
import { asEntityId, asPackVersion } from "@domain/contracts/ids";
import { RULESET_ID } from "@data/classes/common";
import { classes } from "@data/classes/classes";

const sourceRefs = [{ sourceId: RULESET_ID, chapter: "Capítulo 3 — Classes", printedPage: 45, pdfPage: 44, section: "Criação de Personagens" }];

/** Sugestões mínimas para o wizard; seleção final sempre exige revisão do jogador. */
export const characterTemplates: readonly CharacterTemplate[] = classes.map((classDefinition) => ({
  templateId: asEntityId(`${classDefinition.id}-starter`),
  name: `${classDefinition.name} — início rápido`,
  rulesetRef: { id: RULESET_ID, version: asPackVersion("1.0.0") },
  suggestedChoices: [],
  sourceRefs,
  requiresReview: true,
}));

export const CHARACTER_TEMPLATES = characterTemplates;
export const characterTemplatesById: ReadonlyMap<string, CharacterTemplate> = new Map(characterTemplates.map((entry) => [entry.templateId, entry]));

