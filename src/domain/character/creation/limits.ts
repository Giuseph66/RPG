import { type CharacterDraftPartial } from "@domain/contracts/character";
import { type Ability, type ChoiceDefinition } from "@domain/contracts/primitives";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { ABILITIES } from "./model";

const abilityIds = new Set<string>(ABILITIES);

/** Valor base ainda não preenchido (ausente ou 0) vale 10, ou 8 na compra de pontos. */
export function defaultBaseScore(generation: CharacterDraftPartial["abilityGeneration"], ability: Ability): number {
  return generation?.baseScores[ability] || (generation?.method === "point-buy" ? 8 : 10);
}

/** Valor final durante a criação: base + aumentos da raça (fixos e livres) + modificadores da sub-raça. */
export function creationAbilityScore(pack: RulePack, partial: CharacterDraftPartial, ability: Ability): number {
  let score = defaultBaseScore(partial.abilityGeneration, ability);
  const race = partial.raceRef ? pack.races.get(partial.raceRef.entityId) : undefined;
  const chosen = (partial.choices ?? []).flatMap((selection) => selection.selectedIds.map((ref) => String(ref.entityId))).filter((id) => abilityIds.has(id));
  let anyIndex = 0;
  for (const increase of race?.abilityIncreases ?? []) {
    if (increase.ability === "any") { if (chosen[anyIndex++] === ability) score += increase.amount; }
    else if (increase.ability === ability) score += increase.amount;
  }
  const subrace = partial.subraceRef ? pack.subraces.get(partial.subraceRef.entityId) : undefined;
  for (const modifier of subrace?.additionalModifiers ?? []) {
    if (modifier.target.kind === "ability-score" && modifier.target.ability === ability && modifier.operator === "add" && modifier.value.kind === "number") score += modifier.value.amount;
  }
  return score;
}

export interface CreationChoiceLimit {
  readonly max: number;
  /** Explica limites calculados, ex.: "nível 1 + mod. de Sabedoria +3". */
  readonly basis?: string;
}

const ABILITY_NAMES: Readonly<Record<Ability, string>> = { str: "Força", dex: "Destreza", con: "Constituição", int: "Inteligência", wis: "Sabedoria", cha: "Carisma" };

/**
 * Limite efetivo de uma escolha. Conjuradores que preparam magias (Clérigo, Druida)
 * preparam `nível + modificador do atributo`, mínimo 1 — o valor fixo da definição não se aplica.
 */
export function creationChoiceLimit(pack: RulePack, partial: CharacterDraftPartial, choice: ChoiceDefinition): CreationChoiceLimit {
  if (choice.kind !== "spell") return { max: choice.count.max };
  const classEntry = partial.classes?.[0];
  const definition = classEntry ? pack.classes.get(classEntry.classId) : undefined;
  if (!classEntry || !definition?.spellcasting || definition.spellcasting.kind !== "prepared" || !choice.id.startsWith(`${definition.id}.`)) return { max: choice.count.max };
  const ability = definition.spellcasting.ability;
  const modifier = Math.floor((creationAbilityScore(pack, partial, ability) - 10) / 2);
  return {
    max: Math.max(1, classEntry.level + modifier),
    basis: `nível ${classEntry.level} + mod. de ${ABILITY_NAMES[ability]} ${modifier >= 0 ? "+" : "−"}${Math.abs(modifier)}, mínimo 1`,
  };
}
