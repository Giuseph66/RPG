import { describe, expect, it } from "vitest";

import { findSpell } from "@data/spells";
import { CONDITION_DEFINITIONS } from "@data/conditions";
import { minimalCharacter, spellCureWounds } from "@domain/contracts/fixtures";
import { type Character } from "@domain/contracts/character";
import { type DiceRoll } from "@domain/contracts/dice";
import { asCommandId, asEntityId, asIsoTimestamp, asUuid, type DefinitionRef } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type Command } from "@domain/contracts/rules";
import { type SpellDefinition, type CastRequest } from "@domain/contracts/definitions/spell";

import { resolveCharacterCommand } from "./command-dispatcher";

const rulesetId = minimalCharacter.rulesetRef.id;
const sourceId = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const poolId = asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
const timestamp = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const ref = (entityId: string): DefinitionRef => ({ rulesetId, entityId: asEntityId(entityId) });

function characterFor(classId: string, spell: SpellDefinition): Character {
  return {
    ...minimalCharacter,
    id: asUuid("11111111-1111-4111-8111-111111111111"),
    revision: asRevision(0),
    classes: [{ classId: asEntityId(classId), level: 1, choices: [] }],
    castingSources: [{
      id: sourceId,
      grantingRef: ref(classId),
      ability: classId === "wizard" ? "int" : classId === "sorcerer" ? "cha" : "wis",
      knownSpellRefs: [ref(String(spell.id))],
      preparedSpellRefs: [],
      spellbookRefs: [],
      resourcePoolIds: [poolId],
    }],
    spellSlots: [{ poolId, kind: "spellcasting", slotLevel: Math.max(1, spell.level), spent: 0 }],
  };
}

function roll(id: string, total: number, purpose: DiceRoll["purpose"]): DiceRoll {
  return {
    id: asUuid(id),
    expression: { quantity: 1, faces: purpose === "healing" ? 8 : 10, modifier: 0, mode: "normal" },
    purpose,
    timestamp,
    rawDice: [total],
    selectedIndexes: [0],
    discardedIndexes: [],
    subtotal: total,
    modifier: 0,
    total,
    rngVersion: "test",
  };
}

function castRequest(character: Character, spell: SpellDefinition, commandId: string, rollId: string, targetContext: CastRequest["targetContext"]): CastRequest {
  return {
    commandId: asCommandId(commandId),
    characterId: character.id,
    expectedRevision: character.revision,
    spellRef: ref(String(spell.id)),
    castingSourceId: sourceId,
    mode: "normal",
    resourcePoolId: poolId,
    slotLevel: Math.max(1, spell.level),
    targetContext,
    componentContext: { materialProvided: true, focusUsed: false },
    choices: [],
    diceResultIds: [asUuid(rollId)],
  };
}

function spellContext(result: DiceRoll, extra: Record<string, unknown> = {}) {
  return {
    availableActions: ["action" as const, "bonus-action" as const],
    canSpeak: true,
    freeHands: true,
    maximumHitPoints: 20,
    diceResults: new Map([[result.id, result]]),
    targetDistanceCm: 1000,
    lineOfSight: true,
    ...extra,
  };
}

describe("command-dispatcher", () => {
  it("aplica cura determinística de Curar Ferimentos e Palavra Curativa", () => {
    const cure = spellCureWounds;
    const character = characterFor("cleric", cure);
    const cureRoll = roll("cccccccc-cccc-4ccc-8ccc-cccccccccccc", 5, "healing");
    const cureResult = resolveCharacterCommand(character, {
      commandId: asCommandId("cast-cure"), characterId: character.id, expectedRevision: character.revision,
      kind: "cast-spell", payload: {
        spellRef: ref("cure-wounds"), castingSourceId: sourceId, mode: "normal", resourcePoolId: poolId, slotLevel: 1,
        targetContext: { targetIds: [character.id] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [cureRoll.id],
      },
    }, { ...spellContext(cureRoll), spellDefinitions: new Map([[cure.id, cure]]) });
    expect(cureResult.status).toBe("success");
    if (cureResult.status === "success") expect(cureResult.nextState.hp.current).toBe(16); // 5 + modificador SAB +1

    const word = findSpell("healing-word")!;
    const wordCharacter = characterFor("cleric", word);
    const wordRoll = roll("dddddddd-dddd-4ddd-8ddd-dddddddddddd", 4, "healing");
    const wordCommand: Command = {
      commandId: asCommandId("cast-word"), characterId: wordCharacter.id, expectedRevision: wordCharacter.revision,
      kind: "cast-spell", payload: {
        spellRef: ref("healing-word"), castingSourceId: sourceId, mode: "normal", resourcePoolId: poolId, slotLevel: 1,
        targetContext: { targetIds: [wordCharacter.id] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [wordRoll.id],
      },
    };
    const wordResult = resolveCharacterCommand(wordCharacter, wordCommand, { ...spellContext(wordRoll), maximumHitPoints: 20, spellDefinitions: new Map([[word.id, word]]) });
    expect(wordResult.status).toBe("success");
    if (wordResult.status === "success") expect(wordResult.nextState.hp.current).toBe(14);
  });

  it("aplica dano de Raio de Fogo e Bola de Fogo somente com ataque, alvo, alcance e resistência explícitos", () => {
    const bolt = findSpell("fire-bolt")!;
    const boltCharacter = characterFor("wizard", bolt);
    const boltRoll = roll("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", 7, "damage");
    const boltCommand: Command = {
      commandId: asCommandId("cast-bolt"), characterId: boltCharacter.id, expectedRevision: boltCharacter.revision,
      kind: "cast-spell", payload: {
        spellRef: ref("fire-bolt"), castingSourceId: sourceId, mode: "normal", targetContext: { targetIds: [boltCharacter.id] },
        componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [boltRoll.id],
      },
    };
    const boltResult = resolveCharacterCommand(boltCharacter, boltCommand, { ...spellContext(boltRoll, { targetDistanceCm: 1000, spellAttackHit: true }), spellDefinitions: new Map([[bolt.id, bolt]]) });
    expect(boltResult.status).toBe("success");
    if (boltResult.status === "success") expect(boltResult.nextState.hp.current).toBe(3);

    const fireball = findSpell("fireball")!;
    const fireballCharacter = characterFor("wizard", fireball);
    const fireballRoll = roll("ffffffff-ffff-4fff-8fff-ffffffffffff", 28, "damage");
    const fireballCommand: Command = {
      commandId: asCommandId("cast-fireball"), characterId: fireballCharacter.id, expectedRevision: fireballCharacter.revision,
      kind: "cast-spell", payload: {
        spellRef: ref("fireball"), castingSourceId: sourceId, mode: "normal", resourcePoolId: poolId, slotLevel: 3,
        targetContext: { targetIds: [fireballCharacter.id], pointCm: { x: 1 as never, y: 1 as never } },
        componentContext: { materialProvided: true, focusUsed: false }, choices: [], diceResultIds: [fireballRoll.id],
      },
    };
    const needsSave = resolveCharacterCommand(fireballCharacter, fireballCommand, { ...spellContext(fireballRoll, { targetDistanceCm: 3000 }), spellDefinitions: new Map([[fireball.id, fireball]]) });
    expect(needsSave.status).toBe("needsInput");
    const fireballResult = resolveCharacterCommand(fireballCharacter, fireballCommand, { ...spellContext(fireballRoll, { targetDistanceCm: 3000, spellSaveSucceeded: false }), spellDefinitions: new Map([[fireball.id, fireball]]) });
    expect(fireballResult.status).toBe("success");
    if (fireballResult.status === "success") expect(fireballResult.nextState.hp.current).toBe(0);
  });

  it("aplica e remove condição com comandos tipados e mantém idempotência", () => {
    const condition = CONDITION_DEFINITIONS.find((entry) => entry.id === "poisoned")!;
    const instance = { id: asUuid("99999999-9999-4999-8999-999999999999"), definitionRef: ref("poisoned"), origin: { kind: "environment" as const, description: "teste" } };
    const command: Command = { commandId: asCommandId("condition-1"), characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "apply-condition", payload: { conditionInstance: instance } };
    const context = { conditionDefinitions: new Map([[condition.id, condition]]) };
    const applied = resolveCharacterCommand(minimalCharacter, command, context);
    expect(applied.status).toBe("success");
    if (applied.status !== "success") return;
    const repeated = resolveCharacterCommand(applied.nextState, command, { ...context, processedCommandIds: new Set([String(command.commandId)]) });
    expect(repeated.status).toBe("success");
    if (repeated.status === "success") expect(repeated.nextState.conditions).toHaveLength(1);
    const removed = resolveCharacterCommand(applied.nextState, { commandId: asCommandId("condition-2"), characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "remove-condition", payload: { conditionInstanceId: instance.id } });
    expect(removed.status).toBe("success");
    if (removed.status === "success") expect(removed.nextState.conditions).toHaveLength(0);
  });

  it("rejeita comando inválido sem inventar definição, alvo ou rolagem", () => {
    const invalid: Command = { commandId: asCommandId("invalid-spell"), characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "cast-spell", payload: { spellRef: ref("missing-spell"), castingSourceId: sourceId, mode: "normal", targetContext: { targetIds: [minimalCharacter.id] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [] } };
    const result = resolveCharacterCommand(minimalCharacter, invalid, {});
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("unsupported-ruleset");
  });
});
