import { describe, expect, it } from "vitest";
import { asEntityId } from "@domain/contracts/ids";
import { isCreatureStatBlock } from "@domain/creatures";
import { TASHA_ADDITIONAL_RANGER_SPELL_IDS, TASHA_RANGER_OPTIONAL_PACK as pack } from "./tasha-ranger";
import { arielInquisidora, tashaSummonedCreatures } from "@data/creatures/supplement-creatures";

describe("Opções de Guardião de Tasha", () => {
  it("mantém cada substituição explícita e preserva a escolha de nível 2 do estilo", () => {
    expect(pack.classFeatureReplacements?.map((entry) => entry.id)).toEqual([
      "ranger.optional-canny", "ranger.optional-favored-foe", "ranger.optional-primal-awareness", "ranger.optional-natures-veil", "ranger.optional-primal-companion",
    ]);
    expect(pack.classFeatureReplacements?.find((entry) => entry.id === "ranger.optional-favored-foe")?.replacesFeatureIds).toEqual([
      "ranger.favored-enemy",
    ]);
    expect(pack.classFeatureReplacements?.find((entry) => entry.id === "ranger.optional-primal-companion")).toMatchObject({
      subclassId: "beast-conclave", replacesFeatureId: "beast-conclave-feature-level-3",
    });
    expect(pack.classOptions?.find((entry) => entry.id === "ranger.optional-fighting-style")).toMatchObject({
      kind: "choice", choiceId: "ranger.fighting-style.2", featureRefs: ["ranger.blind-fighting", "ranger.druidic-warrior", "ranger.thrown-weapon-fighting"],
    });
    expect(pack.classOptions?.find((entry) => entry.id === "ranger.optional-additional-spells")?.featureRefs).toEqual([]);
    expect(pack.classOptions?.some((entry) => entry.id === "ranger.optional-druidic-focus" && entry.featureRefs.includes(asEntityId("ranger.druidic-focus")))).toBe(true);
  });

  it("publica as subclasses e a lista adicional sem ativá-las no pack base", () => {
    expect(pack.subclasses?.map((entry) => entry.id)).toEqual(["fey-wanderer", "swarmkeeper"]);
    expect(pack.subclasses?.find((entry) => entry.id === "fey-wanderer")?.featureGrants.map((entry) => entry.level)).toEqual([3, 3, 7, 11, 15]);
    expect(pack.subclasses?.find((entry) => entry.id === "swarmkeeper")?.featureGrants.map((entry) => entry.level)).toEqual([3, 7, 11, 15]);
    expect(pack.classOptions?.find((entry) => entry.id === "ranger.optional-additional-spells")?.spellRefs).toEqual([
      ...TASHA_ADDITIONAL_RANGER_SPELL_IDS.map(asEntityId),
    ]);
    expect(TASHA_ADDITIONAL_RANGER_SPELL_IDS).toEqual([
      "destruicao-lancinante", "constricao", "aprimorar-habilidade", "arma-magica", "ajuda", "lufada-de-vento", "invocar-fera",
      "arma-elemental", "invocar-feerico", "mesclar-se-as-rochas", "revivify", "dominar-besta", "invocar-elemental", "restauracao-maior",
    ]);
    const awareness = pack.features?.filter((entry) => String(entry.id).startsWith("ranger.primal-awareness"));
    expect(awareness?.map((entry) => entry.eligibility.find((item) => item.kind === "min-class-level")?.kind === "min-class-level" ? entry.eligibility.find((item) => item.kind === "min-class-level")!.level : undefined)).toEqual([3, 5, 9, 13, 17]);
    expect(awareness?.every((entry) => entry.effects.some((effect) => effect.kind === "grants-spell" && effect.resourceRef) && entry.spellcastingSource?.usesSpellSlots)).toBe(true);
    const reinforcements = pack.features?.find((entry) => entry.id === "fey-wanderer-fey-reinforcements");
    expect(reinforcements?.effects.find((effect) => effect.kind === "grants-spell")).toMatchObject({
      ignoreMaterialComponents: true, concentrationAlternativeMinutes: 1,
    });
    expect(reinforcements?.automationStatus).toBe("assisted");
    const roving = pack.features?.find((entry) => entry.id === "ranger.roving")!;
    expect(roving.effects.filter((effect) => effect.kind === "modifier").every((effect) => effect.kind !== "modifier" || effect.modifier.predicate.kind === "always")).toBe(true);
    const veil = JSON.stringify(pack.features?.find((entry) => entry.id === "ranger.natures-veil")?.effects);
    expect(veil).toContain("começo do próximo turno");
    expect(veil).not.toMatch(/atacar|causar dano|salvaguarda/i);
    expect(pack.subclasses?.find((entry) => entry.id === "fey-wanderer")?.sourceRefs[0]?.printedPage).toBe(53);
    expect(pack.subclasses?.find((entry) => entry.id === "swarmkeeper")?.sourceRefs[0]?.printedPage).toBe(54);
    expect(pack.subclasses?.find((entry) => entry.id === "fey-wanderer")?.spellGrants.map((entry) => entry.level)).toEqual([3, 5, 9, 13, 17]);
    for (const subclassId of ["fey-wanderer", "swarmkeeper"]) {
      const grants = pack.subclasses?.find((entry) => String(entry.id) === subclassId)?.spellGrants ?? [];
      expect(grants.every((grant) => !grant.alwaysPrepared && grant.knownWithoutCount === true)).toBe(true);
    }
    expect(pack.resources?.filter((resource) => ["ranger.favored-foe-use", "ranger.natures-veil-use", "swarmkeeper.writhing-tide-use"].includes(String(resource.id))).every((resource) => resource.capacityRule.kind === "proficiency-bonus")).toBe(true);
    expect(pack.spells?.filter((spell) => spell.tags.includes("summon")).every((spell) => spell.automationStatus === "assisted" && spell.pendingDecisionIds.length === 0)).toBe(true);
    expect(JSON.stringify(pack.features?.find((entry) => entry.id === "ranger.favored-foe")?.effects)).toContain("em cada um dos seus turnos");
    expect(JSON.stringify(pack.features?.find((entry) => entry.id === "fey-wanderer.dreadful-strikes")?.effects)).not.toContain("Uma vez por turno");
    expect(JSON.stringify(pack.features?.find((entry) => entry.id === "ranger.blind-fighting")?.effects)).toContain("se esconder de você com sucesso");
    expect(pack.spells?.filter((spell) => spell.tags.includes("summon")).every((spell) => !spell.classes.includes(asEntityId("ranger")))).toBe(true);
  });

  it("preserva companheiros dinâmicos e valores locais de Ariel", () => {
    expect(pack.creatures).toHaveLength(13);
    expect(pack.creatures?.every(isCreatureStatBlock)).toBe(true);
    const companions = pack.creatures?.filter((entry) => String(entry.id).startsWith("tasha-primal-companion"));
    expect(companions).toHaveLength(3);
    expect(companions?.every((entry) => entry.challengeRating === null && entry.scaling?.hitPoints?.classId === "ranger")).toBe(true);
    const sea = pack.creatures?.find((entry) => entry.id === "tasha-primal-companion-sea")!;
    expect(sea.actions?.find((entry) => entry.id === "primal-sea-grappling-strike")?.damage).toHaveLength(1);
    expect(sea.actions?.[0]?.description).toContain("perfurante ou contundente à escolha");
    expect(arielInquisidora).toMatchObject({
      armorClass: 18, hitPoints: { average: 157, hitDice: "20d10+53" },
      challengeRating: { numerator: 12, denominator: 1 }, proficiencyBonus: 6,
    });
    expect(arielInquisidora.actions?.find((entry) => entry.id === "ariel-healing-touch")?.description).toContain("qualquer maldição");
    expect(arielInquisidora.actions?.find((entry) => entry.id === "ariel-longsword-plus-three")?.description).toContain("12 (1d10 + 7)");
  });

  it("publica variantes-base dos três summons sem esconder escolhas e fórmulas", () => {
    expect(tashaSummonedCreatures).toHaveLength(10);
    expect(tashaSummonedCreatures.every(isCreatureStatBlock)).toBe(true);
    expect(tashaSummonedCreatures.map((creature) => String(creature.id))).toEqual(expect.arrayContaining([
      "tasha-summoned-beast-air", "tasha-summoned-beast-land", "tasha-summoned-beast-water",
      "tasha-summoned-fey-irritable", "tasha-summoned-fey-joyful", "tasha-summoned-fey-playful",
      "tasha-summoned-elemental-air", "tasha-summoned-elemental-water", "tasha-summoned-elemental-earth", "tasha-summoned-elemental-fire",
    ]));
    expect(tashaSummonedCreatures.find((creature) => creature.id === "tasha-summoned-beast-air")?.additionalInfo?.notes).toContain("cláusulas conflitantes");
    expect(tashaSummonedCreatures.find((creature) => creature.id === "tasha-summoned-fey-joyful")?.bonusActions?.[0]?.description).toContain("salvaguarda de Sabedoria");
    expect(tashaSummonedCreatures.find((creature) => creature.id === "tasha-summoned-elemental-fire")?.actions?.find((action) => action.id.endsWith("-slam"))?.description).toContain("ígneo");
    expect(pack.spells?.filter((spell) => spell.tags.includes("summon")).map((spell) => JSON.stringify(spell.effects)).join(" ")).toContain("tasha-summoned-elemental-fire");
  });
});
