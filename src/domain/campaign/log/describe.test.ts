import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import type { Character } from "@domain/contracts/character";
import type { DiceRoll } from "@domain/contracts/dice";
import { asEntityId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";

import { describeCharacterChange, describeRoll } from "./describe";

const roll = (patch: Partial<DiceRoll> = {}): DiceRoll => ({
  id: asUuid("11111111-1111-4111-8111-111111111111"),
  expression: { quantity: 1, faces: 20, modifier: 2, mode: "normal" },
  purpose: "initiative",
  label: "Iniciativa",
  timestamp: asIsoTimestamp("2026-09-29T20:00:00.000Z"),
  rawDice: [15],
  selectedIndexes: [0],
  discardedIndexes: [],
  subtotal: 15,
  modifier: 2,
  total: 17,
  rngVersion: "test",
  ...patch,
});

const condition = (entityId: string) => ({ id: asUuid("22222222-2222-4222-8222-222222222222"), definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId(entityId) }, origin: { kind: "table-decision" as const, description: "teste" } });
const names: Record<string, string> = { poisoned: "Envenenado", prone: "Caído" };
const conditionName = (id: string) => names[id] ?? id;
const withPatch = (patch: Partial<Character>): Character => ({ ...minimalCharacter, ...patch });

describe("describeRoll", () => {
  it("resume a iniciativa com total, fórmula e dados", () => {
    expect(describeRoll(roll())).toEqual({ kind: "roll", summary: "Iniciativa: 17", detail: "1d20+2 [15]", rollPurpose: "initiative", rollTotal: 17 });
  });

  it("marca vantagem e o dado descartado", () => {
    const result = describeRoll(roll({ purpose: "attack", label: "Espada longa", expression: { quantity: 1, faces: 20, modifier: 5, mode: "advantage" }, rawDice: [4, 18], selectedIndexes: [1], discardedIndexes: [0], total: 23 }));
    expect(result.summary).toBe("Ataque · Espada longa: 23");
    expect(result.detail).toBe("1d20+5 com vantagem [~4~, 18]");
  });
});

describe("describeCharacterChange", () => {
  it("descreve dano, cura e PV temporários", () => {
    const before = withPatch({ hp: { current: 10, temp: 0 } });
    expect(describeCharacterChange(before, withPatch({ hp: { current: 6, temp: 0 } }), conditionName)).toEqual([{ kind: "hit-points", summary: "PV 10 → 6", detail: "4 de dano" }]);
    expect(describeCharacterChange(before, withPatch({ hp: { current: 10, temp: 5 } }), conditionName)).toEqual([{ kind: "hit-points", summary: "PV temporários 0 → 5" }]);
    expect(describeCharacterChange(before, withPatch({ hp: { current: 12, temp: 3 } }), conditionName)[0]?.detail).toBe("2 de cura · PV temporários 0 → 3");
  });

  it("lista condições ganhas e perdidas pelo nome", () => {
    const before = withPatch({ conditions: [condition("prone")] });
    const after = withPatch({ conditions: [condition("poisoned")] });
    expect(describeCharacterChange(before, after, conditionName)).toEqual([{ kind: "conditions", summary: "Ganhou Envenenado · Perdeu Caído" }]);
  });

  it("registra ajustes manuais adicionados", () => {
    const after = withPatch({ manualAdjustments: [{ id: asUuid("33333333-3333-4333-8333-333333333333"), target: { kind: "armor-class" }, value: { kind: "number", amount: -2 }, reason: "maldição", createdAt: asIsoTimestamp("2026-09-29T20:00:00.000Z") }] });
    expect(describeCharacterChange(withPatch({}), after, conditionName)).toEqual([{ kind: "adjustments", summary: "Ajuste CA −2 (maldição)" }]);
  });

  it("ignora outras edições e fichas sem versão anterior", () => {
    expect(describeCharacterChange(withPatch({}), withPatch({ name: "Outro nome" }), conditionName)).toEqual([]);
    expect(describeCharacterChange(undefined, withPatch({ hp: { current: 1, temp: 0 } }), conditionName)).toEqual([]);
  });
});
