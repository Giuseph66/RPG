import { describe, expect, it } from "vitest";
import { asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import type { Character } from "@domain/contracts/character";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { equipmentBundles } from "@data/equipment/bundles";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";
import { deriveCharacter } from "@domain/rules/derived";
import { evolveCharacter } from "@domain/character/evolution/apply";

const rulesetRef = { id: asRulesetId("phb-ptbr-local-2017"), version: asPackVersion("1.0.0") };
const ref = (entityId: string) => ({ rulesetId: rulesetRef.id, entityId: asEntityId(entityId) });
const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(loaded.error.message);
const pack = loaded.value;
const context = { gameTime: { day: 0, hour: 0, minute: 0 }, availableActions: [], tablePolicies: [] };
let serial = 0;
const idGenerator = (): Uuid => asUuid(`00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, "0")}`);
const pick = (choiceId: string, ids: readonly string[], owner: string): ChoiceSelection => ({ choiceId, selectedIds: ids.map(ref), grantedAtLevel: 1, grantingRef: ref(owner) });

function create(classId: string, raceId: string, choices: ChoiceSelection[] = [], subclassId?: string): Character {
  const draft = createCharacterDraft({
    id: asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), rulesetRef, createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
    partial: { name: "Teste", raceRef: ref(raceId), ...(raceId === "variant-human" ? { selectedSupplementIds: [asEntityId("variant-human-option")] } : {}), classes: [{ classId: asEntityId(classId), level: 1, choices: [], ...(subclassId ? { subclassId: asEntityId(subclassId) } : {}) }], abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 8 } }, choices },
  });
  if (!draft.ok) throw new Error(draft.error.message);
  const result = materializeCharacter({ rulePack: pack, equipmentBundles }, draft.value, { idGenerator });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value.character;
}

function levelTwo(character: Character, classId: string): Character {
  const result = evolveCharacter(character, { classId: asEntityId(classId), targetClassLevel: 2, mode: "milestone", hitPointGain: { kind: "fixed-average", amount: 5 }, choices: [] }, { rulePack: pack, equipmentBundles }, { idGenerator, now: asIsoTimestamp("2024-01-02T00:00:00.000Z") });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

const walk = (character: Character) => derive(character).speedsCm.find((speed) => speed.kind === "walk")!.value.value;

function derive(character: Character) {
  const derived = deriveCharacter(character, pack, context);
  if (!derived.ok) throw new Error(derived.error.message);
  return derived.value;
}

describe("Monge humano variante com Alerta", () => {
  it("Defesa sem Armadura do Monge soma Sabedoria à CA sem armadura", () => {
    // DES 16 (+3), SAB 14 (+2): 10 + 3 + 2.
    expect(derive(create("monk", "human")).armorClass.value).toBe(15);
  });

  it("Artes Marciais: ataque desarmado com DES e 1d4", () => {
    const unarmed = derive(create("monk", "human")).attacks.find((attack) => attack.label === "Ataque desarmado (Artes Marciais)");
    // DES 17 (+3) + proficiência (+2); dano 1d4 + 3 de concussão.
    expect(unarmed?.attackModifier.value).toBe(5);
    expect(unarmed?.damageParts).toEqual([expect.objectContaining({ expression: { quantity: 1, faces: 4 }, damageType: "bludgeoning", modifierBonus: expect.objectContaining({ value: 3 }) })]);
    // Quem não é monge não ganha o ataque de Artes Marciais.
    expect(derive(create("sorcerer", "human")).attacks.some((attack) => attack.label === "Ataque desarmado (Artes Marciais)")).toBe(false);
  });

  it("Movimento sem Armadura do Monge dá +3 m a partir do 2º nível", () => {
    const monk = create("monk", "human");
    expect(walk(monk)).toBe(900);
    expect(walk(levelTwo(monk, "monk"))).toBe(1200);
  });

  it("Resiliência Dracônica: CA 13 + DES sem armadura e +1 PV por nível de feiticeiro", () => {
    const sorcerer = create("sorcerer", "human", [], "draconic-bloodline");
    const level1 = derive(sorcerer);
    // Humano: DES 17 (+3), CON 15 (+2). CA 13 + 3; PV 6 + 2 + 1.
    expect(level1.armorClass.value).toBe(16);
    expect(level1.hitPointsMax.value).toBe(9);
    // Nível 2: + 5 (ganho registrado) + 2 (CON) + 1 (Resiliência).
    expect(derive(levelTwo(sorcerer, "sorcerer")).hitPointsMax.value).toBe(17);
    // Sem a linhagem, nada muda.
    const plain = derive(create("sorcerer", "human"));
    expect(plain.armorClass.value).toBe(13);
    expect(plain.hitPointsMax.value).toBe(8);
  });

  it("Defesa sem Armadura do Bárbaro soma Constituição", () => {
    // DES 16 (+3), CON 14 (+2) — humano comum soma +1 em tudo: DES 17 (+3), CON 15 (+2).
    expect(derive(create("barbarian", "human")).armorClass.value).toBe(15);
  });

  it("talento Alerta do humano variante dá +5 de iniciativa", () => {
    const monk = create("monk", "variant-human", [
      pick("variant-human.ability-increases", ["dex", "wis"], "variant-human"),
      pick("variant-human.skill", ["perception"], "variant-human"),
      pick("variant-human.feat", ["alert"], "variant-human"),
      pick("variant-human.language", ["elvish"], "variant-human"),
    ]);
    const derived = derive(monk);
    // DES 17 (+3) + Alerta (+5).
    expect(derived.initiative.value).toBe(8);
    // DES 17 (+3), SAB 15 (+2).
    expect(derived.armorClass.value).toBe(15);
  });
});
