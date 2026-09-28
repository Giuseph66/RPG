import { describe, expect, it } from "vitest";
import { classes } from "./classes";
import { equipment } from "@data/equipment";
import { features, resources, FEATURE_PENDING_DECISIONS } from "./features";
import { subclasses } from "@data/subclasses/subclasses";
import { backgrounds } from "@data/backgrounds/backgrounds";
import { feats, FEAT_PENDING_DECISIONS } from "@data/feats/feats";
import { characterTemplates } from "@data/character-templates/templates";
import { progression } from "@data/progression/progression";

describe("catálogo DATA-005", () => {
  it("Magia de Pacto do bruxo: círculo dos espaços sobe de 1º a 5º e a quantidade segue a tabela", () => {
    const warlock = classes.find((entry) => entry.id === "warlock")!;
    const at = (level: number) => warlock.progression[level - 1].spellSlotsGranted?.slotsByLevel ?? [];
    expect(at(1)).toEqual([{ slotLevel: 1, count: 1 }]);
    expect(at(2)).toEqual([{ slotLevel: 1, count: 2 }]);
    expect(at(3)).toEqual([{ slotLevel: 2, count: 2 }]);
    expect(at(5)).toEqual([{ slotLevel: 3, count: 2 }]);
    expect(at(9)).toEqual([{ slotLevel: 5, count: 2 }]);
    expect(at(11)).toEqual([{ slotLevel: 5, count: 3 }]);
    expect(at(17)).toEqual([{ slotLevel: 5, count: 4 }]);
    for (const level of [3, 4, 5, 6, 7, 8, 9, 10, 11, 20]) expect(at(level)).toHaveLength(1);
  });

  it("multiclasse: guerreiro aceita FOR 13 OU DES 13; monge/paladino/patrulheiro exigem os dois", () => {
    const prerequisites = (id: string) => classes.find((entry) => entry.id === id)!.multiclassPrerequisites;
    expect(prerequisites("fighter")).toEqual([{ kind: "any-of", options: [{ kind: "min-ability-score", ability: "str", score: 13 }, { kind: "min-ability-score", ability: "dex", score: 13 }] }]);
    for (const id of ["monk", "paladin", "ranger"]) {
      expect(prerequisites(id)).toHaveLength(2);
      expect(prerequisites(id).every((entry) => entry.kind === "min-ability-score")).toBe(true);
    }
  });

  it("publica o ID do foco arcano coerente com o nome (bastão x cajado)", () => {
    const byId = (id: string) => equipment.find((entry) => entry.id === id)!;
    expect(byId("arcane-focus-rod").name).toBe("Foco arcano: bastão");
    expect(byId("arcane-focus-staff").name).toBe("Foco arcano: cajado");
    expect(Number(byId("arcane-focus-rod").valueCp)).toBe(1000);
    expect(Number(byId("arcane-focus-staff").valueCp)).toBe(500);
  });

  it("zarabatana causa dano fixo 1 perfurante (1d1)", () => {
    const blowgun = equipment.find((entry) => entry.id === "blowgun")!;
    expect(blowgun.weapon?.damageParts).toEqual([{ expression: { quantity: 1, faces: 1 }, damageType: "piercing" }]);
  });

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
