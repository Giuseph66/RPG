import type { Character } from "@domain/contracts/character";
import { ok } from "@domain/contracts/errors";
import { applyLevelUp } from "@domain/character/progression/progression";
import { asProgressionCatalog, type LevelUpRequest, type ProgressionApplyOptions, type ProgressionCatalogInput, type ProgressionResult } from "@domain/character/progression/model";
import { deriveCharacter } from "@domain/rules/derived";
import { syncSpellcasting } from "./spell-state";

const CONTEXT = { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] } as const;

/**
 * Evolui a ficha em um nível de uma classe: registra nível, subclasse, PV e escolhas
 * (`applyLevelUp`), reconcilia a conjuração (fontes, espaços, magias novas e trocas) e
 * soma o PV ganho ao PV atual, como no jogo.
 */
export function evolveCharacter(character: Character, request: LevelUpRequest, catalogInput: ProgressionCatalogInput, options: ProgressionApplyOptions = {}): ProgressionResult<Character> {
  const applied = applyLevelUp(character, request, catalogInput, options);
  if (!applied.ok) return applied;
  const pack = asProgressionCatalog(catalogInput).rulePack;
  const synced = syncSpellcasting(applied.value, pack, request.choices, options.idGenerator ? { idGenerator: options.idGenerator } : {});
  const before = deriveCharacter(character, pack, CONTEXT);
  const after = deriveCharacter(synced, pack, CONTEXT);
  if (!before.ok || !after.ok) return ok(synced);
  const gained = Math.max(0, after.value.hitPointsMax.value - before.value.hitPointsMax.value);
  return ok({ ...synced, hp: { ...synced.hp, current: Math.min(after.value.hitPointsMax.value, synced.hp.current + gained) } });
}
