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
  return entityId.replaceAll("-", " ").replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  common: "Comum", dwarvish: "Anão", elvish: "Élfico", halfling: "Halfling", dragonborn: "Dracônico", gnomish: "Gnômico", orc: "Orc", abyssal: "Abissal", celestial: "Celestial", infernal: "Infernal", primordial: "Primordial", sylvan: "Silvestre", undercommon: "Subcomum",
};

export const PROFICIENCY_LABELS: Readonly<Record<string, string>> = {
  "proficiency.alchemist-supplies": "Suprimentos de alquimista", "proficiency.brewers-supplies": "Suprimentos de cervejeiro", "proficiency.carpenters-tools": "Ferramentas de carpinteiro", "proficiency.disguise-kit": "Kit de disfarce", "proficiency.herbalism-kit": "Kit de herbalismo", "proficiency.leatherworkers-tools": "Ferramentas de coureiro", "proficiency.masons-tools": "Ferramentas de pedreiro", "proficiency.navigator-tools": "Ferramentas de navegador", "proficiency.painters-supplies": "Suprimentos de pintor", "proficiency.potters-tools": "Ferramentas de ceramista", "proficiency.smiths-tools": "Ferramentas de ferreiro", "proficiency.thieves-tools": "Ferramentas de ladrão", "proficiency.vehicle-land": "Veículos terrestres", "proficiency.vehicle-water": "Veículos aquáticos", "proficiency.weavers-tools": "Ferramentas de tecelão", "proficiency.woodcarvers-tools": "Ferramentas de entalhador", "proficiency.musical-instrument": "Instrumento musical",
};

export const TOOL_PROFICIENCY_OPTIONS = [
  "proficiency.alchemist-supplies",
  "proficiency.brewers-supplies",
  "proficiency.carpenters-tools",
  "proficiency.disguise-kit",
  "proficiency.herbalism-kit",
  "proficiency.leatherworkers-tools",
  "proficiency.masons-tools",
  "proficiency.navigator-tools",
  "proficiency.painters-supplies",
  "proficiency.potters-tools",
  "proficiency.smiths-tools",
  "proficiency.thieves-tools",
  "proficiency.vehicle-land",
  "proficiency.vehicle-water",
  "proficiency.weavers-tools",
  "proficiency.woodcarvers-tools",
  "proficiency.musical-instrument",
] as const;
