import { describe, expect, it } from "vitest";

import { ABILITIES } from "@data/abilities/abilities";
import { SKILLS } from "@data/skills/skills";
import { PHB_CANONICAL_DESCRIPTION_REGISTRY } from "@data/correto/integracao";
import { STATIC_COMPENDIUM_ITEMS } from "./static";

function definitionId(item: (typeof STATIC_COMPENDIUM_ITEMS)[number]): string {
  return "id" in item.definition ? String(item.definition.id) : String(item.definition.templateId);
}

describe("static compendium catalog", () => {
  it("publishes all real attributes and skills with their source references", () => {
    const attributes = STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "attributes");
    const skills = STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "skills");

    expect(attributes).toHaveLength(ABILITIES.length);
    expect(skills).toHaveLength(SKILLS.length);
    expect(attributes).toHaveLength(6);
    expect(skills).toHaveLength(18);
    expect([...attributes, ...skills].every((item) => item.definition.sourceRefs.length > 0)).toBe(true);
    expect(attributes.map((item) => item.definition.name)).toEqual(ABILITIES.map((ability) => ability.name));
    expect(skills.map((item) => item.definition.name)).toEqual(SKILLS.map((skill) => skill.name));
  });

  it("publishes source-backed rules and rest entries", () => {
    const rules = STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "rules");
    const rest = STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === "rest");

    expect(rules.length).toBeGreaterThan(0);
    expect(rest.length).toBeGreaterThan(0);
    expect([...rules, ...rest].every((item) => item.kind === "static" && item.definition.sourceRefs.length > 0)).toBe(true);
    expect(rules.map((item) => item.definition.sourceRefs[0]?.sourceId)).toEqual(Array(rules.length).fill("phb-ptbr-local-2017"));
    expect(rest.map((item) => item.definition.sourceRefs[0]?.sourceId)).toEqual(Array(rest.length).fill("phb-ptbr-local-2017"));
  });

  it("publishes mechanical combat, movement and partial adventure coverage", () => {
    const categories = ["combat", "movement", "adventure"] as const;
    for (const category of categories) {
      const entries = STATIC_COMPENDIUM_ITEMS.filter((item) => item.category === category);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((item) => item.kind === "static" && item.definition.sourceRefs.length > 0)).toBe(true);
      expect(entries.every((item) => item.definition.sourceRefs.every((ref) => ref.sourceId === "phb-ptbr-local-2017"))).toBe(true);
      expect(new Set(entries.map(definitionId)).size).toBe(entries.length);
    }

    const attackSource = STATIC_COMPENDIUM_ITEMS.find((item) => definitionId(item) === "attack-roll" && item.category === "combat")?.definition.sourceRefs.find((ref) => ref.section === "Jogada de Ataque");
    expect(attackSource).toMatchObject({ printedPage: 196, pdfPage: 195 });
    expect(STATIC_COMPENDIUM_ITEMS.find((item) => definitionId(item) === "travel-pace" && item.category === "movement")?.definition.sourceRefs[0]).toMatchObject({ printedPage: 183, pdfPage: 182 });
    expect(STATIC_COMPENDIUM_ITEMS.find((item) => definitionId(item) === "adventure-scope" && item.category === "adventure")?.summary).toContain("Cobertura mecânica parcial");
  });

  it("integrates canonical missing descriptions without duplicate static IDs", () => {
    const canonicalEntries = PHB_CANONICAL_DESCRIPTION_REGISTRY.filter((entry) => entry.category !== "equipment" && entry.text.trim());
    const staticKeys = STATIC_COMPENDIUM_ITEMS.map((item) => `${item.category}:${definitionId(item)}`);
    expect(new Set(staticKeys).size).toBe(staticKeys.length);
    for (const entry of canonicalEntries) {
      const match = STATIC_COMPENDIUM_ITEMS.find((item) => item.category === entry.category && definitionId(item) === entry.id);
      expect(match, `${entry.category}/${entry.id}`).toBeDefined();
      expect(match?.definition.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
    }
  });
});
