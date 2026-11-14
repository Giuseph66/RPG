import { describe, expect, it } from "vitest";
import { asCommandId, asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";
import { deriveCharacter } from "@domain/rules/derived";
import { buildLevelUpPreview } from "@domain/character/progression";
import { evolveCharacter } from "./apply";
import { bonusCantripCount } from "./spell-rules";
import { CIRCLE_TERRAIN_SPELLS } from "./terrain-spells";
import { TASHA_RANGER_SUPPLEMENT_ID } from "@data/rulepacks/optional-supplements";
import { resolveCharacterCommand } from "@application/character/command-dispatcher";
import { composeCharacterRuleContent } from "@domain/character/creation/optional-rules";
import { syncSpellcasting } from "./spell-state";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const pack = loaded.value;
const catalog = { rulePack: pack, equipmentBundles };

let serial = 0;
const idGenerator = (): Uuid => asUuid(`00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, "0")}`);
const pick = (choiceId: string, ids: readonly string[], level = 1, owner = "x"): ChoiceSelection => ({ choiceId, selectedIds: ids.map(ref), grantedAtLevel: level, grantingRef: ref(owner) });
const average = (amount: number) => ({ kind: "fixed-average" as const, amount });

function spellsOf(listClass: string, level: number, school?: string): string[] {
  return [...pack.spells.values()].filter((spell) => spell.level === level && spell.classes.some((entry) => String(entry) === listClass) && (!school || spell.school === school)).map((spell) => String(spell.id));
}

function create(classId: string, choices: ChoiceSelection[] = [], scores = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 }): Character {
  const draft = createCharacterDraft({
    id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: now,
    partial: { name: "Teste", raceRef: ref("human"), classes: [{ classId: asEntityId(classId), level: 1, choices: [] }], abilityGeneration: { method: "manual", baseScores: scores }, choices },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter(catalog, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

function evolve(character: Character, classId: string, level: number, extra: { subclassId?: string; choices?: ChoiceSelection[]; hp?: number } = {}) {
  return evolveCharacter(character, {
    classId: asEntityId(classId), targetClassLevel: level, mode: "milestone",
    ...(extra.subclassId ? { subclassId: asEntityId(extra.subclassId) } : {}),
    hitPointGain: average(extra.hp ?? 5), choices: extra.choices ?? [],
  }, catalog, { idGenerator, now });
}

function mustEvolve(...args: Parameters<typeof evolve>): Character {
  const result = evolve(...args);
  if (!result.ok) throw new Error(result.error.map((entry) => `${entry.field}: ${entry.message}`).join(" | "));
  return result.value;
}


function createWith(classId: string, subclassId: string, choices: ChoiceSelection[] = [], scores = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 }): Character {
  const draft = createCharacterDraft({
    id: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), rulesetRef, createdAt: now,
    partial: { name: "Teste", raceRef: ref("human"), classes: [{ classId: asEntityId(classId), level: 1, subclassId: asEntityId(subclassId), choices: [] }], abilityGeneration: { method: "manual", baseScores: scores }, choices },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter(catalog, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

function createTashaRanger(): Character {
  const draft = createCharacterDraft({
    id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), rulesetRef, createdAt: now,
    partial: {
      name: "Guardião Feérico", raceRef: ref("human"), selectedSupplementIds: [TASHA_RANGER_SUPPLEMENT_ID],
      classes: [{ classId: asEntityId("ranger"), level: 1, choices: [] }],
      abilityGeneration: { method: "manual", baseScores: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 10 } },
      choices: [],
    },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter(catalog, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}
const ids = (refs: readonly { entityId: unknown }[]) => refs.map((entry) => String(entry.entityId));

describe("magias concedidas por subclasse, raça de escolha e características", () => {
  it("Clérigo do Domínio do Conhecimento já nasce com as magias de domínio preparadas", () => {
    const cleric = createWith("cleric", "knowledge-domain");
    expect(ids(cleric.castingSources[0].preparedSpellRefs)).toEqual(expect.arrayContaining(["comando", "identificacao"]));
    expect(cleric.preparedSelections.filter((entry) => entry.alwaysPrepared).map((entry) => String(entry.spellRef.entityId))).toEqual(expect.arrayContaining(["comando", "identificacao"]));
  });

  it("magias de domínio de nível maior só chegam no nível certo", () => {
    let cleric = createWith("cleric", "life-domain");
    expect(ids(cleric.castingSources[0].preparedSpellRefs)).not.toContain("restauracao-menor");
    cleric = mustEvolve(mustEvolve(cleric, "cleric", 2), "cleric", 3);
    expect(ids(cleric.castingSources[0].preparedSpellRefs)).toEqual(expect.arrayContaining(["bencao", "cure-wounds", "restauracao-menor"]));
  });

  it("Domínio da Luz concede o truque Luz de graça", () => {
    expect(ids(createWith("cleric", "light-domain").castingSources[0].knownSpellRefs)).toContain("luz");
    expect(bonusCantripCount([{ classId: "cleric", level: 1, subclassId: "light-domain" }])).toBe(1);
  });

  it("Paladino ganha as magias de juramento no 3º nível, sempre preparadas", () => {
    let paladin = create("paladin", [], { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 14 });
    paladin = mustEvolve(paladin, "paladin", 2);
    expect(ids(paladin.castingSources[0].preparedSpellRefs)).not.toContain("perdicao");
    paladin = mustEvolve(paladin, "paladin", 3, { subclassId: "oath-of-vengeance" });
    expect(ids(paladin.castingSources[0].preparedSpellRefs)).toEqual(expect.arrayContaining(["perdicao", "marca-do-cacador"]));
    expect(paladin.preparedSelections.find((entry) => String(entry.spellRef.entityId) === "perdicao")?.alwaysPrepared).toBe(true);
  });

  it("Círculo da Terra: o terreno escolhido define as magias de círculo do nível 3", () => {
    let druid = create("druid");
    druid = mustEvolve(druid, "druid", 2, { subclassId: "circle-of-the-land", choices: [pick("circle-of-the-land.terrain.2", ["druid-terrain.forest"], 2)] });
    expect(ids(druid.castingSources[0].preparedSpellRefs)).not.toContain("pele-de-arvore");
    druid = mustEvolve(druid, "druid", 3);
    expect(ids(druid.castingSources[0].preparedSpellRefs)).toEqual(expect.arrayContaining(["patas-de-aranha", "pele-de-arvore"]));
    expect(druid.preparedSelections.find((entry) => String(entry.spellRef.entityId) === "pele-de-arvore")?.alwaysPrepared).toBe(true);
  });

  it("Escola de Ilusão dá Ilusão Menor; o truque extra só vale se já a conhecia", () => {
    const wizard = create("wizard");
    const learned = mustEvolve(wizard, "wizard", 2, { subclassId: "school-of-illusion" });
    expect(ids(learned.castingSources[0].knownSpellRefs)).toContain("ilusao-menor");
    const extra = spellsOf("wizard", 0).find((id) => id !== "ilusao-menor") as string;
    expect(evolve(wizard, "wizard", 2, { subclassId: "school-of-illusion", choices: [pick("school-of-illusion.cantrip.2", [extra], 2)] }).ok).toBe(false);
    const knowsIt = create("wizard", [pick("wizard.cantrips.1", ["ilusao-menor"])]);
    expect(evolve(knowsIt, "wizard", 2, { subclassId: "school-of-illusion", choices: [pick("school-of-illusion.cantrip.2", [extra], 2)] }).ok).toBe(true);
  });

  it("Pacto da Corrente concede Convocar Familiar sem contar nas magias conhecidas", () => {
    let warlock = create("warlock", [], { str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 16 });
    warlock = mustEvolve(warlock, "warlock", 2, { subclassId: "the-fiend" });
    warlock = mustEvolve(warlock, "warlock", 3, { choices: [pick("warlock.pact-boon.3", ["pact-boon.chain"], 3)] });
    expect(ids(warlock.castingSources[0].knownSpellRefs)).toContain("convocar-familiar");
    const expanded = pack.subclasses.get(asEntityId("the-fiend"))?.spellGrants[0];
    expect(expanded?.alwaysPrepared).toBe(false);
    expect(expanded?.knownWithoutCount).toBeUndefined();
    expect(ids(warlock.castingSources.find((entry) => String(entry.grantingRef.entityId) === "warlock")?.knownSpellRefs ?? [])).not.toContain(String(expanded?.spellRef.entityId));
  });

  it("Rastreador Subterrâneo tem Disfarçar-se preparada a partir do 3º nível", () => {
    let ranger = create("ranger", [], { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 10 });
    ranger = mustEvolve(ranger, "ranger", 2);
    ranger = mustEvolve(ranger, "ranger", 3, { subclassId: "deep-stalker-conclave" });
    expect(ids(ranger.castingSources[0].preparedSpellRefs)).toContain("disfarcar-se");
  });

  it("Andarilho Feérico aprende magias extras nos níveis 3 e 5, sem consumir escolhas, após JSON reload", () => {
    let ranger = createTashaRanger();
    const level2Picks = spellsOf("ranger", 1).slice(0, 2);
    ranger = mustEvolve(ranger, "ranger", 2, { choices: [pick("ranger.spells.2", level2Picks, 2, "ranger")] });
    const invalidChoice = evolve(ranger, "ranger", 3, { subclassId: "fey-wanderer", choices: [
      pick("ranger.spells.3", ["enfeiticar-pessoa"], 3, "ranger"),
      pick("fey-wanderer.otherworldly-glamour.skill", ["performance"], 3, "fey-wanderer.otherworldly-glamour"),
    ] });
    expect(invalidChoice.ok).toBe(false);
    const level3Pick = spellsOf("ranger", 1).find((id) => !level2Picks.includes(id))!;
    ranger = mustEvolve(ranger, "ranger", 3, { subclassId: "fey-wanderer", choices: [
      pick("ranger.spells.3", [level3Pick], 3, "ranger"),
      pick("fey-wanderer.otherworldly-glamour.skill", ["performance"], 3, "fey-wanderer.otherworldly-glamour"),
    ] });
    const rangerSource = ranger.castingSources.find((entry) => String(entry.grantingRef.entityId) === "ranger")!;
    expect(ids(rangerSource.knownSpellRefs)).toContain("enfeiticar-pessoa");
    expect(ids(rangerSource.preparedSpellRefs)).not.toContain("enfeiticar-pessoa");
    expect(ranger.choices.filter((entry) => entry.choiceId.startsWith("ranger.spells.")).flatMap((entry) => ids(entry.selectedIds))).not.toContain("enfeiticar-pessoa");
    expect(ranger.progressionHistory.flatMap((entry) => entry.choices).flatMap((entry) => ids(entry.selectedIds))).not.toContain("enfeiticar-pessoa");

    ranger = JSON.parse(JSON.stringify(ranger)) as Character;
    ranger = mustEvolve(ranger, "ranger", 4);
    ranger = mustEvolve(ranger, "ranger", 5, { choices: [pick("ranger.spells.5", [spellsOf("ranger", 1)[3]], 5, "ranger")] });
    const finalSource = ranger.castingSources.find((entry) => String(entry.grantingRef.entityId) === "ranger")!;
    expect(ids(finalSource.knownSpellRefs)).toContain("enfeiticar-pessoa");
    expect(ids(finalSource.knownSpellRefs)).toContain("passo-nebuloso");
    expect(new Set(ids(finalSource.knownSpellRefs)).size).toBe(finalSource.knownSpellRefs.length);
    expect(ranger.choices.filter((entry) => entry.choiceId.startsWith("ranger.spells.")).flatMap((entry) => ids(entry.selectedIds))).toHaveLength(4);
    expect(finalSource.knownSpellRefs.map((entry) => pack.spells.get(entry.entityId)?.level).filter((level) => level !== undefined)).toHaveLength(6);
  });

  it("Andarilho Feérico nível 11 mantém um único uso de Reforço e preserva gasto ao reconciliar JSON", () => {
    let ranger = createTashaRanger();
    const learned = new Set<string>();
    const newSpellChoice = (level: number, count = 1) => {
      const selected = spellsOf("ranger", 1).filter((spellId) => !learned.has(spellId)).slice(0, count);
      expect(selected).toHaveLength(count);
      selected.forEach((spellId) => learned.add(spellId));
      return pick(`ranger.spells.${level}`, selected, level, "ranger");
    };

    const level2 = spellsOf("ranger", 1).slice(0, 2);
    level2.forEach((spellId) => learned.add(spellId));
    ranger = mustEvolve(ranger, "ranger", 2, { choices: [pick("ranger.spells.2", level2, 2, "ranger")] });
    ranger = mustEvolve(ranger, "ranger", 3, { subclassId: "fey-wanderer", choices: [
      newSpellChoice(3),
      pick("fey-wanderer.otherworldly-glamour.skill", ["performance"], 3, "fey-wanderer.otherworldly-glamour"),
    ] });
    ranger = mustEvolve(ranger, "ranger", 4);
    ranger = mustEvolve(ranger, "ranger", 5, { choices: [newSpellChoice(5)] });
    ranger = mustEvolve(ranger, "ranger", 6);
    ranger = mustEvolve(ranger, "ranger", 7, { choices: [newSpellChoice(7)] });
    ranger = mustEvolve(ranger, "ranger", 8);
    ranger = mustEvolve(ranger, "ranger", 9, { choices: [newSpellChoice(9)] });
    ranger = mustEvolve(ranger, "ranger", 10);
    expect(ranger.classes.find((entry) => String(entry.classId) === "ranger")?.level).toBe(10);

    ranger = mustEvolve(ranger, "ranger", 11, { choices: [newSpellChoice(11)] });
    const featureRef = ref("fey-wanderer.fey-reinforcements-use");
    const featureSource = ranger.castingSources.find((source) => String(source.grantingRef.entityId) === "fey-wanderer-fey-reinforcements");
    const firstPools = ranger.resources.filter((entry) => entry.definitionRef.entityId === featureRef.entityId);
    expect(firstPools).toHaveLength(1);
    expect(firstPools[0]?.spent).toBe(0);
    expect(featureSource?.featureSpellResources?.find((entry) => String(entry.spellRef.entityId) === "invocar-feerico")?.resourceId).toBe(firstPools[0]?.id);
    const composed = composeCharacterRuleContent(pack, ranger);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.resources.get(featureRef.entityId)?.capacityRule).toEqual({ kind: "fixed", amount: 1 });

    // Represent an older JSON where the generic progression pool and feature-source pool both
    // existed. Reconciliation must retain the higher spent value and collapse only this duplicate.
    const legacyDuplicate: Character = {
      ...ranger,
      resources: [
        ...ranger.resources.map((entry) => entry.id === firstPools[0]?.id ? { ...entry, spent: 1 } : entry),
        { id: asUuid("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"), definitionRef: featureRef, ownerInstanceId: ranger.id, spent: 0 },
      ],
    };
    const reloaded = JSON.parse(JSON.stringify(legacyDuplicate)) as Character;
    const reconciled = syncSpellcasting(reloaded, pack, []);
    const finalPools = reconciled.resources.filter((entry) => entry.definitionRef.entityId === featureRef.entityId);
    expect(finalPools).toHaveLength(1);
    expect(finalPools[0]?.spent).toBe(1);
    expect(finalPools[0]?.ownerInstanceId).toBe(featureSource?.id);
    const finalSource = reconciled.castingSources.find((source) => String(source.grantingRef.entityId) === "fey-wanderer-fey-reinforcements");
    expect(finalSource?.featureSpellResources?.find((entry) => String(entry.spellRef.entityId) === "invocar-feerico")?.resourceId).toBe(finalPools[0]?.id);
    const repeatedlyReconciled = syncSpellcasting(reconciled, pack, []);
    expect(repeatedlyReconciled.resources.filter((entry) => entry.definitionRef.entityId === featureRef.entityId)).toHaveLength(1);
    expect(repeatedlyReconciled.resources.find((entry) => entry.definitionRef.entityId === featureRef.entityId)?.spent).toBe(1);
  });

  it("aceita conjuração da magia concedida pela subclasse, mas não de outra subclasse ou nível", () => {
    let ranger = createTashaRanger();
    const level2Picks = spellsOf("ranger", 1).slice(0, 2);
    ranger = mustEvolve(ranger, "ranger", 2, { choices: [pick("ranger.spells.2", level2Picks, 2, "ranger")] });
    ranger = mustEvolve(ranger, "ranger", 3, { subclassId: "fey-wanderer", choices: [
      pick("ranger.spells.3", [spellsOf("ranger", 1)[2]], 3, "ranger"),
      pick("fey-wanderer.otherworldly-glamour.skill", ["performance"], 3, "fey-wanderer.otherworldly-glamour"),
    ] });
    ranger = mustEvolve(ranger, "ranger", 4);
    ranger = mustEvolve(ranger, "ranger", 5, { choices: [pick("ranger.spells.5", [spellsOf("ranger", 1)[3]], 5, "ranger")] });
    const source = ranger.castingSources.find((entry) => String(entry.grantingRef.entityId) === "ranger")!;
    const composed = composeCharacterRuleContent(pack, ranger);
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const content = composed.value;
    const spell = content.spells.get(asEntityId("passo-nebuloso"))!;
    const pool = ranger.spellSlots.find((entry) => entry.slotLevel >= spell.level && source.resourcePoolIds.includes(entry.poolId) && entry.spent === 0)!;
    expect(spell.classes.map(String)).not.toContain("ranger");
    const commandId = asCommandId("tasha-granted-spell-cast");
    const command = {
      commandId, characterId: ranger.id, expectedRevision: ranger.revision, kind: "cast-spell" as const,
      payload: {
        spellRef: ref("passo-nebuloso"), castingSourceId: source.id, mode: "normal" as const,
        resourcePoolId: pool.poolId, slotLevel: pool.slotLevel,
        targetContext: { targetIds: [ranger.id] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [],
      },
    };
    const context = {
      spellDefinitions: new Map([[spell.id, spell]]), classDefinitions: content.classes, subclassDefinitions: content.subclasses,
      availableActions: ["bonus-action"] as const, canSpeak: true, freeHands: true,
    };
    const successResult = resolveCharacterCommand(ranger, command, context);
    expect(successResult.status, JSON.stringify(successResult)).toBe("success");
    if (successResult.status === "success") expect(successResult.nextState.spellSlots.find((entry) => entry.poolId === pool.poolId)?.spent).toBe(1);

    const wrongSubclass: Character = { ...ranger, classes: ranger.classes.map((entry) => entry.classId === asEntityId("ranger") ? { ...entry, subclassId: asEntityId("swarmkeeper") } : entry) };
    const rejectedResult = resolveCharacterCommand(wrongSubclass, { ...command, expectedRevision: wrongSubclass.revision }, context);
    expect(rejectedResult.status).toBe("rejected");
    const belowGrantLevel: Character = { ...ranger, classes: ranger.classes.map((entry) => entry.classId === asEntityId("ranger") ? { ...entry, level: 3 } : entry) };
    const levelResult = resolveCharacterCommand(belowGrantLevel, { ...command, expectedRevision: belowGrantLevel.revision }, context);
    expect(levelResult.status).toBe("rejected");
  });

  function createRace(classId: string, raceId: string, subraceId: string | undefined, choices: ChoiceSelection[] = []): Character {
    const draft = createCharacterDraft({
      id: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), rulesetRef, createdAt: now,
      partial: { name: "Teste", raceRef: ref(raceId), ...(subraceId ? { subraceRef: ref(subraceId) } : {}), classes: [{ classId: asEntityId(classId), level: 1, choices: [] }], abilityGeneration: { method: "manual", baseScores: { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 } }, choices },
    });
    if (!draft.ok) throw new Error(draft.error.message);
    const result = materializeCharacter(catalog, draft.value, { idGenerator });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.value.character;
  }
  const racial = (character: Character, key: string) => ids(character.castingSources.find((entry) => String(entry.grantingRef.entityId) === key)?.knownSpellRefs ?? []);

  it("Tiefling guerreiro recebe Taumaturgia no 1º nível, Repreensão no 3º e Escuridão no 5º (nível total)", () => {
    let fighter = createRace("fighter", "tiefling", undefined);
    expect(racial(fighter, "tiefling")).toEqual(["taumaturgia"]);
    fighter = mustEvolve(fighter, "fighter", 2);
    fighter = mustEvolve(fighter, "fighter", 3, { subclassId: "champion" });
    expect(racial(fighter, "tiefling")).toEqual(["taumaturgia", "repreensao-infernal"]);
    fighter = mustEvolve(fighter, "fighter", 4);
    fighter = mustEvolve(fighter, "fighter", 5);
    expect(racial(fighter, "tiefling")).toEqual(["taumaturgia", "repreensao-infernal", "escuridao"]);
    const derived = deriveCharacter(fighter, pack, { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] });
    expect(derived.ok).toBe(true);
    const sourceId = fighter.castingSources.find((entry) => String(entry.grantingRef.entityId) === "tiefling")?.id;
    if (derived.ok) expect(derived.value.spellcastingSources.some((entry) => entry.castingSourceId === sourceId)).toBe(true);
  });

  it("Elfo Negro e Gnomo da Floresta recebem suas magias raciais", () => {
    expect(racial(createRace("fighter", "elf", "dark-elf"), "dark-elf")).toEqual(["globos-de-luz"]);
    expect(racial(createRace("fighter", "gnome", "forest-gnome"), "forest-gnome")).toEqual(["ilusao-menor"]);
  });

  it("Alto Elfo mantém o truque de mago escolhido, mesmo sendo guerreiro", () => {
    const fighter = createRace("fighter", "elf", "high-elf", [pick("high-elf.cantrip", ["raio-de-gelo"], 1, "high-elf")]);
    expect(racial(fighter, "high-elf")).toEqual(["raio-de-gelo"]);
    const evolved = mustEvolve(fighter, "fighter", 2);
    expect(racial(evolved, "high-elf")).toEqual(["raio-de-gelo"]);
  });

  it("magias raciais não entram nos limites da classe nem duplicam a fonte", () => {
    let wizard = createRace("wizard", "elf", "high-elf", [pick("high-elf.cantrip", ["raio-de-gelo"], 1, "high-elf")]);
    wizard = mustEvolve(wizard, "wizard", 2);
    expect(wizard.castingSources.filter((entry) => String(entry.grantingRef.entityId) === "high-elf")).toHaveLength(1);
    expect(ids(wizard.castingSources.find((entry) => String(entry.grantingRef.entityId) === "wizard")?.knownSpellRefs ?? [])).not.toContain("raio-de-gelo");
  });

  it("talento de meio-aumento (Atleta) oferece o +1 de atributo e ele conta na ficha", () => {
    let fighter = create("fighter", [], { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 });
    for (const level of [2, 3]) fighter = mustEvolve(fighter, "fighter", level, level === 3 ? { subclassId: "champion" } : {});
    const request = { classId: asEntityId("fighter"), targetClassLevel: 4, mode: "milestone" as const, hitPointGain: average(5), choices: [pick("fighter.feat.4", ["athlete"], 4, "fighter")] };
    const preview = buildLevelUpPreview(fighter, request, catalog);
    expect(preview.ok && preview.value.choices.some((entry) => entry.id === "athlete.ability")).toBe(true);
    fighter = mustEvolve(fighter, "fighter", 4, { choices: [pick("fighter.feat.4", ["athlete"], 4, "fighter"), pick("athlete.ability", ["str"], 4, "athlete")] });
    const derived = deriveCharacter(fighter, pack, { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] });
    expect(derived.ok && derived.value.abilityScores.find((entry) => entry.ability === "str")?.score.value).toBe(16);
  });

  it("toda magia concedida por subclasse ou terreno existe no catálogo", () => {
    const missing: string[] = [];
    for (const subclass of pack.subclasses.values()) for (const grant of subclass.spellGrants) if (!pack.spells.has(grant.spellRef.entityId)) missing.push(`${subclass.id}:${grant.spellRef.entityId}`);
    for (const [terrain, rows] of Object.entries(CIRCLE_TERRAIN_SPELLS)) for (const [, spellIds] of rows) for (const id of spellIds) if (!pack.spells.has(asEntityId(id))) missing.push(`${terrain}:${id}`);
    expect(missing).toEqual([]);
    // 7 domínios (10 magias) e 3 juramentos (10) concedem sempre preparadas; patronos só ampliam a lista.
    for (const id of ["knowledge-domain", "life-domain", "light-domain", "nature-domain", "tempest-domain", "trickery-domain", "war-domain", "oath-of-devotion", "oath-of-the-ancients", "oath-of-vengeance"]) {
      const grants = pack.subclasses.get(asEntityId(id))?.spellGrants ?? [];
      expect(grants, id).toHaveLength(10);
      expect(grants.every((grant) => grant.alwaysPrepared), id).toBe(true);
    }
    expect(Object.keys(CIRCLE_TERRAIN_SPELLS)).toHaveLength(8);
  });
});
