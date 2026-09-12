import type { Ability, Skill } from "@domain/contracts/primitives";

export const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  str: "Força",
  dex: "Destreza",
  con: "Constituição",
  int: "Inteligência",
  wis: "Sabedoria",
  cha: "Carisma",
};

export const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  athletics: "Atletismo",
  acrobatics: "Acrobacia",
  "sleight-of-hand": "Prestidigitação",
  stealth: "Furtividade",
  arcana: "Arcanismo",
  history: "História",
  investigation: "Investigação",
  nature: "Natureza",
  religion: "Religião",
  "animal-handling": "Adestrar Animais",
  insight: "Intuição",
  medicine: "Medicina",
  perception: "Percepção",
  survival: "Sobrevivência",
  performance: "Atuação",
  deception: "Enganação",
  intimidation: "Intimidação",
  persuasion: "Persuasão",
};

export const ALL_SKILLS: readonly Skill[] = Object.keys(SKILL_LABELS) as Skill[];

export function formatRef(entityId: string): string {
  return entityId.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
