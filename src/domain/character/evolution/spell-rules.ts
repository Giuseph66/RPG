import type { Character } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityId } from "@domain/contracts/ids";
import { CLASS_CASTING, SUBCLASS_CASTING } from "./spell-tables";
import { ownMaxSpellLevel, type CastingSource } from "./context";

export type EvolutionSpellKind = "cantrips" | "spells" | "spell-swap" | "arcanum" | "magical-secrets" | "additional-secrets" | "tome-cantrips" | "cantrip" | "spell-mastery" | "signature-spells";

export interface ParsedEvolutionChoice {
  /** Classe ou subclasse dona da escolha (primeiro trecho do id). */
  readonly key: string;
  readonly kind: EvolutionSpellKind;
  readonly level: number;
}

const SPELL_CHOICE_ID = /^(.+?)\.(cantrips|spells|spell-swap|arcanum|magical-secrets|additional-secrets|tome-cantrips|cantrip|spell-mastery|signature-spells)\.(\d+)$/;

export function parseEvolutionChoiceId(choiceId: string): ParsedEvolutionChoice | undefined {
  const match = SPELL_CHOICE_ID.exec(choiceId);
  return match ? { key: match[1], kind: match[2] as EvolutionSpellKind, level: Number(match[3]) } : undefined;
}

/** Subclasses que concedem um truque de outra lista (Domínio da Natureza, Círculo da Terra). */
export const SUBCLASS_BONUS_CANTRIPS: Readonly<Record<string, { readonly classId: string; readonly listClassId: string; readonly level: number }>> = {
  "nature-domain": { classId: "cleric", listClassId: "druid", level: 1 },
  "circle-of-the-land": { classId: "druid", listClassId: "druid", level: 2 },
};

export const ARCANUM_LEVEL: Readonly<Record<number, number>> = { 11: 6, 13: 7, 15: 8, 17: 9 };

/** Escolas do Cavaleiro Místico e do Trapaceiro Arcano; a regra livra as magias dos níveis 8, 14 e 20. */
const THIRD_CASTER_SCHOOLS: Readonly<Record<string, readonly string[]>> = {
  "eldritch-knight": ["abjuration", "evocation"],
  "arcane-trickster": ["enchantment", "illusion"],
};
const THIRD_CASTER_FREE_LEVELS: readonly number[] = [8, 14, 20];

export interface SpellConstraint {
  /** Listas de classe aceitas (`spell.classes`); `any` aceita qualquer lista. */
  readonly lists: readonly string[] | "any";
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly schools?: readonly string[];
}

export function spellConstraintFor(parsed: ParsedEvolutionChoice, sources: readonly CastingSource[]): SpellConstraint | undefined {
  const source = sources.find((entry) => entry.key === parsed.key);
  const bonus = SUBCLASS_BONUS_CANTRIPS[parsed.key];
  if (parsed.kind === "cantrip") return bonus ? { lists: [bonus.listClassId], minLevel: 0, maxLevel: 0 } : undefined;
  if (parsed.kind === "tome-cantrips") return { lists: "any", minLevel: 0, maxLevel: 0 };
  if (parsed.kind === "spell-mastery") return { lists: ["wizard"], minLevel: 1, maxLevel: 2 };
  if (parsed.kind === "signature-spells") return { lists: ["wizard"], minLevel: 3, maxLevel: 3 };
  if (parsed.kind === "arcanum") {
    const circle = ARCANUM_LEVEL[parsed.level];
    return circle ? { lists: ["warlock"], minLevel: circle, maxLevel: circle } : undefined;
  }
  if (!source) return undefined;
  const list = source.profile.spellListClassId;
  const schools = THIRD_CASTER_SCHOOLS[source.key];
  const restriction = schools && !THIRD_CASTER_FREE_LEVELS.includes(parsed.level) ? { schools } : {};
  if (parsed.kind === "cantrips") return { lists: [list], minLevel: 0, maxLevel: 0 };
  if (parsed.kind === "magical-secrets" || parsed.kind === "additional-secrets") return { lists: "any", minLevel: 0, maxLevel: ownMaxSpellLevel(source) };
  // spells e spell-swap
  return { lists: [list], minLevel: 1, maxLevel: ownMaxSpellLevel(source), ...restriction };
}

/** Motivo pelo qual a magia não cabe na restrição, ou `undefined` quando cabe. */
export function spellProblem(pack: RulePack, spellId: string, constraint: SpellConstraint): string | undefined {
  const spell = pack.spells.get(spellId as EntityId);
  if (!spell) return `Magia "${spellId}" não está publicada no catálogo.`;
  if (constraint.lists !== "any" && !spell.classes.some((entry) => constraint.lists.includes(String(entry)))) return `${spell.name} não está na lista de magias permitida para esta escolha.`;
  if (spell.level < constraint.minLevel || spell.level > constraint.maxLevel) {
    if (constraint.maxLevel === 0) return `${spell.name} não é um truque.`;
    if (constraint.minLevel === constraint.maxLevel) return `${spell.name} deve ser de ${constraint.minLevel}º nível.`;
    return `${spell.name} está fora dos círculos permitidos (${constraint.minLevel}º ao ${constraint.maxLevel}º).`;
  }
  if (constraint.schools && !constraint.schools.includes(spell.school)) return `${spell.name} não é de uma escola permitida para esta subclasse.`;
  return undefined;
}

/** Magias que o personagem já conhece nesta origem (truques e conhecidas/grimório/preparadas). */
export function knownSpellIds(character: Pick<Character, "castingSources">, key: string): ReadonlySet<string> {
  const source = character.castingSources.find((entry) => String(entry.grantingRef.entityId) === key);
  if (!source) return new Set();
  return new Set([...source.knownSpellRefs, ...source.preparedSpellRefs, ...source.spellbookRefs].map((ref) => String(ref.entityId)));
}

export function isKnownCaster(key: string): boolean {
  return (CLASS_CASTING[key]?.kind ?? SUBCLASS_CASTING[key]?.kind) === "known";
}
