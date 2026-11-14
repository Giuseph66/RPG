import { describe, expect, it } from "vitest";

import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { type Character, type TransformationState } from "@domain/contracts/character";
import { type CreatureStatBlock, isBeastDefinition } from "@domain/creatures";
import { deriveCharacter } from "@domain/rules/derived/derive-character";
import { applyDamage, applyHealing, applyTempHp } from "@domain/rules/combat";
import { resolveRest } from "@domain/rules/rest";
import { asCommandId, asEntityId, asUuid, type DefinitionRef, type EntityId, type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type Command, type RuleResult } from "@domain/contracts/rules";

import {
  beastReference,
  resolveAdvanceWildShapeTime,
  resolveEnterWildShape,
  resolveExitWildShape,
  resolveMarkBeastSeen,
  suggestEligibleBeasts,
  type WildShapeResolutionContext,
} from "./index";

const loaded = loadPhbPtBrLocal2017();
if (!loaded.ok) throw new Error(`Pack PHB local inválido no teste de Forma Selvagem: ${loaded.error.message}`);
const pack: RulePack = loaded.value;
function publishedCreatures(rulePack: RulePack): ReadonlyMap<EntityId, CreatureStatBlock> {
  if (!rulePack.creatures) throw new Error("O pack PHB local não publicou o catálogo de criaturas.");
  return rulePack.creatures;
}
const creatures = publishedCreatures(pack);

const druidId = asEntityId("druid");
const wildShapeResourceId = asEntityId("druid.wild-shape");
const ref = (entityId: string): DefinitionRef => ({ rulesetId: pack.manifest.id, entityId: asEntityId(entityId) });
const uuid = (last: string): Uuid => asUuid(`00000000-0000-4000-8000-${last.padStart(12, "0")}`);

function druid(level = 2, overrides: Partial<Character> = {}): Character {
  const history = Array.from({ length: level }, (_, index) => ({
    ...minimalCharacter.progressionHistory[0],
    id: uuid(String(index + 1)),
    classId: druidId,
    level: index + 1,
    hitPointGain: index === 0
      ? { kind: "first-level-max" as const, amount: 8 }
      : { kind: "fixed-average" as const, amount: 5 },
  }));
  return {
    ...minimalCharacter,
    rulesetRef: { ...minimalCharacter.rulesetRef, id: pack.manifest.id },
    classes: [{ classId: druidId, level, choices: [] }],
    progressionHistory: history,
    hitDiceSpent: [{ classId: druidId, hitDie: 8, spent: 0 }],
    resources: [{
      id: uuid("100"),
      definitionRef: ref("druid.wild-shape"),
      ownerInstanceId: minimalCharacter.id,
      spent: 0,
    }],
    beastSightings: [],
    ...overrides,
  };
}

function derived(subject: Character) {
  const result = deriveCharacter(subject, pack, { availableActions: ["action", "bonus-action"], tablePolicies: [] });
  if (!result.ok) throw new Error(`Derivação falhou no teste de Forma Selvagem: ${result.error.message}`);
  return result.value;
}

function seen(subject: Character, beast: CreatureStatBlock): Character {
  return {
    ...subject,
    beastSightings: [{ beastRef: beastReference(subject, beast.id) }],
  };
}

function context(subject: Character, definitions: ReadonlyMap<EntityId, CreatureStatBlock> = creatures, availableActions: readonly ("action" | "bonus-action")[] = ["action", "bonus-action"]): WildShapeResolutionContext {
  return {
    definitions,
    availableActions,
    transformationId: uuid("200"),
    requestId: uuid("201"),
    originalMaximumHitPoints: derived(subject).hitPointsMax.value,
    gameTime: { day: 1, hour: 0, minute: 0 },
  };
}

function enter(
  subject: Character,
  beast: CreatureStatBlock,
  options: { readonly disposition?: "worn" | "dropped" | "stored" | "merged-with-form"; readonly actionCost?: "action" | "bonus-action"; readonly definitions?: ReadonlyMap<EntityId, CreatureStatBlock>; readonly availableActions?: readonly ("action" | "bonus-action")[] } = {},
): RuleResult {
  const command: Extract<Command, { readonly kind: "enter-wild-shape" }> = {
    commandId: asCommandId("wild-shape-enter"),
    characterId: subject.id,
    expectedRevision: subject.revision,
    kind: "enter-wild-shape",
    payload: {
      beastRef: beastReference(subject, beast.id),
      equipmentDisposition: options.disposition ?? "stored",
      ...(options.actionCost ? { actionCost: options.actionCost } : {}),
    },
  };
  return resolveEnterWildShape(subject, command, context(subject, options.definitions, options.availableActions));
}

function enterSuccess(subject: Character, beast: CreatureStatBlock, options: Parameters<typeof enter>[2] = {}): Character {
  const result = enter(subject, beast, options);
  if (result.status !== "success") throw new Error(`Forma não iniciou: ${JSON.stringify(result)}`);
  return result.nextState;
}

function beastAtOrBelowQuarter(): CreatureStatBlock {
  const result = [...creatures.values()].find((entry) => isBeastDefinition(entry) && entry.challengeRating && entry.challengeRating.numerator * 4 <= entry.challengeRating.denominator);
  if (!result) throw new Error("O catálogo real não contém besta elegível de ND 1/4.");
  return result;
}

function beastAboveQuarter(): CreatureStatBlock {
  const result = [...creatures.values()].find((entry) => isBeastDefinition(entry) && entry.challengeRating && entry.challengeRating.numerator * 4 > entry.challengeRating.denominator);
  if (!result) throw new Error("O catálogo real não contém besta acima de ND 1/4.");
  return result;
}

function activeTransformation(subject: Character): TransformationState {
  if (!subject.transformation) throw new Error("O fixture não iniciou Forma Selvagem.");
  return subject.transformation;
}

describe("Forma Selvagem com o catálogo PHB local publicado", () => {
  it("usa os 95 blocos reais e só lista bestas individuais vistas dentro do ND permitido", () => {
    expect(creatures.size).toBe(95);
    const low = beastAtOrBelowQuarter();
    const high = beastAboveQuarter();
    const swarm = [...creatures.values()].find((entry) => entry.isSwarm === true);
    const nonBeast = [...creatures.values()].find((entry) => entry.creatureType !== "beast");
    expect(swarm).toBeDefined();
    expect(nonBeast).toBeDefined();

    const character = druid();
    expect(enter(character, low).status).toBe("rejected");
    const viewed = seen(character, low);
    expect(suggestEligibleBeasts(viewed, creatures.values()).map((entry) => entry.beast.id)).toContain(low.id);
    expect(suggestEligibleBeasts(character, creatures.values())).toHaveLength(0);
    expect(enter(viewed, low).status).toBe("success");
    expect(enter(seen(character, high), high).status).toBe("rejected");
    if (swarm) expect(enter(seen(character, swarm), swarm).status).toBe("rejected");
    if (nonBeast) expect(enter(seen(character, nonBeast), nonBeast).status).toBe("rejected");
  });

  it("registra avistamento explicitamente e não gasta carga em falha de seleção", () => {
    const beast = beastAtOrBelowQuarter();
    const character = druid();
    const marked = resolveMarkBeastSeen(character, {
      commandId: asCommandId("wild-shape-mark-seen"),
      characterId: character.id,
      expectedRevision: character.revision,
      kind: "mark-beast-seen",
      payload: { beastRef: beastReference(character, beast.id) },
    }, { definitions: creatures });
    expect(marked.status).toBe("success");
    if (marked.status !== "success") return;

    const noActions = enter(marked.nextState, beast, { availableActions: [] });
    expect(noActions.status).toBe("rejected");
    expect(marked.nextState.resources[0]?.spent).toBe(0);
    const spent = druid(2, { resources: [{ ...character.resources[0], spent: 2 }] });
    const exhausted = enter(seen(spent, beast), beast);
    expect(exhausted.status).toBe("rejected");
    expect(spent.resources[0]?.spent).toBe(2);
  });

  it("permite besta voadora vista, suprime voo e usa a progressão real de PV do Druida 2", () => {
    const beast = [...creatures.values()].find((entry) => isBeastDefinition(entry) && entry.challengeRating && entry.challengeRating.numerator * 4 <= entry.challengeRating.denominator && entry.speeds.flyCm !== undefined);
    expect(beast).toBeDefined();
    if (!beast) return;
    const character = druid(2, { hp: { current: 13, temp: 2 } });
    const original = derived(character);
    expect(original.hitPointsMax.value).toBe(17); // 8 + CON no primeiro nível, depois 5 + CON; HD d8.
    const transformed = enterSuccess(seen(character, beast), beast);
    const form = activeTransformation(transformed);
    expect(form.originalMaximumHitPoints).toBe(17);
    expect(form.originalSnapshot?.hitDiceSpent).toEqual(character.hitDiceSpent);
    expect(form.formSnapshot?.size).toBe(beast.size);
    expect(form.formSnapshot?.senses).toEqual(beast.senses);
    expect(form.formHp).toEqual({ current: beast.hitPoints.average, temp: 2 });

    const effective = derived(transformed);
    expect(effective.hitPointsMax.value).toBe(beast.hitPoints.average);
    expect(effective.armorClass.value).toBe(beast.armorClass);
    expect(effective.speedsCm.some((speed) => speed.kind === "fly" || speed.kind === "swim")).toBe(false);
    expect(effective.attacks).toHaveLength((beast.actions ?? []).filter((action) => action.damage?.some((damage) => damage.formula)).length);
    expect("size" in effective).toBe(false);
    expect("senses" in effective).toBe(false);
  });

  it("troca Força/Destreza/Constituição sem duplicar bônus racial e preserva habilidades mentais", () => {
    const beast = beastAtOrBelowQuarter();
    const character = druid();
    const before = derived(character);
    const effective = derived(enterSuccess(seen(character, beast), beast));
    for (const ability of ["str", "dex", "con"] as const) {
      expect(effective.abilityScores.find((entry) => entry.ability === ability)?.score.value).toBe(beast.abilityScores[ability]);
    }
    for (const ability of ["int", "wis", "cha"] as const) {
      expect(effective.abilityScores.find((entry) => entry.ability === ability)?.score.value)
        .toBe(before.abilityScores.find((entry) => entry.ability === ability)?.score.value);
    }
    expect(effective.passivePerception.value).toBe(effective.skills.find((entry) => entry.skill === "perception")?.passiveScore.value);
  });

  it("usa o maior bônus publicado entre forma e personagem para perícia e resistência", () => {
    const base = beastAtOrBelowQuarter();
    const beast: CreatureStatBlock = { ...base, skills: { perception: 15 }, savingThrows: { wis: 12 } };
    const definitions = new Map(creatures);
    definitions.set(beast.id, beast);
    const character = seen(druid(), beast);
    const transformed = enterSuccess(character, beast, { definitions });
    const effective = derived(transformed);
    const perception = effective.skills.find((entry) => entry.skill === "perception");
    const wisdomSave = effective.savingThrows.find((entry) => entry.ability === "wis");
    expect(perception?.modifier.value).toBe(15);
    expect(perception?.passiveScore.value).toBe(25);
    expect(effective.passivePerception.value).toBe(25);
    expect(wisdomSave?.modifier.value).toBe(12);
  });

  it("mantém mudanças de PV temporários/cura e não restaura recursos ou inventário antigos ao retornar", () => {
    const beast = beastAtOrBelowQuarter();
    const character = seen(druid(2, { hp: { current: 10, temp: 2 } }), beast);
    const transformed = enterSuccess(character, beast);
    const initialTempDamage = applyDamage(transformed, { amount: 2, damageType: "slashing" });
    expect(initialTempDamage.status).toBe("success");
    if (initialTempDamage.status !== "success") return;
    const formDamage = applyDamage(initialTempDamage.nextState, { amount: 2, damageType: "slashing" });
    expect(formDamage.status).toBe("success");
    if (formDamage.status !== "success") return;
    expect(formDamage.nextState.transformation?.formHp.current).toBe(beast.hitPoints.average - 2);
    expect(formDamage.nextState.transformation?.formHp.temp).toBe(0);
    const healed = applyHealing(formDamage.nextState, { amount: 1, maximumHitPoints: beast.hitPoints.average });
    expect(healed.status).toBe("success");
    if (healed.status !== "success") return;
    expect(healed.nextState.transformation?.formHp.current).toBe(beast.hitPoints.average - 1);
    const moreTemp = applyTempHp(healed.nextState, { amount: 5, stacking: "highest-wins" });
    expect(moreTemp.status).toBe("success");
    if (moreTemp.status !== "success") return;
    const tempDamage = applyDamage(moreTemp.nextState, { amount: 4, damageType: "slashing" });
    expect(tempDamage.status).toBe("success");
    if (tempDamage.status !== "success") return;
    expect(tempDamage.nextState.transformation?.formHp.temp).toBe(1);
    const current = {
      ...tempDamage.nextState,
      resources: tempDamage.nextState.resources.map((resource) => ({ ...resource, spent: 2 })),
      inventory: [{ id: uuid("300"), equipmentRef: ref("shield"), quantity: 1, equippedState: "stored" as const, notes: "adicionado durante a forma" }],
    };
    const exited = resolveExitWildShape(current, {
      commandId: asCommandId("wild-shape-exit-voluntary"), characterId: current.id, expectedRevision: current.revision,
      kind: "exit-wild-shape", payload: { reason: "voluntary" },
    }, { availableActions: ["bonus-action"] });
    expect(exited.status).toBe("success");
    if (exited.status === "success") {
      expect(exited.nextState.transformation).toBeUndefined();
      expect(exited.nextState.hp).toEqual({ current: 10, temp: 1 }); // o pool original não perde PV; o gasto de temporários persiste.
      expect(exited.nextState.resources[0]?.spent).toBe(2);
      expect(exited.nextState.inventory).toEqual(current.inventory);
    }
  });

  it("passa excedente uma vez, sem repetir resistência, e encerra a forma ao zerar seus PV", () => {
    const base = beastAtOrBelowQuarter();
    const beast: CreatureStatBlock = { ...base, damageResistances: ["fire"] };
    const definitions = new Map(creatures);
    definitions.set(beast.id, beast);
    const character = seen(druid(2, { hp: { current: 10, temp: 0 } }), beast);
    const transformed = enterSuccess(character, beast, { definitions });
    const rawDamage = (beast.hitPoints.average + 3) * 2;
    const result = applyDamage(transformed, { amount: rawDamage, damageType: "fire", defense: { resistances: ["fire"] } });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.transformation).toBeUndefined();
      expect(result.nextState.hp).toEqual({ current: 7, temp: 0 });
      expect(result.effects.filter((effect) => effect.kind === "transformation-ended")).toHaveLength(1);
    }
  });

  it("expira por minutos explícitos e avança o tempo mínimo de descansos curto e longo", () => {
    const beast = beastAtOrBelowQuarter();
    const character = seen(druid(), beast);
    const transformed = enterSuccess(character, beast);
    const advanced = resolveAdvanceWildShapeTime(transformed, {
      commandId: asCommandId("wild-shape-advance"), characterId: transformed.id, expectedRevision: transformed.revision,
      kind: "advance-wild-shape-time", payload: { minutes: 59 },
    });
    expect(advanced.status).toBe("success");
    if (advanced.status !== "success") return;
    expect(advanced.nextState.transformation?.elapsedMinutes).toBe(59);
    const expired = resolveAdvanceWildShapeTime(advanced.nextState, {
      commandId: asCommandId("wild-shape-expire"), characterId: advanced.nextState.id, expectedRevision: advanced.nextState.revision,
      kind: "advance-wild-shape-time", payload: { minutes: 1 },
    });
    expect(expired.status).toBe("success");
    if (expired.status === "success") expect(expired.nextState.transformation).toBeUndefined();

    for (const restKind of ["short", "long"] as const) {
      const restingForm = enterSuccess(character, beast);
      const rest = resolveRest(restingForm, {
        restKind,
        hitDiceSpent: [],
        ...(restKind === "long" ? { maximumHitPoints: 13 } : {}),
        resourceDefinitions: pack.resources,
      });
      expect(rest.status).toBe("success");
      if (rest.status === "success") expect(rest.nextState.transformation).toBeUndefined();
    }
  });

  it("permite ação bônus do Círculo da Lua e nível 20 sem gasto de usos", () => {
    const beast = beastAtOrBelowQuarter();
    const moon = seen(druid(2, { classes: [{ classId: druidId, level: 2, subclassId: asEntityId("circle-of-the-moon"), choices: [] }] }), beast);
    const moonResult = enter(moon, beast, { availableActions: ["bonus-action"], actionCost: "bonus-action" });
    expect(moonResult.status).toBe("success");
    if (moonResult.status === "success") expect(moonResult.nextState.resources[0]?.spent).toBe(1);

    const archdruid = seen(druid(20, { resources: [] }), beast);
    const unlimited = enter(archdruid, beast);
    expect(unlimited.status).toBe("success");
    if (unlimited.status === "success") expect(unlimited.nextState.resources).toEqual([]);
  });
});
