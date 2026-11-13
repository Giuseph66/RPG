import { describe, expect, it } from "vitest";
import { asEntityId } from "@domain/contracts/ids";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { loadPhbPtBrLocal2017 } from "./phb-ptbr-local-2017";
import { composeOptionalRuleContent } from "@domain/character/creation/optional-rules";
import { applyLevelUp, buildLevelUpPreview } from "@domain/character/progression";
import { TASHA_ADDITIONAL_RANGER_SPELL_IDS } from "@data/classes/tasha-ranger";

const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const base = loaded.value;
const tashaId = asEntityId("tasha-ranger-options");
const ref = (entityId: string) => ({ rulesetId: base.manifest.id, entityId: asEntityId(entityId) });
const additionalSpellRefs = TASHA_ADDITIONAL_RANGER_SPELL_IDS.map((id) => ref(id));

describe("packs opcionais", () => {
  it("publica o catálogo disponível sem ativar Fada, Tasha ou as novas magias", () => {
    expect([...base.optionalRulePacks?.keys() ?? []]).toEqual([asEntityId("fairy-supplement"), tashaId]);
    expect(base.races.has(asEntityId("fairy"))).toBe(false);
    expect(base.classes.get(asEntityId("ranger"))?.subclassIds).not.toContain(asEntityId("fey-wanderer"));
    expect(base.spells.has(asEntityId("invocar-fera"))).toBe(false);
  });

  it("aplica somente as substituições escolhidas e troca também o grant de subclasse", () => {
    const selections = [
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-favored-foe"), selectedFeatureRefs: [ref("ranger.favored-foe")] },
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-primal-companion"), selectedFeatureRefs: [ref("ranger.primal-companion")] },
    ];
    const composed = composeOptionalRuleContent(base, [tashaId], selections);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const ranger = composed.value.classes.get(asEntityId("ranger"))!;
    expect(ranger.progression[0]?.featureRefs.map((entry) => entry.entityId)).toContain(asEntityId("ranger.favored-foe"));
    expect(ranger.progression[0]?.featureRefs.map((entry) => entry.entityId)).not.toContain(asEntityId("ranger.favored-enemy"));
    expect(ranger.progression[5]?.featureRefs.map((entry) => entry.entityId)).toContain(asEntityId("ranger.favored-enemy-greater"));
    const beastMaster = composed.value.subclasses.get(asEntityId("beast-conclave"))!;
    expect(beastMaster.featureGrants.some((entry) => entry.featureRef.entityId === asEntityId("beast-conclave-feature-level-3"))).toBe(false);
    expect(beastMaster.featureGrants.some((entry) => entry.featureRef.entityId === asEntityId("ranger.primal-companion") && entry.level === 3)).toBe(true);
    expect(composed.value.spells.get(asEntityId("invocar-fera"))?.classes).not.toContain(asEntityId("ranger"));
    expect(base.classes.get(asEntityId("ranger"))?.progression[0]?.featureRefs.map((entry) => entry.entityId)).toContain(asEntityId("ranger.favored-enemy"));
  });

  it("estende a escolha de estilo existente e adiciona a tabela completa à lista sem conceder magia conhecida", () => {
    const composed = composeOptionalRuleContent(base, [tashaId], [
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] },
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-additional-spells"), selectedFeatureRefs: [], selectedSpellRefs: additionalSpellRefs },
    ]);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const ranger = composed.value.classes.get(asEntityId("ranger"))!;
    const styleChoice = ranger.progression[1]?.choicesGranted.find((entry) => entry.id === "ranger.fighting-style.2");
    expect(styleChoice?.optionSet.kind === "explicit" && styleChoice.optionSet.options.map((entry) => entry.entityId)).toEqual(expect.arrayContaining([
      asEntityId("ranger.blind-fighting"), asEntityId("ranger.druidic-warrior"), asEntityId("ranger.thrown-weapon-fighting"),
    ]));
    for (const id of TASHA_ADDITIONAL_RANGER_SPELL_IDS) {
      expect(composed.value.spells.get(asEntityId(id))?.classes).toContain(asEntityId("ranger"));
    }
    expect(ranger.progression[1]?.featureRefs.map((entry) => entry.entityId)).not.toContain(asEntityId("ranger.blind-fighting"));
    const repeated = composeOptionalRuleContent(composed.value, [tashaId], [
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] },
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-additional-spells"), selectedFeatureRefs: [], selectedSpellRefs: additionalSpellRefs },
    ]);
    expect(repeated.ok).toBe(true);
  });

  it("mantém o estilo de Tasha alcançável ao evoluir Ranger 1→2 e abre a escolha condicional de truques", () => {
    const rangerId = asEntityId("ranger");
    const character = {
      ...minimalCharacter,
      classes: [{ classId: rangerId, level: 1, choices: [] }],
      selectedSupplementIds: [tashaId],
      optionalRuleSelections: [{ supplementId: tashaId, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] }],
    };
    const druidCantrips = [...base.spells.values()]
      .filter((spell) => spell.level === 0 && spell.classes.includes(asEntityId("druid")))
      .slice(0, 2);
    expect(druidCantrips).toHaveLength(2);
    const levelTwoChoices = [
      { choiceId: "ranger.fighting-style.2", selectedIds: [ref("ranger.druidic-warrior")], grantedAtLevel: 2, grantingRef: ref("ranger.fighting-style") },
      { choiceId: "ranger.spells.2", selectedIds: [ref("cure-wounds")], grantedAtLevel: 2, grantingRef: ref("ranger") },
      { choiceId: "ranger.cantrips.2", selectedIds: druidCantrips.map((spell) => ref(String(spell.id))), grantedAtLevel: 2, grantingRef: ref("ranger.druidic-warrior") },
    ];
    const preview = buildLevelUpPreview(character, {
      classId: rangerId,
      targetClassLevel: 2,
      mode: "milestone",
      hitPointGain: { kind: "fixed-average", amount: 6 },
      choices: levelTwoChoices,
    }, base);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.choices.map((choice) => choice.id)).toContain("ranger.cantrips.2");
    expect(preview.value.pending.filter((entry) => entry.blocking !== false)).toEqual([]);
    const wizardOnly = [...base.spells.values()].find((spell) => spell.level === 0 && spell.classes.includes(asEntityId("wizard")) && !spell.classes.includes(asEntityId("druid")));
    expect(wizardOnly).toBeDefined();
    const invalidCantrip = buildLevelUpPreview(character, {
      classId: rangerId, targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 6 },
      choices: [...levelTwoChoices.slice(0, 2), { ...levelTwoChoices[2], selectedIds: [ref(String(druidCantrips[0].id)), ref(String(wizardOnly!.id))] }],
    }, base);
    expect(invalidCantrip.ok).toBe(true);
    if (invalidCantrip.ok) expect(invalidCantrip.value.pending.some((entry) => entry.code === "invalid-choice" && entry.field === "choices.ranger.cantrips.2")).toBe(true);

    const appliedTwo = applyLevelUp(character, {
      classId: rangerId, targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 6 }, choices: levelTwoChoices,
    }, base);
    expect(appliedTwo.ok).toBe(true);
    if (!appliedTwo.ok) return;
    const reloaded = JSON.parse(JSON.stringify(appliedTwo.value)) as typeof appliedTwo.value;
    const knownCantrips = reloaded.choices.find((selection) => selection.choiceId === "ranger.cantrips.2")!.selectedIds;
    const druidFeature = (base.optionalRulePacks?.get(tashaId)?.features ?? []).find((feature) => feature.id === "ranger.druidic-warrior")!;
    const allowedIds = druidFeature.choices[0].optionSet.kind === "explicit" ? druidFeature.choices[0].optionSet.options.map((entry) => entry.entityId) : [];
    const newCantrip = [...base.spells.values()].find((spell) => spell.level === 0 && spell.classes.includes(asEntityId("druid")) && allowedIds.includes(spell.id) && !knownCantrips.some((known) => known.entityId === spell.id));
    expect(newCantrip).toBeDefined();
    const swap = {
      classId: rangerId, targetClassLevel: 3, mode: "milestone" as const, hitPointGain: { kind: "fixed-average" as const, amount: 6 },
      choices: [{ choiceId: "ranger.druidic-warrior-cantrip-swap.3", selectedIds: [knownCantrips[0], ref(String(newCantrip!.id))], grantedAtLevel: 3, grantingRef: ref("ranger.druidic-warrior") }],
    };
    const previewThree = buildLevelUpPreview(reloaded, swap, base);
    expect(previewThree.ok).toBe(true);
    if (previewThree.ok) expect(previewThree.value.pending.filter((entry) => entry.blocking !== false)).toEqual([]);
    const appliedThree = applyLevelUp(reloaded, swap, base);
    expect(appliedThree.ok).toBe(true);
    if (appliedThree.ok) {
      expect(appliedThree.value.choices.find((selection) => selection.choiceId === "ranger.cantrips.2")?.selectedIds).toEqual([knownCantrips[0], ref(String(newCantrip!.id))]);
      expect(appliedThree.value.choices.some((selection) => selection.choiceId === "ranger.druidic-warrior-cantrip-swap.3")).toBe(false);
    }
  });

  it("expande a lista do Guardião sem conceder todas as magias conhecidas", () => {
    const rangerId = asEntityId("ranger");
    const character = {
      ...minimalCharacter,
      classes: [{ classId: rangerId, level: 1, choices: [] }],
      selectedSupplementIds: [tashaId],
      optionalRuleSelections: [
        { supplementId: tashaId, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] },
        { supplementId: tashaId, optionId: asEntityId("ranger.optional-additional-spells"), selectedFeatureRefs: [], selectedSpellRefs: additionalSpellRefs },
      ],
    };
    const preview = buildLevelUpPreview(character, {
      classId: rangerId, targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 6 },
      choices: [
        { choiceId: "ranger.fighting-style.2", selectedIds: [ref("ranger.blind-fighting")], grantedAtLevel: 2, grantingRef: ref("ranger.fighting-style") },
        { choiceId: "ranger.spells.2", selectedIds: [ref("destruicao-lancinante")], grantedAtLevel: 2, grantingRef: ref("ranger") },
      ],
    }, base);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.pending.filter((entry) => entry.blocking !== false)).toEqual([]);
    const applied = applyLevelUp(character, {
      classId: rangerId, targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 6 },
      choices: [
        { choiceId: "ranger.fighting-style.2", selectedIds: [ref("ranger.blind-fighting")], grantedAtLevel: 2, grantingRef: ref("ranger.fighting-style") },
        { choiceId: "ranger.spells.2", selectedIds: [ref("destruicao-lancinante")], grantedAtLevel: 2, grantingRef: ref("ranger") },
      ],
    }, base);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.value.choices.find((selection) => selection.choiceId === "ranger.spells.2")?.selectedIds).toEqual([ref("destruicao-lancinante")]);
      expect(applied.value.choices.some((selection) => selection.selectedIds.some((spellRef) => spellRef.entityId === asEntityId("invocar-fera")))).toBe(false);
    }
  });

  it("rejeita substituição parcial e magias adicionais parciais", () => {
    const partialBundle = composeOptionalRuleContent(base, [tashaId], [
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-canny"), selectedFeatureRefs: [ref("ranger.canny")] },
    ]);
    expect(partialBundle.ok).toBe(false);
    const partialSpells = composeOptionalRuleContent(base, [tashaId], [
      { supplementId: tashaId, optionId: asEntityId("ranger.optional-additional-spells"), selectedFeatureRefs: [], selectedSpellRefs: [ref("invocar-fera")] },
    ]);
    expect(partialSpells.ok).toBe(false);
  });
});
