import { describe, expect, it } from "vitest";
import { fairy, FAIRY_OPTIONAL_PACK } from "./fairy";

describe("Fada (fonte local opt-in)", () => {
  it("preserva tipo, tamanho, ausência de bônus não publicados e fonte impressa", () => {
    expect(fairy).toMatchObject({
      name: "Fada", creatureType: "fey", size: "small", speedCm: 900,
      abilityIncreases: [], languages: [], sourceRefs: [{ printedPage: 14, pdfPage: 1 }],
    });
    expect(FAIRY_OPTIONAL_PACK.id).toBe("fairy-supplement");
  });

  it("faz voo copiar caminhada efetiva e restringe apenas armadura média/pesada", () => {
    const flight = fairy.traits.find((trait) => trait.id === "fairy.flight-trait")!.modifiers[0]!;
    expect(flight).toMatchObject({
      target: { kind: "speed-copy", speedKind: "fly", from: "walk" },
      predicate: { kind: "while-not-wearing-armor-categories", armorCategories: ["medium", "heavy"] },
    });
    expect(JSON.stringify(flight)).not.toContain("900");
  });

  it("publica escolhas de conjuração e fontes com cargas independentes", () => {
    expect(fairy.choices.map((choice) => choice.id)).toContain("fairy.spellcasting-ability");
    expect(fairy.spellcastingSources).toHaveLength(3);
    expect(fairy.spellcastingSources?.map((entry) => [entry.minTotalLevel, entry.resourceRef?.entityId])).toEqual([
      [undefined, undefined], [3, "fairy.faerie-fire-use"], [5, "fairy.enlarge-reduce-use"],
    ]);
    expect(fairy.spellcastingSources?.slice(1).every((entry) => entry.canUseSpellSlots && entry.spellListClassId === "druid")).toBe(true);
  });
});
