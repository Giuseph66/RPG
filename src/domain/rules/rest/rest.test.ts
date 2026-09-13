import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";
import { type DiceRoll } from "@domain/contracts/dice";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";

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

  it("recupera floor(total gasto/2) e expira temporários no descanso longo", () => {
    const character = { ...minimalCharacter, hp: { current: 4, temp: 5 }, hitDiceSpent: [{ classId: asEntityId("fighter"), hitDie: 10 as const, spent: 3 }] };
    const result = resolveRest(character, { restKind: "long", maximumHitPoints: 10, recoverHitDiceByClass: { fighter: 1 }, ateAndDrank: true });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hp).toEqual({ current: 10, temp: 0 });
      expect(result.nextState.hitDiceSpent[0].spent).toBe(2);
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
});
