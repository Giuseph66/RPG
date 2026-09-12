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
