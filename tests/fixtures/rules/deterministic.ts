import { minimalCharacter } from "@domain/contracts/fixtures";
import { asCommandId, asEntityId, asUuid, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { type Character } from "@domain/contracts/character";
import { type CastRequest } from "@domain/contracts/definitions/spell";
import { type DiceRoll } from "@domain/contracts/dice";
import { asRevision } from "@domain/contracts/versioning";

/** IDs e rolagens fixos para manter a suíte transversal independente de aleatoriedade. */
export const deterministicUuid = (suffix: string): Uuid =>
  asUuid(`00000000-0000-4000-8000-${suffix.padStart(12, "0")}`);

export const fixtureRef = (entityId: string): DefinitionRef => ({
  rulesetId: minimalCharacter.rulesetRef.id,
  entityId: asEntityId(entityId),
});

export const fixtureCharacter = (overrides: Partial<Character> = {}): Character => ({
  ...minimalCharacter,
  id: deterministicUuid("1"),
  revision: asRevision(0),
  ...overrides,
});

export const deterministicRoll = (total: number, purpose: DiceRoll["purpose"] = "free"): DiceRoll => ({
  id: deterministicUuid(String(100 + total)),
  expression: { quantity: 1, faces: 20, modifier: 0, mode: "normal" },
  purpose,
  timestamp: "2024-01-01T00:00:00.000Z" as never,
  rawDice: [total],
  selectedIndexes: [0],
  discardedIndexes: [],
  subtotal: total,
  modifier: 0,
  total,
  rngVersion: "qa-fixed",
});

export const castRequest = (
  characterId: Uuid,
  spellId: string,
  sourceId: Uuid,
  mode: CastRequest["mode"] = "normal",
  slotLevel?: number,
  resourcePoolId?: Uuid,
): CastRequest => ({
  commandId: asCommandId(`qa-${spellId}-${mode}`),
  characterId,
  expectedRevision: asRevision(0),
  spellRef: fixtureRef(spellId),
  castingSourceId: sourceId,
  mode,
  resourcePoolId,
  slotLevel,
  targetContext: { targetIds: [characterId] },
  componentContext: { materialProvided: false, focusUsed: false },
  choices: [],
});
