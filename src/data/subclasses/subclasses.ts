import { type SubclassDefinition } from "@domain/contracts/definitions/class";
import { asEntityId } from "@domain/contracts/ids";
import { choice, featureRef, ref, source } from "@data/classes/common";

type SubclassSpec = { id: string; name: string; classId: string; selectionLevel: number; levels: readonly number[]; page: number; pdfPage: number };

const specs: readonly SubclassSpec[] = ([
  ["path-of-the-berserker", "Caminho do Furioso", "barbarian", 3, [3, 6, 10, 14], 49, 48],
  ["path-of-the-totem-warrior", "Caminho do Guerreiro Totêmico", "barbarian", 3, [3, 6, 10, 14], 49, 48],
  ["college-of-lore", "Colégio do Conhecimento", "bard", 3, [3, 6, 14], 54, 53],
  ["college-of-valor", "Colégio da Bravura", "bard", 3, [3, 6, 14], 54, 53],
  ["the-archfey", "A Arquifada", "warlock", 1, [1, 6, 10, 14], 58, 57],
  ["the-fiend", "O Corruptor", "warlock", 1, [1, 6, 10, 14], 58, 57],
  ["the-great-old-one", "O Grande Antigo", "warlock", 1, [1, 6, 10, 14], 58, 57],
  ["knowledge-domain", "Domínio do Conhecimento", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["life-domain", "Domínio da Vida", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["light-domain", "Domínio da Luz", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["nature-domain", "Domínio da Natureza", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["tempest-domain", "Domínio da Tempestade", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["trickery-domain", "Domínio da Enganação", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["war-domain", "Domínio da Guerra", "cleric", 1, [1, 2, 6, 8, 17], 65, 64],
  ["circle-of-the-land", "Círculo da Terra", "druid", 2, [2, 6, 10, 14], 73, 72],
  ["circle-of-the-moon", "Círculo da Lua", "druid", 2, [2, 6, 10, 14], 73, 72],
  ["draconic-bloodline", "Linhagem Dracônica", "sorcerer", 1, [1, 6, 14, 18], 79, 78],
  ["wild-magic", "Magia Selvagem", "sorcerer", 1, [1, 6, 14, 18], 79, 78],
  ["champion", "Campeão", "fighter", 3, [3, 7, 10, 15, 18], 85, 84],
  ["battle-master", "Mestre de Batalha", "fighter", 3, [3, 7, 10, 15, 18], 85, 84],
  ["eldritch-knight", "Cavaleiro Místico", "fighter", 3, [3, 7, 10, 15, 18], 85, 84],
  ["thief", "Ladrão", "rogue", 3, [3, 9, 13, 17], 91, 90],
  ["assassin", "Assassino", "rogue", 3, [3, 9, 13, 17], 91, 90],
  ["arcane-trickster", "Trapaceiro Arcano", "rogue", 3, [3, 9, 13, 17], 91, 90],
  ["school-of-abjuration", "Escola de Abjuração", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-conjuration", "Escola de Conjuração", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-divination", "Escola de Adivinhação", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-enchantment", "Escola de Encantamento", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-evocation", "Escola de Evocação", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-illusion", "Escola de Ilusão", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-necromancy", "Escola de Necromancia", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["school-of-transmutation", "Escola de Transmutação", "wizard", 2, [2, 6, 10, 14], 96, 95],
  ["way-of-the-open-hand", "Caminho da Mão Aberta", "monk", 3, [3, 6, 11, 17], 104, 103],
  ["way-of-shadow", "Caminho da Sombra", "monk", 3, [3, 6, 11, 17], 104, 103],
  ["way-of-the-four-elements", "Caminho dos Quatro Elementos", "monk", 3, [3, 6, 11, 17], 104, 103],
  ["oath-of-devotion", "Juramento de Devoção", "paladin", 3, [3, 7, 15, 20], 111, 110],
  ["oath-of-the-ancients", "Juramento dos Anciões", "paladin", 3, [3, 7, 15, 20], 111, 110],
  ["oath-of-vengeance", "Juramento de Vingança", "paladin", 3, [3, 7, 15, 20], 111, 110],
  ["beast-conclave", "Conclave da Besta", "ranger", 3, [3, 5, 7, 11, 15], 118, 117],
  ["hunter-conclave", "Conclave do Caçador", "ranger", 3, [3, 5, 7, 11, 15], 118, 117],
  ["deep-stalker-conclave", "Conclave do Rastreador Subterrâneo", "ranger", 3, [3, 5, 7, 11, 15], 118, 117],
] as const).map(([id, name, classId, selectionLevel, levels, page, pdfPage]) => ({ id, name, classId, selectionLevel, levels, page, pdfPage }));

export const subclasses: readonly SubclassDefinition[] = specs.map((spec) => {
  const src = source(spec.page, spec.pdfPage, "Subclasses");
  return {
    id: asEntityId(spec.id),
    name: spec.name,
    tags: ["player-handbook", "subclass"],
    sourceRefs: [src],
    classId: asEntityId(spec.classId),
    selectionLevel: spec.selectionLevel,
    featureGrants: spec.levels.map((level) => ({ level, featureRef: featureRef(`${spec.id}-feature-level-${level}`) })),
    spellGrants: [],
    resourceChanges: [],
    choices: [],
  };
});

export const SUBCLASS_DEFINITIONS = subclasses;
export const subclassesById: ReadonlyMap<string, SubclassDefinition> = new Map(subclasses.map((entry) => [entry.id, entry]));

export function findSubclass(subclassId: string): SubclassDefinition | undefined {
  return subclassesById.get(subclassId);
}
