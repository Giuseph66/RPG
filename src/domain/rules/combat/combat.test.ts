import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid, type Uuid } from "@domain/contracts/ids";
import { type DiceRoll } from "@domain/contracts/dice";

import { applyDamage, applyHealing, applyTempHp, resolveAttack, resolveDeathSave, resolveCombatCommand } from "./index";

const id = (value: string) => asUuid(value) as Uuid;
const ref = (entityId: string) => ({ rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId(entityId) });
const roll = (natural: number, subtotal = natural, modifier = 0): DiceRoll => ({
  id: id(`${String(natural).padStart(2, "0")}000000-0000-4000-8000-000000000000`),
  expression: { quantity: 1, faces: 20, modifier, mode: "normal" },
  purpose: "attack",
  timestamp: "2024-01-01T00:00:00.000Z" as never,
  rawDice: [natural],
  selectedIndexes: [0],
  discardedIndexes: [],
  subtotal,
  modifier,
  total: natural + modifier,
  rngVersion: "test",
});

describe("combat rules", () => {
  it("aplica redução, resistência e PV temporários em sequência", () => {
    const withTemp = { ...minimalCharacter, hp: { current: 10, temp: 5 } };
    const result = applyDamage(withTemp, { amount: 25, damageType: "fire", defense: { flatReduction: 5, resistances: ["fire"] } });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState.hp).toEqual({ current: 5, temp: 0 });
  });

  it("não acumula PV temporários e limita cura ao máximo", () => {
    const withTemp = { ...minimalCharacter, hp: { current: 14, temp: 10 } };
    const temp = applyTempHp(withTemp, { amount: 12, stacking: "highest-wins" });
    expect(temp.status).toBe("success");
    if (temp.status === "success") {
      const healed = applyHealing(temp.nextState, { amount: 8, maximumHitPoints: 20 });
      expect(healed.status).toBe("success");
      if (healed.status === "success") expect(healed.nextState.hp).toEqual({ current: 20, temp: 12 });
    }
  });

  it("dobra os dados no crítico e registra falha natural em 0 PV", () => {
    const target = { ...minimalCharacter, hp: { current: 20, temp: 0 } };
    const result = resolveAttack(target, {
      attackSourceRef: ref("fighter"),
      targetId: target.id,
      targetArmorClass: 10,
      attackRoll: roll(20, 20),
      damageParts: [{ roll: roll(4, 4, 3), damageType: "slashing" }],
    });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.hp.current).toBe(9);
      const dying = { ...result.nextState, hp: { current: 0, temp: 0 }, deathSaves: { successes: 0, failures: 0, stable: false } };
      const save = resolveDeathSave(dying, { rollId: roll(1).id, natural: 1 });
      expect(save.status).toBe("success");
      if (save.status === "success") expect(save.nextState.deathSaves.failures).toBe(2);
    }
  });

  it("dispatcher aceita comando repetido sem reaplicar efeitos", () => {
    const command = { commandId: "damage-1" as never, characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "apply-damage" as const, payload: { amount: 2, damageType: "fire" as const, diceResultIds: [] } };
    const result = resolveCombatCommand(minimalCharacter, command, { processedCommandIds: new Set([command.commandId]) });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.nextState).toBe(minimalCharacter);
  });
});
