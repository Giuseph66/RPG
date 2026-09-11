import { describe, expect, it } from "vitest";
import { classes } from "./classes";
import { features, resources, FEATURE_PENDING_DECISIONS } from "./features";
import { subclasses } from "@data/subclasses/subclasses";
import { backgrounds } from "@data/backgrounds/backgrounds";
import { feats, FEAT_PENDING_DECISIONS } from "@data/feats/feats";
import { characterTemplates } from "@data/character-templates/templates";
import { progression } from "@data/progression/progression";

describe("catálogo DATA-005", () => {
  it("publica as doze classes e uma progressão completa por nível", () => {
    expect(classes).toHaveLength(12);
    expect(new Set(classes.map((entry) => entry.id)).size).toBe(12);
    for (const entry of classes) {
      expect(entry.progression).toHaveLength(20);
      expect(entry.progression.map((level) => level.level)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
      expect(entry.subclassIds).toHaveLength(entry.id === "cleric" ? 7 : entry.id === "wizard" ? 8 : entry.id === "warlock" || entry.id === "fighter" || entry.id === "rogue" || entry.id === "monk" || entry.id === "paladin" || entry.id === "ranger" ? 3 : entry.id === "barbarian" || entry.id === "bard" || entry.id === "druid" || entry.id === "sorcerer" ? 2 : 0);
      expect(entry.sourceRefs[0]?.sourceId).toBe("phb-ptbr-local-2017");
    }
  });

  it("mantém a relação classe/subclasse e IDs de características resolvíveis", () => {
    const featureIds = new Set(features.map((entry) => entry.id));
    expect(subclasses).toHaveLength(41);
    for (const subclass of subclasses) {
      const parent = classes.find((entry) => entry.id === subclass.classId);
      expect(parent?.subclassIds).toContain(subclass.id);
      for (const grant of subclass.featureGrants) expect(featureIds).toContain(grant.featureRef.entityId);
    }
    for (const cls of classes) for (const level of cls.progression) for (const feature of level.featureRefs) expect(featureIds).toContain(feature.entityId);
  });

  it("preserva progressão total da fonte e recuperações declaradas", () => {
    expect(progression.table).toHaveLength(20);
    expect(progression.table[4]).toMatchObject({ totalLevel: 5, xpThreshold: 6500, proficiencyBonus: 3 });
    expect(progression.table[19]).toMatchObject({ totalLevel: 20, xpThreshold: 355000, proficiencyBonus: 6 });
    expect(resources.length).toBeGreaterThanOrEqual(8);
    expect(resources.find((entry) => entry.id === "barbarian.rage")?.recoveryTriggers).toEqual([{ kind: "long-rest" }]);
    expect(resources.find((entry) => entry.id === "bard.bardic-inspiration")?.recoveryTriggers).toEqual([{ kind: "short-rest" }, { kind: "long-rest" }]);
  });

  it("cataloga antecedentes, variantes, talentos e templates revisáveis", () => {
    expect(backgrounds).toHaveLength(13);
    expect(backgrounds.flatMap((entry) => entry.variants)).toHaveLength(5);
    expect(feats).toHaveLength(42);
    expect(new Set(feats.map((entry) => entry.id)).size).toBe(42);
    expect(feats.every((entry) => entry.optionalRule)).toBe(true);
    expect(characterTemplates).toHaveLength(12);
    expect(characterTemplates.every((entry) => entry.requiresReview === true)).toBe(true);
  });

  it("não inventa a quarta opção do Patrulheiro nem magias ausentes", () => {
    const ranger = classes.find((entry) => entry.id === "ranger");
    expect(ranger?.subclassIds).toEqual(["beast-conclave", "hunter-conclave", "deep-stalker-conclave"]);
    expect(subclasses.filter((entry) => entry.classId === "ranger")).toHaveLength(3);
    expect(subclasses.every((entry) => entry.spellGrants.length === 0)).toBe(true);
  });

  it("expõe pendências de fonte sem transformar lacunas em defaults", () => {
    expect(FEATURE_PENDING_DECISIONS["wizard.signature-spells"]).toEqual(["PEND-005"]);
    expect(FEATURE_PENDING_DECISIONS["warlock.eldritch-invocations"]).toEqual(["PEND-006"]);
    expect(FEAT_PENDING_DECISIONS.grappler).toEqual(["PEND-018"]);
    expect(FEAT_PENDING_DECISIONS["medium-armor-master"]).toEqual(["PEND-019"]);
  });
});
