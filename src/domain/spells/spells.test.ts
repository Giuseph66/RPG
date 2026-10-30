import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { type Character } from "@domain/contracts/character";
import { type CastRequest, type SpellDefinition } from "@domain/contracts/definitions/spell";
import { type DiceRoll } from "@domain/contracts/dice";
import { asCommandId, asEntityId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { classes } from "@data/classes";
import { findSpell } from "@data/spells";

import { castSpell } from "./index";

const uid = (value: string) => asUuid(value);
const ref = (value: string) => ({ rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId(value) });
const sourceId = uid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
const poolId = uid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

function character(overrides: Partial<Character> = {}): Character {
  return {
    ...minimalCharacter,
    id: uid("11111111-1111-4111-8111-111111111111"),
    revision: asRevision(0),
    ...overrides,
  };
}

function request(spellId: string, mode: CastRequest["mode"] = "normal", extra: Partial<CastRequest> = {}): CastRequest {
  return {
    commandId: asCommandId(`cast-${spellId}-${mode}`), characterId: character().id, expectedRevision: asRevision(0), spellRef: ref(spellId), castingSourceId: sourceId, mode,
    resourcePoolId: poolId, slotLevel: 1, targetContext: { targetIds: [character().id] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], ...extra,
  };
}

function clericCharacter(spellId: string, slots = [{ poolId, kind: "spellcasting" as const, slotLevel: 1, spent: 0 }], extra: Partial<Character> = {}) {
  return character({
    castingSources: [{ id: sourceId, grantingRef: ref("cleric"), ability: "wis", knownSpellRefs: [], preparedSpellRefs: [ref(spellId)], spellbookRefs: [], resourcePoolIds: [poolId] }],
    spellSlots: slots,
    ...extra,
  });
}

const context = { availableActions: ["action" as const], canSpeak: true, freeHands: true };

function healingRoll(id: Uuid, total: number): DiceRoll {
  return { id, expression: { quantity: 1, faces: 8, modifier: 0, mode: "normal" }, purpose: "healing", timestamp: "2024-01-01T00:00:00.000Z" as never, rawDice: [total], selectedIndexes: [0], discardedIndexes: [], subtotal: total, modifier: 0, total, rngVersion: "test" };
}

describe("spell domain", () => {
  it("exige magia preparada e rejeita slot esgotado", () => {
    const spell = findSpell("cure-wounds")!;
    const unprepared = clericCharacter("fireball");
    expect(castSpell(unprepared, spell, request("cure-wounds"), context).status).toBe("rejected");
    const exhausted = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 1 }]);
    const result = castSpell(exhausted, spell, request("cure-wounds"), context);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("insufficient-resource");
  });

  it("gasta slot e permite upcast estruturado", () => {
    const spell = findSpell("cure-wounds")!;
    const source = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 2, spent: 0 }]);
    const result = castSpell(source, spell, request("cure-wounds", "normal", { slotLevel: 2 }), context);
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.spellSlots[0].spent).toBe(1);
  });

  it("aplica o modificador da fonte e os dados adicionais de Curar Ferimentos", () => {
    const first = uid("12121212-1212-4121-8121-121212121212");
    const second = uid("13131313-1313-4131-8131-131313131313");
    const spell = findSpell("cure-wounds")!;
    const source = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 2, spent: 0 }], {
      hp: { current: 5, temp: 0 },
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 } },
      castingSources: [{ id: sourceId, grantingRef: ref("bard"), ability: "cha", knownSpellRefs: [], preparedSpellRefs: [ref("cure-wounds")], spellbookRefs: [], resourcePoolIds: [poolId] }],
    });
    const result = castSpell(source, spell, request("cure-wounds", "normal", { slotLevel: 2, diceResultIds: [first, second] }), {
      ...context,
      maximumHitPoints: 20,
      casterAbilityModifier: 3,
      diceResults: new Map([[first, healingRoll(first, 4)], [second, healingRoll(second, 5)]]),
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hp.current).toBe(17); // 4 + 5 + modificador efetivo derivado de CAR (+3), limitado pelo máximo 20
      expect(result.nextState.spellSlots[0].spent).toBe(1);
    }

    const cleric = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }], {
      hp: { current: 5, temp: 0 },
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 13, con: 14, int: 10, wis: 15, cha: 8 } },
    });
    const clericResult = castSpell(cleric, spell, request("cure-wounds", "normal", { diceResultIds: [first] }), {
      ...context,
      maximumHitPoints: 20,
      casterAbilityModifier: 2,
      diceResults: new Map([[first, healingRoll(first, 4)]]),
    });
    expect(clericResult.status).toBe("success");
    if (clericResult.status === "success") expect(clericResult.nextState.hp.current).toBe(11); // 4 + SAB 15 (+2)
  });

  it("bloqueia conjuração de cura para criatura incapacitada sem gastar slot", () => {
    const spell = findSpell("cure-wounds")!;
    const blocked = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }], {
      conditions: [{ id: uid("14141414-1414-4141-8141-141414141414"), definitionRef: ref("incapacitated"), origin: { kind: "environment", description: "teste" } }],
    });
    const result = castSpell(blocked, spell, request("cure-wounds"), { ...context, canSpeak: true, freeHands: true, maximumHitPoints: 20, casterAbilityModifier: 3, diceResults: new Map() });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].message).toContain("impede a conjuração");
    expect(blocked.spellSlots[0]?.spent).toBe(0);

    const dying = clericCharacter("cure-wounds", [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }], { hp: { current: 0, temp: 0 } });
    expect(castSpell(dying, spell, request("cure-wounds"), { ...context, canSpeak: true, freeHands: true, maximumHitPoints: 20, casterAbilityModifier: 3, diceResults: new Map() }).status).toBe("rejected");
  });

  it("ritual elegível não consome slot e falha sem capacidade ritual", () => {
    const spell = findSpell("detect-magic")!;
    const wizardSource = character({ castingSources: [{ id: sourceId, grantingRef: ref("wizard"), ability: "int", knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [ref("detect-magic")], resourcePoolIds: [] }] });
    const result = castSpell(wizardSource, spell, request("detect-magic", "ritual", { resourcePoolId: undefined, slotLevel: undefined }), { ...context, concentrationEffectId: uid("ffffffff-ffff-4fff-8fff-ffffffffffff") });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.spellSlots).toHaveLength(0);
    const cleric = clericCharacter("detect-magic");
    expect(castSpell(cleric, spell, request("detect-magic", "ritual", { resourcePoolId: undefined, slotLevel: undefined }), context).status).toBe("rejected");
  });

  it("consome componente material somente após validação e confirmação", () => {
    const spell = findSpell("revivify")!;
    const itemId = uid("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
    const source = clericCharacter("revivify", [{ poolId, kind: "spellcasting", slotLevel: 3, spent: 0 }], { inventory: [{ id: itemId, equipmentRef: ref("diamond"), quantity: 1, equippedState: "carried", notes: "" }] });
    const result = castSpell(source, spell, request("revivify", "normal", { slotLevel: 3, componentContext: { materialProvided: true, focusUsed: false } }), { ...context, consumedInventoryItemId: itemId });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.inventory).toHaveLength(0);
      expect(result.effects.some((effect) => effect.kind === "inventory-changed" && effect.payload.inventoryItemId === itemId)).toBe(true);
    }
  });

  it("substitui concentração somente com decisão explícita", () => {
    const spell = findSpell("detect-magic")!;
    const source = character({ castingSources: [{ id: sourceId, grantingRef: ref("wizard"), ability: "int", knownSpellRefs: [], preparedSpellRefs: [ref("detect-magic")], spellbookRefs: [], resourcePoolIds: [poolId] }], spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }], concentration: { effectId: uid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), sourceRef: ref("detect-magic"), duration: { kind: "minutes", value: 10 }, pendingSaveIds: [] } });
    const noDecision = castSpell(source, spell, request("detect-magic", "normal", { slotLevel: 1 }), { ...context, concentrationEffectId: uid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee") });
    expect(noDecision.status).toBe("needsInput");
    const replaced = castSpell(source, spell, request("detect-magic", "normal", { slotLevel: 1 }), { ...context, replaceConcentration: true, concentrationEffectId: uid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee") });
    expect(replaced.status).toBe("success");
  });

  it("mantém pact magic separado e não fabrica escalonamento customizado", () => {
    const base = findSpell("detect-magic")!;
    const pactSpell: SpellDefinition = { ...base, id: asEntityId("pact-light"), classes: [asEntityId("warlock")], ritual: false, concentration: false, duration: { kind: "instantaneous", endTriggers: [] } };
    const source = character({ castingSources: [{ id: sourceId, grantingRef: ref("warlock"), ability: "cha", knownSpellRefs: [ref("pact-light")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId] }], spellSlots: [{ poolId, kind: "pact", slotLevel: 1, spent: 0 }] });
    const result = castSpell(source, pactSpell, request("pact-light"), context);
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.spellSlots[0].spent).toBe(1);
    const wrongPool = { ...source, spellSlots: [{ poolId, kind: "spellcasting" as const, slotLevel: 1, spent: 0 }] };
    const rejected = castSpell(wrongPool, pactSpell, request("pact-light"), context);
    expect(rejected.status).toBe("rejected");
    if (rejected.status === "rejected") expect(rejected.errors[0].code).toBe("insufficient-resource");
  });
});
