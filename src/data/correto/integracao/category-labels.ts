/** Rótulos humanos que faltavam em `formatHumanReference()` do Compêndio. */
export const COMPENDIUM_HUMAN_CATEGORY_LABELS = {
  rules: "Regras",
  combat: "Combate",
  condition: "Condições",
  attributes: "Atributos",
  skills: "Perícias",
  race: "Raça",
  subrace: "Sub-raça",
  class: "Classe",
  subclass: "Subclasse",
  background: "Antecedente",
  equipment: "Equipamento",
  feat: "Talento",
  spell: "Magia",
  resource: "Recurso",
  feature: "Característica",
  progression: "Progressão",
  rest: "Descanso",
  movement: "Movimentação",
  adventure: "Aventura",
} as const;

export function humanCompendiumCategory(category: string): string {
  return COMPENDIUM_HUMAN_CATEGORY_LABELS[category as keyof typeof COMPENDIUM_HUMAN_CATEGORY_LABELS] ?? category;
}

export default COMPENDIUM_HUMAN_CATEGORY_LABELS;
