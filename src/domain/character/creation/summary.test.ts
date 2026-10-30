import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid } from "@domain/contracts/ids";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft } from "./creation";
import { backgroundOverview, buildCreationSummary } from "./summary";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const ref = (id: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(id) });
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const catalog = { rulePack: loaded.value, equipmentBundles };
const draft = (partial: Parameters<typeof createCharacterDraft>[0]["partial"]) => {
  const result = createCharacterDraft({ id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"), partial });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};
const pick = (choiceId: string, ids: string[], owner: string) => ({ choiceId, selectedIds: ids.map(ref), grantedAtLevel: 1, grantingRef: ref(owner) });

describe("resumo da criação", () => {
  it("aceita rascunho vazio sem lançar erro", () => {
    const summary = buildCreationSummary(catalog, draft({}));
    expect(summary.skills).toEqual([]);
    expect(summary.conflicts).toEqual([]);
    expect(summary.abilities).toHaveLength(6);
  });

  it("mostra a origem de perícias, proficiências, idiomas, equipamento e atributos", () => {
    const summary = buildCreationSummary(catalog, draft({
      raceRef: ref("human"), backgroundRef: ref("hermit"), classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
      abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 12, con: 14, int: 10, wis: 15, cha: 8 } },
      choices: [pick("druid.skills", ["nature", "perception"], "druid")],
    }), { skill: (id) => `P:${id}` });
    expect(summary.skills.find((line) => line.id === "medicine")?.sources.map((entry) => entry.kind)).toEqual(["background"]);
    expect(summary.skills.find((line) => line.id === "nature")?.sources[0]).toMatchObject({ kind: "class", name: "Druida" });
    expect(summary.skills.find((line) => line.id === "medicine")?.name).toBe("P:medicine");
    expect(summary.proficiencies.find((line) => line.id === "proficiency.herbalism-kit")?.sources[0].kind).toBe("class");
    expect(summary.equipment.find((line) => line.id === "herbalism-kit")?.sources[0]).toMatchObject({ kind: "background", name: "Eremita" });
    expect(summary.equipment.find((line) => line.id === "herbalism-kit")?.weightGrams).toBeGreaterThan(0);
    const wisdom = summary.abilities.find((entry) => entry.ability === "wis");
    expect(wisdom).toMatchObject({ base: 15, final: 16, modifier: 3 });
    expect(wisdom?.parts[0].amount).toBe(1);
    expect(summary.hitPoints).toMatchObject({ die: 8, total: 8 + 2 });
  });

  it("aponta o Estojo de Herbalismo repetido entre Eremita e Druida, e a proficiência repetida", () => {
    const summary = buildCreationSummary(catalog, draft({
      raceRef: ref("human"), backgroundRef: ref("hermit"), classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
      choices: [pick("hermit.tools", ["proficiency.herbalism-kit"], "hermit"), pick("druid.equipment", ["herbalism-kit"], "druid")],
    }));
    const item = summary.conflicts.find((entry) => entry.id === "equipment:herbalism-kit");
    expect(item?.step).toBe("equipment");
    expect(item?.message).toContain("2×");
    expect(item?.message).toContain("Antecedente Eremita");
    expect(item?.message).toContain("Classe Druida");
    const proficiency = summary.conflicts.find((entry) => entry.id === "proficiency:proficiency.herbalism-kit");
    expect(proficiency?.message).toContain("Eremita");
    expect(proficiency?.message).toContain("Druida");
  });

  it("aponta perícia repetida entre antecedente e escolha da classe", () => {
    const summary = buildCreationSummary(catalog, draft({
      raceRef: ref("human"), backgroundRef: ref("hermit"), classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
      choices: [pick("druid.skills", ["medicine", "nature"], "druid")],
    }), { skill: (id) => (id === "medicine" ? "Medicina" : id) });
    expect(summary.conflicts.find((entry) => entry.id === "skill:medicine")?.message).toContain("Medicina");
    expect(summary.conflicts.some((entry) => entry.id === "skill:nature")).toBe(false);
  });

  it("mostra o que o antecedente traz e marca o que já vem da classe", () => {
    const base = draft({ raceRef: ref("human"), classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }], choices: [pick("druid.skills", ["medicine", "nature"], "druid")] });
    const hermit = backgroundOverview(catalog, base, "hermit", { skill: (id) => (id === "medicine" ? "Medicina" : id) });
    expect(hermit?.skills.map((line) => line.name)).toEqual(["Medicina", "religion"]);
    expect(hermit?.skills[0].alreadyFrom[0]).toMatchObject({ kind: "class", name: "Druida" });
    expect(hermit?.skills[1].alreadyFrom).toEqual([]);
    expect(hermit?.equipment.some((line) => line.id === "herbalism-kit" && line.weightGrams > 0)).toBe(true);
    expect(hermit?.ownedTools.map((line) => line.id)).toContain("proficiency.herbalism-kit");
    expect(hermit?.toolChoices).toBe(1);
    expect(hermit?.overlapCount).toBe(1);
    expect(hermit?.feature.name).toBeTruthy();
    expect(backgroundOverview(catalog, base, "nao-existe")).toBeUndefined();
  });

  it("antecedente sem sobreposição não marca nada e ignora o antecedente já escolhido", () => {
    const chosen = draft({ raceRef: ref("human"), backgroundRef: ref("criminal"), classes: [{ classId: asEntityId("rogue"), level: 1, choices: [] }] });
    const overview = backgroundOverview(catalog, chosen, "criminal");
    expect(overview?.skills.length).toBeGreaterThan(0);
    // O próprio antecedente escolhido não conta como "já vem de outra fonte".
    expect(overview?.skills.every((line) => line.alreadyFrom.every((source) => source.kind !== "background"))).toBe(true);
  });
});
