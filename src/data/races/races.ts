import { type RaceDefinition, type RaceTrait, type SubraceDefinition } from "@domain/contracts/definitions/race";
import { asCentimeters } from "@domain/contracts/primitives";
import { asEntityId } from "@domain/contracts/ids";
import { contextualAdvantageModifier, contextualResistanceModifier, customTraitModifier, explicitChoice, levelPredicate, modifier, ref, selectorChoice, source, RULESET_ID } from "./common";

const LANGUAGE = {
  common: asEntityId("common"),
  dwarvish: asEntityId("dwarvish"),
  elvish: asEntityId("elvish"),
  halfling: asEntityId("halfling"),
  draconic: asEntityId("draconic"),
  gnomish: asEntityId("gnomish"),
  orc: asEntityId("orc"),
  infernal: asEntityId("infernal"),
} as const;

const abilityIds = ["str", "dex", "con", "int", "wis", "cha"] as const;
const sourceByRace = {
  dwarf: source(20, "Anão"), elf: source(23, "Elfo"), halfling: source(28, "Halfling"), human: source(31, "Humano"),
  dragonborn: source(34, "Draconato"), gnome: source(36, "Gnomo"), "half-elf": source(39, "Meio-elfo"),
  "half-orc": source(41, "Meio-orc"), tiefling: source(43, "Tiefling"),
} as const;

function savingAdvantageTrait(id: string, name: string, description: string, sourceRef: ReturnType<typeof source>, abilities: readonly ("str" | "dex" | "con" | "int" | "wis" | "cha")[]): RaceTrait {
  return {
    id: asEntityId(id), name, description,
    modifiers: abilities.map((ability) => contextualAdvantageModifier(`${id}.${ability}`, sourceRef, `${description} — resistência de ${ability} no contexto descrito`)),
    sourceRefs: [sourceRef],
  };
}

function poisonResistanceTrait(id: string, name: string, description: string, sourceRef: ReturnType<typeof source>): RaceTrait {
  return {
    id: asEntityId(id), name, description,
    modifiers: [
      contextualAdvantageModifier(`${id}.save`, sourceRef, `${description} — resistência contra veneno`),
      contextualResistanceModifier(`${id}.damage`, sourceRef, `${description} — dano de veneno`, { kind: "damage-type", damageType: "poison" }),
    ], sourceRefs: [sourceRef],
  };
}

function levelledSpellTrait(id: string, name: string, description: string, sourceRef: ReturnType<typeof source>, level: number): RaceTrait {
  return {
    id: asEntityId(id), name, description,
    modifiers: [customTraitModifier(`${id}.grant`, sourceRef, description, levelPredicate(level))],
    sourceRefs: [sourceRef],
  };
}

const dwarfSource = sourceByRace.dwarf;
const elfSource = sourceByRace.elf;
const halflingSource = sourceByRace.halfling;
const humanSource = sourceByRace.human;
const dragonbornSource = sourceByRace.dragonborn;
const gnomeSource = sourceByRace.gnome;
const halfElfSource = sourceByRace["half-elf"];
const halfOrcSource = sourceByRace["half-orc"];
const tieflingSource = sourceByRace.tiefling;

export const DRAGONBORN_ANCESTRIES = [
  { id: "blue", name: "Azul", damageType: "lightning", area: "line", rangeCm: asCentimeters(900), widthCm: asCentimeters(150), savingAbility: "dex" },
  { id: "white", name: "Branco", damageType: "cold", area: "cone", rangeCm: asCentimeters(450), savingAbility: "con" },
  { id: "bronze", name: "Bronze", damageType: "lightning", area: "line", rangeCm: asCentimeters(900), widthCm: asCentimeters(150), savingAbility: "dex" },
  { id: "copper", name: "Cobre", damageType: "acid", area: "line", rangeCm: asCentimeters(900), widthCm: asCentimeters(150), savingAbility: "dex" },
  { id: "brass", name: "Latão", damageType: "fire", area: "line", rangeCm: asCentimeters(900), widthCm: asCentimeters(150), savingAbility: "dex" },
  { id: "black", name: "Negro", damageType: "acid", area: "line", rangeCm: asCentimeters(900), widthCm: asCentimeters(150), savingAbility: "dex" },
  { id: "gold", name: "Ouro", damageType: "fire", area: "cone", rangeCm: asCentimeters(450), savingAbility: "dex" },
  { id: "silver", name: "Prata", damageType: "cold", area: "cone", rangeCm: asCentimeters(450), savingAbility: "con" },
  { id: "green", name: "Verde", damageType: "poison", area: "cone", rangeCm: asCentimeters(450), savingAbility: "con" },
  { id: "red", name: "Vermelho", damageType: "fire", area: "cone", rangeCm: asCentimeters(450), savingAbility: "dex" },
] as const;

const dragonAncestryChoice = selectorChoice("dragonborn.ancestry", "other", { kind: "any-entity-of-type", entityType: "race", filterTag: "dragonborn-ancestry" }, dragonbornSource);

/** Restrições de escolhas cuja categoria ainda não possui catálogo no contrato V1. */
export const RACE_CHOICE_ALLOWED_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  "dwarf.tool-proficiency": ["proficiency.smiths-tools", "proficiency.brewers-supplies", "proficiency.masons-tools"],
  "dragonborn.ancestry": DRAGONBORN_ANCESTRIES.map((ancestry) => `dragonborn.ancestry.${ancestry.id}`),
};

const dwarfTraits: readonly RaceTrait[] = [
  poisonResistanceTrait("dwarf.dwarven-resilience", "Resiliência Anã", "Vantagem em resistências contra veneno e resistência a dano de veneno.", dwarfSource),
  { id: asEntityId("dwarf.stonecunning"), name: "Conhecimento de Pedras", description: "História sobre a origem de trabalho em pedra: proficiência e dobro do bônus de proficiência.", modifiers: [customTraitModifier("dwarf.stonecunning.history", dwarfSource, "História sobre trabalho em pedra usa o dobro do bônus de proficiência")], sourceRefs: [dwarfSource] },
  { id: asEntityId("dwarf.dwarven-speed"), name: "Velocidade Anã", description: "A armadura pesada não reduz o deslocamento de caminhada anão.", modifiers: [modifier("dwarf.dwarven-speed.minimum", dwarfSource, { kind: "speed", speedKind: "walk" }, "set-minimum", { kind: "number", amount: 750 })], sourceRefs: [dwarfSource] },
];
const elfTraits: readonly RaceTrait[] = [
  savingAdvantageTrait("elf.fey-ancestry", "Ancestral Feérico", "Vantagem para resistir a ser enfeitiçado; magia não pode fazer o elfo dormir.", elfSource, ["wis"]),
  { id: asEntityId("elf.trance"), name: "Transe", description: "Meditação semiconsciente de quatro horas equivale ao sono humano de oito horas; a interação exata com descanso longo permanece pendente (PEND-014).", modifiers: [], sourceRefs: [elfSource] },
  { id: asEntityId("elf.keen-senses"), name: "Sentidos Aguçados", description: "Proficiência em Percepção.", modifiers: [], sourceRefs: [elfSource] },
];
const halflingTraits: readonly RaceTrait[] = [
  { id: asEntityId("halfling.lucky"), name: "Sortudo", description: "Pode rerrolar um 1 natural em ataque, teste de habilidade ou resistência, usando o novo resultado.", modifiers: [], sourceRefs: [halflingSource] },
  savingAdvantageTrait("halfling.brave", "Bravura", "Vantagem em resistências contra amedrontamento.", halflingSource, ["wis"]),
  { id: asEntityId("halfling.nimbleness"), name: "Agilidade Halfling", description: "Pode atravessar o espaço de uma criatura de pelo menos uma categoria maior.", modifiers: [], sourceRefs: [halflingSource] },
];

export const races: readonly RaceDefinition[] = [
  { id: asEntityId("dwarf"), name: "Anão", tags: ["player-handbook", "race"], sourceRefs: [dwarfSource], abilityIncreases: [{ ability: "con", amount: 2 }], size: "medium", speedCm: asCentimeters(750), languages: [LANGUAGE.common, LANGUAGE.dwarvish], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: ["proficiency.battleaxe", "proficiency.handaxe", "proficiency.light-hammer", "proficiency.warhammer"].map(ref), traits: dwarfTraits, subraceIds: ["hill-dwarf", "mountain-dwarf"].map(asEntityId), choices: [selectorChoice("dwarf.tool-proficiency", "tool-proficiency", { kind: "any-tool-proficiency" }, dwarfSource)] },
  { id: asEntityId("elf"), name: "Elfo", tags: ["player-handbook", "race"], sourceRefs: [elfSource], abilityIncreases: [{ ability: "dex", amount: 2 }], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common, LANGUAGE.elvish], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: ["proficiency.perception"].map(ref), traits: elfTraits, subraceIds: ["high-elf", "wood-elf", "dark-elf"].map(asEntityId), choices: [] },
  { id: asEntityId("halfling"), name: "Halfling", tags: ["player-handbook", "race"], sourceRefs: [halflingSource], abilityIncreases: [{ ability: "dex", amount: 2 }], size: "small", speedCm: asCentimeters(750), languages: [LANGUAGE.common, LANGUAGE.halfling], senses: [], proficiencies: [], traits: halflingTraits, subraceIds: ["lightfoot", "stout"].map(asEntityId), choices: [] },
  { id: asEntityId("human"), name: "Humano", tags: ["player-handbook", "race"], sourceRefs: [humanSource], abilityIncreases: abilityIds.map((ability) => ({ ability, amount: 1 })), size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common], senses: [], proficiencies: [], traits: [], subraceIds: [], choices: [selectorChoice("human.language", "language", { kind: "any-language" }, humanSource)] },
  { id: asEntityId("dragonborn"), name: "Draconato", tags: ["player-handbook", "race"], sourceRefs: [dragonbornSource], abilityIncreases: [{ ability: "str", amount: 2 }, { ability: "cha", amount: 1 }], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common, LANGUAGE.draconic], senses: [], proficiencies: [], traits: [{ id: asEntityId("dragonborn.draconic-ancestry"), name: "Ancestral Dracônica", description: "A ancestralidade escolhida define tipo de dano, resistência e formato da arma de sopro.", modifiers: [] , sourceRefs: [dragonbornSource] }, { id: asEntityId("dragonborn.breath-weapon"), name: "Arma de Sopro", description: "Ação, um uso por descanso curto ou longo; CD 8 + CON + proficiência. Dano 2d6/3d6/4d6/5d6 nos níveis 1/6/11/16; sucesso do alvo reduz o dano à metade.", modifiers: [customTraitModifier("dragonborn.breath-weapon.2d6", dragonbornSource, "Dano da arma de sopro: 2d6", levelPredicate(1)), customTraitModifier("dragonborn.breath-weapon.3d6", dragonbornSource, "Dano da arma de sopro: 3d6", levelPredicate(6)), customTraitModifier("dragonborn.breath-weapon.4d6", dragonbornSource, "Dano da arma de sopro: 4d6", levelPredicate(11)), customTraitModifier("dragonborn.breath-weapon.5d6", dragonbornSource, "Dano da arma de sopro: 5d6", levelPredicate(16))], sourceRefs: [dragonbornSource] }], subraceIds: [], choices: [dragonAncestryChoice] },
  { id: asEntityId("gnome"), name: "Gnomo", tags: ["player-handbook", "race"], sourceRefs: [gnomeSource], abilityIncreases: [{ ability: "int", amount: 2 }], size: "small", speedCm: asCentimeters(750), languages: [LANGUAGE.common, LANGUAGE.gnomish], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: [], traits: [savingAdvantageTrait("gnome.gnome-cunning", "Esperteza Gnômica", "Vantagem em resistências de Inteligência, Sabedoria e Carisma contra magia.", gnomeSource, ["int", "wis", "cha"])], subraceIds: ["forest-gnome", "rock-gnome"].map(asEntityId), choices: [] },
  { id: asEntityId("half-elf"), name: "Meio-elfo", tags: ["player-handbook", "race"], sourceRefs: [halfElfSource], abilityIncreases: [{ ability: "cha", amount: 2 }], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common, LANGUAGE.elvish], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: [], traits: [savingAdvantageTrait("half-elf.fey-ancestry", "Ancestral Feérico", "Vantagem para resistir a ser enfeitiçado; magia não pode fazer o meio-elfo dormir.", halfElfSource, ["wis"])], subraceIds: [], choices: [explicitChoice("half-elf.ability-increases", "ability-score-increase", abilityIds.filter((ability) => ability !== "cha"), halfElfSource, 2), selectorChoice("half-elf.skill-proficiencies", "skill-proficiency", { kind: "any-skill" }, halfElfSource, 2), selectorChoice("half-elf.language", "language", { kind: "any-language" }, halfElfSource)] },
  { id: asEntityId("half-orc"), name: "Meio-orc", tags: ["player-handbook", "race"], sourceRefs: [halfOrcSource], abilityIncreases: [{ ability: "str", amount: 2 }, { ability: "con", amount: 1 }], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common, LANGUAGE.orc], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: ["proficiency.intimidation"].map(ref), traits: [{ id: asEntityId("half-orc.relentless-endurance"), name: "Resistência Implacável", description: "Ao cair a 0 PV sem morte instantânea, fica com 1 PV; um uso por descanso longo.", modifiers: [] , sourceRefs: [halfOrcSource] }, { id: asEntityId("half-orc.savage-attacks"), name: "Ataques Selvagens", description: "Um dado da arma é adicionado ao dano extra de um crítico com arma corpo a corpo.", modifiers: [], sourceRefs: [halfOrcSource] }], subraceIds: [], choices: [] },
  { id: asEntityId("tiefling"), name: "Tiefling", tags: ["player-handbook", "race"], sourceRefs: [tieflingSource], abilityIncreases: [{ ability: "int", amount: 1 }, { ability: "cha", amount: 2 }], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common, LANGUAGE.infernal], senses: [{ kind: "darkvision", rangeCm: asCentimeters(1800) }], proficiencies: [], traits: [
    { id: asEntityId("tiefling.infernal-resistance"), name: "Resistência Infernal", description: "Resistência a dano de fogo.", modifiers: [contextualResistanceModifier("tiefling.infernal-resistance.fire", tieflingSource, "Resistência a dano de fogo", { kind: "damage-type", damageType: "fire" })], sourceRefs: [tieflingSource] },
    levelledSpellTrait("tiefling.infernal-legacy.thaumaturgy", "Legado Infernal — Taumaturgia", "Concede o truque taumaturgia usando Carisma a partir do nível 1.", tieflingSource, 1),
    levelledSpellTrait("tiefling.infernal-legacy.hellish-rebuke", "Legado Infernal — Repreensão Infernal", "Concede repreensão infernal como magia de 2º nível, uma vez por descanso longo, a partir do nível 3.", tieflingSource, 3),
    levelledSpellTrait("tiefling.infernal-legacy.darkness", "Legado Infernal — Escuridão", "Concede escuridão, uma vez por descanso longo, a partir do nível 5.", tieflingSource, 5),
  ], subraceIds: [], choices: [] },
];

const subraceSource = (page: number, section: string) => source(page, section);
export const subraces: readonly SubraceDefinition[] = [
  { id: asEntityId("hill-dwarf"), name: "Anão da colina", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(21, "Anão da colina")], raceId: asEntityId("dwarf"), additionalModifiers: [{ id: "hill-dwarf.ability", sourceRef: subraceSource(21, "Anão da colina"), target: { kind: "ability-score", ability: "wis" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }, { id: "hill-dwarf.hit-points", sourceRef: subraceSource(21, "Anão da colina"), target: { kind: "hit-points-per-level" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [], choices: [] },
  { id: asEntityId("mountain-dwarf"), name: "Anão da montanha", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(21, "Anão da montanha")], raceId: asEntityId("dwarf"), additionalModifiers: [{ id: "mountain-dwarf.ability", sourceRef: subraceSource(21, "Anão da montanha"), target: { kind: "ability-score", ability: "str" }, operator: "add", value: { kind: "number", amount: 2 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("mountain-dwarf.armor-proficiency"), name: "Treino Anão com Armaduras", description: "Proficiência em armaduras leves e médias.", modifiers: [customTraitModifier("mountain-dwarf.armor-proficiency.light", subraceSource(21, "Armaduras"), "Proficiência em armaduras leves"), customTraitModifier("mountain-dwarf.armor-proficiency.medium", subraceSource(21, "Armaduras"), "Proficiência em armaduras médias")], sourceRefs: [subraceSource(21, "Armaduras")] }], choices: [] },
  { id: asEntityId("high-elf"), name: "Alto elfo", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(24, "Alto elfo")], raceId: asEntityId("elf"), additionalModifiers: [{ id: "high-elf.ability", sourceRef: subraceSource(24, "Alto elfo"), target: { kind: "ability-score", ability: "int" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("high-elf.weapon-training"), name: "Treino Élfico com Armas", description: "Proficiência em espadas longa e curta, arco longo e arco curto.", modifiers: [customTraitModifier("high-elf.weapon-training.long-sword", subraceSource(24, "Armas élficas"), "Proficiência em espada longa"), customTraitModifier("high-elf.weapon-training.short-sword", subraceSource(24, "Armas élficas"), "Proficiência em espada curta"), customTraitModifier("high-elf.weapon-training.longbow", subraceSource(24, "Armas élficas"), "Proficiência em arco longo"), customTraitModifier("high-elf.weapon-training.shortbow", subraceSource(24, "Armas élficas"), "Proficiência em arco curto")], sourceRefs: [subraceSource(24, "Armas élficas")] }], choices: [selectorChoice("high-elf.cantrip", "cantrip", { kind: "any-entity-of-type", entityType: "spell", filterTag: "wizard-cantrip" }, subraceSource(24, "Truque de mago")), selectorChoice("high-elf.language", "language", { kind: "any-language" }, subraceSource(24, "Idioma adicional"))] },
  { id: asEntityId("wood-elf"), name: "Elfo da floresta", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(25, "Elfo da floresta")], raceId: asEntityId("elf"), additionalModifiers: [{ id: "wood-elf.ability", sourceRef: subraceSource(25, "Elfo da floresta"), target: { kind: "ability-score", ability: "wis" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }, { id: "wood-elf.speed", sourceRef: subraceSource(25, "Elfo da floresta"), target: { kind: "speed", speedKind: "walk" }, operator: "set-base", value: { kind: "number", amount: 1050 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("wood-elf.weapon-training"), name: "Treino Élfico com Armas", description: "Proficiência em espadas longa e curta, arco longo e arco curto.", modifiers: [customTraitModifier("wood-elf.weapon-training.long-sword", subraceSource(25, "Armas élficas"), "Proficiência em espada longa"), customTraitModifier("wood-elf.weapon-training.short-sword", subraceSource(25, "Armas élficas"), "Proficiência em espada curta"), customTraitModifier("wood-elf.weapon-training.longbow", subraceSource(25, "Armas élficas"), "Proficiência em arco longo"), customTraitModifier("wood-elf.weapon-training.shortbow", subraceSource(25, "Armas élficas"), "Proficiência em arco curto")], sourceRefs: [subraceSource(25, "Armas élficas")] }, { id: asEntityId("wood-elf.mask-of-the-wild"), name: "Máscara da Natureza", description: "Pode tentar se esconder quando apenas folhagem, chuva forte, neve, névoa ou outro fenômeno natural obscurece levemente.", modifiers: [], sourceRefs: [subraceSource(25, "Máscara da Natureza")] }], choices: [] },
  { id: asEntityId("dark-elf"), name: "Elfo negro (drow)", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(26, "Elfo negro")], raceId: asEntityId("elf"), additionalModifiers: [{ id: "dark-elf.ability", sourceRef: subraceSource(26, "Elfo negro"), target: { kind: "ability-score", ability: "cha" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }, { id: "dark-elf.darkvision", sourceRef: subraceSource(26, "Elfo negro"), target: { kind: "custom", description: "Visão no escuro de 36 m" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("dark-elf.weapon-training"), name: "Treino Drow com Armas", description: "Proficiência em rapieira, espada curta e besta de mão.", modifiers: [customTraitModifier("dark-elf.weapon-training.rapier", subraceSource(26, "Armas drow"), "Proficiência em rapieira"), customTraitModifier("dark-elf.weapon-training.short-sword", subraceSource(26, "Armas drow"), "Proficiência em espada curta"), customTraitModifier("dark-elf.weapon-training.hand-crossbow", subraceSource(26, "Armas drow"), "Proficiência em besta de mão")], sourceRefs: [subraceSource(26, "Armas drow")] }, { id: asEntityId("dark-elf.sunlight-sensitivity"), name: "Sensibilidade à Luz Solar", description: "Ataques e Percepção visual têm desvantagem quando o personagem, o alvo ou o objeto observado está sob sol direto.", modifiers: [], sourceRefs: [subraceSource(26, "Sensibilidade à luz solar")] }, levelledSpellTrait("dark-elf.dancing-lights", "Globos de luz", "Concede globos de luz a partir do nível 1.", subraceSource(26, "Magia drow"), 1), levelledSpellTrait("dark-elf.faerie-fire", "Fogo das fadas", "Concede fogo das fadas a partir do nível 3.", subraceSource(26, "Magia drow"), 3), levelledSpellTrait("dark-elf.darkness", "Escuridão", "Concede escuridão a partir do nível 5.", subraceSource(26, "Magia drow"), 5)], choices: [] },
  { id: asEntityId("lightfoot"), name: "Pés leves", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(29, "Pés leves")], raceId: asEntityId("halfling"), additionalModifiers: [{ id: "lightfoot.ability", sourceRef: subraceSource(29, "Pés leves"), target: { kind: "ability-score", ability: "cha" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("lightfoot.naturally-stealthy"), name: "Furtividade Natural", description: "Pode tentar se esconder usando cobertura de uma criatura de pelo menos uma categoria maior.", modifiers: [], sourceRefs: [subraceSource(29, "Furtividade Natural")] }], choices: [] },
  { id: asEntityId("stout"), name: "Robusto", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(29, "Robusto")], raceId: asEntityId("halfling"), additionalModifiers: [{ id: "stout.ability", sourceRef: subraceSource(29, "Robusto"), target: { kind: "ability-score", ability: "con" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [poisonResistanceTrait("stout.poison-resilience", "Resiliência Robusta", "Vantagem em resistências contra veneno e resistência a dano de veneno.", subraceSource(29, "Robusto"))], choices: [] },
  { id: asEntityId("forest-gnome"), name: "Gnomo da floresta", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(37, "Gnomo da floresta")], raceId: asEntityId("gnome"), additionalModifiers: [{ id: "forest-gnome.ability", sourceRef: subraceSource(37, "Gnomo da floresta"), target: { kind: "ability-score", ability: "dex" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [levelledSpellTrait("forest-gnome.minor-illusion", "Ilusão menor", "Concede o truque ilusão menor usando Inteligência.", subraceSource(37, "Ilusão menor"), 1), { id: asEntityId("forest-gnome.speak-with-small-beasts"), name: "Falar com Bestas Pequenas", description: "Comunica ideias simples por sons e gestos a Bestas Pequenas ou menores.", modifiers: [], sourceRefs: [subraceSource(37, "Falar com Bestas Pequenas")] }], choices: [] },
  { id: asEntityId("rock-gnome"), name: "Gnomo das rochas", tags: ["player-handbook", "subrace"], sourceRefs: [subraceSource(37, "Gnomo das rochas")], raceId: asEntityId("gnome"), additionalModifiers: [{ id: "rock-gnome.ability", sourceRef: subraceSource(37, "Gnomo das rochas"), target: { kind: "ability-score", ability: "con" }, operator: "add", value: { kind: "number", amount: 1 }, predicate: { kind: "always" } }], traits: [{ id: asEntityId("rock-gnome.artificers-lore"), name: "Conhecimento de Artífice", description: "História sobre itens mágicos, objetos alquímicos e mecanismos tecnológicos usa o dobro do bônus de proficiência.", modifiers: [customTraitModifier("rock-gnome.artificers-lore.history", subraceSource(37, "Conhecimento de Artífice"), "História especializada em itens mágicos, objetos alquímicos e mecanismos tecnológicos")], sourceRefs: [subraceSource(37, "Conhecimento de Artífice")] }, { id: asEntityId("rock-gnome.tinker"), name: "Engenhoqueiro", description: "Proficiência em ferramentas de engenhoqueiro; mecanismos Miúdos e seus limites seguem a descrição da fonte e exigem tempo de jogo explícito.", modifiers: [], sourceRefs: [subraceSource(37, "Engenhoqueiro")] }], choices: [] },
];

export const variantHuman: RaceDefinition = {
  id: asEntityId("variant-human"), name: "Humano variante", tags: ["player-handbook", "race-variant"], sourceRefs: [source(31, "Humano variante")], abilityIncreases: [], size: "medium", speedCm: asCentimeters(900), languages: [LANGUAGE.common], senses: [], proficiencies: [], traits: [], subraceIds: [], choices: [explicitChoice("variant-human.ability-increases", "ability-score-increase", [...abilityIds], source(31, "Humano variante"), 2), selectorChoice("variant-human.skill", "skill-proficiency", { kind: "any-skill" }, source(31, "Humano variante")), selectorChoice("variant-human.feat", "feat", { kind: "any-entity-of-type", entityType: "feat" }, source(31, "Humano variante")), selectorChoice("variant-human.language", "language", { kind: "any-language" }, source(31, "Humano variante"))],
};

export const RACE_PENDING_DECISIONS: Readonly<Record<string, readonly string[]>> = {
  "variant-human": ["PEND-009"],
  "elf.trance": ["PEND-014"],
};
export const RACE_CONTENT_LIMITATIONS: Readonly<Record<string, string>> = {
  duergar: "Menção narrativa sem bloco jogável na fonte atual.",
  svirfneblin: "Menção narrativa sem regras de sub-raça na fonte atual.",
  draconians: "Menção narrativa sem definição mecânica completa na fonte atual.",
};

export const RACE_DEFINITIONS = races;
export const SUBRACE_DEFINITIONS = subraces;
export const racesById: ReadonlyMap<string, RaceDefinition> = new Map(races.map((entry) => [entry.id, entry]));
export const subracesById: ReadonlyMap<string, SubraceDefinition> = new Map(subraces.map((entry) => [entry.id, entry]));
export function findRace(raceId: string): RaceDefinition | undefined { return racesById.get(raceId); }
export function findSubrace(subraceId: string): SubraceDefinition | undefined { return subracesById.get(subraceId); }
export { RULESET_ID };
