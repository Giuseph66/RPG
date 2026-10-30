import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { applyCreationDecision, createCharacterDraft, creationChoiceLimit, materializeCharacter, validateCharacterCreation } from ".";
import { type CreationCatalog } from "./model";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const draft = (partial: Parameters<typeof createCharacterDraft>[0]["partial"] = {}) => {
  const result = createCharacterDraft({ id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: now, partial });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const catalog = (): CreationCatalog => {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  return { rulePack: loaded.value, equipmentBundles };
};

describe("domínio de criação", () => {
  it("rejeita matriz padrão alterada e escolhas repetidas", () => {
    const invalid = draft({ abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 15, con: 12, int: 10, wis: 8, cha: 8 } } });
    const report = validateCharacterCreation(catalog(), invalid);
    expect(report.valid).toBe(false);
    expect(report.issues.some((entry) => entry.code === "invalid-ability-scores")).toBe(true);

    const repeated = draft({
      name: "Teste", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [{ choiceId: "fighter.skills", selectedIds: [ref("athletics"), ref("athletics")], grantedAtLevel: 1, grantingRef: ref("fighter") }],
    });
    expect(validateCharacterCreation(catalog(), repeated).issues.some((entry) => entry.code === "duplicate-choice")).toBe(true);

    const unresolved = draft({
      name: "Teste", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "point-buy", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [{ choiceId: "fighter.equipment", selectedIds: [ref("unknown-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") }],
    });
    const unresolvedReport = validateCharacterCreation(catalog(), unresolved);
    expect(unresolvedReport.issues.some((entry) => entry.code === "unresolved-source")).toBe(true);
  });

  it("materializa ficha mínima só com raça, classe e antecedente", () => {
    const minimal = draft({ raceRef: ref("elf"), backgroundRef: ref("acolyte"), classes: [{ classId: asEntityId("cleric"), level: 1, choices: [] }] });
    const report = validateCharacterCreation(catalog(), minimal);
    expect(report.issues).toEqual([]);
    const result = materializeCharacter(catalog(), minimal);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character.name).toBe("Aventureiro sem nome");
    expect(result.value.character.abilityGeneration.baseScores).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
  });

  it("aceita atributos parciais e compra de pontos abaixo do orçamento", () => {
    const partialScores = draft({
      raceRef: ref("human"), backgroundRef: ref("soldier"), classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "point-buy", baseScores: { str: 15, dex: 0, con: 13, int: 0, wis: 0, cha: 0 } },
    });
    expect(validateCharacterCreation(catalog(), partialScores).valid).toBe(true);
    const materialized = materializeCharacter(catalog(), partialScores);
    expect(materialized.ok && materialized.value.character.abilityGeneration.baseScores.dex).toBe(8);
  });

  it("limita magias preparadas do druida a nível + mod. de Sabedoria, mínimo 1", () => {
    const pack = catalog().rulePack;
    const druidSpells = pack.classes.get(asEntityId("druid"))!.progression[0]!.choicesGranted.find((choice) => choice.id === "druid.spells.1")!;
    const druidCantrips = pack.classes.get(asEntityId("druid"))!.progression[0]!.choicesGranted.find((choice) => choice.id === "druid.cantrips.1")!;
    const base = { raceRef: ref("human"), backgroundRef: ref("acolyte"), classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }] };
    // Humano +1 em tudo: SAB 16 → 17 (+3) → 1 + 3 = 4.
    const wise = draft({ ...base, abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 14, con: 13, int: 10, wis: 16 - 1, cha: 12 } } });
    expect(creationChoiceLimit(pack, wise.partial, druidSpells).max).toBe(4);
    expect(creationChoiceLimit(pack, wise.partial, druidCantrips).max).toBe(2);
    const foolish = draft({ ...base, abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 5, cha: 10 } } });
    expect(creationChoiceLimit(pack, foolish.partial, druidSpells).max).toBe(1);
    const tooMany = draft({ ...wise.partial, choices: [{ choiceId: "druid.spells.1", selectedIds: ["bom-fruto", "cure-wounds", "falar-com-animais", "nevoa-obscurecente", "salto"].map(ref), grantedAtLevel: 1, grantingRef: ref("druid") }] });
    expect(validateCharacterCreation(catalog(), tooMany).issues.some((entry) => entry.field === "choices.druid.spells.1" && /no máximo 4/.test(entry.message))).toBe(true);
  });

  it("cria personagem sem antecedente e permite remover um antecedente escolhido", () => {
    const withBackground = draft({ raceRef: ref("human"), backgroundRef: ref("acolyte"), classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }] });
    const cleared = applyCreationDecision(withBackground, { kind: "background" });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect("backgroundRef" in cleared.value.partial).toBe(false);
    expect(validateCharacterCreation(catalog(), cleared.value).issues).toEqual([]);
    const result = materializeCharacter(catalog(), cleared.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.character.backgroundRef).toBeUndefined();
    expect("backgroundRef" in result.value.character).toBe(false);
  });

  it("aplica decisões sem mutar o draft anterior", () => {
    const initial = draft();
    const result = applyCreationDecision(initial, { kind: "race", raceRef: ref("human") });
    expect(result.ok).toBe(true);
    expect(initial.partial.raceRef).toBeUndefined();
    if (result.ok) expect(result.value.partial.raceRef?.entityId).toBe("human");
  });

  it("materializa equipamento, proficiências, PV e valores derivados", () => {
    const value = draft({
      name: "Guerreiro", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 } },
      choices: [
        { choiceId: "human.language", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("human") },
        { choiceId: "fighter.skills", selectedIds: [ref("acrobatics"), ref("perception")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "fighter.equipment", selectedIds: [ref("dungeoneer-pack")], grantedAtLevel: 1, grantingRef: ref("fighter") },
        { choiceId: "soldier.tools", selectedIds: [ref("proficiency.gaming-set"), ref("proficiency.vehicle-land")], grantedAtLevel: 1, grantingRef: ref("soldier") },
      ],
    });
    const result = materializeCharacter(catalog(), value, { revision: asRevision(0) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.character.schemaVersion).toBe(1);
      expect(result.value.character.inventory.length).toBeGreaterThan(1);
      expect(result.value.derived.abilityScores.find((entry) => entry.ability === "str")?.score.value).toBe(16);
      expect(result.value.derived.hitPointsMax.value).toBe(12);
      expect(result.value.character.hp.current).toBe(12);
      expect(result.value.derived.proficiencyBonus.value).toBe(2);
    }
  });

  it("valida acesso e nível nas escolhas iniciais de magia da classe", () => {
    const invalid = draft({
      name: "Bardo", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 15, con: 13, int: 10, wis: 12, cha: 14 } },
      choices: [
        { choiceId: "bard.cantrips.1", selectedIds: [ref("cure-wounds"), ref("cure-wounds")], grantedAtLevel: 1, grantingRef: ref("bard") },
        { choiceId: "bard.spells.1", selectedIds: [ref("fire-bolt"), ref("fire-bolt"), ref("fire-bolt"), ref("fire-bolt")], grantedAtLevel: 1, grantingRef: ref("bard") },
      ],
    });
    const issues = validateCharacterCreation(catalog(), invalid).issues;
    expect(issues.some((entry) => entry.field === "choices.bard.cantrips.1" && entry.message.includes("nível 0"))).toBe(true);
    expect(issues.some((entry) => entry.field === "choices.bard.spells.1" && entry.message.includes("classe \"bard\""))).toBe(true);
    expect(issues.some((entry) => entry.field === "choices.bard.spells.1" && entry.message.includes("nível de magia disponível"))).toBe(true);
  });

  it("cria um Bardo nível 1 com as opções de magia publicadas pelo pack real", () => {
    const value = draft({
      name: "Bardo real", raceRef: ref("human"), backgroundRef: ref("soldier"),
      classes: [{ classId: asEntityId("bard"), level: 1, choices: [] }],
      abilityGeneration: { method: "standard-array", baseScores: { str: 8, dex: 15, con: 13, int: 10, wis: 12, cha: 14 } },
      choices: [
        { choiceId: "human.language", selectedIds: [ref("elvish")], grantedAtLevel: 1, grantingRef: ref("human") },
        { choiceId: "bard.skills", selectedIds: [ref("performance"), ref("insight"), ref("deception")], grantedAtLevel: 1, grantingRef: ref("bard") },
        { choiceId: "bard.equipment", selectedIds: [ref("entertainer-pack")], grantedAtLevel: 1, grantingRef: ref("bard") },
        { choiceId: "soldier.tools", selectedIds: [ref("proficiency.gaming-set"), ref("proficiency.vehicle-land")], grantedAtLevel: 1, grantingRef: ref("soldier") },
        { choiceId: "bard.cantrips.1", selectedIds: [ref("prestidigitacao"), ref("zombaria-viciosa")], grantedAtLevel: 1, grantingRef: ref("bard") },
        { choiceId: "bard.spells.1", selectedIds: [ref("cure-wounds"), ref("disfarcar-se"), ref("enfeiticar-pessoa"), ref("fogo-das-fadas")], grantedAtLevel: 1, grantingRef: ref("bard") },
      ],
    });
    const validation = validateCharacterCreation(catalog(), value);
    expect(validation).toEqual({ valid: true, issues: [] });

    const result = materializeCharacter(catalog(), value, { revision: asRevision(0) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.character.castingSources[0]?.ability).toBe("cha");
      expect(result.value.character.castingSources[0]?.knownSpellRefs.map((spell) => String(spell.entityId))).toEqual([
        "prestidigitacao", "zombaria-viciosa", "cure-wounds", "disfarcar-se", "enfeiticar-pessoa", "fogo-das-fadas",
      ]);
      expect(result.value.character.spellSlots).toHaveLength(1);
    }
  });
});
