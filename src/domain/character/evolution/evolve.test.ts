import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";
import { deriveCharacter } from "@domain/rules/derived";
import { buildLevelUpPreview } from "@domain/character/progression";
import { evolveCharacter } from "./apply";

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

describe("evolução por classe", () => {
  it("Druida 1→2 escolhe círculo e terreno, ganha truque, espaço e Forma Selvagem", () => {
    const druid = create("druid");
    const cantrip = spellsOf("druid", 0)[0];
    const next = mustEvolve(druid, "druid", 2, {
      subclassId: "circle-of-the-land",
      choices: [pick("circle-of-the-land.terrain.2", ["druid-terrain.forest"], 2), pick("circle-of-the-land.cantrip.2", [cantrip], 2)],
    });
    expect(next.classes[0]).toMatchObject({ level: 2, subclassId: "circle-of-the-land" });
    expect(next.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId))).toContain(cantrip);
    expect(next.spellSlots.filter((slot) => slot.slotLevel === 1)).toHaveLength(3);
    expect(next.resources.some((resource) => String(resource.definitionRef.entityId) === "druid.wild-shape")).toBe(true);
    expect(next.hitDiceSpent.find((dice) => String(dice.classId) === "druid")).toBeDefined();
  });

  it("Mago 1→2 acrescenta 2 magias ao grimório e um espaço de 1º círculo", () => {
    const wizard = create("wizard");
    const [first, second] = spellsOf("wizard", 1, "evocation");
    const next = mustEvolve(wizard, "wizard", 2, { subclassId: "school-of-evocation", choices: [pick("wizard.spells.2", [first, second], 2)] });
    expect(next.castingSources[0].spellbookRefs.map((entry) => String(entry.entityId))).toEqual(expect.arrayContaining([first, second]));
    expect(next.spellbookEntries.filter((entry) => [first, second].includes(String(entry.spellRef.entityId)))).toHaveLength(2);
    expect(next.spellSlots.filter((slot) => slot.slotLevel === 1)).toHaveLength(3);
  });

  it("rejeita magia fora da lista da classe ou de círculo que o mago ainda não conjura", () => {
    const wizard = create("wizard");
    const cleric = spellsOf("cleric", 1).find((id) => !spellsOf("wizard", 1).includes(id)) as string;
    const wrongList = evolve(wizard, "wizard", 2, { subclassId: "school-of-evocation", choices: [pick("wizard.spells.2", [cleric], 2)] });
    expect(wrongList.ok).toBe(false);
    const tooHigh = spellsOf("wizard", 3)[0];
    const circle = evolve(wizard, "wizard", 2, { subclassId: "school-of-evocation", choices: [pick("wizard.spells.2", [tooHigh], 2)] });
    expect(circle.ok).toBe(false);
  });

  it("Guerreiro: Aumento de Habilidade soma +2 em um atributo e +1 em dois", () => {
    let fighter = create("fighter", [], { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 });
    fighter = mustEvolve(fighter, "fighter", 2);
    fighter = mustEvolve(fighter, "fighter", 3, { subclassId: "champion" });
    const withAsi = mustEvolve(fighter, "fighter", 4, { choices: [pick("fighter.asi.4", ["str"], 4)] });
    const split = mustEvolve(fighter, "fighter", 4, { choices: [pick("fighter.asi.4", ["str", "dex"], 4)] });
    const score = (character: Character, ability: string) => {
      const derived = deriveCharacter(character, pack, { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] });
      if (!derived.ok) throw new Error(derived.error.message);
      return derived.value.abilityScores.find((entry) => entry.ability === ability)?.score.value;
    };
    const baseStr = score(fighter, "str") as number;
    const baseDex = score(fighter, "dex") as number;
    expect(score(withAsi, "str")).toBe(baseStr + 2);
    expect(score(split, "str")).toBe(baseStr + 1);
    expect(score(split, "dex")).toBe(baseDex + 1);
  });

  it("não aceita Aumento de Habilidade e talento no mesmo nível", () => {
    let fighter = create("fighter");
    fighter = mustEvolve(fighter, "fighter", 2);
    fighter = mustEvolve(fighter, "fighter", 3, { subclassId: "champion" });
    const feat = [...pack.feats.keys()][0];
    const both = evolve(fighter, "fighter", 4, { choices: [pick("fighter.asi.4", ["str"], 4), pick("fighter.feat.4", [String(feat)], 4)] });
    expect(both.ok).toBe(false);
    if (!both.ok) expect(both.error.some((entry) => /aumento de atributo ou um talento/.test(entry.message))).toBe(true);
  });

  it("Bruxo: invocação exige o truque e o nível; troca de pacto preserva espaços gastos", () => {
    const eldritchBlast = "rajada-mistica";
    let warlock = create("warlock", [pick("warlock.cantrips.1", [eldritchBlast, spellsOf("warlock", 0)[1]]), pick("warlock.spells.1", spellsOf("warlock", 1).slice(0, 2))], { str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 16 });
    expect(warlock.spellSlots).toEqual([expect.objectContaining({ kind: "pact", slotLevel: 1, spent: 0 })]);
    const level2 = evolve(warlock, "warlock", 2, { choices: [pick("warlock.invocations.2", ["invocation.agonizing-blast", "invocation.thirsting-blade"], 2)] });
    expect(level2.ok).toBe(false);
    warlock = mustEvolve(warlock, "warlock", 2, { choices: [pick("warlock.invocations.2", ["invocation.agonizing-blast", "invocation.devils-sight"], 2), pick("warlock.spells.2", [spellsOf("warlock", 1)[2]], 2)] });
    expect(warlock.spellSlots.filter((slot) => slot.kind === "pact")).toHaveLength(2);
    const spent = { ...warlock, spellSlots: warlock.spellSlots.map((slot, index) => (index === 0 ? { ...slot, spent: 1 } : slot)) };
    const level3 = mustEvolve(spent, "warlock", 3, { choices: [pick("warlock.pact-boon.3", ["pact-boon.tome"], 3)] });
    const pact = level3.spellSlots.filter((slot) => slot.kind === "pact");
    expect(pact.map((slot) => slot.slotLevel)).toEqual([2, 2]);
    expect(pact.filter((slot) => slot.spent > 0)).toHaveLength(1);
  });

  it("Paladino ganha fonte de conjuração e espaços no 2º nível", () => {
    let paladin = create("paladin", [], { str: 16, dex: 10, con: 14, int: 8, wis: 10, cha: 14 });
    expect(paladin.castingSources).toHaveLength(0);
    paladin = mustEvolve(paladin, "paladin", 2, { choices: [pick("paladin.fighting-style.2", ["fighting-style.defense"], 2)] });
    expect(paladin.castingSources).toHaveLength(1);
    expect(paladin.castingSources[0].ability).toBe("cha");
    expect(paladin.spellSlots.map((slot) => slot.slotLevel)).toEqual([1, 1]);
  });

  it("Patrulheiro aprende 2 magias conhecidas no 2º nível", () => {
    let ranger = create("ranger", [], { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 10 });
    const [first, second] = spellsOf("ranger", 1);
    ranger = mustEvolve(ranger, "ranger", 2, { choices: [pick("ranger.fighting-style.2", ["fighting-style.archery"], 2), pick("ranger.spells.2", [first, second], 2)] });
    expect(ranger.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId))).toEqual([first, second]);
  });

  it("Cavaleiro Místico conjura pela subclasse com magias de abjuração e evocação", () => {
    let knight = create("fighter");
    knight = mustEvolve(knight, "fighter", 2);
    const cantrips = spellsOf("wizard", 0).slice(0, 2);
    const school = spellsOf("wizard", 1, "evocation");
    const outside = spellsOf("wizard", 1, "necromancy")[0];
    const wrong = evolve(knight, "fighter", 3, { subclassId: "eldritch-knight", choices: [pick("eldritch-knight.cantrips.3", cantrips, 3), pick("eldritch-knight.spells.3", [outside, school[0], school[1]], 3)] });
    expect(wrong.ok).toBe(false);
    knight = mustEvolve(knight, "fighter", 3, { subclassId: "eldritch-knight", choices: [pick("eldritch-knight.cantrips.3", cantrips, 3), pick("eldritch-knight.spells.3", school.slice(0, 3), 3)] });
    expect(knight.castingSources[0].grantingRef.entityId).toBe("eldritch-knight");
    expect(knight.spellSlots.map((slot) => slot.slotLevel)).toEqual([1, 1]);
    const derived = deriveCharacter(knight, pack, { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] });
    expect(derived.ok).toBe(true);
  });

  it("Feiticeiro: metamagia não repete e a troca de magia substitui a conhecida", () => {
    let sorcerer = create("sorcerer", [pick("sorcerer.spells.1", spellsOf("sorcerer", 1).slice(0, 2))], { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 });
    sorcerer = mustEvolve(sorcerer, "sorcerer", 2, { subclassId: "wild-magic", choices: [pick("sorcerer.spells.2", [spellsOf("sorcerer", 1)[2]], 2)] });
    const known = sorcerer.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId));
    const old = known.find((id) => spellsOf("sorcerer", 1).includes(id)) as string;
    const replacement = spellsOf("sorcerer", 1)[5];
    sorcerer = mustEvolve(sorcerer, "sorcerer", 3, {
      choices: [pick("sorcerer.metamagic.3", ["metamagic.quickened-spell", "metamagic.twinned-spell"], 3), pick("sorcerer.spells.3", [spellsOf("sorcerer", 2)[0]], 3), pick("sorcerer.spell-swap.3", [old, replacement], 3)],
    });
    const after = sorcerer.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId));
    expect(after).toContain(replacement);
    expect(after).not.toContain(old);
    const repeated = evolve(sorcerer, "sorcerer", 4, { choices: [pick("sorcerer.metamagic.4", ["metamagic.quickened-spell"], 4)] });
    expect(repeated.ok).toBe(false);
  });

  it("multiclasse combina espaços de classes conjuradoras diferentes", () => {
    let character = create("wizard", [], { str: 10, dex: 10, con: 14, int: 16, wis: 14, cha: 13 });
    character = mustEvolve(character, "wizard", 2, { subclassId: "school-of-evocation" });
    const cleric = mustEvolve(character, "cleric", 1);
    // Mago 2 + Clérigo 1 = nível combinado 3: 4 de 1º e 2 de 2º.
    expect(cleric.spellSlots.filter((slot) => slot.slotLevel === 1)).toHaveLength(4);
    expect(cleric.spellSlots.filter((slot) => slot.slotLevel === 2)).toHaveLength(2);
    expect(cleric.castingSources.map((entry) => String(entry.grantingRef.entityId)).sort()).toEqual(["cleric", "wizard"]);
  });

  it("a prévia lista as escolhas de cada classe no nível", () => {
    const fighter = create("fighter");
    const preview = buildLevelUpPreview(fighter, { classId: asEntityId("fighter"), targetClassLevel: 2, mode: "milestone", hitPointGain: average(6), choices: [] }, catalog);
    expect(preview.ok).toBe(true);
    const monk = create("monk", [], { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 });
    const four = buildLevelUpPreview(monk, { classId: asEntityId("monk"), targetClassLevel: 2, mode: "milestone", hitPointGain: average(5), choices: [] }, catalog);
    expect(four.ok).toBe(true);
  });
});
