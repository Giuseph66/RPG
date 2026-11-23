import { normalizeSearchText, type CompendiumService } from "@application/compendium";
import type { CompendiumBookCreatureDefinition, CompendiumBookSpellDefinition } from "@application/compendium/types";
import type { RulesetRef } from "@domain/contracts/ids";
import type { Ability, Skill, SourceRef } from "@domain/contracts/primitives";
import { CREATURE_SIZES, CREATURE_TYPES, type CreatureStatBlock } from "@domain/creatures";
import { ABILITIES, SKILLS, SKILL_ABILITY } from "@domain/rules/core/modifiers";

type CreatureSort = "hitPoints" | "armorClass" | "challengeRating" | "experiencePoints" | "passivePerception" | "walkSpeed" | "flySpeed" | "swimSpeed" | "climbSpeed" | "name" | Ability | Skill;
export const CREATURE_SORTS = ["hitPoints", "armorClass", "challengeRating", "experiencePoints", "passivePerception", "walkSpeed", "flySpeed", "swimSpeed", "climbSpeed", "name", ...ABILITIES, ...SKILLS] as readonly CreatureSort[];
export const SPELL_CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard", "artificer"] as const;

type Input = Record<string, unknown>;
interface Listing { readonly content: string; readonly title: string; readonly locator: string; readonly names: readonly string[] }

const page = (refs: readonly SourceRef[]) => refs.map((ref) => [ref.chapter, ref.printedPage ? `p. ${ref.printedPage}` : ""].filter(Boolean).join(" ")).join("; ");
const challenge = (block: CreatureStatBlock) => block.challengeRating ? block.challengeRating.numerator / block.challengeRating.denominator : undefined;
const challengeLabel = (block: CreatureStatBlock) => !block.challengeRating ? "—" : block.challengeRating.denominator === 1 ? String(block.challengeRating.numerator) : `${block.challengeRating.numerator}/${block.challengeRating.denominator}`;
const modifier = (score: number) => Math.floor((score - 10) / 2);
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => values.includes(value as T);

function text(input: Input, key: string): string {
  if (input[key] === undefined) return "";
  if (typeof input[key] !== "string" || input[key].length > 160) throw new Error(`Valor inválido para ${key}.`);
  return normalizeSearchText(input[key]);
}
function amount(input: Input, key: string): number | undefined {
  if (input[key] === undefined) return undefined;
  if (typeof input[key] !== "number" || !Number.isFinite(input[key])) throw new Error(`Valor inválido para ${key}.`);
  return input[key];
}
function choice<T extends string>(input: Input, key: string, values: readonly T[]): T | undefined {
  if (input[key] === undefined) return undefined;
  if (!isOneOf(values, input[key])) throw new Error(`Valor inválido para ${key}. Use: ${values.join(", ")}.`);
  return input[key];
}
const limitOf = (input: Input) => Math.max(1, Math.min(30, Math.trunc(amount(input, "limit") ?? 12)));

/** Value used to rank; a skill the block does not list falls back to its ability modifier. */
function measure(block: CreatureStatBlock, sort: CreatureSort): number | undefined {
  if (isOneOf<Ability>(ABILITIES, sort)) return block.abilityScores[sort];
  if (isOneOf<Skill>(SKILLS, sort)) return block.skills?.[sort] ?? modifier(block.abilityScores[SKILL_ABILITY[sort]]);
  switch (sort) {
    case "hitPoints": return block.hitPoints.average;
    case "armorClass": return block.armorClass;
    case "challengeRating": return challenge(block);
    case "experiencePoints": return block.experiencePoints;
    case "passivePerception": return block.passivePerception;
    case "walkSpeed": return block.speeds.walkCm;
    case "flySpeed": return block.speeds.flyCm;
    case "swimSpeed": return block.speeds.swimCm;
    case "climbSpeed": return block.speeds.climbCm;
    default: return undefined;
  }
}

function creatures(compendium: CompendiumService, ruleset: RulesetRef): readonly CompendiumBookCreatureDefinition[] {
  return compendium.search({ category: "creature" }).entries
    .filter((entry) => entry.ruleset.id === ruleset.id && entry.ruleset.version === ruleset.version)
    .flatMap((entry) => { const found = compendium.getDetail({ ...entry.ref, version: entry.ruleset.version }); return found.ok && "kind" in found.value.definition && found.value.definition.kind === "book-creature" ? [found.value.definition] : []; });
}

/** Filters, ranks and groups stat blocks in one step, so the model never has to guess names one by one. */
export function searchCreatures(compendium: CompendiumService, ruleset: RulesetRef, input: Input): Listing {
  const query = text(input, "query"), type = choice(input, "type", CREATURE_TYPES), size = choice(input, "size", CREATURE_SIZES);
  const minChallenge = amount(input, "minChallenge"), maxChallenge = amount(input, "maxChallenge"), minHitPoints = amount(input, "minHitPoints");
  const sort = choice(input, "sortBy", CREATURE_SORTS) ?? (query ? "name" : "challengeRating");
  const ascending = input.order === "asc" || (input.order !== "desc" && sort === "name");
  const limit = limitOf(input), terms = query.split(" ").filter(Boolean);
  const all = creatures(compendium, ruleset).map((item) => item.statBlock);
  let found = all.filter((block) => (!type || block.creatureType === type) && (!size || block.size === size) &&
    (input.includeSwarms !== false || !block.isSwarm) &&
    (minChallenge === undefined || (challenge(block) ?? -1) >= minChallenge) && (maxChallenge === undefined || (challenge(block) ?? Infinity) <= maxChallenge) &&
    (minHitPoints === undefined || block.hitPoints.average >= minHitPoints) &&
    (!terms.length || terms.every((term) => normalizeSearchText(block.name).includes(term))));
  if (sort !== "name") found = found.filter((block) => measure(block, sort) !== undefined);
  found = found.sort((a, b) => (sort === "name" ? 0 : (measure(a, sort)! - measure(b, sort)!) * (ascending ? 1 : -1)) || a.name.localeCompare(b.name, "pt-BR") * (sort === "name" && !ascending ? -1 : 1));
  const matched = found.length;
  let shown = found.slice(0, limit);
  let tied = 0;
  if (input.topPerChallenge === true) {
    const best = new Map<string, CreatureStatBlock[]>();
    for (const block of found) {
      const group = best.get(challengeLabel(block));
      if (!group) best.set(challengeLabel(block), [block]);
      else if (sort !== "name" && measure(group[0], sort) === measure(block, sort)) group.push(block);
    }
    const groups = [...best.values()].sort((a, b) => (challenge(a[0]) ?? -1) - (challenge(b[0]) ?? -1)).map((group) => { tied += Math.max(0, group.length - 3); return group.slice(0, 3); });
    shown = groups.flat();
  }
  // A short list must not hide creatures tied with its last one.
  const last = shown.at(-1);
  const hidden = input.topPerChallenge !== true && sort !== "name" && last ? found.slice(shown.length).filter((block) => measure(block, sort) === measure(last, sort)) : [];
  const detail = input.detail === true && shown.length <= 3;
  const rows = shown.map((block) => detail ? block : {
    nome: block.name, tipo: block.creatureType, ...(block.isSwarm ? { enxame: true } : {}), tamanho: block.size, nd: challengeLabel(block), pv: block.hitPoints.average, dados: block.hitPoints.hitDice, ca: block.armorClass,
    ...(sort !== "name" && sort !== "hitPoints" && sort !== "armorClass" && sort !== "challengeRating" ? { [sort]: measure(block, sort) } : {}), fonte: page(block.sourceRefs.slice(0, 1)),
  });
  const note = `${matched} de ${all.length} criaturas com ficha no catálogo do app atendem ao filtro; ${shown.length} listadas.${tied ? ` ${tied} empate(s) omitido(s).` : ""}${hidden.length ? ` Empatadas com a última listada e fora da lista: ${hidden.slice(0, 8).map((block) => block.name).join(", ")}${hidden.length > 8 ? ` e mais ${hidden.length - 8}` : ""}.` : ""} Só afirme o que está no catálogo: criaturas ausentes não estão cadastradas no app.${matched ? "" : " Nada encontrado: diga isso ou remova filtros; não tente nomes ao acaso."}`;
  return { content: JSON.stringify({ observacao: note, ordenadoPor: sort, criaturas: rows }), title: "Criaturas do catálogo", locator: `${matched} de ${all.length} criaturas · ordem: ${sort}${input.topPerChallenge === true ? " · melhor de cada ND" : ""}`,
    names: shown.map((block) => `${block.name}: ND ${challengeLabel(block)}, PV ${block.hitPoints.average}, CA ${block.armorClass} (${page(block.sourceRefs.slice(0, 1))})`) };
}

export function searchSpells(compendium: CompendiumService, ruleset: RulesetRef, input: Input): Listing {
  const query = text(input, "query"), school = text(input, "school"), spellClass = choice(input, "class", SPELL_CLASSES);
  const level = amount(input, "level"), minLevel = amount(input, "minLevel") ?? 0, maxLevel = amount(input, "maxLevel") ?? 9, limit = limitOf(input);
  const terms = query.split(" ").filter(Boolean);
  const all = compendium.search({ category: "spell" }).entries
    .filter((entry) => entry.ruleset.id === ruleset.id && entry.ruleset.version === ruleset.version)
    .flatMap((entry) => { const found = compendium.getDetail({ ...entry.ref, version: entry.ruleset.version }); return found.ok && "kind" in found.value.definition && found.value.definition.kind === "book-spell" ? [found.value.definition as CompendiumBookSpellDefinition] : []; });
  const found = all.filter((spell) => (level === undefined ? spell.level >= minLevel && spell.level <= maxLevel : spell.level === level) &&
    (!spellClass || spell.classes.includes(spellClass)) && (!school || normalizeSearchText(spell.school).includes(school)) &&
    (typeof input.concentration !== "boolean" || spell.concentration === input.concentration) && (typeof input.ritual !== "boolean" || spell.ritual === input.ritual) &&
    terms.every((term) => normalizeSearchText(`${spell.name} ${spell.description}`).includes(term)))
    .sort((a, b) => Number(terms.length > 0 && normalizeSearchText(b.name).includes(query)) - Number(terms.length > 0 && normalizeSearchText(a.name).includes(query)) || a.level - b.level || a.name.localeCompare(b.name, "pt-BR"));
  const shown = found.slice(0, limit), detail = input.detail === true && shown.length <= 3;
  const rows = shown.map((spell) => ({ nome: spell.name, circulo: spell.level, escola: spell.school, classes: spell.classes, conjuracao: spell.castingTime, alcance: spell.range, duracao: spell.duration, concentracao: spell.concentration, ritual: spell.ritual, ...(detail ? { componentes: spell.components, descricao: spell.description, niveisSuperiores: spell.higherLevels } : {}), fonte: page(spell.sourceRefs.slice(0, 1)) }));
  return { content: JSON.stringify({ observacao: `${found.length} de ${all.length} magias do livro atendem ao filtro; ${shown.length} listadas. Magias de suplementos podem estar só em search_rules.`, magias: rows }), title: "Magias do catálogo", locator: `${found.length} de ${all.length} magias`, names: shown.map((spell) => `${spell.name}: círculo ${spell.level} (${page(spell.sourceRefs.slice(0, 1))})`) };
}
