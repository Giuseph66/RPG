import { describe, expect, it } from "vitest";

import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { findSpell } from "@data/spells";
import { abilityModifier, proficiencyBonusForLevel } from "@domain/rules/core";
import { applyDamage, resolveDeathSave } from "@domain/rules/combat";
import { resolveRest } from "@domain/rules/rest";
import { castSpell } from "@domain/spells";
import { getProgressionStatus, grantExperience } from "@domain/character/progression";
import { deriveEquipmentImpact } from "@domain/inventory";
import { asEntityId } from "@domain/contracts/ids";
import { type Character } from "@domain/contracts/character";
import {
  castRequest,
  deterministicRoll,
  deterministicUuid,
  fixtureCharacter,
  fixtureRef,
} from "../fixtures/rules/deterministic";

const packResult = loadPhbPtBrLocal2017();
if (!packResult.ok) throw new Error("O rule pack local é necessário para a suíte transversal.");
const pack = packResult.value;
const item = (id: string, equipmentId: string, equippedState: "equipped" | "carried" = "equipped") => ({
  id: deterministicUuid(id),
  equipmentRef: fixtureRef(equipmentId),
  quantity: 1,
  equippedState,
  notes: "",
});

describe("QA-001 — regras transversais determinísticas", () => {
  it("resolve modificadores de habilidade, proficiência publicada e CA do equipamento", () => {
    expect(abilityModifier(15)).toBe(2);
    expect(abilityModifier(9)).toBe(-1);
    expect(proficiencyBonusForLevel(5, [
      { totalLevel: 1, proficiencyBonus: 2 },
      { totalLevel: 5, proficiencyBonus: 3 },
    ])).toEqual({ ok: true, value: 3 });

    const character = fixtureCharacter({
      inventory: [item("10", "leather-armor"), item("11", "shield")],
    });
    const impact = deriveEquipmentImpact(character, pack, {
      dexterityModifier: 4,
      proficiencyRefs: [fixtureRef("light"), fixtureRef("shield")],
    });
    expect(impact.ok).toBe(true);
    if (impact.ok) {
      expect(impact.value.armorClass.value).toBe(17);
      expect(impact.value.armor?.proficiency.proficient).toBe(true);
      expect(impact.value.shield?.proficiency.proficient).toBe(true);
    }
  });

  it("aplica dano em ordem, deixa concentração pendente e resolve morte", () => {
    const concentrating = fixtureCharacter({
      hp: { current: 10, temp: 5 },
      concentration: {
        effectId: deterministicUuid("20"),
        sourceRef: fixtureRef("detect-magic"),
        duration: { kind: "minutes", value: 10 },
        pendingSaveIds: [],
      },
    });
    const damaged = applyDamage(concentrating, {
      amount: 25,
      damageType: "fire",
      defense: { flatReduction: 5, resistances: ["fire"] },
    });
    expect(damaged.status).toBe("success");
    if (damaged.status !== "success") return;
    expect(damaged.nextState.hp).toEqual({ current: 5, temp: 0 });
    expect(damaged.nextState.concentration).toBeDefined();
    expect(damaged.nextState.pendingResolutions).toHaveLength(1);

    const dying = fixtureCharacter({ hp: { current: 0, temp: 0 }, deathSaves: { successes: 0, failures: 0, stable: false } });
    const criticalFailure = resolveDeathSave(dying, { rollId: deterministicUuid("21"), natural: 1 });
    expect(criticalFailure.status).toBe("success");
    if (criticalFailure.status === "success") expect(criticalFailure.nextState.deathSaves.failures).toBe(2);
    const recovery = resolveDeathSave(dying, { rollId: deterministicUuid("22"), natural: 20 });
    expect(recovery.status).toBe("success");
    if (recovery.status === "success") expect(recovery.nextState.hp.current).toBe(1);
  });

  it("mantém descanso curto/longo determinístico", () => {
    const shortCharacter = fixtureCharacter({ hp: { current: 8, temp: 0 } });
    const hitDie = deterministicRoll(5);
    const short = resolveRest(shortCharacter, {
      restKind: "short",
      durationHours: 1,
      maximumHitPoints: 20,
      constitutionModifier: 2,
      hitDiceSpent: [{ classId: asEntityId("fighter"), count: 1, rollIds: [hitDie.id] }],
      hitDiceRolls: new Map([[hitDie.id, hitDie]]),
    });
    expect(short.status).toBe("success");
    if (short.status === "success") {
      expect(short.nextState.hp.current).toBe(15);
      expect(short.nextState.hitDiceSpent[0].spent).toBe(1);
    }

    const longCharacter = fixtureCharacter({ hp: { current: 4, temp: 5 }, hitDiceSpent: [{ classId: asEntityId("fighter"), hitDie: 10, spent: 3 }] });
    const long = resolveRest(longCharacter, {
      restKind: "long",
      durationHours: 8,
      maximumHitPoints: 10,
      recoverHitDiceByClass: { fighter: 1 },
      ateAndDrank: true,
      restId: "qa-rest-1",
    });
    expect(long.status).toBe("success");
    if (long.status === "success") {
      expect(long.nextState.hp).toEqual({ current: 10, temp: 0 });
      expect(long.nextState.hitDiceSpent[0].spent).toBe(2);
    }
  });

  it("separa espaço de Magia de Pacto e ritual sem consumir slot", () => {
    const spell = findSpell("detect-magic");
    expect(spell).toBeDefined();
    if (!spell) return;
    const sourceId = deterministicUuid("30");
    const poolId = deterministicUuid("31");
    const ritualist = fixtureCharacter({
      castingSources: [{ id: sourceId, grantingRef: fixtureRef("wizard"), ability: "int", knownSpellRefs: [], preparedSpellRefs: [], spellbookRefs: [fixtureRef("detect-magic")], resourcePoolIds: [] }],
    });
    const ritual = castSpell(ritualist, spell, castRequest(ritualist.id, "detect-magic", sourceId, "ritual"), { availableActions: ["action"], canSpeak: true, freeHands: true, concentrationEffectId: deterministicUuid("32") });
    expect(ritual.status).toBe("success");
    if (ritual.status === "success") expect(ritual.nextState.spellSlots).toHaveLength(0);

    const pactSpell = { ...spell, id: asEntityId("qa-pact-light"), classes: [asEntityId("warlock")], ritual: false, concentration: false };
    const pactCharacter = fixtureCharacter({
      castingSources: [{ id: sourceId, grantingRef: fixtureRef("warlock"), ability: "cha", knownSpellRefs: [fixtureRef("qa-pact-light")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId] }],
      spellSlots: [{ poolId, kind: "pact", slotLevel: 1, spent: 0 }],
    });
    const pact = castSpell(pactCharacter, pactSpell, castRequest(pactCharacter.id, "qa-pact-light", sourceId, "normal", 1, poolId), { availableActions: ["action"], canSpeak: true, freeHands: true });
    expect(pact.status).toBe("success");
    if (pact.status === "success") expect(pact.nextState.spellSlots[0].spent).toBe(1);
    const wrongPool = { ...pactCharacter, spellSlots: [{ poolId, kind: "spellcasting" as const, slotLevel: 1, spent: 0 }] };
    expect(castSpell(wrongPool, pactSpell, castRequest(wrongPool.id, "qa-pact-light", sourceId, "normal", 1, poolId), { availableActions: ["action"], canSpeak: true, freeHands: true })).toMatchObject({ status: "rejected" });
  });

  it("expõe progressão publicada e mantém XP monotônico", () => {
    expect(getProgressionStatus(6499, 4, pack)).toMatchObject({ ok: true, value: { eligibleLevels: [] } });
    expect(getProgressionStatus(6500, 4, pack)).toMatchObject({ ok: true, value: { eligibleLevels: [5] } });
    const final = getProgressionStatus(355000, 20, pack);
    expect(final.ok).toBe(true);
    if (final.ok) {
      expect(final.value.proficiencyBonus).toBe(6);
      expect(final.value.nextThreshold).toBeUndefined();
      expect(final.value.progress).toBe(1);
    }
    expect(grantExperience(fixtureCharacter(), 300)).toMatchObject({ ok: true, value: { xp: 300 } });
    expect(grantExperience(fixtureCharacter(), -1).ok).toBe(false);
  });

  it("não inventa cobertura de catálogo: usa apenas definições publicadas e preserva referências", () => {
    const spell = findSpell("detect-magic");
    expect(spell?.sourceRefs.length).toBeGreaterThan(0);
    expect(pack.equipment.has(asEntityId("leather-armor"))).toBe(true);
    const original = JSON.stringify(pack.equipment.get(asEntityId("leather-armor")));
    const character: Character = fixtureCharacter({ inventory: [item("40", "leather-armor")] });
    deriveEquipmentImpact(character, pack, { dexterityModifier: 2 });
    expect(JSON.stringify(pack.equipment.get(asEntityId("leather-armor")))).toBe(original);
  });
});
