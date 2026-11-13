import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { type DiceRoll } from "@domain/contracts/dice";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type Character, type CharacterSnapshot } from "@domain/contracts/character";
import { type CreatureStatBlock } from "@domain/creatures";

import { resolveRest } from "./index";

const hitDieRoll: DiceRoll = {
  id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), expression: { quantity: 1, faces: 10, modifier: 0, mode: "normal" }, purpose: "free", timestamp: "2024-01-01T00:00:00.000Z" as never,
  rawDice: [5], selectedIndexes: [0], discardedIndexes: [], subtotal: 5, modifier: 0, total: 5, rngVersion: "test",
};

describe("rest rules", () => {
  it("cura Dados de Vida individualmente no descanso curto", () => {
    const character = { ...minimalCharacter, hp: { current: 8, temp: 0 } };
    const result = resolveRest(character, { restKind: "short", maximumHitPoints: 20, constitutionModifier: 2, hitDiceSpent: [{ classId: asEntityId("fighter"), count: 1, rollIds: [hitDieRoll.id] }], hitDiceRolls: new Map([[hitDieRoll.id, hitDieRoll]]) });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.hp.current).toBe(15);
  });

  it("Incansável reduz exatamente um nível de exaustão no descanso curto e não afeta personagens sem a feature", () => {
    const exhaustion = {
      id: asUuid("cccccccc-cccc-4ccc-8ccc-ccccccccccdd"),
      definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("exhaustion") },
      origin: { kind: "environment" as const, description: "teste" },
      severity: 2,
    };
    const sourceRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("ranger.tireless") };
    const reduced = resolveRest({ ...minimalCharacter, conditions: [exhaustion] }, {
      restKind: "short", tirelessActive: true, tirelessSourceRef: sourceRef,
    });
    expect(reduced.status).toBe("success");
    if (reduced.status === "success") expect(reduced.nextState.conditions).toMatchObject([{ severity: 1 }]);

    const removed = resolveRest({ ...minimalCharacter, conditions: [{ ...exhaustion, severity: 1 }] }, {
      restKind: "short", tirelessActive: true, tirelessSourceRef: sourceRef,
    });
    expect(removed.status).toBe("success");
    if (removed.status === "success") expect(removed.nextState.conditions).toEqual([]);

    const inactive = resolveRest({ ...minimalCharacter, conditions: [exhaustion] }, { restKind: "short" });
    expect(inactive.status).toBe("success");
    if (inactive.status === "success") expect(inactive.nextState.conditions).toEqual([exhaustion]);
  });

  it("recupera Dados de Vida escolhidos e expira temporários no descanso longo", () => {
    const character = { ...minimalCharacter, classes: minimalCharacter.classes.map((entry) => ({ ...entry, level: 4 })), hp: { current: 4, temp: 5 }, hitDiceSpent: [{ classId: asEntityId("fighter"), hitDie: 10 as const, spent: 3 }] };
    const result = resolveRest(character, { restKind: "long", maximumHitPoints: 10, recoverHitDiceByClass: { fighter: 1 }, ateAndDrank: true });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hp).toEqual({ current: 10, temp: 0 });
      expect(result.nextState.hitDiceSpent[0].spent).toBe(2);
    }
  });

  it("recupera até metade do total de Dados de Vida e todos os espaços de magia (p.188)", () => {
    const character = {
      ...minimalCharacter,
      classes: minimalCharacter.classes.map((entry) => ({ ...entry, level: 8 })),
      hitDiceSpent: [{ classId: asEntityId("fighter"), hitDie: 10 as const, spent: 6 }],
      spellSlots: [{ poolId: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), kind: "spellcasting" as const, slotLevel: 1, spent: 2 }],
    };
    const result = resolveRest(character, { restKind: "long", maximumHitPoints: 10, ateAndDrank: true });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hitDiceSpent[0].spent).toBe(2);
      expect(result.nextState.spellSlots[0].spent).toBe(0);
    }
  });

  it("respeita arredondamento declarado na recuperação de metade", () => {
    const definition: ResourceDefinition = {
      id: asEntityId("test-resource"), name: "Recurso", tags: [], sourceRefs: [], ownerRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("fighter") },
      unit: "uses", capacityRule: { kind: "fixed", amount: 5 }, recoveryTriggers: [{ kind: "long-rest" }],
      recoveryAmountRule: { kind: "half-rounded", rounding: "up" }, spendRules: [{ kind: "per-use", amount: 1 }],
    };
    const resource = { id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: definition.id }, ownerInstanceId: minimalCharacter.id, spent: 3 };
    const result = resolveRest({ ...minimalCharacter, resources: [resource] }, { restKind: "long", maximumHitPoints: 10, ateAndDrank: true, resourceDefinitions: new Map([[String(definition.id), definition]]) });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.resources[0].spent).toBe(1);
  });

  it("avança uma hora de descanso curto em forma, encerra ao limite e mantém recursos recuperados", () => {
    const beast: CreatureStatBlock = {
      id: asEntityId("rest-wolf"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 12,
      hitPoints: { average: 11 }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
    };
    const characterWithoutForm: Character = {
      ...minimalCharacter,
      classes: [{ classId: asEntityId("druid"), level: 2, choices: [] }],
      hp: { current: 8, temp: 0 },
      resources: [{ id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("druid.wild-shape") }, ownerInstanceId: minimalCharacter.id, spent: 1 }],
    };
    const transformationId = asUuid("33333333-3333-4333-8333-333333333333");
    const character: Character = {
      ...characterWithoutForm,
      transformation: {
        id: transformationId,
        formRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: beast.id },
        originalSnapshotRef: transformationId,
        originalSnapshot: characterWithoutForm as CharacterSnapshot,
        originalMaximumHitPoints: 8,
        formSnapshot: beast,
        formMaximumHitPoints: 11,
        formHp: { current: 6, temp: 0 },
        duration: { kind: "hours", value: 1 },
        elapsedMinutes: 0,
        equipmentDisposition: "worn",
        retainedFeatureIds: [],
      },
    };
    const wildShapeResource: ResourceDefinition = {
      id: asEntityId("druid.wild-shape"), name: "Forma Selvagem", tags: [], sourceRefs: [],
      ownerRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("druid") },
      unit: "uses", capacityRule: { kind: "fixed", amount: 2 }, recoveryTriggers: [{ kind: "short-rest" }],
      recoveryAmountRule: { kind: "full" }, spendRules: [{ kind: "per-use", amount: 1 }],
    };

    const result = resolveRest(character, {
      restKind: "short", durationHours: 1, hitDiceSpent: [],
      resourceDefinitions: new Map([[String(wildShapeResource.id), wildShapeResource]]),
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.transformation).toBeUndefined();
      expect(result.nextState.resources[0]?.spent).toBe(0);
      expect(result.effects.map((effect) => effect.kind)).toContain("transformation-ended");
    }
  });

  it("descanso longo que expira forma cura o pool original atual e zera PV temporários", () => {
    const beast: CreatureStatBlock = {
      id: asEntityId("rest-wolf-expiring"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 12,
      hitPoints: { average: 11 }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
    };
    const original: Character = {
      ...minimalCharacter,
      classes: [{ classId: asEntityId("druid"), level: 2, choices: [] }],
      hp: { current: 9, temp: 2 },
    };
    const transformationId = asUuid("44444444-4444-4444-8444-444444444444");
    const character: Character = {
      ...original,
      transformation: {
        id: transformationId,
        formRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: beast.id },
        originalSnapshotRef: transformationId,
        originalSnapshot: original as CharacterSnapshot,
        originalMaximumHitPoints: 17,
        formSnapshot: beast,
        formMaximumHitPoints: 11,
        formHp: { current: 4, temp: 5 },
        duration: { kind: "hours", value: 1 },
        elapsedMinutes: 0,
        equipmentDisposition: "worn",
        retainedFeatureIds: [],
      },
    };

    const result = resolveRest(character, {
      restKind: "long",
      maximumHitPoints: 11,
      originalMaximumHitPoints: 17,
      ateAndDrank: true,
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.transformation).toBeUndefined();
      expect(result.nextState.hp).toEqual({ current: 17, temp: 0 });
      expect(result.effects.map((effect) => effect.kind)).toContain("transformation-ended");
    }
  });

  it("descanso longo dentro da duração recupera só o pool efetivo da forma", () => {
    const beast: CreatureStatBlock = {
      id: asEntityId("rest-wolf-lasting"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 12,
      hitPoints: { average: 11 }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
    };
    const original: Character = {
      ...minimalCharacter,
      classes: [{ classId: asEntityId("druid"), level: 2, choices: [] }],
      hp: { current: 8, temp: 5 },
    };
    const transformationId = asUuid("55555555-5555-4555-8555-555555555555");
    const character: Character = {
      ...original,
      transformation: {
        id: transformationId,
        formRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: beast.id },
        originalSnapshotRef: transformationId,
        originalSnapshot: original as CharacterSnapshot,
        originalMaximumHitPoints: 17,
        formSnapshot: beast,
        formMaximumHitPoints: 11,
        formHp: { current: 4, temp: 2 },
        duration: { kind: "hours", value: 9 },
        elapsedMinutes: 0,
        equipmentDisposition: "worn",
        retainedFeatureIds: [],
      },
    };

    const result = resolveRest(character, {
      restKind: "long",
      maximumHitPoints: 11,
      originalMaximumHitPoints: 17,
      ateAndDrank: true,
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.transformation?.elapsedMinutes).toBe(8 * 60);
      expect(result.nextState.transformation?.formHp).toEqual({ current: 11, temp: 0 });
      expect(result.nextState.hp).toEqual({ current: 8, temp: 5 });
    }
  });

  it("Dados de Vida após expiração usam máximo e Constituição da ficha original", () => {
    const beast: CreatureStatBlock = {
      id: asEntityId("rest-wolf-short-expires"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 12,
      hitPoints: { average: 11 }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
    };
    const original: Character = {
      ...minimalCharacter,
      classes: [{ classId: asEntityId("druid"), level: 2, choices: [] }],
      hp: { current: 9, temp: 1 },
      hitDiceSpent: [{ classId: asEntityId("druid"), hitDie: 8, spent: 1 }],
    };
    const transformationId = asUuid("66666666-6666-4666-8666-666666666666");
    const character: Character = {
      ...original,
      transformation: {
        id: transformationId,
        formRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: beast.id },
        originalSnapshotRef: transformationId,
        originalSnapshot: original as CharacterSnapshot,
        originalMaximumHitPoints: 17,
        formSnapshot: beast,
        formMaximumHitPoints: 11,
        formHp: { current: 3, temp: 0 },
        duration: { kind: "hours", value: 1 },
        elapsedMinutes: 0,
        equipmentDisposition: "worn",
        retainedFeatureIds: [],
      },
    };

    const result = resolveRest(character, {
      restKind: "short",
      durationHours: 1,
      maximumHitPoints: 11,
      constitutionModifier: -1,
      originalMaximumHitPoints: 17,
      originalConstitutionModifier: 2,
      hitDiceSpent: [{ classId: asEntityId("druid"), count: 1, rollIds: [hitDieRoll.id] }],
      hitDiceRolls: new Map([[hitDieRoll.id, hitDieRoll]]),
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.transformation).toBeUndefined();
      expect(result.nextState.hp.current).toBe(16);
      expect(result.nextState.hp.temp).toBe(0);
    }
  });
});
