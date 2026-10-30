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


function advance(character: Character, classId: string, to: number, plan: Record<number, { subclassId?: string; choices?: ChoiceSelection[] }> = {}): Character {
  let current = character;
  const from = current.classes.find((entry) => String(entry.classId) === classId)?.level ?? 0;
  for (let level = from + 1; level <= to; level += 1) current = mustEvolve(current, classId, level, plan[level] ?? {});
  return current;
}

describe("evolução: escolhas específicas de cada classe", () => {
  it("Mestre de Batalha aprende 3 manobras no 3º nível e mais 2 no 7º, sem repetir", () => {
    const fighter = create("fighter");
    const level3 = advance(fighter, "fighter", 3, { 3: { subclassId: "battle-master", choices: [pick("battle-master.maneuvers.3", ["maneuver.parry", "maneuver.riposte", "maneuver.rally"], 3), pick("battle-master.student-of-war.3", ["proficiency.smiths-tools"], 3)] } });
    expect(level3.choices.some((entry) => entry.choiceId === "battle-master.maneuvers.3")).toBe(true);
    const upTo6 = advance(level3, "fighter", 6);
    const repeated = evolve(upTo6, "fighter", 7, { choices: [pick("battle-master.maneuvers.7", ["maneuver.parry", "maneuver.trip-attack"], 7)] });
    expect(repeated.ok).toBe(false);
    const fine = evolve(upTo6, "fighter", 7, { choices: [pick("battle-master.maneuvers.7", ["maneuver.trip-attack", "maneuver.precision-attack"], 7)] });
    expect(fine.ok).toBe(true);
    const tooMany = evolve(fighter, "fighter", 2, { choices: [] });
    expect(tooMany.ok).toBe(true);
  });

  it("Conclave do Caçador oferece a Presa do Caçador e a Defesa Superior só no nível certo", () => {
    let ranger = create("ranger");
    ranger = advance(ranger, "ranger", 2, { 2: { choices: [pick("ranger.fighting-style.2", ["fighting-style.archery"], 2)] } });
    const level3 = evolve(ranger, "ranger", 3, { subclassId: "hunter-conclave", choices: [pick("hunter-conclave.hunters-prey.3", ["hunters-prey.colossus-slayer"], 3)] });
    expect(level3.ok).toBe(true);
    const wrongLevel = evolve(ranger, "ranger", 3, { subclassId: "hunter-conclave", choices: [pick("hunter-conclave.superior-defense.15", ["superior-hunters-defense.evasion"], 3)] });
    expect(wrongLevel.ok).toBe(false);
  });

  it("Monge dos Quatro Elementos: disciplina avançada exige o nível da classe", () => {
    const monk = create("monk", [], { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 });
    const level3 = advance(monk, "monk", 3, { 3: { subclassId: "way-of-the-four-elements", choices: [pick("way-of-the-four-elements.disciplines.3", ["elemental-discipline.water-whip"], 3)] } });
    const tooEarly = evolve(advance(level3, "monk", 5), "monk", 6, { choices: [pick("way-of-the-four-elements.disciplines.6", ["elemental-discipline.ride-the-wind"], 6)] });
    expect(tooEarly.ok).toBe(false);
    const ok = evolve(advance(level3, "monk", 5), "monk", 6, { choices: [pick("way-of-the-four-elements.disciplines.6", ["elemental-discipline.gong-of-the-summit"], 6)] });
    expect(ok.ok).toBe(true);
  });

  it("Bárbaro Totêmico escolhe o animal e pode repetir o mesmo nos níveis seguintes", () => {
    const barbarian = create("barbarian");
    const level3 = advance(barbarian, "barbarian", 3, { 3: { subclassId: "path-of-the-totem-warrior", choices: [pick("path-of-the-totem-warrior.totem-spirit.3", ["totem.bear"], 3)] } });
    const level6 = evolve(advance(level3, "barbarian", 5), "barbarian", 6, { choices: [pick("path-of-the-totem-warrior.totem-aspect.6", ["totem.bear"], 6)] });
    expect(level6.ok).toBe(true);
  });

  it("Ladino repete Especialização no 6º nível sem dobrar a mesma perícia", () => {
    let rogue = create("rogue", [pick("rogue.expertise.1", ["stealth"])]);
    rogue = advance(rogue, "rogue", 5, { 3: { subclassId: "thief" } });
    expect(evolve(rogue, "rogue", 6, { choices: [pick("rogue.expertise.6", ["stealth", "acrobatics"], 6)] }).ok).toBe(false);
    expect(evolve(rogue, "rogue", 6, { choices: [pick("rogue.expertise.6", ["acrobatics", "perception"], 6)] }).ok).toBe(true);
  });

  it("Bardo ganha Segredos Mágicos de qualquer lista no 10º nível", () => {
    let bard = create("bard");
    bard = advance(bard, "bard", 9, { 3: { subclassId: "college-of-valor" } });
    const cleric = spellsOf("cleric", 1).find((id) => !spellsOf("bard", 1).includes(id)) as string;
    const wizardCantrip = spellsOf("wizard", 0).find((id) => !spellsOf("bard", 0).includes(id)) as string;
    const next = mustEvolve(bard, "bard", 10, { choices: [pick("bard.magical-secrets.10", [cleric, wizardCantrip], 10)] });
    expect(next.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId))).toEqual(expect.arrayContaining([cleric, wizardCantrip]));
    const tooHigh = evolve(bard, "bard", 10, { choices: [pick("bard.magical-secrets.10", [spellsOf("cleric", 7)[0] ?? spellsOf("wizard", 6)[0]], 10)] });
    expect(tooHigh.ok).toBe(false);
  });

  it("Bruxo escolhe a Arcana Mística de 6º círculo no 11º nível", () => {
    let warlock = create("warlock", [], { str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 16 });
    warlock = advance(warlock, "warlock", 10, { 1: {}, 2: { subclassId: "the-fiend" } });
    const arcanum = spellsOf("warlock", 6)[0];
    expect(evolve(warlock, "warlock", 11, { choices: [pick("warlock.arcanum.11", [spellsOf("warlock", 5)[0]], 11)] }).ok).toBe(false);
    const next = mustEvolve(warlock, "warlock", 11, { choices: [pick("warlock.arcanum.11", [arcanum], 11)] });
    expect(next.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId))).toContain(arcanum);
    expect(next.spellSlots.filter((slot) => slot.kind === "pact")).toHaveLength(3);
  });

  it("Bruxo do Corruptor aprende magias da Lista de Magia Expandida (ex.: Comando)", () => {
    const warlock = create("warlock", [], { str: 10, dex: 12, con: 14, int: 10, wis: 10, cha: 16 });
    // Comando não é da lista de bruxo; só entra pelo patrono.
    expect(spellsOf("warlock", 1)).not.toContain("comando");
    const withFiend = mustEvolve(warlock, "warlock", 2, { subclassId: "the-fiend", choices: [pick("warlock.spells.2", ["comando"], 2)] });
    expect(withFiend.castingSources[0].knownSpellRefs.map((entry) => String(entry.entityId))).toContain("comando");
    // Não fica preparada sozinha: a lista expandida só amplia o que dá para aprender.
    expect(withFiend.castingSources[0].preparedSpellRefs).toEqual([]);
    // Sono é da Arquifada, não do Corruptor.
    expect(evolve(warlock, "warlock", 2, { subclassId: "the-fiend", choices: [pick("warlock.spells.2", ["sono"], 2)] }).ok).toBe(false);
    // Raio Ardente (2º círculo) ainda não está ao alcance no nível 2.
    expect(evolve(warlock, "warlock", 2, { subclassId: "the-fiend", choices: [pick("warlock.spells.2", ["raio-ardente"], 2)] }).ok).toBe(false);
  });
});
