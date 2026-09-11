import { describe, expect, it } from "vitest";

import { DICE, DICE_FACES, findDice } from "./dice";

describe("DICE_FACES", () => {
  it("cobre exatamente as 7 faces suportadas pelo Dice Engine", () => {
    expect(DICE_FACES).toEqual([4, 6, 8, 10, 12, 20, 100]);
  });
});

describe("DICE", () => {
  it("um item por face com rótulo pt-BR d<faces>", () => {
    expect(DICE).toHaveLength(7);
    for (const entry of DICE) {
      expect(entry.label).toBe(`d${entry.faces}`);
      expect(entry.sourceRefs.length).toBeGreaterThan(0);
      expect(entry.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
    }
  });

  it("findDice resolve por número de faces", () => {
    expect(findDice(20)?.label).toBe("d20");
    expect(findDice(3 as never)).toBeUndefined();
  });
});
