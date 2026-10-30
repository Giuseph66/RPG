import { type ChoiceDefinition, type ChoiceKind, type ChoiceSelector, type SourceRef } from "@domain/contracts/primitives";
import { invocationsKnownAt, metamagicKnownAt } from "@domain/character/evolution/spell-tables";
import { ref, source } from "@data/classes/common";
import { FIGHTING_STYLES_BY_CLASS, OPTION_GROUPS, optionFeatureId, type OptionGroupId } from "./options";

/** Páginas impressas / PDF do Livro do Jogador por classe, para citar a fonte das escolhas. */
const PAGES: Readonly<Record<string, readonly [number, number]>> = {
  barbarian: [46, 45], bard: [51, 50], warlock: [56, 55], cleric: [63, 62], druid: [71, 70], sorcerer: [77, 76],
  fighter: [83, 82], rogue: [89, 88], wizard: [94, 93], monk: [102, 101], paladin: [108, 107], ranger: [115, 114],
};

const SUBCLASS_PAGES: Readonly<Record<string, readonly [number, number]>> = {
  "path-of-the-totem-warrior": [49, 48], "college-of-lore": [54, 53], "knowledge-domain": [65, 64], "nature-domain": [65, 64],
  "circle-of-the-land": [73, 72], "draconic-bloodline": [79, 78], champion: [85, 84], "battle-master": [85, 84],
  "way-of-the-four-elements": [104, 103], "beast-conclave": [118, 117], "hunter-conclave": [118, 117],
};

const classSource = (classId: string, section: string): SourceRef => {
  const [printed, pdf] = PAGES[classId] ?? [46, 45];
  return source(printed, pdf, section);
};

const subclassSource = (subclassId: string, section: string): SourceRef => {
  const [printed, pdf] = SUBCLASS_PAGES[subclassId] ?? [46, 45];
  return source(printed, pdf, section);
};

function groupOptionRefs(groupId: OptionGroupId, only?: readonly string[]) {
  const group = OPTION_GROUPS.find((entry) => entry.id === groupId);
  if (!group) throw new Error(`Grupo de opções desconhecido: ${groupId}`);
  return group.options.filter((option) => !only || only.includes(option.id)).map((option) => ref(optionFeatureId(groupId, option.id)));
}

/** Escolha entre as opções de um grupo do catálogo. Tudo é opcional (min 0): a mesa decide. */
function fromGroup(id: string, kind: ChoiceKind, groupId: OptionGroupId, max: number, sourceRef: SourceRef, options?: readonly string[], unique = true): ChoiceDefinition {
  return { id, kind, count: { min: 0, max }, optionSet: { kind: "explicit", options: groupOptionRefs(groupId, options) }, prerequisites: [], unique, sourceRefs: [sourceRef] };
}

function bySelector(id: string, kind: ChoiceKind, selector: ChoiceSelector, max: number, sourceRef: SourceRef): ChoiceDefinition {
  return { id, kind, count: { min: 0, max }, optionSet: { kind: "selector", selector }, prerequisites: [], unique: true, sourceRefs: [sourceRef] };
}

function explicitSkills(id: string, kind: ChoiceKind, skills: readonly string[], max: number, sourceRef: SourceRef): ChoiceDefinition {
  return { id, kind, count: { min: 0, max }, optionSet: { kind: "explicit", options: skills.map(ref) }, prerequisites: [], unique: true, sourceRefs: [sourceRef] };
}

const expertise = (classId: string, level: number): ChoiceDefinition => bySelector(`${classId}.expertise.${level}`, "expertise", { kind: "any-skill" }, 2, classSource(classId, "Especialização"));
const fightingStyle = (classId: string, level: number): ChoiceDefinition => fromGroup(`${classId}.fighting-style.${level}`, "fighting-style", "fighting-style", 1, classSource(classId, "Estilo de Luta"), FIGHTING_STYLES_BY_CLASS[classId]);

/** Escolhas específicas de cada classe por nível. Aumento de Habilidade e magias ficam à parte. */
export const CLASS_LEVEL_CHOICES: Readonly<Record<string, Readonly<Record<number, readonly ChoiceDefinition[]>>>> = {
  fighter: { 1: [fightingStyle("fighter", 1)] },
  paladin: { 2: [fightingStyle("paladin", 2)] },
  ranger: {
    1: [
      fromGroup("ranger.favored-enemy.1", "other", "favored-enemy", 1, classSource("ranger", "Inimigo Favorito")),
      bySelector("ranger.favored-enemy-language.1", "language", { kind: "any-language" }, 1, classSource("ranger", "Inimigo Favorito")),
    ],
    2: [fightingStyle("ranger", 2)],
    6: [
      fromGroup("ranger.greater-favored-enemy.6", "other", "greater-favored-enemy", 1, classSource("ranger", "Inimigo Favorito Maior")),
      bySelector("ranger.greater-favored-enemy-language.6", "language", { kind: "any-language" }, 1, classSource("ranger", "Inimigo Favorito Maior")),
    ],
  },
  rogue: { 1: [expertise("rogue", 1)], 6: [expertise("rogue", 6)] },
  bard: { 3: [expertise("bard", 3)], 10: [expertise("bard", 10)] },
  sorcerer: Object.fromEntries([3, 10, 17].map((level) => [level, [fromGroup(`sorcerer.metamagic.${level}`, "other", "metamagic", metamagicKnownAt(level) - metamagicKnownAt(level - 1), classSource("sorcerer", "Metamagia"))]])),
  warlock: {
    3: [fromGroup("warlock.pact-boon.3", "other", "pact-boon", 1, classSource("warlock", "Dádiva do Pacto"))],
    ...Object.fromEntries([2, 5, 7, 9, 12, 15, 18].map((level) => [level, [fromGroup(`warlock.invocations.${level}`, "other", "invocation", invocationsKnownAt(level) - invocationsKnownAt(level - 1), classSource("warlock", "Invocações Místicas"))]])),
  },
};

/** Escolhas atreladas a uma característica de subclasse: chave = `<subclasse>-feature-level-<nível>`. */
export const SUBCLASS_FEATURE_CHOICES: Readonly<Record<string, readonly ChoiceDefinition[]>> = {
  "path-of-the-totem-warrior-feature-level-3": [fromGroup("path-of-the-totem-warrior.totem-spirit.3", "subclass-option", "totem", 1, subclassSource("path-of-the-totem-warrior", "Totem Espiritual"), undefined, false)],
  "path-of-the-totem-warrior-feature-level-6": [fromGroup("path-of-the-totem-warrior.totem-aspect.6", "subclass-option", "totem", 1, subclassSource("path-of-the-totem-warrior", "Aspecto da Besta"), undefined, false)],
  "path-of-the-totem-warrior-feature-level-14": [fromGroup("path-of-the-totem-warrior.totem-attunement.14", "subclass-option", "totem", 1, subclassSource("path-of-the-totem-warrior", "Sintonia Totêmica"), undefined, false)],
  "college-of-lore-feature-level-3": [bySelector("college-of-lore.bonus-skills.3", "skill-proficiency", { kind: "any-skill" }, 3, subclassSource("college-of-lore", "Proficiência Adicional"))],
  "knowledge-domain-feature-level-1": [
    bySelector("knowledge-domain.languages.1", "language", { kind: "any-language" }, 2, subclassSource("knowledge-domain", "Bênçãos do Conhecimento")),
    explicitSkills("knowledge-domain.skills-expertise.1", "expertise", ["arcana", "history", "nature", "religion"], 2, subclassSource("knowledge-domain", "Bênçãos do Conhecimento")),
  ],
  "nature-domain-feature-level-1": [explicitSkills("nature-domain.skill.1", "skill-proficiency", ["animal-handling", "nature", "survival"], 1, subclassSource("nature-domain", "Acólito da Natureza"))],
  "circle-of-the-land-feature-level-2": [fromGroup("circle-of-the-land.terrain.2", "subclass-option", "druid-terrain", 1, subclassSource("circle-of-the-land", "Magias de Círculo"))],
  "draconic-bloodline-feature-level-1": [fromGroup("draconic-bloodline.ancestry.1", "subclass-option", "dragon-ancestry", 1, subclassSource("draconic-bloodline", "Ancestral Dracônico"))],
  "champion-feature-level-10": [fromGroup("champion.additional-fighting-style.10", "fighting-style", "fighting-style", 1, subclassSource("champion", "Estilo de Luta Adicional"), FIGHTING_STYLES_BY_CLASS.fighter)],
  "battle-master-feature-level-3": [
    fromGroup("battle-master.maneuvers.3", "subclass-option", "maneuver", 3, subclassSource("battle-master", "Manobras")),
    bySelector("battle-master.student-of-war.3", "tool-proficiency", { kind: "any-tool-proficiency" }, 1, subclassSource("battle-master", "Estudioso da Guerra")),
  ],
  "battle-master-feature-level-7": [fromGroup("battle-master.maneuvers.7", "subclass-option", "maneuver", 2, subclassSource("battle-master", "Manobras"))],
  "battle-master-feature-level-10": [fromGroup("battle-master.maneuvers.10", "subclass-option", "maneuver", 2, subclassSource("battle-master", "Manobras"))],
  "battle-master-feature-level-15": [fromGroup("battle-master.maneuvers.15", "subclass-option", "maneuver", 2, subclassSource("battle-master", "Manobras"))],
  "way-of-the-four-elements-feature-level-3": [fromGroup("way-of-the-four-elements.disciplines.3", "subclass-option", "elemental-discipline", 1, subclassSource("way-of-the-four-elements", "Disciplinas Elementais"))],
  "way-of-the-four-elements-feature-level-6": [fromGroup("way-of-the-four-elements.disciplines.6", "subclass-option", "elemental-discipline", 1, subclassSource("way-of-the-four-elements", "Disciplinas Elementais"))],
  "way-of-the-four-elements-feature-level-11": [fromGroup("way-of-the-four-elements.disciplines.11", "subclass-option", "elemental-discipline", 1, subclassSource("way-of-the-four-elements", "Disciplinas Elementais"))],
  "way-of-the-four-elements-feature-level-17": [fromGroup("way-of-the-four-elements.disciplines.17", "subclass-option", "elemental-discipline", 1, subclassSource("way-of-the-four-elements", "Disciplinas Elementais"))],
  "beast-conclave-feature-level-3": [fromGroup("beast-conclave.companion.3", "subclass-option", "beast-companion", 1, subclassSource("beast-conclave", "Companheiro Animal"))],
  "hunter-conclave-feature-level-3": [fromGroup("hunter-conclave.hunters-prey.3", "subclass-option", "hunters-prey", 1, subclassSource("hunter-conclave", "Presa do Caçador"))],
  "hunter-conclave-feature-level-7": [fromGroup("hunter-conclave.defensive-tactics.7", "subclass-option", "defensive-tactics", 1, subclassSource("hunter-conclave", "Táticas Defensivas"))],
  "hunter-conclave-feature-level-11": [fromGroup("hunter-conclave.multiattack.11", "subclass-option", "multiattack", 1, subclassSource("hunter-conclave", "Ataque Múltiplo"))],
  "hunter-conclave-feature-level-15": [fromGroup("hunter-conclave.superior-defense.15", "subclass-option", "superior-hunters-defense", 1, subclassSource("hunter-conclave", "Defesa de Caçador Superior"))],
};
