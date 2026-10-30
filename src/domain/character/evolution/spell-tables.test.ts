import { describe, expect, it } from "vitest";
import { cantripsKnownAt, invocationsKnownAt, metamagicKnownAt, ownSlots, preparedLimitFor, slotAllotments, spellbookSizeAt, spellsKnownAt } from "./spell-tables";

describe("tabelas de conjuração", () => {
  it("cobre truques e magias conhecidas por classe e nível", () => {
    expect([1, 4, 10].map((level) => cantripsKnownAt("druid", level))).toEqual([2, 3, 4]);
    expect([1, 4, 10].map((level) => cantripsKnownAt("sorcerer", level))).toEqual([4, 5, 6]);
    expect([1, 2, 20].map((level) => spellsKnownAt("warlock", level))).toEqual([2, 3, 15]);
    expect([1, 2, 3, 5, 19].map((level) => spellsKnownAt("ranger", level))).toEqual([0, 2, 3, 4, 11]);
    expect(spellsKnownAt("bard", 10)).toBe(14);
    expect(cantripsKnownAt("fighter", 5)).toBe(0);
  });

  it("calcula grimório, preparadas, invocações e metamagia", () => {
    expect([1, 2, 20].map(spellbookSizeAt)).toEqual([6, 8, 44]);
    expect(preparedLimitFor("druid", 1, 3)).toBe(4);
    expect(preparedLimitFor("druid", 1, -3)).toBe(1);
    expect(preparedLimitFor("paladin", 5, 3)).toBe(5);
    expect(preparedLimitFor("bard", 5, 3)).toBeUndefined();
    expect([1, 2, 5, 18].map(invocationsKnownAt)).toEqual([0, 2, 3, 8]);
    expect([2, 3, 10, 17].map(metamagicKnownAt)).toEqual([0, 2, 3, 4]);
  });

  it("usa a tabela da própria classe com uma classe conjuradora", () => {
    expect(slotAllotments([{ profile: "half", level: 5 }])).toEqual([{ kind: "spellcasting", slotLevel: 1, count: 4 }, { kind: "spellcasting", slotLevel: 2, count: 2 }]);
    expect(slotAllotments([{ profile: "full", level: 1 }])).toEqual([{ kind: "spellcasting", slotLevel: 1, count: 2 }]);
    expect(ownSlots("third", 3)).toEqual([2]);
  });

  it("combina níveis na multiclasse e mantém o pacto separado", () => {
    // Mago 3 + Clérigo 2 = nível combinado 5: 4/3/2.
    expect(slotAllotments([{ profile: "full", level: 3 }, { profile: "full", level: 2 }]).map((entry) => entry.count)).toEqual([4, 3, 2]);
    // Paladino 4 conta 2 e Druida 3 conta 3: nível combinado 5.
    expect(slotAllotments([{ profile: "half", level: 4 }, { profile: "full", level: 3 }]).map((entry) => entry.count)).toEqual([4, 3, 2]);
    const withPact = slotAllotments([{ profile: "full", level: 2 }, { profile: "pact", level: 5 }]);
    expect(withPact).toEqual([{ kind: "spellcasting", slotLevel: 1, count: 3 }, { kind: "pact", slotLevel: 3, count: 2 }]);
  });
});
