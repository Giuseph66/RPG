import type { Ability } from "@domain/contracts/primitives";

/**
 * Magias que a raça concede (Livro do Jogador, cap. 2). Usam a habilidade da raça, ficam fora das
 * listas e dos limites de classe e valem a partir do nível total indicado. `cantripChoice` é o id
 * da escolha de um truque de outra lista (Alto Elfo).
 */
export interface RacialSpellRule {
  readonly ability: Ability;
  readonly spells: readonly { readonly level: number; readonly spellId: string }[];
  readonly cantripChoice?: string;
}

export const RACIAL_SPELLS: Readonly<Record<string, RacialSpellRule>> = {
  tiefling: { ability: "cha", spells: [{ level: 1, spellId: "taumaturgia" }, { level: 3, spellId: "repreensao-infernal" }, { level: 5, spellId: "escuridao" }] },
  "dark-elf": { ability: "cha", spells: [{ level: 1, spellId: "globos-de-luz" }, { level: 3, spellId: "fogo-das-fadas" }, { level: 5, spellId: "escuridao" }] },
  "forest-gnome": { ability: "int", spells: [{ level: 1, spellId: "ilusao-menor" }] },
  "high-elf": { ability: "int", spells: [], cantripChoice: "high-elf.cantrip" },
};

/** Chaves de raça e sub-raça do personagem que concedem magias. */
export function racialSpellKeys(character: { readonly raceRef: { readonly entityId: unknown }; readonly subraceRef?: { readonly entityId: unknown } }): readonly string[] {
  return [character.raceRef.entityId, character.subraceRef?.entityId].map((id) => (id === undefined ? undefined : String(id))).filter((id): id is string => id !== undefined && id in RACIAL_SPELLS);
}
