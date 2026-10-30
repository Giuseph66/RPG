/**
 * Dados resolvidos do rule pack para a rota da ficha. Os componentes de feature não
 * consultam o pack: recebem listas e totais prontos daqui.
 */
import type { Character } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { DefinitionRef } from "@domain/contracts/ids";
import type { InventoryCarrying, InventoryCatalogOption } from "@features/inventory";
import type { ActionAttackRoll, ActionRestInfo, ActionSpellRoll } from "@features/actions";
import { DAMAGE_LABELS } from "@features/character/sheet/mapping";
import { DICE_FACES, type Ability, type DiceFaces } from "@domain/contracts/primitives";
import type { SheetEquipmentInfo, SheetSpellOption } from "@features/character/sheet";
import type { SpellInfo, SpellInfoLookup } from "@features/character/spell-info";
import { carryingCapacityGrams, encumbranceThresholdsGrams } from "@data/rules/encumbrance";
import { EXTRACTED_PHB_SPELLS } from "@data/spells/spells-book-catalog";
import { OPTION_GROUPS } from "@data/evolution/options";
import type { FeatureInfo, FeatureInfoLookup, RacialUnlock, SubclassInfo, SubclassInfoLookup } from "@features/character/evolution";

/** Itens concretos do catálogo (sem escolhas abstratas como "símbolo sagrado à escolha"). */
export function equipmentCatalog(pack: RulePack | undefined): readonly InventoryCatalogOption[] {
  if (!pack) return [];
  return [...pack.equipment.values()]
    .filter((definition) => !(definition.tags as readonly string[]).includes("background-grant") && !definition.name.includes("(à escolha)"))
    .map((definition) => ({
      equipmentRef: { rulesetId: pack.manifest.id, entityId: definition.id },
      name: definition.name,
      category: definition.category,
      unitWeightGrams: definition.weightGrams,
      unitValueCp: definition.valueCp,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function equipmentInfo(pack: RulePack | undefined, entityId: string): SheetEquipmentInfo | undefined {
  const definition = pack?.equipment.get(entityId as never);
  return definition ? { category: definition.category, weightGrams: Number(definition.weightGrams) } : undefined;
}

/** Peso total do inventário, capacidade do livro (7,5 kg × Força) e limiares da Sobrecarga. */
export function carryingFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): InventoryCarrying | undefined {
  const strength = derived?.abilityScores.find((entry) => entry.ability === "str")?.score.value;
  if (strength === undefined || !pack) return undefined;
  const totalGrams = character.inventory.reduce((sum, item) => sum + Number(pack.equipment.get(item.equipmentRef.entityId)?.weightGrams ?? 0) * item.quantity, 0);
  return {
    totalGrams,
    capacityGrams: carryingCapacityGrams(strength),
    ...encumbranceThresholdsGrams(strength),
    strengthScore: strength,
  };
}

const SCHOOL_BY_PT: ReadonlyArray<readonly [RegExp, string]> = [
  [/^a?bjura/, "abjuration"], [/^conjura/, "conjuration"], [/^adivinha/, "divination"], [/^encant/, "enchantment"],
  [/^evoca/, "evocation"], [/^ilus/, "illusion"], [/^necro/, "necromancy"], [/^transmuta/, "transmutation"],
];

function schoolKey(schoolPtBr: string): string {
  const normalized = schoolPtBr.trim().toLowerCase();
  return SCHOOL_BY_PT.find(([pattern]) => pattern.test(normalized))?.[1] ?? normalized;
}

/**
 * Magias da lista das classes conjuradoras do personagem, até o maior círculo de espaço
 * disponível. Usa o catálogo completo extraído do capítulo 11; o rule pack, quando cobre
 * a magia, fornece o mesmo id (as refs continuam resolvíveis pelo Rules Engine).
 */
export function spellOptionsFor(character: Character, pack: RulePack | undefined): readonly SheetSpellOption[] {
  if (!pack) return [];
  const classIds = new Set(character.castingSources.map((source) => String(source.grantingRef.entityId)));
  if (classIds.size === 0) return [];
  const maxSlot = character.spellSlots.reduce((max, slot) => Math.max(max, slot.slotLevel), 0);
  // Lista expandida do patrono (bruxo): magias de outras listas que entram na da classe.
  const expanded = new Set(character.classes.flatMap((entry) => {
    const subclass = entry.subclassId ? pack.subclasses.get(entry.subclassId) : undefined;
    return (subclass?.spellGrants ?? []).filter((grant) => !grant.alwaysPrepared && grant.level <= entry.level).map((grant) => String(grant.spellRef.entityId));
  }));
  return EXTRACTED_PHB_SPELLS
    .filter((spell) => (spell.classes.some((classId) => classIds.has(classId)) || expanded.has(spell.id) || expanded.has(String(pack.spells.get(spell.id as never)?.id ?? ""))) && spell.level <= maxSlot)
    .map((spell) => {
      const structured = pack.spells.get(spell.id as never);
      return {
        ref: { rulesetId: pack.manifest.id, entityId: (structured?.id ?? spell.id) as never },
        name: structured?.name ?? spell.name,
        level: spell.level,
        school: structured?.school ?? schoolKey(spell.schoolPtBr),
        ritual: spell.ritual,
        concentration: structured?.concentration ?? /concentra/i.test(spell.duration),
      };
    })
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}

/** Junta as linhas quebradas do PDF; parágrafo novo só após frase encerrada em linha curta. */
function reflow(text: string): string[] {
  const paragraphs: string[] = [];
  let current = "";
  for (const line of text.split("\n").map((entry) => entry.trim()).filter(Boolean)) {
    // Hífen no fim da linha é quebra de palavra composta do PDF ("corpo-a-" + "corpo").
    current = !current ? line : current.endsWith("-") ? `${current}${line}` : `${current} ${line}`;
    if (/[.!?:]$/.test(line) && line.length < 48) { paragraphs.push(current); current = ""; }
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}

/** Evolução de truque fica no corpo do texto ("...quando você alcança o 5° nível"). */
function cantripScaling(paragraphs: readonly string[]): string | undefined {
  return paragraphs.flatMap((paragraph) => paragraph.split(/(?<=\.)\s+/)).find((sentence) => /\d+\s*[°º]\s*n[íi]vel/i.test(sentence) && /aument|alcan|dois|tr[êe]s|quatro/i.test(sentence));
}

const spellInfoByPack = new WeakMap<RulePack, SpellInfoLookup>();

/** Descrição do livro por id de magia (criação e ficha); registros estruturados são achados pelo nome. */
export function spellInfoFor(pack: RulePack | undefined): SpellInfoLookup {
  const memo = pack ? spellInfoByPack.get(pack) : undefined;
  if (memo) return memo;
  const cache = new Map<string, SpellInfo | undefined>();
  const lookup: SpellInfoLookup = (spellId) => {
    if (cache.has(spellId)) return cache.get(spellId);
    const name = pack?.spells.get(spellId as never)?.name;
    const book = EXTRACTED_PHB_SPELLS.find((spell) => spell.id === spellId) ?? (name ? EXTRACTED_PHB_SPELLS.find((spell) => spell.name.localeCompare(name, "pt-BR", { sensitivity: "base" }) === 0) : undefined);
    let info: SpellInfo | undefined;
    if (book) {
      const paragraphs = reflow(book.description);
      const scaling = book.level === 0 && !book.higherLevels ? cantripScaling(paragraphs) : undefined;
      // A evolução do truque sai do corpo do texto para não aparecer duas vezes.
      const description = scaling ? paragraphs.map((paragraph) => paragraph.replace(scaling, "").trim()).filter(Boolean) : paragraphs;
      const higherLevels = book.higherLevels ? reflow(book.higherLevels).join(" ").replace(/^Em N[íi]veis Superiores\.\s*/i, "") : scaling;
      info = {
        name: book.name, level: book.level, school: book.schoolPtBr, castingTime: book.castingTime, range: book.range,
        components: book.components, duration: book.duration, ritual: book.ritual, description,
        ...(higherLevels ? { higherLevels } : {}),
        source: `Livro do Jogador, p. ${book.source.printedPage}`,
      };
    }
    cache.set(spellId, info);
    return info;
  };
  if (pack) spellInfoByPack.set(pack, lookup);
  return lookup;
}

export function conditionOptionsFor(pack: RulePack | undefined): readonly { readonly ref: DefinitionRef; readonly name: string }[] {
  if (!pack) return [];
  return [...pack.conditions.values()]
    .map((condition) => ({ ref: { rulesetId: pack.manifest.id, entityId: condition.id }, name: condition.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

const DAMAGE_TYPE_WORDS = /de dano (\w+)/i;

function abilityModifier(derived: CharacterDerived, ability: Ability): number {
  return derived.abilityScores.find((entry) => entry.ability === ability)?.modifier.value ?? 0;
}

function asFaces(value: number): DiceFaces | undefined {
  return (DICE_FACES as readonly number[]).includes(value) ? value as DiceFaces : undefined;
}

/** Armas equipadas com bônus e dano derivados pela ficha, mais o ataque desarmado. */
export function attackRollsFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): readonly ActionAttackRoll[] {
  if (!derived) return [];
  const weapons = derived.attacks.map((attack, index) => {
    const part = attack.damageParts[0];
    const name = pack?.equipment.get(attack.sourceRef.entityId)?.name ?? String(attack.sourceRef.entityId);
    return {
      id: `weapon:${index}:${String(attack.sourceRef.entityId)}`,
      name,
      attackBonus: attack.attackModifier.value,
      ...(part ? { damage: { quantity: part.expression.quantity, faces: part.expression.faces, modifier: part.modifierBonus.value, typeLabel: DAMAGE_LABELS[part.damageType] } } : {}),
    };
  });
  // Livro do Jogador, cap. 9: ataque desarmado usa FOR + proficiência e causa 1 + FOR de dano.
  const strength = abilityModifier(derived, "str");
  const unarmed = { id: "unarmed", name: "Ataque desarmado", attackBonus: strength + derived.proficiencyBonus.value, fixedDamage: `${Math.max(1, 1 + strength)} de dano contundente` };
  return character ? [...weapons, unarmed] : weapons;
}

/** Nomes das armas carregadas mas não equipadas (para sugerir equipar na ficha). */
export function unequippedWeaponsFor(character: Character, pack: RulePack | undefined): readonly string[] {
  if (!pack) return [];
  return character.inventory
    .filter((item) => item.equippedState !== "equipped" && pack.equipment.get(item.equipmentRef.entityId)?.category === "weapon")
    .map((item) => item.customName || pack.equipment.get(item.equipmentRef.entityId)?.name || String(item.equipmentRef.entityId));
}

/**
 * Magias conhecidas/preparadas com o que dá para rolar, lido do texto do livro (cap. 11):
 * ataque mágico, teste de resistência (CD e atributo) e o primeiro dado de dano ou cura.
 * Truques escalam nos níveis 5, 11 e 17; "+ seu modificador de habilidade de conjuração"
 * soma o atributo da fonte.
 */
export function spellRollsFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): readonly ActionSpellRoll[] {
  if (!derived) return [];
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const cantripTier = 1 + Number(totalLevel >= 5) + Number(totalLevel >= 11) + Number(totalLevel >= 17);
  const rolls: ActionSpellRoll[] = [];
  const seen = new Set<string>();
  for (const source of character.castingSources) {
    const casting = derived.spellcastingSources.find((entry) => entry.castingSourceId === source.id);
    const abilityMod = abilityModifier(derived, source.ability);
    for (const ref of [...source.knownSpellRefs, ...source.preparedSpellRefs, ...source.spellbookRefs]) {
      const id = String(ref.entityId);
      if (seen.has(id)) continue;
      seen.add(id);
      const book = EXTRACTED_PHB_SPELLS.find((spell) => spell.id === id);
      const name = pack?.spells.get(ref.entityId)?.name ?? book?.name ?? id;
      const level = book?.level ?? pack?.spells.get(ref.entityId)?.level ?? 0;
      const text = (book?.description ?? "").replace(/\s+/g, " ");
      const attackBonus = casting?.spellAttackModifier.value ?? abilityMod + derived.proficiencyBonus.value;
      const roll: { -readonly [K in keyof ActionSpellRoll]: ActionSpellRoll[K] } = { id, name, level };

      const weaponDie = text.match(/dado de dano da arma se torna um d(\d+)/i);
      if (weaponDie) {
        // Bordão Místico e afins: a arma usa o atributo de conjuração no ataque e no dano.
        const faces = asFaces(Number(weaponDie[1]));
        roll.attackBonus = attackBonus;
        if (faces) roll.effect = { kind: "damage", quantity: 1, faces, modifier: abilityMod, typeLabel: "contundente" };
        rolls.push(roll);
        continue;
      }
      if (/ataque [^.]{0,40}com magia/i.test(text)) roll.attackBonus = attackBonus;
      const save = text.match(/teste de resist[êe]ncia de (\p{L}+)/iu);
      if (save) {
        roll.saveAbility = save[1];
        roll.saveDc = casting?.spellSaveDc.value ?? 8 + derived.proficiencyBonus.value + abilityMod;
      }
      const sentence = text.split(/(?<=\.)\s/).find((part) => /\d+d\d+/.test(part));
      const dice = sentence?.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/);
      const faces = dice ? asFaces(Number(dice[2])) : undefined;
      if (dice && faces && sentence) {
        const healing = /recupera|pontos de vida/i.test(sentence) && !/de dano/i.test(sentence);
        const flat = dice[3] ? Number(dice[3]) : 0;
        const withAbility = /modificador de habilidade de conjura/i.test(sentence) ? abilityMod : 0;
        const scales = level === 0 && /aumenta em \d+d\d+ quando voc[êe] alcan[çc]a o 5/i.test(text);
        roll.effect = {
          kind: healing ? "healing" : "damage",
          quantity: Number(dice[1]) * (scales ? cantripTier : 1),
          faces,
          modifier: flat + withAbility,
          ...(healing ? {} : { typeLabel: sentence.match(DAMAGE_TYPE_WORDS)?.[1] }),
        };
      }
      rolls.push(roll);
    }
  }
  return rolls.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * O que cada descanso devolve (cap. 8, p.188): Dados de Vida por classe, recursos gastos com
 * gatilho de descanso curto/longo, espaços de magia e exaustão.
 */
export function restInfoFor(character: Character, derived: CharacterDerived | undefined, pack: RulePack | undefined): ActionRestInfo | undefined {
  if (!derived || !pack) return undefined;
  const hitDice = character.classes.map((entry) => {
    const spent = character.hitDiceSpent.find((candidate) => candidate.classId === entry.classId);
    const faces = spent?.hitDie ?? pack.classes.get(entry.classId)?.hitDie;
    return faces ? { classId: String(entry.classId), className: pack.classes.get(entry.classId)?.name ?? String(entry.classId), faces, available: Math.max(0, entry.level - (spent?.spent ?? 0)), total: entry.level } : undefined;
  }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const spentHitDice = character.hitDiceSpent.reduce((sum, entry) => sum + entry.spent, 0);
  const recovers = (trigger: "short-rest" | "long-rest") => character.resources.flatMap((resource) => {
    const definition = pack.resources.get(resource.definitionRef.entityId);
    if (!definition || resource.spent <= 0 || !definition.recoveryTriggers.some((candidate) => candidate.kind === trigger || (trigger === "long-rest" && candidate.kind === "short-rest"))) return [];
    return [`${definition.name} (${resource.spent} ${resource.spent === 1 ? "uso" : "usos"})`];
  });
  return {
    hitDice,
    constitutionModifier: abilityModifier(derived, "con"),
    maxHitPoints: derived.hitPointsMax.value,
    longRestHitDice: Math.min(spentHitDice, Math.floor(totalLevel / 2)),
    shortRecovers: recovers("short-rest"),
    longRecovers: recovers("long-rest"),
    spentSpellSlots: character.spellSlots.reduce((sum, slot) => sum + slot.spent, 0),
    spentPactSlots: character.spellSlots.filter((slot) => slot.kind === "pact").reduce((sum, slot) => sum + slot.spent, 0),
    exhaustion: character.conditions.filter((condition) => condition.definitionRef.entityId === "exhaustion").reduce((max, condition) => Math.max(max, condition.severity ?? 0), 0),
  };
}

/** Deslocamento de caminhada derivado (já com condições e armadura), em centímetros. */
export function walkSpeedFor(derived: CharacterDerived | undefined): number | undefined {
  return derived?.speedsCm.find((entry) => entry.kind === "walk")?.value.value;
}


const CLASS_SLUG: Readonly<Record<string, string>> = { barbarian: "barbaro", bard: "bardo", warlock: "bruxo", cleric: "clerigo", druid: "druida", sorcerer: "feiticeiro", fighter: "guerreiro", rogue: "ladino", wizard: "mago", monk: "monge", paladin: "paladino", ranger: "patrulheiro" };
const slug = (name: string): string => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export interface FeatureTextBlock { readonly id: string; readonly text: string; readonly printedPages: readonly number[] }

/** Textos do livro para as características e opções de evolução; `blocks` vem de `PHB_FEATURE_DESCRIPTIONS.featureBlocks`. */
export function featureInfoFor(pack: RulePack | undefined, blocks: readonly FeatureTextBlock[]): FeatureInfoLookup {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const optionKeys = new Map<string, string | undefined>(OPTION_GROUPS.flatMap((group) => group.options.map((option) => [`${group.id}.${option.id}`, option.descKey] as const)));
  return (featureId) => {
    const feature = pack?.features.get(featureId as never);
    if (!feature) return undefined;
    const keys = optionKeys.has(featureId)
      ? [optionKeys.get(featureId)].filter((key): key is string => Boolean(key))
      : featureId.includes("-feature-level-")
        ? feature.name.split(" / ").map((name) => `${featureId.split("-feature-level-")[0]}.${slug(name)}`)
        : [`${CLASS_SLUG[featureId.split(".")[0]] ?? featureId.split(".")[0]}.${slug(feature.name)}`];
    const found = keys.map((key) => byId.get(key)).filter((block): block is FeatureTextBlock => Boolean(block));
    if (found.length === 0) return undefined;
    const paragraphs = found.flatMap((block) => reflow(block.text.split("\n").slice(1).join("\n")));
    const page = found[0].printedPages[0];
    const info: FeatureInfo = { name: feature.name, paragraphs: paragraphs.filter((paragraph) => !/^\d+$/.test(paragraph)), ...(page ? { source: `Livro do Jogador, p. ${page}` } : {}) };
    return info;
  };
}

/** Características raciais que dependem do nível total (magias do Drow e do Tiefling, sopro do Draconato). */
export function racialTraitsFor(pack: RulePack | undefined, character: Character): readonly RacialUnlock[] {
  if (!pack) return [];
  const race = pack.races.get(character.raceRef.entityId);
  const subrace = character.subraceRef ? pack.subraces.get(character.subraceRef.entityId) : undefined;
  const traits = [...(race?.traits ?? []), ...(subrace?.traits ?? [])];
  return traits.flatMap((trait) => trait.modifiers.flatMap((modifier) => {
    if (modifier.predicate.kind !== "min-total-level" || modifier.predicate.level <= 1) return [];
    const description = modifier.target.kind === "custom" ? modifier.target.description : trait.description;
    return [{ name: trait.name, description, level: modifier.predicate.level }];
  }));
}

export interface ClassTextSection { readonly className: string; readonly text: string }

/** Parágrafos que o livro escreve logo após o título da subclasse, até o próximo título em caixa alta. */
function introAfterHeading(text: string, subclassName: string): readonly string[] {
  const target = subclassName.toUpperCase();
  const lines = text.split("\n").map((line) => line.trim());
  const start = lines.findIndex((line) => line === target || (line.length >= 10 && target.startsWith(line) && line === line.toUpperCase()));
  if (start < 0) return [];
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const heading = line.length > 3 && line === line.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(line) && !/\d/.test(line) && line.length < 60;
    if (heading) break;
    if (!/^\d+$/.test(line)) body.push(line);
  }
  return reflow(body.join("\n"));
}

/** Introdução e características por nível de cada subclasse, para decidir antes de escolher. */
const SMALL_WORDS = new Set(["da", "de", "do", "das", "dos", "e", "a", "o", "em", "com", "para", "no", "na"]);
/** "Caminho Da Floresta" vira "Caminho da Floresta": preposições em minúscula, exceto no início. */
function titleCase(name: string): string {
  return name.split(" ").map((word, index) => (index > 0 && SMALL_WORDS.has(word.toLowerCase()) ? word.toLowerCase() : word)).join(" ");
}

export interface SubclassTextBlock { readonly id: string; readonly name: string; readonly text: string }

export function subclassInfoFor(pack: RulePack | undefined, sections: readonly ClassTextSection[], blocks: readonly SubclassTextBlock[]): SubclassInfoLookup {
  const cache = new Map<string, SubclassInfo | undefined>();
  return (subclassId) => {
    if (cache.has(subclassId)) return cache.get(subclassId);
    const subclass = pack?.subclasses.get(subclassId as never);
    let info: SubclassInfo | undefined;
    if (subclass && pack) {
      const className = pack.classes.get(subclass.classId)?.name;
      const section = sections.find((entry) => entry.className === className);
      // O nível de cada característica está no texto ("A partir do 6° nível…"); entram só os blocos com nível.
      const features = blocks.filter((block) => block.id.startsWith(`${subclassId}.`)).flatMap((block) => {
        const opening = block.text.split("\n").slice(1, 5);
        // Tabelas de magias por nível ("Nível de Druida / Magias") não são características.
        if (/^N[íi]vel d/i.test(opening[0] ?? "")) return [];
        const level = /(\d+)\s*[°º]/.exec(opening.join(" "))?.[1];
        if (!level) return [];
        const paragraphs = reflow(block.text.split("\n").slice(1).join("\n")).filter((paragraph) => !/^\d+$/.test(paragraph));
        return [{ level: Number(level), name: titleCase(block.name), paragraphs }];
      }).sort((a, b) => a.level - b.level);
      const intro = section ? introAfterHeading(section.text, subclass.name) : [];
      if (intro.length > 0 || features.length > 0) info = { name: subclass.name, intro, features };
    }
    cache.set(subclassId, info);
    return info;
  };
}
