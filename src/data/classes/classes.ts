import { type ClassDefinition, type ClassLevelProgressionEntry, type ResourceProgressionChange, type SpellcastingDescriptor } from "@domain/contracts/definitions/class";
import { type ResourceCapacityRule } from "@domain/contracts/definitions/resource";
import { type ChoiceDefinition } from "@domain/contracts/primitives";
import { asEntityId } from "@domain/contracts/ids";
import { choice, featureRef, ref, source } from "./common";

type ClassSpec = {
  id: string;
  name: string;
  page: number;
  pdfPage: number;
  hitDie: 4 | 6 | 8 | 10 | 12 | 20 | 100;
  primaryAbilities: ("str" | "dex" | "con" | "int" | "wis" | "cha")[];
  saves: ("str" | "dex" | "con" | "int" | "wis" | "cha")[];
  skillCount: number;
  skillOptions: string;
  subclassLevel: number;
  subclasses: string[];
  levels: Record<number, string[]>;
  asi: number[];
  multiclassPrerequisites: { ability: "str" | "dex" | "int" | "wis" | "cha"; score: number }[];
  proficiencies: string[];
  multiclassProficiencies: string[];
  spellcasting?: SpellcastingDescriptor;
  slotProfile?: "full" | "half" | "pact";
};

const skillSelector = { kind: "any-skill" as const };
const equipmentSelector = { kind: "any-entity-of-type" as const, entityType: "equipment" as const };

function asiChoice(classId: string, level: number, page: number, pdfPage: number): ChoiceDefinition {
  const src = source(page, pdfPage, "Incremento no Valor de Habilidade");
  return {
    id: `${classId}.asi.${level}`,
    kind: "ability-score-increase",
    count: { min: 1, max: 1 },
    optionSet: {
      kind: "explicit",
      options: ["str", "dex", "con", "int", "wis", "cha"].map((ability) => ref(ability)),
    },
    prerequisites: [],
    unique: false,
    sourceRefs: [src],
  };
}

function progression(spec: ClassSpec): readonly ClassLevelProgressionEntry[] {
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const slots = spec.slotProfile ? spellSlots(spec.slotProfile, level) : undefined;
    return {
      level,
      featureRefs: (spec.levels[level] ?? []).map((feature) => featureRef(`${spec.id}.${feature}`)),
      resourceChanges: resourceChangesFor(spec, level),
      choicesGranted: spec.asi.includes(level) ? [asiChoice(spec.id, level, spec.page, spec.pdfPage)] : [],
      ...(slots ? { spellSlotsGranted: { slotsByLevel: slots.map((count, index) => ({ slotLevel: index + 1, count })).filter((entry) => entry.count > 0) } } : {}),
    };
  });
}

function resourceChangesFor(spec: ClassSpec, level: number): readonly ResourceProgressionChange[] {
  const counts: Record<string, number> = {
    "barbarian.rage": level >= 20 ? 999 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2,
    "cleric.channel-divinity": level >= 18 ? 3 : level >= 6 ? 2 : 1,
    "monk.ki": level,
    "sorcerer.sorcery-points": level,
    "paladin.lay-on-hands": level * 5,
  };
  const resourceId = spec.id === "barbarian" ? "barbarian.rage" : spec.id === "cleric" ? "cleric.channel-divinity" : spec.id === "monk" ? "monk.ki" : spec.id === "sorcerer" ? "sorcerer.sorcery-points" : spec.id === "paladin" ? "paladin.lay-on-hands" : undefined;
  if (resourceId && ((spec.id === "barbarian" && [1, 3, 6, 12, 17, 20].includes(level)) || (spec.id === "cleric" && [2, 6, 18].includes(level)) || (spec.id === "monk" && level >= 2) || (spec.id === "sorcerer" && level >= 2) || (spec.id === "paladin" && level >= 1))) {
    const capacityRule: ResourceCapacityRule = { kind: "fixed", amount: counts[resourceId] };
    return [{ resourceRef: ref(resourceId), capacityRule }];
  }
  if (spec.id === "bard" && level === 1) return [{ resourceRef: ref("bard.bardic-inspiration"), capacityRule: { kind: "ability-modifier", ability: "cha", minimum: 1 } }];
  if (spec.id === "wizard" && level === 1) return [{ resourceRef: ref("wizard.arcane-recovery"), capacityRule: { kind: "fixed", amount: 1 } }];
  if (spec.id === "fighter" && level === 1) return [{ resourceRef: ref("fighter.second-wind"), capacityRule: { kind: "fixed", amount: 1 } }];
  if (spec.id === "rogue" && level === 20) return [{ resourceRef: ref("rogue.stroke-of-luck"), capacityRule: { kind: "fixed", amount: 1 } }];
  return [];
}

const FULL_SLOTS: readonly (readonly number[])[] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
const HALF_SLOTS: readonly (readonly number[])[] = [
  [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];
const PACT_SLOTS: readonly (readonly number[])[] = [[], [2], [2], [2], [2], [2], [2], [2], [2], [2], [3], [3], [3], [3], [3], [3], [4], [4], [4], [4]];
function spellSlots(profile: "full" | "half" | "pact", level: number): readonly number[] {
  return (profile === "full" ? FULL_SLOTS : profile === "half" ? HALF_SLOTS : PACT_SLOTS)[level - 1] ?? [];
}

function makeClass(spec: ClassSpec): ClassDefinition {
  const src = source(spec.page, spec.pdfPage, "Criação");
  return {
    id: asEntityId(spec.id),
    name: spec.name,
    tags: ["player-handbook", "class"],
    sourceRefs: [src],
    hitDie: spec.hitDie,
    primaryAbilities: spec.primaryAbilities,
    initialProficiencies: spec.proficiencies.map(ref),
    savingThrowProficiencies: spec.saves,
    skillChoices: {
      ...choice(`${spec.id}.skills`, "skill-proficiency", spec.skillCount, skillSelector, src),
      optionSet: {
        kind: "selector",
        selector: skillSelector,
      },
      prerequisites: [],
    },
    initialEquipmentChoices: [
      choice(`${spec.id}.equipment`, "equipment-pack", 1, equipmentSelector, src),
    ],
    progression: progression(spec),
    subclassSelectionLevel: spec.subclassLevel,
    subclassIds: spec.subclasses.map(asEntityId),
    multiclassPrerequisites: spec.multiclassPrerequisites.map((prerequisite) => ({ kind: "min-ability-score" as const, ...prerequisite })),
    multiclassProficiencies: spec.multiclassProficiencies.map(ref),
    ...(spec.spellcasting ? { spellcasting: spec.spellcasting } : {}),
  };
}

const fullSpellcasting = (ability: "int" | "wis" | "cha", kind: SpellcastingDescriptor["kind"]): SpellcastingDescriptor => ({
  ability,
  kind,
  progressionType: "full",
  ritualCasting: ability === "int",
  spellcastingFocusAllowed: true,
});

const halfSpellcasting = (ability: "wis" | "cha"): SpellcastingDescriptor => ({
  ability,
  kind: "prepared",
  progressionType: "half",
  ritualCasting: false,
  spellcastingFocusAllowed: true,
});

const specs: ClassSpec[] = [
  { id: "barbarian", name: "Bárbaro", page: 46, pdfPage: 45, hitDie: 12, primaryAbilities: ["str"], saves: ["str", "con"], skillCount: 2, skillOptions: "any", subclassLevel: 3, subclasses: ["path-of-the-berserker", "path-of-the-totem-warrior"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "str", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], multiclassProficiencies: ["proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], levels: { 1: ["rage", "unarmored-defense"], 2: ["reckless-attack", "danger-sense"], 3: ["primal-path"], 5: ["extra-attack", "fast-movement"], 7: ["feral-instinct"], 9: ["brutal-critical"], 11: ["relentless-rage"], 15: ["persistent-rage"], 18: ["indomitable-might"], 20: ["primal-champion"] } },
  { id: "bard", name: "Bardo", page: 51, pdfPage: 50, hitDie: 8, primaryAbilities: ["cha"], saves: ["dex", "cha"], skillCount: 3, skillOptions: "any", subclassLevel: 3, subclasses: ["college-of-lore", "college-of-valor"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "cha", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.simple-weapons", "proficiency.hand-crossbow", "proficiency.longsword", "proficiency.rapier", "proficiency.shortsword", "proficiency.instrument"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.instrument"], slotProfile: "full", spellcasting: fullSpellcasting("cha", "known"), levels: { 1: ["spellcasting", "bardic-inspiration"], 2: ["jack-of-all-trades", "song-of-rest"], 3: ["bard-college", "expertise"], 5: ["font-of-inspiration"], 6: ["countercharm"], 10: ["magical-secrets", "expertise"], 20: ["superior-inspiration"] } },
  { id: "warlock", name: "Bruxo", page: 56, pdfPage: 55, hitDie: 8, primaryAbilities: ["cha"], saves: ["wis", "cha"], skillCount: 2, skillOptions: "any", subclassLevel: 1, subclasses: ["the-archfey", "the-fiend", "the-great-old-one"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "cha", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.simple-weapons"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.simple-weapons"], slotProfile: "pact", spellcasting: { ability: "cha", kind: "known", progressionType: "pact", ritualCasting: false, spellcastingFocusAllowed: true }, levels: { 1: ["otherworldly-patron", "pact-magic"], 2: ["eldritch-invocations"], 3: ["pact-boon"], 11: ["mystic-arcanum"], 20: ["eldritch-master"] } },
  { id: "cleric", name: "Clérigo", page: 63, pdfPage: 62, hitDie: 8, primaryAbilities: ["wis"], saves: ["wis", "cha"], skillCount: 2, skillOptions: "any", subclassLevel: 1, subclasses: ["knowledge-domain", "life-domain", "light-domain", "nature-domain", "tempest-domain", "trickery-domain", "war-domain"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "wis", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield"], slotProfile: "full", spellcasting: fullSpellcasting("wis", "prepared"), levels: { 1: ["spellcasting", "divine-domain"], 2: ["channel-divinity"], 5: ["destroy-undead"], 10: ["divine-intervention"], 20: ["greater-divine-intervention"] } },
  { id: "druid", name: "Druida", page: 71, pdfPage: 70, hitDie: 8, primaryAbilities: ["wis"], saves: ["int", "wis"], skillCount: 2, skillOptions: "any", subclassLevel: 2, subclasses: ["circle-of-the-land", "circle-of-the-moon"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "wis", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.herbalism-kit"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield"], slotProfile: "full", spellcasting: fullSpellcasting("wis", "prepared"), levels: { 1: ["druidic", "spellcasting"], 2: ["wild-shape", "druid-circle"], 4: ["wild-shape-improvement"], 18: ["timeless-body", "beast-spells"], 20: ["archdruid"] } },
  { id: "sorcerer", name: "Feiticeiro", page: 77, pdfPage: 76, hitDie: 6, primaryAbilities: ["cha"], saves: ["con", "cha"], skillCount: 2, skillOptions: "any", subclassLevel: 1, subclasses: ["draconic-bloodline", "wild-magic"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "cha", score: 13 }], proficiencies: ["proficiency.dagger", "proficiency.dart", "proficiency.sling", "proficiency.quarterstaff", "proficiency.light-crossbow"], multiclassProficiencies: [], slotProfile: "full", spellcasting: fullSpellcasting("cha", "known"), levels: { 1: ["spellcasting", "sorcerous-origin"], 2: ["font-of-magic"], 3: ["metamagic"], 10: ["metamagic"], 20: ["sorcerous-restoration"] } },
  { id: "fighter", name: "Guerreiro", page: 83, pdfPage: 82, hitDie: 10, primaryAbilities: ["str", "dex"], saves: ["str", "con"], skillCount: 2, skillOptions: "any", subclassLevel: 3, subclasses: ["champion", "battle-master", "eldritch-knight"], asi: [4, 6, 8, 12, 14, 16, 19], multiclassPrerequisites: [{ ability: "str", score: 13 }, { ability: "dex", score: 13 }], proficiencies: ["proficiency.all-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], levels: { 1: ["fighting-style", "second-wind"], 2: ["action-surge"], 3: ["martial-archetype"], 5: ["extra-attack"], 9: ["indomitable"], 11: ["extra-attack"], 13: ["indomitable"], 17: ["action-surge", "indomitable"], 20: ["extra-attack"] } },
  { id: "rogue", name: "Ladino", page: 89, pdfPage: 88, hitDie: 8, primaryAbilities: ["dex"], saves: ["dex", "int"], skillCount: 4, skillOptions: "any", subclassLevel: 3, subclasses: ["thief", "assassin", "arcane-trickster"], asi: [4, 8, 10, 12, 16, 19], multiclassPrerequisites: [{ ability: "dex", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.simple-weapons", "proficiency.hand-crossbow", "proficiency.rapier", "proficiency.shortsword", "proficiency.thieves-tools"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.thieves-tools"], levels: { 1: ["expertise", "sneak-attack", "thieves-cant"], 2: ["cunning-action"], 3: ["roguish-archetype"], 5: ["uncanny-dodge"], 7: ["evasion"], 11: ["reliable-talent"], 14: ["blindsense"], 15: ["slippery-mind"], 18: ["elusive"], 20: ["stroke-of-luck"] } },
  { id: "wizard", name: "Mago", page: 94, pdfPage: 93, hitDie: 6, primaryAbilities: ["int"], saves: ["int", "wis"], skillCount: 2, skillOptions: "any", subclassLevel: 2, subclasses: ["school-of-abjuration", "school-of-conjuration", "school-of-divination", "school-of-enchantment", "school-of-evocation", "school-of-illusion", "school-of-necromancy", "school-of-transmutation"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "int", score: 13 }], proficiencies: ["proficiency.dagger", "proficiency.dart", "proficiency.sling", "proficiency.quarterstaff", "proficiency.light-crossbow"], multiclassProficiencies: [], slotProfile: "full", spellcasting: fullSpellcasting("int", "spellbook-prepared"), levels: { 1: ["spellcasting", "arcane-recovery"], 2: ["arcane-tradition"], 18: ["spell-mastery"], 20: ["signature-spells"] } },
  { id: "monk", name: "Monge", page: 102, pdfPage: 101, hitDie: 8, primaryAbilities: ["dex", "wis"], saves: ["str", "dex"], skillCount: 2, skillOptions: "any", subclassLevel: 3, subclasses: ["way-of-the-open-hand", "way-of-shadow", "way-of-the-four-elements"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "dex", score: 13 }, { ability: "wis", score: 13 }], proficiencies: ["proficiency.simple-weapons", "proficiency.shortsword"], multiclassProficiencies: ["proficiency.simple-weapons", "proficiency.shortsword"], levels: { 1: ["unarmored-defense", "martial-arts"], 2: ["ki", "unarmored-movement"], 3: ["monastic-tradition", "deflect-missiles"], 5: ["extra-attack", "stunning-strike"], 7: ["evasion", "stillness-of-mind"], 10: ["purity-of-body"], 13: ["tongue-of-sun-and-moon"], 14: ["diamond-soul"], 15: ["timeless-body"], 18: ["empty-body"], 20: ["perfect-self"] } },
  { id: "paladin", name: "Paladino", page: 108, pdfPage: 107, hitDie: 10, primaryAbilities: ["str", "cha"], saves: ["wis", "cha"], skillCount: 2, skillOptions: "any", subclassLevel: 3, subclasses: ["oath-of-devotion", "oath-of-the-ancients", "oath-of-vengeance"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "str", score: 13 }, { ability: "cha", score: 13 }], proficiencies: ["proficiency.all-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], slotProfile: "half", spellcasting: halfSpellcasting("cha"), levels: { 1: ["divine-sense", "lay-on-hands"], 2: ["fighting-style", "divine-smite", "spellcasting"], 3: ["divine-health"], 5: ["extra-attack"], 6: ["aura-of-protection"], 10: ["aura-of-courage"], 11: ["improved-divine-smite"], 14: ["cleansing-touch"], 18: ["aura-range-improvement"] } },
  { id: "ranger", name: "Patrulheiro", page: 115, pdfPage: 114, hitDie: 10, primaryAbilities: ["dex", "wis"], saves: ["str", "dex"], skillCount: 3, skillOptions: "any", subclassLevel: 3, subclasses: ["beast-conclave", "hunter-conclave", "deep-stalker-conclave"], asi: [4, 8, 12, 16, 19], multiclassPrerequisites: [{ ability: "dex", score: 13 }, { ability: "wis", score: 13 }], proficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], multiclassProficiencies: ["proficiency.light-armor", "proficiency.medium-armor", "proficiency.shield", "proficiency.simple-weapons", "proficiency.martial-weapons"], slotProfile: "half", spellcasting: halfSpellcasting("wis"), levels: { 1: ["favored-enemy", "natural-explorer"], 2: ["fighting-style", "spellcasting"], 3: ["primeval-awareness"], 5: ["extra-attack"], 8: ["land-stride"], 10: ["hide-in-plain-sight"], 14: ["vanish"], 18: ["feral-senses"], 20: ["foe-slayer"] } },
];

export const classes: readonly ClassDefinition[] = specs.map(makeClass);
export const CLASS_DEFINITIONS = classes;
export const classesById: ReadonlyMap<string, ClassDefinition> = new Map(classes.map((entry) => [entry.id, entry]));

export function findClass(classId: string): ClassDefinition | undefined {
  return classesById.get(classId);
}

export type { ClassSpec };
