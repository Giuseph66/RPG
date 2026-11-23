import { normalizeSearchText, type CompendiumService } from "@application/compendium";
import type { CompendiumBookCreatureDefinition, CompendiumBookSpellDefinition } from "@application/compendium/types";
import type { RulesetRef } from "@domain/contracts/ids";
import type { Ability, Skill, SourceRef } from "@domain/contracts/primitives";
import type { CreatureRecord, CreatureSighting, CreatureSightingRevealed, CreatureKind } from "@domain/campaign/creatures";
import { CREATURE_SIZES, CREATURE_TYPES, type CreatureStatBlock } from "@domain/creatures";
import { ABILITIES, SKILLS, SKILL_ABILITY } from "@domain/rules/core/modifiers";

type CreatureSort = "hitPoints" | "armorClass" | "challengeRating" | "experiencePoints" | "passivePerception" | "walkSpeed" | "flySpeed" | "swimSpeed" | "climbSpeed" | "name" | Ability | Skill;
export const CREATURE_SORTS = ["hitPoints", "armorClass", "challengeRating", "experiencePoints", "passivePerception", "walkSpeed", "flySpeed", "swimSpeed", "climbSpeed", "name", ...ABILITIES, ...SKILLS] as readonly CreatureSort[];
export const SPELL_CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard", "artificer"] as const;

type Input = Record<string, unknown>;
interface Listing { readonly content: string; readonly title: string; readonly locator: string; readonly names: readonly string[] }

/** One creature the asking person may see, from the book or from the campaign. */
export interface CreatureEntry {
  readonly origin: "livro" | "campanha";
  readonly name: string;
  readonly kind?: CreatureKind;
  readonly statBlock?: CreatureStatBlock;
  readonly hitPoints?: number;
  readonly armorClass?: number;
  /** Everything else this person may read; private notes only exist for the master. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly updatedAt?: string;
}
export interface CreatureListing extends Listing { readonly campaign: readonly CreatureEntry[] }

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
function measure(entry: CreatureEntry, sort: CreatureSort): number | undefined {
  const block = entry.statBlock;
  if (sort === "hitPoints") return entry.hitPoints;
  if (sort === "armorClass") return entry.armorClass;
  if (!block) return undefined;
  if (isOneOf<Ability>(ABILITIES, sort)) return block.abilityScores[sort];
  if (isOneOf<Skill>(SKILLS, sort)) return block.skills?.[sort] ?? modifier(block.abilityScores[SKILL_ABILITY[sort]]);
  switch (sort) {
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

/** Cast fields are free text: only an unambiguous leading number counts (“40 (6d8+13)”, never “uns 40”). */
export function plainNumber(value: string | undefined): number | undefined {
  const found = /^\s*(\d{1,5})\s*(?:\(.*\)|pv|hp|pontos de vida|ca)?\s*\.?\s*$/i.exec(value ?? "");
  return found ? Number(found[1]) : undefined;
}

export function bookCreatures(compendium: CompendiumService, ruleset: RulesetRef): readonly CreatureEntry[] {
  return compendium.search({ category: "creature" }).entries
    .filter((entry) => entry.ruleset.id === ruleset.id && entry.ruleset.version === ruleset.version)
    .flatMap((entry) => { const found = compendium.getDetail({ ...entry.ref, version: entry.ruleset.version }); return found.ok && "kind" in found.value.definition && found.value.definition.kind === "book-creature" ? [found.value.definition as CompendiumBookCreatureDefinition] : []; })
    .map(({ statBlock }) => ({ origin: "livro", name: statBlock.name, statBlock, hitPoints: statBlock.hitPoints.average, armorClass: statBlock.armorClass }));
}

function campaignEntry(fields: CreatureSightingRevealed, kind: CreatureKind | undefined, updatedAt: string, extra: Readonly<Record<string, unknown>> = {}): CreatureEntry {
  const { name, statBlock, hitPoints, armorClass, ...rest } = fields;
  const details = Object.fromEntries(Object.entries({ ...rest, ...extra, ...(hitPoints ? { pvInformado: hitPoints } : {}), ...(armorClass ? { caInformada: armorClass } : {}) }).filter(([, value]) => value !== "" && value !== undefined));
  const life = statBlock?.hitPoints.average ?? plainNumber(hitPoints), defense = statBlock?.armorClass ?? plainNumber(armorClass);
  return { origin: "campanha", name: name?.trim() || "Criatura sem nome revelado", ...(kind ? { kind } : {}), ...(statBlock ? { statBlock } : {}), ...(life === undefined ? {} : { hitPoints: life }), ...(defense === undefined ? {} : { armorClass: defense }), details, updatedAt };
}
/** Master only: the whole private cast. Callers must have confirmed the role. */
export const masterCreatures = (records: readonly CreatureRecord[]): readonly CreatureEntry[] => records.map(({ name, appearance, race, description, hitPoints, armorClass, abilities, notes, statBlock, kind, updatedAt }) =>
  campaignEntry({ name, appearance, race, description, hitPoints, armorClass, abilities, ...(statBlock ? { statBlock } : {}) }, kind, updatedAt, { notasDoMestre: notes }));
/** Player: nothing but the fields revealed to that account. */
export const playerCreatures = (sightings: readonly CreatureSighting[]): readonly CreatureEntry[] => sightings.map((item) => campaignEntry(item.revealed, item.kind, item.updatedAt));

const matchesType = (entry: CreatureEntry, type: string) => entry.statBlock ? entry.statBlock.creatureType === type : type === "beast" && entry.kind === "animal";
const origin = (entry: CreatureEntry) => entry.statBlock && entry.origin === "livro" ? page(entry.statBlock.sourceRefs.slice(0, 1)) : "Elenco da campanha";
const entryChallenge = (entry: CreatureEntry) => entry.statBlock ? challenge(entry.statBlock) : undefined;
const entryChallengeLabel = (entry: CreatureEntry) => entry.statBlock ? challengeLabel(entry.statBlock) : "—";

/**
 * Filters, ranks and groups in one step, so the model never has to guess names one by one. `visible` must
 * hold only what the asking person may see: counts, order and ties are computed from nothing else.
 */
export function searchCreatures(visible: readonly CreatureEntry[], input: Input): CreatureListing {
  const query = text(input, "query"), type = choice(input, "type", CREATURE_TYPES), size = choice(input, "size", CREATURE_SIZES);
  const wanted = choice(input, "origin", ["all", "book", "campaign"] as const) ?? "all";
  const minChallenge = amount(input, "minChallenge"), maxChallenge = amount(input, "maxChallenge"), minHitPoints = amount(input, "minHitPoints");
  const sort = choice(input, "sortBy", CREATURE_SORTS) ?? (query || wanted === "campaign" ? "name" : "challengeRating");
  const ascending = input.order === "asc" || (input.order !== "desc" && sort === "name");
  const limit = limitOf(input), terms = query.split(" ").filter(Boolean);
  const all = visible.filter((entry) => wanted === "all" || entry.origin === (wanted === "book" ? "livro" : "campanha"));
  const candidates = all.filter((entry) => (!type || matchesType(entry, type)) && (!size || entry.statBlock?.size === size) &&
    (input.includeSwarms !== false || !entry.statBlock?.isSwarm) &&
    (minChallenge === undefined || (entryChallenge(entry) ?? -1) >= minChallenge) && (maxChallenge === undefined || (entryChallenge(entry) ?? Infinity) <= maxChallenge) &&
    (minHitPoints === undefined || (entry.hitPoints ?? -1) >= minHitPoints) &&
    (!terms.length || terms.every((term) => normalizeSearchText(entry.name).includes(term))));
  // Without the value there is no place in the ranking; saying so is better than guessing one.
  const unranked = sort === "name" ? [] : candidates.filter((entry) => measure(entry, sort) === undefined);
  const found = candidates.filter((entry) => !unranked.includes(entry))
    .sort((a, b) => (sort === "name" ? 0 : (measure(a, sort)! - measure(b, sort)!) * (ascending ? 1 : -1)) || a.name.localeCompare(b.name, "pt-BR") * (sort === "name" && !ascending ? -1 : 1));
  const matched = found.length;
  let shown = found.slice(0, limit);
  let tied = 0;
  if (input.topPerChallenge === true) {
    const best = new Map<string, CreatureEntry[]>();
    for (const entry of found) {
      const group = best.get(entryChallengeLabel(entry));
      if (!group) best.set(entryChallengeLabel(entry), [entry]);
      else if (sort !== "name" && measure(group[0], sort) === measure(entry, sort)) group.push(entry);
    }
    shown = [...best.values()].sort((a, b) => (entryChallenge(a[0]) ?? -1) - (entryChallenge(b[0]) ?? -1)).flatMap((group) => { tied += Math.max(0, group.length - 3); return group.slice(0, 3); });
  }
  // A short list must not hide creatures tied with its last one.
  const last = shown.at(-1);
  const hidden = input.topPerChallenge !== true && sort !== "name" && last ? found.slice(shown.length).filter((entry) => measure(entry, sort) === measure(last, sort)) : [];
  const detail = input.detail === true && shown.length <= 3;
  const rows = shown.map((entry) => {
    const block = entry.statBlock;
    return {
      nome: entry.name, origem: entry.origin, ...(entry.kind ? { categoria: entry.kind } : {}), ...(block ? { tipo: block.creatureType, ...(block.isSwarm ? { enxame: true } : {}), tamanho: block.size, nd: challengeLabel(block), dados: block.hitPoints.hitDice } : {}),
      pv: entry.hitPoints ?? "não informado", ca: entry.armorClass ?? "não informada",
      ...(sort !== "name" && sort !== "hitPoints" && sort !== "armorClass" && sort !== "challengeRating" ? { [sort]: measure(entry, sort) } : {}), fonte: origin(entry),
      ...(detail ? { ...(block ? { ficha: block } : {}), ...(entry.details ? { detalhes: entry.details } : {}) } : {}),
    };
  });
  const names = (list: readonly CreatureEntry[]) => `${list.slice(0, 8).map((entry) => entry.name).join(", ")}${list.length > 8 ? ` e mais ${list.length - 8}` : ""}`;
  const unrankedCampaign = unranked.filter((entry) => entry.origin === "campanha");
  const note = `${matched} de ${all.length} criaturas visíveis para esta pessoa atendem ao filtro; ${shown.length} listadas.${tied ? ` ${tied} empate(s) omitido(s).` : ""}${hidden.length ? ` Empatadas com a última listada e fora da lista: ${names(hidden)}.` : ""}${unrankedCampaign.length ? ` Da campanha, sem valor conhecido para ${sort} e por isso fora da ordem: ${names(unrankedCampaign)}.` : ""} Indique a origem (livro ou campanha). Só afirme o que está aqui.${matched ? "" : " Nada encontrado no livro nem no que esta pessoa pode ver da campanha: diga exatamente isso, sem concluir que não existe; não tente nomes ao acaso."}`;
  const line = (entry: CreatureEntry) => `${entry.name}: ${entry.statBlock ? `ND ${challengeLabel(entry.statBlock)}, ` : ""}PV ${entry.hitPoints ?? "não informado"}, CA ${entry.armorClass ?? "não informada"} (${origin(entry)})`;
  const book = shown.filter((entry) => entry.origin === "livro");
  return { content: JSON.stringify({ observacao: note, ordenadoPor: sort, criaturas: rows }), title: "Criaturas do catálogo", locator: `Livro · ordem: ${sort}${input.topPerChallenge === true ? " · melhor de cada ND" : ""}`,
    names: book.map(line), campaign: shown.filter((entry) => entry.origin === "campanha") };
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
