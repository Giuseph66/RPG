import type { Ability, DamageType, Skill } from "@domain/contracts/primitives";

export const ABILITY_LABELS: Readonly<Record<Ability, { readonly short: string; readonly name: string }>> = {
  str: { short: "FOR", name: "Força" },
  dex: { short: "DES", name: "Destreza" },
  con: { short: "CON", name: "Constituição" },
  int: { short: "INT", name: "Inteligência" },
  wis: { short: "SAB", name: "Sabedoria" },
  cha: { short: "CAR", name: "Carisma" },
};

export const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  athletics: "Atletismo",
  acrobatics: "Acrobacia",
  "sleight-of-hand": "Prestidigitação",
  stealth: "Furtividade",
  arcana: "Arcanismo",
  history: "História",
  investigation: "Investigação",
  nature: "Natureza",
  religion: "Religião",
  "animal-handling": "Adestrar Animais",
  insight: "Intuição",
  medicine: "Medicina",
  perception: "Percepção",
  survival: "Sobrevivência",
  performance: "Atuação",
  deception: "Enganação",
  intimidation: "Intimidação",
  persuasion: "Persuasão",
};

export const DAMAGE_LABELS: Readonly<Record<DamageType, string>> = {
  acid: "ácido",
  bludgeoning: "contundente",
  cold: "frio",
  fire: "fogo",
  force: "força",
  lightning: "elétrico",
  necrotic: "necrótico",
  piercing: "perfurante",
  poison: "veneno",
  psychic: "psíquico",
  radiant: "radiante",
  slashing: "cortante",
  thunder: "trovão",
};

/** Perícia → habilidade que a rege (regra fixa do PHB, não dado de personagem). */
export const SKILL_ABILITY: Readonly<Record<Skill, Ability>> = {
  athletics: "str",
  acrobatics: "dex",
  "sleight-of-hand": "dex",
  stealth: "dex",
  arcana: "int",
  history: "int",
  investigation: "int",
  nature: "int",
  religion: "int",
  "animal-handling": "wis",
  insight: "wis",
  medicine: "wis",
  perception: "wis",
  survival: "wis",
  performance: "cha",
  deception: "cha",
  intimidation: "cha",
  persuasion: "cha",
};

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export function formatRef(ref: { readonly entityId: string } | string): string {
  const value = typeof ref === "string" ? ref : ref.entityId;
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatSource(source: { readonly sourceRef: { readonly entityId?: string; readonly sourceId?: string }; readonly amount?: number; readonly description: string }): string {
  const ref = "entityId" in source.sourceRef && source.sourceRef.entityId
    ? formatRef(source.sourceRef as { readonly entityId: string })
    : "sourceId" in source.sourceRef ? source.sourceRef.sourceId
    : "Fonte não resolvida";
  return `${source.description} · ${ref}${source.amount === undefined ? "" : ` (${formatModifier(source.amount)})`}`;
}

export const SPELL_SCHOOL_LABELS: Readonly<Record<string, string>> = {
  abjuration: "Abjuração",
  conjuration: "Conjuração",
  divination: "Adivinhação",
  enchantment: "Encantamento",
  evocation: "Evocação",
  illusion: "Ilusão",
  necromancy: "Necromancia",
  transmutation: "Transmutação",
};

export const EQUIPMENT_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  weapon: "Arma",
  armor: "Armadura",
  tool: "Ferramenta",
  "adventuring-gear": "Equipamento",
  consumable: "Consumível",
  mount: "Montaria",
  vehicle: "Veículo",
  "trade-good": "Mercadoria",
  container: "Recipiente",
  focus: "Foco",
};

/** Classes que conhecem magias fixas; as demais preparam da lista (Livro do Jogador, cap. 3). */
export const KNOWN_SPELL_CLASSES: ReadonlySet<string> = new Set(["bard", "sorcerer", "warlock", "ranger"]);

/** Truques conhecidos por nível de classe (tabelas de classe do Livro do Jogador). */
const CANTRIPS_BY_CLASS: Readonly<Record<string, readonly [number, number, number]>> = {
  bard: [2, 3, 4],
  cleric: [3, 4, 5],
  druid: [2, 3, 4],
  sorcerer: [4, 5, 6],
  warlock: [2, 3, 4],
  wizard: [3, 4, 5],
};

export function cantripsKnown(classId: string, level: number): number | undefined {
  const row = CANTRIPS_BY_CLASS[classId];
  if (!row) return undefined;
  return level >= 10 ? row[2] : level >= 4 ? row[1] : row[0];
}

/** Magias preparadas: modificador + nível (metade do nível para paladino), mínimo 1. */
export function preparedSpellCount(classId: string, level: number, abilityModifier: number): number | undefined {
  if (classId === "paladin") return Math.max(1, abilityModifier + Math.floor(level / 2));
  if (classId === "cleric" || classId === "druid" || classId === "wizard") return Math.max(1, abilityModifier + level);
  return undefined;
}

export function formatSpellLevel(level: number): string {
  return level === 0 ? "Truque" : `${level}º círculo`;
}

export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  return `${grams.toLocaleString("pt-BR")} g`;
}
