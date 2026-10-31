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
import { bonusCantripCount } from "./spell-rules";
import { CIRCLE_TERRAIN_SPELLS } from "./terrain-spells";

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
  });

  it("Rastreador Subterrâneo tem Disfarçar-se preparada a partir do 3º nível", () => {
    let ranger = create("ranger", [], { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 10 });
    ranger = mustEvolve(ranger, "ranger", 2);
    ranger = mustEvolve(ranger, "ranger", 3, { subclassId: "deep-stalker-conclave" });
    expect(ids(ranger.castingSources[0].preparedSpellRefs)).toContain("disfarcar-se");
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
