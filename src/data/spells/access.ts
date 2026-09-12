import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { isEntityId } from "@domain/contracts/ids";
import { findSpell, spells, SPELLCASTING_ABILITIES_BY_CLASS } from "./spells";

export type SpellClassId =
  | "barbarian" | "bard" | "cleric" | "druid" | "fighter" | "monk"
  | "paladin" | "ranger" | "rogue" | "sorcerer" | "warlock" | "wizard";

export interface SpellAccess {
  readonly spell: SpellDefinition;
  readonly classId: string;
  readonly resource: { readonly kind: "none" } | { readonly kind: "spell-slot"; readonly minimumSlotLevel: number };
  readonly ritual: "available" | "source-dependent" | "unavailable";
}

/** Acesso base publicado pela fonte; known/prepared/spellbook são estado do personagem. */
export function getSpellsForClass(classId: string): readonly SpellDefinition[] {
  if (!isEntityId(classId)) return [];
  return spells.filter((spell) => spell.classes.some((entry) => entry === classId));
}

export function hasClassAccess(classId: string, spellId: string): boolean {
  const spell = findSpell(spellId);
  return spell?.classes.some((entry) => entry === classId) ?? false;
}

export function getSpellAccess(classId: string, spellId: string): SpellAccess | undefined {
  if (!hasClassAccess(classId, spellId)) return undefined;
  const spell = findSpell(spellId);
  return spell ? {
    spell,
    classId,
    resource: spell.level === 0 ? { kind: "none" as const } : { kind: "spell-slot" as const, minimumSlotLevel: spell.level },
    ritual: spell.ritual && classId === "wizard" ? "available" as const : spell.ritual ? "source-dependent" as const : "unavailable" as const,
  } : undefined;
}

export function getClassSpellcastingAbility(classId: string): (typeof SPELLCASTING_ABILITIES_BY_CLASS)[keyof typeof SPELLCASTING_ABILITIES_BY_CLASS] | undefined {
  return Object.prototype.hasOwnProperty.call(SPELLCASTING_ABILITIES_BY_CLASS, classId)
    ? SPELLCASTING_ABILITIES_BY_CLASS[classId as keyof typeof SPELLCASTING_ABILITIES_BY_CLASS]
    : undefined;
}
