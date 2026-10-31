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
import { castingSourcesOf, projectClasses } from "./context";
import { knownSpellIds, parseEvolutionChoiceId, spellConstraintFor, spellProblem } from "./spell-rules";
import { CLASS_CASTING, cantripsKnownAt, ownSlots, spellbookSizeAt, spellsKnownAt } from "./spell-tables";
import { SUBCLASS_BONUS_CANTRIPS, bonusCantripCount } from "./spell-rules";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const now = asIsoTimestamp("2024-01-01T00:00:00.000Z");
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const pack = loaded.value;
const catalog = { rulePack: pack, equipmentBundles };
let serial = 0;
const idGenerator = (): Uuid => asUuid(`00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, "0")}`);

const CLASSES = ["barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"];
const RACES: readonly (readonly [string, string | undefined])[] = [
  ["dwarf", "hill-dwarf"], ["dwarf", "mountain-dwarf"], ["elf", "high-elf"], ["elf", "wood-elf"], ["elf", "dark-elf"], ["halfling", "lightfoot"], ["halfling", "stout"],
  ["human", undefined], ["dragonborn", undefined], ["gnome", "forest-gnome"], ["gnome", "rock-gnome"], ["half-elf", undefined], ["half-orc", undefined], ["tiefling", undefined],
];
/** Subclasse escolhida no nível 1 (clérigo, feiticeiro, bruxo) ou no 2 (druida, mago). */
const SUBCLASS_LEVEL: Record<string, number> = { cleric: 1, sorcerer: 1, warlock: 1, druid: 2, wizard: 2 };
const SUBCLASS_IDS: Record<string, readonly string[]> = {
  cleric: ["life-domain", "knowledge-domain", "light-domain", "nature-domain", "tempest-domain", "trickery-domain", "war-domain"],
  sorcerer: ["draconic-bloodline", "wild-magic"], warlock: ["the-fiend", "the-archfey", "the-great-old-one"],
  druid: ["circle-of-the-land", "circle-of-the-moon"],
  wizard: ["school-of-abjuration", "school-of-conjuration", "school-of-divination", "school-of-enchantment", "school-of-evocation", "school-of-illusion", "school-of-necromancy", "school-of-transmutation"],
};
let SUBCLASS: Record<string, { level: number; id: string }> = {};

const pick = (choiceId: string, ids: readonly string[], level: number, owner: string): ChoiceSelection => ({ choiceId, selectedIds: ids.map(ref), grantedAtLevel: level, grantingRef: ref(owner) });

function create(classId: string, raceId: string, subraceId: string | undefined, choices: ChoiceSelection[]): Character {
  const sub = SUBCLASS[classId];
  const draft = createCharacterDraft({
    id: asUuid("dddddddd-dddd-4ddd-8ddd-dddddddddddd"), rulesetRef, createdAt: now,
    partial: {
      name: "Teste", raceRef: ref(raceId), ...(subraceId ? { subraceRef: ref(subraceId) } : {}),
      classes: [{ classId: asEntityId(classId), level: 1, ...(sub?.level === 1 ? { subclassId: asEntityId(sub.id) } : {}), choices: [] }],
      abilityGeneration: { method: "manual", baseScores: { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 } }, choices,
    },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter(catalog, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

/** Preenche as escolhas de magia de um nível com as primeiras magias válidas ainda não conhecidas. */
function fillSpellChoices(character: Character, classId: string, level: number, subclassId: string | undefined): ChoiceSelection[] {
  const preview = buildLevelUpPreview(character, { classId: asEntityId(classId), targetClassLevel: level, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 5 }, ...(subclassId ? { subclassId: asEntityId(subclassId) } : {}), choices: [] }, catalog);
  if (!preview.ok) throw new Error(preview.error.map((entry) => entry.message).join("|"));
  const sources = castingSourcesOf(projectClasses(character, classId, level, subclassId));
  const taken = new Set<string>();
  for (const source of character.castingSources) for (const id of knownSpellIds(character, String(source.grantingRef.entityId))) taken.add(id);
  const out: ChoiceSelection[] = [];
  for (const choice of preview.value.choices) {
    const parsed = parseEvolutionChoiceId(choice.id);
    if (!parsed || parsed.kind === "spell-swap" || choice.count.max === 0 || parsed.key === "school-of-illusion") continue;
    const constraint = spellConstraintFor(parsed, sources, pack);
    if (!constraint) continue;
    const chosen = [...pack.spells.values()].map((spell) => String(spell.id)).filter((id) => !taken.has(id) && !spellProblem(pack, id, constraint)).slice(0, choice.count.max);
    chosen.forEach((id) => taken.add(id));
    if (chosen.length > 0) out.push(pick(choice.id, chosen, level, classId));
  }
  return out;
}

describe("matriz nível 1 → 2: todas as classes × todas as raças", () => {
  it("cria, evolui, deriva e mantém contagens de magia coerentes", () => {
    const failures: string[] = [];
    const combos: (readonly [string, string, string | undefined, string | undefined])[] = [];
    for (const classId of CLASSES) {
      const subs = SUBCLASS_IDS[classId] ?? [undefined];
      subs.forEach((subId, index) => { for (const [raceId, subraceId] of (index === 0 ? RACES : RACES.slice(7, 8))) combos.push([classId, raceId, subraceId, subId]); });
    }
    for (const [classId, raceId, subraceId, subId] of combos) {
      SUBCLASS = subId ? { [classId]: { level: SUBCLASS_LEVEL[classId], id: subId } } : {};
      const label = `${subId ? `${classId}[${subId}]` : classId}/${subraceId ?? raceId}`;
      try {
        const extra = subraceId === "high-elf" ? [pick("high-elf.cantrip", ["raio-de-gelo"], 1, "high-elf")] : [];
        const first = pack.classes.get(asEntityId(classId))?.progression[0]?.choicesGranted ?? [];
        for (const choice of first.filter((entry) => /\.(cantrips|spells)\.1$/.test(entry.id))) {
          const level = choice.id.endsWith("cantrips.1") ? 0 : 1;
          const ids = [...pack.spells.values()].filter((spell) => spell.level === level && spell.classes.some((entry) => String(entry) === classId)).map((spell) => String(spell.id)).slice(0, choice.count.max);
          if (ids.length > 0) extra.push(pick(choice.id, ids, 1, classId));
        }
        // Truque extra de subclasse escolhido já no 1º nível (Domínio da Natureza).
        const bonus = subId ? SUBCLASS_BONUS_CANTRIPS[subId] : undefined;
        if (subId && bonus?.level === 1) {
          const parsed = { key: subId, kind: "cantrip" as const, level: 1 };
          const constraint = spellConstraintFor(parsed, castingSourcesOf([{ classId: asEntityId(classId), level: 1, subclassId: asEntityId(subId) }]), pack);
          const ids = [...pack.spells.values()].map((spell) => String(spell.id)).filter((id) => constraint && !spellProblem(pack, id, constraint) && !extra.some((e) => e.selectedIds.some((r) => String(r.entityId) === id))).slice(0, 1);
          if (ids.length > 0) extra.push(pick(`${subId}.cantrip.1`, ids, 1, subId));
        }
        const level1 = create(classId, raceId, subraceId, extra);
        const sub = SUBCLASS[classId];
        const subclassId = sub?.id;
        const choices = fillSpellChoices(level1, classId, 2, sub && sub.level <= 2 ? subclassId : undefined);
        const result = evolveCharacter(level1, { classId: asEntityId(classId), targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 5 }, ...(sub && sub.level <= 2 ? { subclassId: asEntityId(sub.id) } : {}), choices }, catalog, { idGenerator, now });
        if (!result.ok) { failures.push(`${label}: evolução recusada — ${result.error.map((entry) => entry.message).join(" | ")}`); continue; }
        const character = result.value;
        const derived = deriveCharacter(character, pack, { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] });
        if (!derived.ok) { failures.push(`${label}: derivação falhou — ${derived.error.message}`); continue; }
        // Espaços: um registro por espaço conforme a tabela da classe.
        const classSource = castingSourcesOf(character.classes).find((entry) => entry.classId === classId);
        if (classSource && classSource.profile.profile !== "pact") {
          const expected = ownSlots(classSource.profile.profile, classSource.level).reduce((sum, count) => sum + count, 0);
          const got = character.spellSlots.filter((slot) => slot.kind === "spellcasting").length;
          if (expected !== got) failures.push(`${label}: espaços ${got}, esperado ${expected}`);
        }
        // Limites da tabela do livro (truques e magias conhecidas) no nível 2.
        if (classSource) {
          const own = character.castingSources.find((entry) => String(entry.grantingRef.entityId) === classSource.key);
          const refs = [...(own?.knownSpellRefs ?? [])];
          const cantripCount = refs.filter((r) => pack.spells.get(r.entityId)?.level === 0).length;
          const spellCount = refs.filter((r) => (pack.spells.get(r.entityId)?.level ?? 0) > 0).length;
          const bonusCantrips = bonusCantripCount(character.classes);
          const wantCantrips = cantripsKnownAt(classSource.key, 2) + bonusCantrips;
          if (cantripCount !== wantCantrips) failures.push(`${label}: truques ${cantripCount}, esperado ${wantCantrips}`);
          if (CLASS_CASTING[classSource.key]?.kind === "known" && spellCount !== spellsKnownAt(classSource.key, 2)) failures.push(`${label}: magias conhecidas ${spellCount}, esperado ${spellsKnownAt(classSource.key, 2)}`);
          if (classId === "wizard" && (own?.spellbookRefs.length ?? 0) !== spellbookSizeAt(2)) failures.push(`${label}: grimório ${own?.spellbookRefs.length}, esperado ${spellbookSizeAt(2)}`);
        }
        // Magias raciais não podem sumir.
        if (subraceId === "high-elf" && !character.castingSources.some((entry) => String(entry.grantingRef.entityId) === "high-elf")) failures.push(`${label}: truque de Alto Elfo sumiu`);
        if (raceId === "tiefling" && !character.castingSources.some((entry) => String(entry.grantingRef.entityId) === "tiefling")) failures.push(`${label}: magia racial do Tiefling sumiu`);
        // Toda magia de toda fonte existe no catálogo.
        for (const source of character.castingSources) for (const spellRef of [...source.knownSpellRefs, ...source.preparedSpellRefs, ...source.spellbookRefs]) if (!pack.spells.has(spellRef.entityId)) failures.push(`${label}: magia ${String(spellRef.entityId)} fora do catálogo`);
      } catch (error) { failures.push(`${label}: ${(error as Error).message}`); }
    }
    expect(failures).toEqual([]);
  });
});
