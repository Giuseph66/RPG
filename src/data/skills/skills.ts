/**
 * Catálogo das 18 perícias. Fonte: Livro do Jogador fornecido, capítulo 7, p.175–181/PDF174–180;
 * duplicidade de antecedentes cap.4 p.127/PDF126. Ver docs/criacao/personagem/pericias.md.
 *
 * Ownership: DATA-002 (src/data/skills/**). `Skill`/`Ability` são uniões fechadas do contrato
 * (@domain/contracts/primitives); este módulo só anexa nome pt-BR, habilidade padrão e fonte.
 */

import { asRulesetId, type RulesetId } from "@domain/contracts/ids";
import { type Ability, type Skill, type SourceRef } from "@domain/contracts/primitives";

const PACK_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

const SKILLS_SOURCE: SourceRef = {
  sourceId: PACK_ID,
  chapter: "Capítulo 7",
  printedPage: 175,
  pdfPage: 174,
  section: "Perícias",
};

export interface SkillDefinition {
  readonly id: Skill;
  readonly name: string;
  readonly defaultAbility: Ability;
  readonly sourceRefs: readonly SourceRef[];
}

/** 18 perícias, ordem da tabela de pericias.md. Constituição não tem perícia padrão. */
export const SKILLS: readonly SkillDefinition[] = [
  { id: "athletics", name: "Atletismo", defaultAbility: "str", sourceRefs: [SKILLS_SOURCE] },
  { id: "acrobatics", name: "Acrobacia", defaultAbility: "dex", sourceRefs: [SKILLS_SOURCE] },
  { id: "sleight-of-hand", name: "Prestidigitação", defaultAbility: "dex", sourceRefs: [SKILLS_SOURCE] },
  { id: "stealth", name: "Furtividade", defaultAbility: "dex", sourceRefs: [SKILLS_SOURCE] },
  { id: "arcana", name: "Arcanismo", defaultAbility: "int", sourceRefs: [SKILLS_SOURCE] },
  { id: "history", name: "História", defaultAbility: "int", sourceRefs: [SKILLS_SOURCE] },
  { id: "investigation", name: "Investigação", defaultAbility: "int", sourceRefs: [SKILLS_SOURCE] },
  { id: "nature", name: "Natureza", defaultAbility: "int", sourceRefs: [SKILLS_SOURCE] },
  { id: "religion", name: "Religião", defaultAbility: "int", sourceRefs: [SKILLS_SOURCE] },
  { id: "animal-handling", name: "Adestrar Animais", defaultAbility: "wis", sourceRefs: [SKILLS_SOURCE] },
  { id: "insight", name: "Intuição", defaultAbility: "wis", sourceRefs: [SKILLS_SOURCE] },
  { id: "medicine", name: "Medicina", defaultAbility: "wis", sourceRefs: [SKILLS_SOURCE] },
  { id: "perception", name: "Percepção", defaultAbility: "wis", sourceRefs: [SKILLS_SOURCE] },
  { id: "survival", name: "Sobrevivência", defaultAbility: "wis", sourceRefs: [SKILLS_SOURCE] },
  { id: "performance", name: "Atuação", defaultAbility: "cha", sourceRefs: [SKILLS_SOURCE] },
  { id: "deception", name: "Enganação", defaultAbility: "cha", sourceRefs: [SKILLS_SOURCE] },
  { id: "intimidation", name: "Intimidação", defaultAbility: "cha", sourceRefs: [SKILLS_SOURCE] },
  { id: "persuasion", name: "Persuasão", defaultAbility: "cha", sourceRefs: [SKILLS_SOURCE] },
];

export function findSkill(id: Skill): SkillDefinition | undefined {
  return SKILLS.find((skill) => skill.id === id);
}

/** Perícias cuja `defaultAbility` é a habilidade informada (ex.: "con" retorna lista vazia). */
export function skillsByAbility(ability: Ability): readonly SkillDefinition[] {
  return SKILLS.filter((skill) => skill.defaultAbility === ability);
}
