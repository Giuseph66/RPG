/**
 * Tabelas de conjuração do Livro do Jogador (cap. 3 e cap. 6): espaços por nível, truques e
 * magias conhecidas, limites de preparação e combinação de espaços na multiclasse.
 * Fonte única: o pack, a ficha e a evolução leem daqui.
 */

import type { Ability } from "@domain/contracts/primitives";

export type CasterProfile = "full" | "half" | "third" | "pact";

/** Índice = nível − 1; cada linha lista a quantidade de espaços dos círculos 1º, 2º, 3º… */
export const FULL_SLOTS: readonly (readonly number[])[] = [
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Paladino e Patrulheiro: sem espaços no 1º nível. */
export const HALF_SLOTS: readonly (readonly number[])[] = [
  [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2],
];

/** Cavaleiro Místico e Trapaceiro Arcano: a partir do 3º nível de Guerreiro ou Ladino. */
export const THIRD_SLOTS: readonly (readonly number[])[] = [
  [], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
];

/** Magia de Pacto: todos os espaços têm o mesmo círculo, que sobe com o nível do bruxo. */
export const PACT_SLOTS: readonly { readonly slotLevel: number; readonly count: number }[] = [
  { slotLevel: 1, count: 1 }, { slotLevel: 1, count: 2 }, { slotLevel: 2, count: 2 }, { slotLevel: 2, count: 2 }, { slotLevel: 3, count: 2 }, { slotLevel: 3, count: 2 },
  { slotLevel: 4, count: 2 }, { slotLevel: 4, count: 2 }, { slotLevel: 5, count: 2 }, { slotLevel: 5, count: 2 }, { slotLevel: 5, count: 3 }, { slotLevel: 5, count: 3 },
  { slotLevel: 5, count: 3 }, { slotLevel: 5, count: 3 }, { slotLevel: 5, count: 3 }, { slotLevel: 5, count: 3 }, { slotLevel: 5, count: 4 }, { slotLevel: 5, count: 4 },
  { slotLevel: 5, count: 4 }, { slotLevel: 5, count: 4 },
];

const row = (values: readonly number[]): readonly number[] => values;

/** Truques conhecidos por nível de classe (índice = nível − 1). */
export const CANTRIPS_KNOWN: Readonly<Record<string, readonly number[]>> = {
  bard: row([2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
  warlock: row([2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
  sorcerer: row([4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]),
  cleric: row([3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
  druid: row([2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
  wizard: row([3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
  "eldritch-knight": row([0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
  "arcane-trickster": row([0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
};

/** Magias conhecidas por nível para as classes que aprendem uma lista fixa. */
export const SPELLS_KNOWN: Readonly<Record<string, readonly number[]>> = {
  bard: row([4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22]),
  warlock: row([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15]),
  sorcerer: row([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15]),
  ranger: row([0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]),
  "eldritch-knight": row([0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]),
  "arcane-trickster": row([0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]),
};

/** Invocações Místicas conhecidas (Bruxo, coluna da tabela de classe). */
export const INVOCATIONS_KNOWN: readonly number[] = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8];

/** Opções de Metamagia conhecidas: 2 no 3º nível, 3 no 10º e 4 no 17º. */
export const METAMAGIC_KNOWN: readonly number[] = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];

/** Classes que conjuram e a lista de magias que consultam (Cavaleiro Místico e Trapaceiro Arcano usam a de mago). */
export interface CastingProfile {
  readonly profile: CasterProfile;
  /** 1º nível de classe em que a conjuração existe. */
  readonly startLevel: number;
  /** Classe cuja lista de magias vale (`spell.classes`). */
  readonly spellListClassId: string;
  readonly kind: "known" | "prepared" | "spellbook";
  readonly ability: Ability;
}

export const CLASS_CASTING: Readonly<Record<string, CastingProfile>> = {
  bard: { profile: "full", startLevel: 1, spellListClassId: "bard", kind: "known", ability: "cha" },
  sorcerer: { profile: "full", startLevel: 1, spellListClassId: "sorcerer", kind: "known", ability: "cha" },
  warlock: { profile: "pact", startLevel: 1, spellListClassId: "warlock", kind: "known", ability: "cha" },
  cleric: { profile: "full", startLevel: 1, spellListClassId: "cleric", kind: "prepared", ability: "wis" },
  druid: { profile: "full", startLevel: 1, spellListClassId: "druid", kind: "prepared", ability: "wis" },
  wizard: { profile: "full", startLevel: 1, spellListClassId: "wizard", kind: "spellbook", ability: "int" },
  paladin: { profile: "half", startLevel: 2, spellListClassId: "paladin", kind: "prepared", ability: "cha" },
  ranger: { profile: "half", startLevel: 2, spellListClassId: "ranger", kind: "known", ability: "wis" },
};

/** Subclasses de terço de conjuração; a classe pai só conjura por elas. */
export const SUBCLASS_CASTING: Readonly<Record<string, CastingProfile & { readonly classId: string }>> = {
  "eldritch-knight": { classId: "fighter", profile: "third", startLevel: 3, spellListClassId: "wizard", kind: "known", ability: "int" },
  "arcane-trickster": { classId: "rogue", profile: "third", startLevel: 3, spellListClassId: "wizard", kind: "known", ability: "int" },
};

const at = (table: readonly number[], level: number): number => table[Math.min(20, Math.max(1, level)) - 1] ?? 0;

export function cantripsKnownAt(sourceKey: string, level: number): number {
  const table = CANTRIPS_KNOWN[sourceKey];
  return table ? at(table, level) : 0;
}

export function spellsKnownAt(sourceKey: string, level: number): number {
  const table = SPELLS_KNOWN[sourceKey];
  return table ? at(table, level) : 0;
}

export function invocationsKnownAt(level: number): number {
  return at(INVOCATIONS_KNOWN, level);
}

export function metamagicKnownAt(level: number): number {
  return at(METAMAGIC_KNOWN, level);
}

/** Magias de mago no grimório: 6 no 1º nível e mais 2 a cada nível de mago. */
export function spellbookSizeAt(level: number): number {
  return 6 + 2 * (Math.max(1, level) - 1);
}

/** Magias preparadas: Clérigo e Druida usam o nível; Paladino, metade; Mago, o nível. Mínimo 1. */
export function preparedLimitFor(classId: string, level: number, abilityModifier: number): number | undefined {
  if (classId === "paladin") return Math.max(1, Math.floor(level / 2) + abilityModifier);
  if (classId === "cleric" || classId === "druid" || classId === "wizard") return Math.max(1, level + abilityModifier);
  return undefined;
}

/** Quantos espaços de cada círculo (índice 0 = 1º) uma classe isolada concede neste nível. */
export function ownSlots(profile: CasterProfile, level: number): readonly number[] {
  const clamped = Math.min(20, Math.max(1, level));
  if (profile === "full") return FULL_SLOTS[clamped - 1] ?? [];
  if (profile === "half") return HALF_SLOTS[clamped - 1] ?? [];
  if (profile === "third") return THIRD_SLOTS[clamped - 1] ?? [];
  const pact = PACT_SLOTS[clamped - 1];
  return pact ? Array.from({ length: pact.slotLevel }, (_, index) => (index === pact.slotLevel - 1 ? pact.count : 0)) : [];
}

export interface CasterLevel {
  readonly profile: CasterProfile;
  readonly level: number;
}

export interface SlotAllotment {
  readonly kind: "spellcasting" | "pact";
  readonly slotLevel: number;
  readonly count: number;
}

/**
 * Espaços totais do personagem. Com uma única classe conjuradora vale a tabela dela; com
 * várias, soma-se nível integral + metade (Paladino/Patrulheiro) + um terço (subclasses de
 * terço), arredondando para baixo, e usa-se a tabela integral. Magia de Pacto fica à parte.
 * Quem chama passa só as classes que já conjuram (Paladino no 1º nível ainda não conta).
 */
export function slotAllotments(casters: readonly CasterLevel[]): readonly SlotAllotment[] {
  const result: SlotAllotment[] = [];
  const spellcasters = casters.filter((entry) => entry.profile !== "pact");
  let counts: readonly number[] = [];
  if (spellcasters.length === 1) counts = ownSlots(spellcasters[0].profile, spellcasters[0].level);
  else if (spellcasters.length > 1) {
    const combined = spellcasters.reduce((sum, entry) => sum + (entry.profile === "full" ? entry.level : entry.profile === "half" ? Math.floor(entry.level / 2) : Math.floor(entry.level / 3)), 0);
    counts = combined > 0 ? ownSlots("full", combined) : [];
  }
  counts.forEach((count, index) => { if (count > 0) result.push({ kind: "spellcasting", slotLevel: index + 1, count }); });
  for (const pact of casters.filter((entry) => entry.profile === "pact")) {
    const row = PACT_SLOTS[Math.min(20, Math.max(1, pact.level)) - 1];
    if (row) result.push({ kind: "pact", slotLevel: row.slotLevel, count: row.count });
  }
  return result;
}

export function highestSlotLevel(allotments: readonly SlotAllotment[]): number {
  return allotments.reduce((max, entry) => Math.max(max, entry.slotLevel), 0);
}
