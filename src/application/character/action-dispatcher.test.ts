import { describe, expect, it, vi } from "vitest";

import { minimalCharacter, spellCureWounds } from "@domain/contracts/fixtures";
import { type Character, type CharacterSummary, type CharacterDraft } from "@domain/contracts/character";
import { type CharacterDerived } from "@domain/contracts/derived";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";
import { appError, type AppError, err, ok, type Result } from "@domain/contracts/errors";
import { type CommandReceipt, type Command, type RuleResult } from "@domain/contracts/rules";
import { asCommandId, asEntityId, asIsoTimestamp, asPackVersion, asRulesetId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { createSequenceRandomSource } from "@domain/dice";
import { resolveCombatCommand } from "@domain/rules/combat";
import { spendResource } from "@domain/rules/resources";

import { type ActionCapabilityExecution } from "./action-capabilities";
import { deriveActionCapabilities } from "./action-capabilities";
import { createActionDispatcher } from "./action-dispatcher";
import { createCharacterApplicationService } from "./service";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { composeOptionalRuleContent } from "@domain/character/creation/optional-rules";
import { TASHA_RANGER_SUPPLEMENT_ID } from "@data/rulepacks/optional-supplements";
import { createCharacterDraft, materializeCharacter } from "@domain/character/creation";
import { equipmentBundles } from "@data/equipment/bundles";
import { deriveCharacter } from "@domain/rules/derived";

function fairySpellScenario(): { readonly character: Character; readonly pack: RulePack; readonly derived: CharacterDerived; readonly sources: Readonly<Record<string, Uuid>>; readonly resourceStates: Readonly<Record<string, Uuid>>; readonly poolId: Uuid } {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  const fairyId = asEntityId("fairy-supplement");
  const composed = composeOptionalRuleContent(loaded.value, [fairyId], []);
  if (!composed.ok) throw new Error(composed.error.message);
  const pack = composed.value;
  const ref = (entityId: string) => ({ rulesetId: pack.manifest.id, entityId: asEntityId(entityId) });
  const sourceIds = {
    "fogo-das-fadas": asUuid("22222222-2222-4222-8222-222222222201"),
    "aumentar-reduzir": asUuid("22222222-2222-4222-8222-222222222202"),
  };
  const resourceStates = {
    "fogo-das-fadas": asUuid("33333333-3333-4333-8333-333333333201"),
    "aumentar-reduzir": asUuid("33333333-3333-4333-8333-333333333202"),
  };
  const poolId = asUuid("44444444-4444-4444-8444-444444444401");
  const source = (spellId: keyof typeof sourceIds, grantId: string, resourceId: keyof typeof resourceStates) => ({
    id: sourceIds[spellId], grantingRef: ref(grantId), sourceKind: "race" as const, ability: "wis" as const,
    knownSpellRefs: [ref(spellId)], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId],
    featureResourceId: resourceStates[resourceId], requiresFeatureResource: true, usesSpellSlots: true,
    spellListClassId: asEntityId("druid"),
  });
  const character: Character = {
    ...minimalCharacter,
    raceRef: ref("fairy"),
    selectedSupplementIds: [fairyId],
    classes: [{ classId: asEntityId("druid"), level: 5, choices: [] }],
    castingSources: [
      source("fogo-das-fadas", "fairy.magic-faerie-fire", "fogo-das-fadas"),
      source("aumentar-reduzir", "fairy.magic-enlarge-reduce", "aumentar-reduzir"),
    ],
    resources: [
      { id: resourceStates["fogo-das-fadas"], definitionRef: ref("fairy.faerie-fire-use"), ownerInstanceId: sourceIds["fogo-das-fadas"], spent: 0 },
      { id: resourceStates["aumentar-reduzir"], definitionRef: ref("fairy.enlarge-reduce-use"), ownerInstanceId: sourceIds["aumentar-reduzir"], spent: 0 },
    ],
    spellSlots: [
      { poolId, kind: "spellcasting", slotLevel: 1, spent: 0 },
      { poolId, kind: "spellcasting", slotLevel: 2, spent: 0 },
    ],
  };
  const derived: CharacterDerived = {
    characterId: character.id, characterRevision: character.revision, rulesetRef: character.rulesetRef,
    abilityScores: [], skills: [], savingThrows: [], armorClass: { value: 10, contributions: [] }, initiative: { value: 0, contributions: [] },
    speedsCm: [], proficiencyBonus: { value: 3, contributions: [] }, hitPointsMax: { value: 20, contributions: [] },
    resourceCapacities: [
      { definitionRef: ref("fairy.faerie-fire-use"), capacity: { value: 1, contributions: [] } },
      { definitionRef: ref("fairy.enlarge-reduce-use"), capacity: { value: 1, contributions: [] } },
    ],
    attacks: [], spellcastingSources: [], resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] }, passivePerception: { value: 10, contributions: [] },
  };
  return { character, pack, derived, sources: sourceIds, resourceStates, poolId };
}

function tirelessScenario(): { readonly character: Character; readonly pack: RulePack; readonly derived: CharacterDerived; readonly resourceId: Uuid } {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  const ref = (entityId: string) => ({ rulesetId: loaded.value.manifest.id, entityId: asEntityId(entityId) });
  const composed = composeOptionalRuleContent(loaded.value, [TASHA_RANGER_SUPPLEMENT_ID], [{
    supplementId: TASHA_RANGER_SUPPLEMENT_ID,
    optionId: asEntityId("ranger.optional-canny"),
    selectedFeatureRefs: ["ranger.canny", "ranger.roving", "ranger.tireless"].map(ref),
  }]);
  if (!composed.ok) throw new Error(composed.error.message);
  const resourceId = asUuid("55555555-5555-4555-8555-555555555501");
  const character: Character = {
    ...minimalCharacter,
    selectedSupplementIds: [TASHA_RANGER_SUPPLEMENT_ID],
    classes: [{ classId: asEntityId("ranger"), level: 10, choices: [] }],
    hp: { current: 8, temp: 0 },
    resources: [{ id: resourceId, definitionRef: ref("ranger.tireless-use"), ownerInstanceId: minimalCharacter.id, spent: 0 }],
  };
  const explanation = <T,>(value: T) => ({ value, contributions: [] });
  const derived: CharacterDerived = {
    characterId: character.id, characterRevision: character.revision, rulesetRef: character.rulesetRef,
    abilityScores: [{ ability: "wis", score: explanation(8), modifier: explanation(-1) }],
    skills: [], savingThrows: [], armorClass: explanation(10), initiative: explanation(0), speedsCm: [],
    proficiencyBonus: explanation(4), hitPointsMax: explanation(74),
    resourceCapacities: [{ definitionRef: ref("ranger.tireless-use"), capacity: explanation(4) }],
    attacks: [], spellcastingSources: [], resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] },
    passivePerception: explanation(10),
  };
  return { character, pack: composed.value, derived, resourceId };
}

function reinforcementScenario(): { readonly character: Character; readonly pack: RulePack; readonly derived: CharacterDerived; readonly sourceId: Uuid; readonly resourceId: Uuid; readonly poolId: Uuid } {
  const loaded = loadPhbPtBrLocal2017();
  if (!loaded.ok) throw new Error(loaded.error.message);
  const ref = (entityId: string) => ({ rulesetId: loaded.value.manifest.id, entityId: asEntityId(entityId) });
  const composed = composeOptionalRuleContent(loaded.value, [TASHA_RANGER_SUPPLEMENT_ID], []);
  if (!composed.ok) throw new Error(composed.error.message);
  const sourceId = asUuid("66666666-6666-4666-8666-666666666601");
  const resourceId = asUuid("66666666-6666-4666-8666-666666666602");
  const poolId = asUuid("66666666-6666-4666-8666-666666666603");
  const spellRef = ref("invocar-feerico");
  const source: Character["castingSources"][number] = {
    id: sourceId, grantingRef: ref("fey-wanderer-fey-reinforcements"), sourceKind: "feature", ability: "wis",
    knownSpellRefs: [spellRef], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [poolId],
    featureResourceId: resourceId, requiresFeatureResource: true, usesSpellSlots: true, spellListClassId: asEntityId("ranger"),
    featureSpellOverrides: [{ spellRef, ignoreMaterialComponents: true, concentrationAlternativeMinutes: 1 }],
  };
  const character: Character = {
    ...minimalCharacter,
    selectedSupplementIds: [TASHA_RANGER_SUPPLEMENT_ID],
    classes: [{ classId: asEntityId("ranger"), subclassId: asEntityId("fey-wanderer"), level: 11, choices: [] }],
    castingSources: [source],
    resources: [{ id: resourceId, definitionRef: ref("fey-wanderer.fey-reinforcements-use"), ownerInstanceId: sourceId, spent: 0 }],
    spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 3, spent: 0 }],
    concentration: { effectId: asUuid("66666666-6666-4666-8666-666666666604"), sourceRef: ref("prior-spell"), duration: { kind: "minutes", value: 10 }, pendingSaveIds: [] },
  };
  const explanation = <T,>(value: T) => ({ value, contributions: [] });
  const derived: CharacterDerived = {
    characterId: character.id, characterRevision: character.revision, rulesetRef: character.rulesetRef,
    abilityScores: [{ ability: "wis", score: explanation(14), modifier: explanation(2) }], skills: [], savingThrows: [],
    armorClass: explanation(10), initiative: explanation(2), speedsCm: [], proficiencyBonus: explanation(4), hitPointsMax: explanation(88),
    resourceCapacities: [{ definitionRef: ref("fey-wanderer.fey-reinforcements-use"), capacity: explanation(1) }],
    attacks: [], spellcastingSources: [], resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] },
    passivePerception: explanation(12),
  };
  return { character, pack: composed.value, derived, sourceId, resourceId, poolId };
}

const clock: Clock = { now: () => asIsoTimestamp("2024-01-01T00:00:00.000Z") };

function fakeIdGenerator(): IdGenerator {
  let n = 0;
  return { uuid: () => asUuid(`00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`), commandId: () => asCommandId(`cmd-${++n}`) };
}

/** Repositório fake: `save` grava num spy para inspeção; `get` sempre resolve com `character`. */
function fakeRepository(character: Character, saveResult: Result<Revision, AppError> = ok(asRevision((character.revision as unknown as number) + 1))) {
  const saves: { readonly character: Character; readonly expectedRevision: Revision; readonly receipt?: CommandReceipt }[] = [];
  const repository: CharacterRepository = {
    get: async () => ok(character),
    list: async (): Promise<Result<readonly CharacterSummary[], AppError>> => ok([]),
    save: async (nextCharacter, expectedRevision, receipt) => {
      saves.push({ character: nextCharacter, expectedRevision, receipt });
      return saveResult;
    },
    delete: async () => ok(undefined),
    getDraft: async () => err({ code: "not-found", entity: "draft", id: "n/a", message: "sem rascunho" } as AppError),
    listDrafts: async () => ok([]),
    saveDraft: async (draft: CharacterDraft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
  return { repository, saves };
}

async function activeService(character: Character, saveResult?: Result<Revision, AppError>) {
  const { repository, saves } = fakeRepository(character, saveResult);
  const service = createCharacterApplicationService({ repository, debounceMs: 0, commandDependencies: { clock } });
  const selected = await service.select(character.id);
  expect(selected.ok).toBe(true);
  return { service, saves };
}

async function persistentService(character: Character, rejectSave = false) {
  let persisted = character;
  const saves: { readonly character: Character; readonly expectedRevision: Revision; readonly receipt?: CommandReceipt }[] = [];
  const base = fakeRepository(character).repository;
  const repository: CharacterRepository = {
    ...base,
    get: async () => ok(persisted),
    save: async (next, expectedRevision, receipt) => {
      saves.push({ character: next, expectedRevision, receipt });
      if (rejectSave) return err(appError.conflict(expectedRevision, asRevision(Number(expectedRevision) + 1), "revisão concorrente"));
      if (expectedRevision !== persisted.revision) return err(appError.conflict(expectedRevision, persisted.revision));
      persisted = { ...next, revision: asRevision(Number(expectedRevision) + 1) };
      return ok(persisted.revision);
    },
  };
  const service = createCharacterApplicationService({ repository, debounceMs: 0, commandDependencies: { clock } });
  const selected = await service.select(character.id);
  expect(selected.ok).toBe(true);
  return { service, saves, persisted: () => persisted };
}

function buildAttackExecution(
  character: Character,
  options: { readonly forwardTargetArmorClass?: boolean } = {},
): { readonly execution: ActionCapabilityExecution; readonly attackRollId: Uuid; readonly damageRollId: Uuid } {
  const attackRollId = asUuid("11111111-1111-4111-8111-000000000001");
  const damageRollId = asUuid("11111111-1111-4111-8111-000000000002");
  const command: Command = {
    commandId: asCommandId("cmd-attack-1"),
    characterId: character.id,
    expectedRevision: character.revision,
    kind: "resolve-attack",
    payload: {
      attackSourceRef: { rulesetId: character.rulesetRef.id, entityId: asEntityId("dagger") },
      targetId: character.id,
      attackRollId,
      damageRollIds: [damageRollId],
    },
  };
  const execution: ActionCapabilityExecution = {
    command,
    rollPlan: [
      { id: attackRollId, expression: { quantity: 1, faces: 20, modifier: 5, mode: "normal" }, purpose: "attack" },
      { id: damageRollId, expression: { quantity: 1, faces: 8, modifier: 3, mode: "normal" }, purpose: "damage" },
    ],
    // Por padrão fixa CA 10 (comportamento das versões anteriores dos testes deste arquivo);
    // `forwardTargetArmorClass` encaminha o valor recebido de `resolve(...)`, imitando o que
    // `action-capabilities.ts` faz de verdade (ver testes "repassa targetArmorClass...").
    resolve: ({ character: liveCharacter, rolls, targetArmorClass }) =>
      resolveCombatCommand(liveCharacter, command, {
        diceResults: rolls,
        damageTypes: new Map([[damageRollId, "piercing"]]),
        targetArmorClass: options.forwardTargetArmorClass ? targetArmorClass : 10,
        maximumHitPoints: 20,
      }),
  };
  return { execution, attackRollId, damageRollId };
}

describe("createActionDispatcher", () => {
  describe("Incansável com RulePack Tasha e fluxo real de confirmação", () => {
    function tirelessExecutionFor(scenario: ReturnType<typeof tirelessScenario>) {
      const { executions } = deriveActionCapabilities(scenario.character, scenario.derived, scenario.pack, fakeIdGenerator());
      const execution = executions.get(`resource:${scenario.resourceId}`);
      if (!execution || execution.command.kind !== "use-tireless") throw new Error("A capacidade de Incansável não foi derivada.");
      return execution;
    }

    it("confirma rollPlan d8 e grava gasto + PV temporários num único commit", async () => {
      const scenario = tirelessScenario();
      const { service, saves, persisted } = await persistentService(scenario.character);
      const execution = tirelessExecutionFor(scenario);
      const commitSpy = vi.spyOn(service.commands!, "commit");
      const dispatch = createActionDispatcher({
        characterService: service,
        capabilitiesById: new Map([[`resource:${scenario.resourceId}`, execution]]),
        rng: createSequenceRandomSource([1]), idGenerator: fakeIdGenerator(), clock,
      });

      const result = await dispatch({
        commandId: execution.command.commandId, characterId: scenario.character.id,
        capabilityId: `resource:${scenario.resourceId}`, kind: "resource",
      }) as RuleResult;

      expect(result.status).toBe("success");
      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect(commitSpy.mock.calls[0]?.[0]).toMatchObject({ kind: "use-tireless", payload: { rollId: execution.command.payload.rollId } });
      expect(commitSpy.mock.calls[0]?.[2]).toHaveLength(1);
      expect(saves).toHaveLength(1);
      expect(saves[0]?.character.resources.find(({ id }) => id === scenario.resourceId)?.spent).toBe(1);
      expect(saves[0]?.character.hp.temp).toBe(1); // 1d8 mínimo 1 + SAB -1, com resultado mínimo 1
      expect(persisted().resources.find(({ id }) => id === scenario.resourceId)?.spent).toBe(1);
      expect(persisted().hp.temp).toBe(1);
    });

    it("dados inválidos e rollId sem resultado retornam sem gasto nem PV parcial", async () => {
      const scenario = tirelessScenario();
      const execution = tirelessExecutionFor(scenario);

      const invalid = await persistentService(scenario.character);
      const invalidDispatch = createActionDispatcher({
        characterService: invalid.service,
        capabilitiesById: new Map([[`resource:${scenario.resourceId}`, execution]]),
        rng: { nextInt: () => 9 }, idGenerator: fakeIdGenerator(), clock,
      });
      const invalidResult = await invalidDispatch({ commandId: execution.command.commandId, characterId: scenario.character.id, capabilityId: `resource:${scenario.resourceId}`, kind: "resource" }) as RuleResult;
      expect(invalidResult.status).toBe("rejected");
      expect(invalid.saves).toHaveLength(0);
      expect(invalid.persisted().resources[0]?.spent).toBe(0);
      expect(invalid.persisted().hp.temp).toBe(0);

      const missing = await persistentService(scenario.character);
      if (execution.command.kind !== "use-tireless") throw new Error("Comando inesperado.");
      const mismatchedRoll = asUuid("55555555-5555-4555-8555-555555555599");
      const staleExecution: ActionCapabilityExecution = {
        ...execution,
        command: { ...execution.command, payload: { ...execution.command.payload, rollId: mismatchedRoll } },
      };
      const missingDispatch = createActionDispatcher({
        characterService: missing.service,
        capabilitiesById: new Map([[`resource:${scenario.resourceId}`, staleExecution]]),
        rng: createSequenceRandomSource([1]), idGenerator: fakeIdGenerator(), clock,
      });
      const missingResult = await missingDispatch({ commandId: execution.command.commandId, characterId: scenario.character.id, capabilityId: `resource:${scenario.resourceId}`, kind: "resource" }) as RuleResult;
      expect(missingResult.status).toBe("needsInput");
      expect(missing.saves).toHaveLength(0);
      expect(missing.persisted().resources[0]?.spent).toBe(0);
      expect(missing.persisted().hp.temp).toBe(0);
    });

    it("cancelamento não rola nem despacha; conflito CAS não publica gasto/PV", async () => {
      const scenario = tirelessScenario();
      const execution = tirelessExecutionFor(scenario);

      const canceled = await persistentService(scenario.character);
      const nextInt = vi.fn(() => 1);
      const cancelDispatch = createActionDispatcher({
        characterService: canceled.service,
        capabilitiesById: new Map([[`resource:${scenario.resourceId}`, execution]]),
        rng: { nextInt }, idGenerator: fakeIdGenerator(), clock,
      });
      void cancelDispatch; // A UI cancela sem invocar onIntent/dispatch.
      expect(nextInt).not.toHaveBeenCalled();
      expect(canceled.saves).toHaveLength(0);
      expect(canceled.persisted().resources[0]?.spent).toBe(0);
      expect(canceled.persisted().hp.temp).toBe(0);

      const conflict = await persistentService(scenario.character, true);
      const conflictDispatch = createActionDispatcher({
        characterService: conflict.service,
        capabilitiesById: new Map([[`resource:${scenario.resourceId}`, execution]]),
        rng: createSequenceRandomSource([1]), idGenerator: fakeIdGenerator(), clock,
      });
      const conflictResult = await conflictDispatch({ commandId: execution.command.commandId, characterId: scenario.character.id, capabilityId: `resource:${scenario.resourceId}`, kind: "resource" }) as RuleResult;
      expect(conflictResult.status).toBe("rejected");
      expect(conflict.saves).toHaveLength(1); // tentativa atômica do command service, rejeitada pelo CAS
      expect(conflict.persisted().resources[0]?.spent).toBe(0);
      expect(conflict.persisted().hp.temp).toBe(0);
      expect(conflict.service.store.getSnapshot().value?.resources[0]?.spent).toBe(0);
      expect(conflict.service.store.getSnapshot().value?.hp.temp).toBe(0);
    });
  });

  describe("magias concedidas: custos, alvo e componentes passam ao mesmo commit", () => {
    it("usa o resolver canônico para restringir conjuração na Forma Selvagem pelo dispatcher real", async () => {
      const loaded = loadPhbPtBrLocal2017();
      if (!loaded.ok) throw new Error(loaded.error.message);
      const pack = loaded.value;
      const ref = (entityId: string) => ({ rulesetId: pack.manifest.id, entityId: asEntityId(entityId) });
      const poolId = asUuid("77777777-7777-4777-8777-777777777771");
      const sourceId = asUuid("77777777-7777-4777-8777-777777777772");
      const makeSpell = (id: string, material = false): SpellDefinition => ({
        ...spellCureWounds,
        id: asEntityId(id), name: id, level: 1, classes: [asEntityId("druid")],
        components: { verbal: true, somatic: true, ...(material ? { material: { descriptionSummary: "um pouco de barro", consumed: false } } : {}) },
        range: { kind: "touch" }, targetType: { type: "creature", count: 1, restrictions: [], visibilityRequired: false },
        damage: [], healing: [], effects: [], automationStatus: "automated", pendingDecisionIds: [],
      });
      const verbalSomatic = makeSpell("druid-form-vs");
      const materialSpell = makeSpell("druid-form-m", true);
      const spellPack: RulePack = {
        ...pack,
        spells: new Map([...pack.spells, [verbalSomatic.id, verbalSomatic], [materialSpell.id, materialSpell]]),
      };

      const run = async (level: number, spell: SpellDefinition) => {
        const character: Character = {
          ...minimalCharacter,
          hp: { current: 10, temp: 0 },
          classes: [{ classId: asEntityId("druid"), level, choices: [] }],
          castingSources: [{
            id: sourceId, grantingRef: ref("druid"), sourceKind: "class", ability: "wis",
            knownSpellRefs: [], preparedSpellRefs: [ref(String(spell.id))], spellbookRefs: [], resourcePoolIds: [poolId],
          }],
          spellSlots: [{ poolId, kind: "spellcasting", slotLevel: 1, spent: 0 }],
          transformation: {
            id: asUuid("77777777-7777-4777-8777-777777777773"), formRef: ref("wild-shape-form"), originalSnapshotRef: minimalCharacter.id,
            originalMaximumHitPoints: 10, formMaximumHitPoints: 8, formHp: { current: 8, temp: 0 },
            duration: { kind: "hours", value: 1 }, equipmentDisposition: "stored", retainedFeatureIds: [],
          },
        };
        const derived: CharacterDerived = {
          characterId: character.id, characterRevision: character.revision, rulesetRef: character.rulesetRef,
          abilityScores: [], skills: [], savingThrows: [], armorClass: { value: 10, contributions: [] }, initiative: { value: 0, contributions: [] },
          speedsCm: [], proficiencyBonus: { value: 2, contributions: [] }, hitPointsMax: { value: 10, contributions: [] },
          resourceCapacities: [], attacks: [], spellcastingSources: [],
          resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] }, passivePerception: { value: 10, contributions: [] },
        };
        const { capabilities, executions } = deriveActionCapabilities(character, derived, spellPack, fakeIdGenerator());
        const capabilityId = `spell:${sourceId}:${spell.id}:slot`;
        expect(capabilities.find(({ id }) => id === capabilityId)?.status, JSON.stringify(capabilities.find(({ id }) => id === capabilityId))).toBe("available");
        const execution = executions.get(capabilityId)!;
        const active = await persistentService(character);
        const dispatch = createActionDispatcher({
          characterService: active.service, capabilitiesById: executions, rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock,
        });
        const result = await dispatch({
          commandId: execution.command.commandId, characterId: character.id, capabilityId, kind: "spell",
          spellTargetContext: { targetIds: [character.id] }, spellComponentContext: { materialProvided: false, focusUsed: false },
        }) as RuleResult;
        return { result, active };
      };

      const lowLevel = await run(2, verbalSomatic);
      expect(lowLevel.result.status).toBe("rejected");
      expect(lowLevel.active.saves).toHaveLength(0);
      expect(lowLevel.active.persisted().spellSlots[0]?.spent).toBe(0);

      const level18Vs = await run(18, verbalSomatic);
      expect(level18Vs.result.status, JSON.stringify(level18Vs.result)).toBe("success");
      expect(level18Vs.active.persisted().spellSlots[0]?.spent).toBe(1);

      const level18Material = await run(18, materialSpell);
      expect(level18Material.result.status).toBe("rejected");
      expect(level18Material.active.saves).toHaveLength(0);
      expect(level18Material.active.persisted().spellSlots[0]?.spent).toBe(0);

      const level20Material = await run(20, materialSpell);
      expect(level20Material.result.status, JSON.stringify(level20Material.result)).toBe("success");
      expect(level20Material.active.persisted().spellSlots[0]?.spent).toBe(1);
    });

    it("mantém cantrips extraídos bloqueados até existir estrutura de resolução", () => {
      const loaded = loadPhbPtBrLocal2017();
      if (!loaded.ok) throw new Error(loaded.error.message);
      const basePack = loaded.value;
      const ref = (entityId: string) => ({ rulesetId: basePack.manifest.id, entityId: asEntityId(entityId) });
      const druidSpell = basePack.spells.get(asEntityId("druidismo"));
      const warriorSpell = basePack.spells.get(asEntityId("bordao-mistico"));
      if (!druidSpell || !warriorSpell) throw new Error("Faltam definições reais dos truques de Druida/Guerreiro Druídico");
      expect(druidSpell).toMatchObject({ automationStatus: "blocked", pendingDecisionIds: expect.arrayContaining(["PEND-SPELL-STRUCTURE"]) });
      expect(warriorSpell).toMatchObject({ automationStatus: "blocked", pendingDecisionIds: expect.arrayContaining(["PEND-SPELL-STRUCTURE"]) });
      const tashaSelections = [
        { supplementId: TASHA_RANGER_SUPPLEMENT_ID, optionId: asEntityId("ranger.optional-fighting-style"), selectedFeatureRefs: [] },
        { supplementId: TASHA_RANGER_SUPPLEMENT_ID, optionId: asEntityId("ranger.optional-druidic-focus"), selectedFeatureRefs: [ref("ranger.druidic-focus")] },
      ];
      const composed = composeOptionalRuleContent(basePack, [TASHA_RANGER_SUPPLEMENT_ID], tashaSelections);
      if (!composed.ok) throw new Error(composed.error.message);
      const pack = composed.value;
      const poolId = asUuid("77777777-7777-4777-8777-777777777781");
      const derived = (character: Character): CharacterDerived => ({
        characterId: character.id, characterRevision: character.revision, rulesetRef: character.rulesetRef,
        abilityScores: [], skills: [], savingThrows: [], armorClass: { value: 10, contributions: [] }, initiative: { value: 0, contributions: [] },
        speedsCm: [], proficiencyBonus: { value: 2, contributions: [] }, hitPointsMax: { value: 10, contributions: [] },
        resourceCapacities: [], attacks: [], spellcastingSources: [],
        resistanceProfile: { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] }, passivePerception: { value: 10, contributions: [] },
      });
      const capabilitiesFor = (character: Character, spellId: string, rulePack: RulePack) => {
        const { capabilities, executions } = deriveActionCapabilities(character, derived(character), rulePack, fakeIdGenerator());
        const capabilityId = `spell:${character.castingSources[0]!.id}:${spellId}`;
        return { capability: capabilities.find(({ id }) => id === capabilityId), canDispatch: executions.has(capabilityId) };
      };

      const druidSourceId = asUuid("77777777-7777-4777-8777-777777777782");
      const druid: Character = {
        ...minimalCharacter,
        classes: [{ classId: asEntityId("druid"), level: 1, choices: [] }],
        castingSources: [{
          id: druidSourceId, grantingRef: ref("druid"), sourceKind: "class", ability: "wis",
          knownSpellRefs: [ref("druidismo")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
        }],
      };
      expect(capabilitiesFor(druid, "druidismo", basePack)).toMatchObject({
        capability: { status: "blocked", blockedReason: expect.stringContaining("PEND-SPELL-STRUCTURE") }, canDispatch: false,
      });

      const warriorSourceId = asUuid("77777777-7777-4777-8777-777777777783");
      const warrior: Character = {
        ...minimalCharacter,
        selectedSupplementIds: [TASHA_RANGER_SUPPLEMENT_ID],
        optionalRuleSelections: tashaSelections,
        classes: [{
          classId: asEntityId("ranger"), level: 2, choices: [
            { choiceId: "ranger.fighting-style.2", selectedIds: [ref("ranger.druidic-warrior")], grantedAtLevel: 2, grantingRef: ref("ranger.fighting-style") },
            { choiceId: "ranger.cantrips.2", selectedIds: [ref("bordao-mistico")], grantedAtLevel: 2, grantingRef: ref("ranger.druidic-warrior") },
          ],
        }],
        castingSources: [{
          id: warriorSourceId, grantingRef: ref("ranger.druidic-warrior"), sourceKind: "feature", ability: "wis",
          spellListClassId: asEntityId("druid"), knownSpellRefs: [ref("bordao-mistico")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [],
        }],
      };
      expect(capabilitiesFor(warrior, "bordao-mistico", pack)).toMatchObject({
        capability: {
          status: "blocked", blockedReason: expect.stringContaining("PEND-SPELL-STRUCTURE"),
          spellRequiresMaterial: true, spellAllowsFocus: true, spellMaterialRequiresTrackedItem: false,
        }, canDispatch: false,
      });
    });

    it("registra Druidismo concedido à Fada real sem slot, recurso ou efeito automático", async () => {
      const loaded = loadPhbPtBrLocal2017();
      if (!loaded.ok) throw new Error(loaded.error.message);
      const basePack = loaded.value;
      const fairyId = asEntityId("fairy-supplement");
      const ref = (entityId: string) => ({ rulesetId: basePack.manifest.id, entityId: asEntityId(entityId) });
      const characterDraft = createCharacterDraft({
        id: asUuid("77777777-7777-4777-8777-777777777784"),
        rulesetRef: { id: asRulesetId(String(basePack.manifest.id)), version: asPackVersion(String(basePack.manifest.version)) },
        createdAt: asIsoTimestamp("2024-01-01T00:00:00.000Z"),
        partial: {
          name: "Fada de teste",
          raceRef: ref("fairy"),
          classes: [{ classId: asEntityId("fighter"), level: 1, choices: [] }],
          selectedSupplementIds: [fairyId],
          optionalRuleSelections: [],
          abilityGeneration: { method: "manual", baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 } },
          choices: [
            { choiceId: "fighter.fighting-style.1", selectedIds: [ref("fighting-style.defense")], grantedAtLevel: 1, grantingRef: ref("fighter") },
            { choiceId: "fairy.spellcasting-ability", selectedIds: [ref("wis")], grantedAtLevel: 1, grantingRef: ref("fairy") },
          ],
        },
      });
      expect(characterDraft.ok).toBe(true);
      if (!characterDraft.ok) return;
      const created = materializeCharacter({ rulePack: basePack, equipmentBundles }, characterDraft.value);
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const character = created.value.character;
      const composition = composeOptionalRuleContent(basePack, [fairyId], []);
      if (!composition.ok) throw new Error(composition.error.message);
      const pack = composition.value;
      const source = character.castingSources.find(({ grantingRef }) => String(grantingRef.entityId) === "fairy.magic-druidcraft");
      expect(source?.knownSpellRefs).toContainEqual(ref("druidismo"));
      expect(character.resources.some(({ definitionRef }) => String(definitionRef.entityId).startsWith("fairy."))).toBe(false);
      expect(character.spellSlots).toEqual([]);
      const derived = deriveCharacter(character, pack, { availableActions: [], tablePolicies: [] });
      expect(derived.ok).toBe(true);
      if (!derived.ok) return;

      const { capabilities, executions } = deriveActionCapabilities(character, derived.value, pack, fakeIdGenerator());
      const capabilityId = `spell:${source!.id}:druidismo`;
      const capability = capabilities.find(({ id }) => id === capabilityId);
      expect(capability).toMatchObject({
        status: "available",
        costs: [{ label: "Custo", value: "Sem gasto" }],
        description: expect.stringContaining("assistidos pela mesa"),
      });
      const execution = executions.get(capabilityId);
      expect(execution).toBeDefined();
      if (!execution) return;
      const active = await persistentService(character);
      const dispatch = createActionDispatcher({
        characterService: active.service,
        capabilitiesById: executions,
        rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(),
        clock,
      });
      const result = await dispatch({
        commandId: execution.command.commandId,
        characterId: character.id,
        capabilityId,
        kind: "spell",
        spellTargetContext: { targetIds: [character.id] },
        spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(result.status, JSON.stringify(result)).toBe("success");
      if (result.status !== "success") return;
      expect(result.effects).toEqual([]);
      expect(result.nextState.resources).toEqual(character.resources);
      expect(result.nextState.spellSlots).toEqual(character.spellSlots);
      expect(active.saves).toHaveLength(1);
    });

    it("preserva custo de ação bônus em Healing Word e Passo Nebuloso, inclusive com prévia pending", () => {
      const base = fairySpellScenario();
      const sourceId = asUuid("77777777-7777-4777-8777-777777777701");
      const ref = (entityId: string) => ({ rulesetId: base.pack.manifest.id, entityId: asEntityId(entityId) });
      const source = {
        id: sourceId, grantingRef: ref("bard"), sourceKind: "class" as const, ability: "cha" as const,
        knownSpellRefs: [ref("healing-word"), ref("passo-nebuloso")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [base.poolId],
      };
      const character: Character = {
        ...base.character,
        classes: [{ classId: asEntityId("bard"), level: 5, choices: [] }],
        castingSources: [source],
        spellSlots: [
          { poolId: base.poolId, kind: "spellcasting", slotLevel: 1, spent: 0 },
          { poolId: base.poolId, kind: "spellcasting", slotLevel: 2, spent: 0 },
        ],
      };
      const { capabilities } = deriveActionCapabilities(character, base.derived, base.pack, fakeIdGenerator());
      const healingWord = capabilities.find(({ id }) => id === `spell:${sourceId}:healing-word:slot`);
      expect(healingWord).toMatchObject({ actionCost: "bonus-action", status: "available" });
      expect(healingWord?.preview).toMatchObject({ status: "needsInput", preview: { castPreview: { actionCost: { kind: "bonus-action" } } } });
      const mistyStep = capabilities.find(({ id }) => id === `spell:${sourceId}:passo-nebuloso`);
      expect(mistyStep).toMatchObject({ actionCost: "bonus-action", status: "blocked" });
    });

    it("Fada oferece opções gratuitas e por espaço distintas; Fogo das Fadas registra o alvo escolhido", async () => {
      const scenario = fairySpellScenario();
      const { capabilities, executions } = deriveActionCapabilities(scenario.character, scenario.derived, scenario.pack, fakeIdGenerator());
      const featureId = `spell:${scenario.sources["fogo-das-fadas"]}:fogo-das-fadas:feature`;
      const slotId = `spell:${scenario.sources["fogo-das-fadas"]}:fogo-das-fadas:slot`;
      expect(capabilities.find(({ id }) => id === featureId)).toMatchObject({ status: "available", label: expect.stringContaining("uso gratuito") });
      expect(capabilities.find(({ id }) => id === slotId)).toMatchObject({ status: "available", label: expect.stringContaining("espaço") });

      const exhaustedCharacter = {
        ...scenario.character,
        resources: scenario.character.resources.map((resource) => resource.id === scenario.resourceStates["fogo-das-fadas"] ? { ...resource, spent: 1 } : resource),
      };
      const exhausted = deriveActionCapabilities(exhaustedCharacter, scenario.derived, scenario.pack, fakeIdGenerator()).capabilities;
      expect(exhausted.find(({ id }) => id === featureId)).toMatchObject({ status: "blocked", blockedReason: expect.stringContaining("gastos") });
      expect(exhausted.find(({ id }) => id === slotId)?.status).toBe("available");

      const freeService = await activeService(scenario.character);
      const freeExecution = executions.get(featureId)!;
      const freeCommit = vi.spyOn(freeService.service.commands!, "commit");
      const freeDispatch = createActionDispatcher({
        characterService: freeService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(), clock,
      });
      const targetContext = { targetIds: [scenario.character.id] };
      const noTarget = await freeDispatch({
        commandId: freeExecution.command.commandId, characterId: scenario.character.id, capabilityId: featureId, kind: "spell",
        spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(noTarget.status).toBe("rejected");
      expect(freeService.saves).toHaveLength(0);
      const freeResult = await freeDispatch({
        commandId: freeExecution.command.commandId, characterId: scenario.character.id, capabilityId: featureId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(freeResult.status, JSON.stringify(freeResult)).toBe("success");
      expect(freeService.saves).toHaveLength(1);
      expect(freeService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceStates["fogo-das-fadas"])?.spent).toBe(1);
      expect(freeService.saves[0]?.character.spellSlots[0]?.spent).toBe(0);
      expect(freeCommit.mock.calls[0]?.[0]).toMatchObject({ kind: "cast-spell", payload: { targetContext, componentContext: { materialProvided: false, focusUsed: false } } });

      const slotService = await activeService(scenario.character);
      const slotExecution = executions.get(slotId)!;
      const slotCommit = vi.spyOn(slotService.service.commands!, "commit");
      const slotDispatch = createActionDispatcher({
        characterService: slotService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(), clock,
      });
      const slotResult = await slotDispatch({
        commandId: slotExecution.command.commandId, characterId: scenario.character.id, capabilityId: slotId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(slotResult.status).toBe("success");
      expect(slotService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceStates["fogo-das-fadas"])?.spent).toBe(0);
      expect(slotService.saves[0]?.character.spellSlots[0]?.spent).toBe(1);
      expect(slotCommit.mock.calls[0]?.[0]).toMatchObject({ kind: "cast-spell", payload: { targetContext } });

      const higherSlotCharacter: Character = {
        ...scenario.character,
        resources: scenario.character.resources.map((resource) => resource.id === scenario.resourceStates["fogo-das-fadas"] ? { ...resource, spent: 1 } : resource),
        spellSlots: [
          { poolId: scenario.poolId, kind: "spellcasting", slotLevel: 1, spent: 1 },
          { poolId: scenario.poolId, kind: "spellcasting", slotLevel: 2, spent: 0 },
        ],
      };
      expect(scenario.pack.spells.get(asEntityId("fogo-das-fadas"))?.higherLevels.kind).toBe("none");
      const higher = deriveActionCapabilities(higherSlotCharacter, scenario.derived, scenario.pack, fakeIdGenerator());
      expect(higher.capabilities.find(({ id }) => id === featureId)?.status).toBe("blocked");
      expect(higher.capabilities.find(({ id }) => id === slotId)).toMatchObject({ status: "available", label: expect.stringContaining("2º nível") });
      const higherService = await activeService(higherSlotCharacter);
      const higherExecution = higher.executions.get(slotId)!;
      const higherCommit = vi.spyOn(higherService.service.commands!, "commit");
      const higherDispatch = createActionDispatcher({
        characterService: higherService.service, capabilitiesById: higher.executions, rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(), clock,
      });
      const higherResult = await higherDispatch({
        commandId: higherExecution.command.commandId, characterId: higherSlotCharacter.id, capabilityId: slotId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(higherResult.status, JSON.stringify(higherResult)).toBe("success");
      expect(higherCommit.mock.calls[0]?.[0]).toMatchObject({ kind: "cast-spell", payload: { slotLevel: 2 } });
      expect(higherService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceStates["fogo-das-fadas"])?.spent).toBe(1);
      expect(higherService.saves[0]?.character.spellSlots.map(({ spent }) => spent)).toEqual([1, 1]);
      expect(higherService.saves[0]?.character.hp).toEqual(higherSlotCharacter.hp);
    });

    it("mantém material de custo/consumo bloqueado sem seletor de item rastreável", () => {
      const base = fairySpellScenario();
      const sourceId = asUuid("77777777-7777-4777-8777-777777777702");
      const ref = (entityId: string) => ({ rulesetId: base.pack.manifest.id, entityId: asEntityId(entityId) });
      const character: Character = {
        ...base.character,
        classes: [{ classId: asEntityId("cleric"), level: 5, choices: [] }],
        castingSources: [{
          id: sourceId, grantingRef: ref("cleric"), sourceKind: "class", ability: "wis",
          knownSpellRefs: [ref("revivify")], preparedSpellRefs: [], spellbookRefs: [], resourcePoolIds: [base.poolId],
        }],
        spellSlots: [{ poolId: base.poolId, kind: "spellcasting", slotLevel: 3, spent: 0 }],
      };
      const { capabilities, executions } = deriveActionCapabilities(character, base.derived, base.pack, fakeIdGenerator());
      const id = `spell:${sourceId}:revivify:slot`;
      expect(capabilities.find(({ id: candidate }) => candidate === id)).toMatchObject({
        status: "blocked", blockedReason: expect.stringContaining("item/custo rastreável"),
        spellRequiresMaterial: true, spellMaterialRequiresTrackedItem: true, spellAllowsFocus: false,
      });
      expect(executions.has(id)).toBe(false);
    });

    it("Aumentar/reduzir exige alvo e material explícitos e consome só o modo escolhido", async () => {
      const scenario = fairySpellScenario();
      const { capabilities, executions } = deriveActionCapabilities(scenario.character, scenario.derived, scenario.pack, fakeIdGenerator());
      const featureId = `spell:${scenario.sources["aumentar-reduzir"]}:aumentar-reduzir:feature`;
      const slotId = `spell:${scenario.sources["aumentar-reduzir"]}:aumentar-reduzir:slot`;
      const targetContext = { targetIds: [scenario.character.id] };

      const freeService = await activeService(scenario.character);
      const freeExecution = executions.get(featureId)!;
      const freeDispatch = createActionDispatcher({
        characterService: freeService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(), clock,
      });
      const missingMaterial = await freeDispatch({
        commandId: freeExecution.command.commandId, characterId: scenario.character.id, capabilityId: featureId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(missingMaterial.status).toBe("rejected");
      expect(freeService.saves).toHaveLength(0);
      expect(scenario.character.resources.find(({ id }) => id === scenario.resourceStates["aumentar-reduzir"])?.spent).toBe(0);

      const freeResult = await freeDispatch({
        commandId: freeExecution.command.commandId, characterId: scenario.character.id, capabilityId: featureId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: true, focusUsed: false },
      }) as RuleResult;
      expect(freeResult.status).toBe("success");
      expect(freeService.saves).toHaveLength(1);
      expect(freeService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceStates["aumentar-reduzir"])?.spent).toBe(1);
      expect(freeService.saves[0]?.character.spellSlots[1]?.spent).toBe(0);

      const slotService = await activeService(scenario.character);
      const slotExecution = executions.get(slotId)!;
      const slotCommit = vi.spyOn(slotService.service.commands!, "commit");
      const slotDispatch = createActionDispatcher({
        characterService: slotService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]),
        idGenerator: fakeIdGenerator(), clock,
      });
      const slotResult = await slotDispatch({
        commandId: slotExecution.command.commandId, characterId: scenario.character.id, capabilityId: slotId, kind: "spell",
        spellTargetContext: targetContext, spellComponentContext: { materialProvided: true, focusUsed: false },
      }) as RuleResult;
      expect(slotResult.status).toBe("success");
      expect(slotService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceStates["aumentar-reduzir"])?.spent).toBe(0);
      expect(slotService.saves[0]?.character.spellSlots[1]?.spent).toBe(1);
      expect(slotCommit.mock.calls[0]?.[0]).toMatchObject({ kind: "cast-spell", payload: { targetContext, componentContext: { materialProvided: true, focusUsed: false } } });
    });

    it("Reforço Feérico aplica custo livre ou slot, dispensa M e preserva a concentração anterior", async () => {
      const scenario = reinforcementScenario();
      const { capabilities, executions } = deriveActionCapabilities(scenario.character, scenario.derived, scenario.pack, fakeIdGenerator());
      const featureId = `spell:${scenario.sourceId}:invocar-feerico:feature`;
      const slotId = `spell:${scenario.sourceId}:invocar-feerico:slot`;
      const option = { kind: "drop-concentration" as const, durationMinutes: 1 };
      expect(capabilities.find(({ id }) => id === featureId)).toMatchObject({ status: "available", spellRequiresMaterial: false, spellMaterialRequiresTrackedItem: false, featureCastingOptions: [expect.objectContaining(option)] });
      expect(capabilities.find(({ id }) => id === slotId)).toMatchObject({ status: "available", spellRequiresMaterial: false, spellMaterialRequiresTrackedItem: false, featureCastingOptions: [expect.objectContaining(option)] });

      const freeService = await activeService(scenario.character);
      const freeExecution = executions.get(featureId)!;
      const freeCommit = vi.spyOn(freeService.service.commands!, "commit");
      const freeDispatch = createActionDispatcher({ characterService: freeService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });
      const freeResult = await freeDispatch({
        commandId: freeExecution.command.commandId, characterId: scenario.character.id, capabilityId: featureId, kind: "spell",
        featureCastingOption: option, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(freeResult.status, JSON.stringify(freeResult)).toBe("success");
      expect(freeService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceId)?.spent).toBe(1);
      expect(freeService.saves[0]?.character.spellSlots[0]?.spent).toBe(0);
      expect(freeService.saves[0]?.character.concentration).toEqual(scenario.character.concentration);
      expect(freeCommit.mock.calls[0]?.[0]).toMatchObject({ kind: "cast-spell", payload: { mode: "feature", featureCastingOption: option, componentContext: { materialProvided: false, focusUsed: false } } });

      const slotService = await activeService(scenario.character);
      const slotExecution = executions.get(slotId)!;
      const slotDispatch = createActionDispatcher({ characterService: slotService.service, capabilitiesById: executions, rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });
      const slotResult = await slotDispatch({
        commandId: slotExecution.command.commandId, characterId: scenario.character.id, capabilityId: slotId, kind: "spell",
        featureCastingOption: option, spellComponentContext: { materialProvided: false, focusUsed: false },
      }) as RuleResult;
      expect(slotResult.status).toBe("success");
      expect(slotService.saves[0]?.character.resources.find(({ id }) => id === scenario.resourceId)?.spent).toBe(0);
      expect(slotService.saves[0]?.character.spellSlots[0]?.spent).toBe(1);
      expect(slotService.saves[0]?.character.concentration).toEqual(scenario.character.concentration);
    });
  });

  it("executa o rollPlan com o RNG injetado, resolve com sucesso e chama commit com os rolls corretos", async () => {
    const character: Character = { ...minimalCharacter, hp: { current: 20, temp: 0 } };
    const { service, saves } = await activeService(character);
    const { execution, attackRollId, damageRollId } = buildAttackExecution(character);

    // 1d20 -> 15 (ataque, total 15+5=20, bate CA 10, não é natural 1/20); 1d8 -> 4 (dano 4+3=7).
    const rng = createSequenceRandomSource([15, 4]);
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["attack-1", execution]]), rng, idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "attack-1", kind: "attack" }) as RuleResult;

    expect(result.status).toBe("success");
    expect(saves).toHaveLength(1);
    expect([...(saves[0].receipt?.diceRollIds ?? [])].sort()).toEqual([attackRollId, damageRollId].sort());
    if (result.status === "success") expect(result.nextState.hp.current).toBe(13); // 20 - 7
  });

  it("publica no store a revisão persistida antes da próxima ação", async () => {
    const initial: Character = { ...minimalCharacter, hp: { current: 20, temp: 0 } };
    let persisted = initial;
    const base = fakeRepository(initial).repository;
    const repository: CharacterRepository = {
      ...base,
      get: async () => ok(persisted),
      save: async (next, expectedRevision) => {
        if (expectedRevision !== persisted.revision) return err(appError.conflict(expectedRevision, persisted.revision));
        persisted = { ...next, revision: asRevision(Number(expectedRevision) + 1) };
        return ok(persisted.revision);
      },
    };
    const service = createCharacterApplicationService({ repository, debounceMs: 0, commandDependencies: { clock } });
    await service.select(initial.id);
    const command: Command = { commandId: asCommandId("cmd-refresh-1"), characterId: initial.id, expectedRevision: initial.revision, kind: "apply-damage", payload: { amount: 5, damageType: "fire", diceResultIds: [] } };
    const execution: ActionCapabilityExecution = { command, rollPlan: [], resolve: ({ character: live }) => resolveCombatCommand(live, command, { maximumHitPoints: 20 }) };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["damage-refresh", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: command.commandId, characterId: initial.id, capabilityId: "damage-refresh", kind: "damage" });
    expect(result?.status).toBe("success");
    expect(service.store.getSnapshot().value?.hp.current).toBe(15);
    expect(service.store.getSnapshot().value?.revision).toBe(asRevision(1));
    service.dispose();
  });

  it("repassa intent.value para execution.resolve (dano/cura manual)", async () => {
    const character: Character = { ...minimalCharacter };
    const { service } = await activeService(character);
    const command: Command = { commandId: asCommandId("cmd-value-1"), characterId: character.id, expectedRevision: character.revision, kind: "apply-damage", payload: { amount: 5, damageType: "bludgeoning", diceResultIds: [] } };
    const resolve = vi.fn((): RuleResult => ({ status: "rejected", errors: [{ code: "invalid-command", message: "só testando o repasse de argumentos" }], sourceRefs: [] }));
    const execution: ActionCapabilityExecution = { command, rollPlan: [], resolve };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["manual-damage", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "manual-damage", kind: "damage", value: 12 });

    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ value: 12, targetArmorClass: undefined }));
  });

  it("sem value no intent, repassa undefined (o resolvedor decide o fallback, não o dispatcher)", async () => {
    const character: Character = { ...minimalCharacter };
    const { service } = await activeService(character);
    const command: Command = { commandId: asCommandId("cmd-value-2"), characterId: character.id, expectedRevision: character.revision, kind: "apply-damage", payload: { amount: 5, damageType: "bludgeoning", diceResultIds: [] } };
    const resolve = vi.fn((): RuleResult => ({ status: "rejected", errors: [{ code: "invalid-command", message: "só testando o repasse de argumentos" }], sourceRefs: [] }));
    const execution: ActionCapabilityExecution = { command, rollPlan: [], resolve };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["manual-damage", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "manual-damage", kind: "damage" });

    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ value: undefined }));
  });

  it("repassa e persiste somente a opção de conjuração anunciada para a capacidade", async () => {
    const character: Character = { ...minimalCharacter };
    const { service, saves } = await activeService(character);
    const featureCastingOption = { kind: "drop-concentration" as const, durationMinutes: 1 };
    const command: Command = {
      commandId: asCommandId("cmd-feature-cast"), characterId: character.id, expectedRevision: character.revision,
      kind: "cast-spell", payload: {
        spellRef: { rulesetId: character.rulesetRef.id, entityId: asEntityId("fey-summon") },
        castingSourceId: asUuid("22222222-2222-4222-8222-222222222222"), mode: "normal",
        targetContext: { targetIds: [] }, componentContext: { materialProvided: false, focusUsed: false }, choices: [], diceResultIds: [],
      },
    };
    const success: RuleResult = { status: "success", nextState: character, effects: [], explanations: [], sourceRefs: [] };
    const resolve = vi.fn(() => success);
    const execution: ActionCapabilityExecution = { command, rollPlan: [], featureCastingOptions: [featureCastingOption], resolve };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["fey-summon", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "fey-summon", kind: "spell", featureCastingOption });

    expect(result?.status).toBe("success");
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({ payload: expect.objectContaining({ featureCastingOption }) }) }));
    expect(saves).toHaveLength(1);
  });

  it("rejeita opção de conjuração não anunciada antes de resolver ou consumir", async () => {
    const character: Character = { ...minimalCharacter };
    const { service, saves } = await activeService(character);
    const command: Command = { commandId: asCommandId("cmd-no-feature-cast"), characterId: character.id, expectedRevision: character.revision, kind: "apply-healing", payload: { amount: 1, diceResultIds: [] } };
    const resolve = vi.fn((): RuleResult => ({ status: "success", nextState: character, effects: [], explanations: [], sourceRefs: [] }));
    const execution: ActionCapabilityExecution = { command, rollPlan: [], resolve };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["no-option", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "no-option", kind: "spell", featureCastingOption: { kind: "drop-concentration", durationMinutes: 1 } });

    expect(result?.status).toBe("rejected");
    expect(resolve).not.toHaveBeenCalled();
    expect(saves).toHaveLength(0);
  });

  it("repassa intent.targetArmorClass para o resolvedor de ataque e persiste o resultado", async () => {
    const character: Character = { ...minimalCharacter, hp: { current: 20, temp: 0 } };
    const { service, saves } = await activeService(character);
    const { execution } = buildAttackExecution(character, { forwardTargetArmorClass: true });
    const rng = createSequenceRandomSource([15, 4]);
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["attack-1", execution]]), rng, idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "attack-1", kind: "attack", targetArmorClass: 10 }) as RuleResult;

    expect(result.status).toBe("success");
    expect(saves).toHaveLength(1);
    if (result.status === "success") expect(result.nextState.hp.current).toBe(13); // 20 - 7, igual ao teste com CA fixa
  });

  it("sem targetArmorClass no intent, o motor de ataque devolve needsInput honesto e nada é persistido", async () => {
    const character: Character = { ...minimalCharacter, hp: { current: 20, temp: 0 } };
    const { service, saves } = await activeService(character);
    const { execution } = buildAttackExecution(character, { forwardTargetArmorClass: true });
    const rng = createSequenceRandomSource([15, 4]);
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["attack-1", execution]]), rng, idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "attack-1", kind: "attack" }) as RuleResult;

    expect(result.status).toBe("needsInput");
    expect(saves).toHaveLength(0);
  });

  it("quando o domínio rejeita, não chama commit e devolve o RuleResult rejeitado", async () => {
    const character: Character = { ...minimalCharacter };
    const { service, saves } = await activeService(character);
    const command: Command = { commandId: asCommandId("cmd-reject-1"), characterId: character.id, expectedRevision: character.revision, kind: "apply-damage", payload: { amount: 5, damageType: "fire", diceResultIds: [] } };
    const execution: ActionCapabilityExecution = {
      command,
      rollPlan: [],
      resolve: () => ({ status: "rejected", errors: [{ code: "invalid-command", message: "forçado para o teste" }], sourceRefs: [] }),
    };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["reject-1", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "reject-1", kind: "damage" }) as RuleResult;

    expect(result.status).toBe("rejected");
    expect(saves).toHaveLength(0);
  });

  it("sem characterService.commands, devolve rejected sem lançar e sem persistir", async () => {
    const character: Character = { ...minimalCharacter };
    const repository = fakeRepository(character).repository;
    // Sem commandDependencies: characterService.commands fica undefined (ver service.ts).
    const service = createCharacterApplicationService({ repository, debounceMs: 0 });
    await service.select(character.id);
    const command: Command = { commandId: asCommandId("cmd-nosave-1"), characterId: character.id, expectedRevision: character.revision, kind: "apply-healing", payload: { amount: 5, diceResultIds: [] } };
    const execution: ActionCapabilityExecution = {
      command,
      rollPlan: [],
      resolve: ({ character: liveCharacter }) => resolveCombatCommand(liveCharacter, command, { maximumHitPoints: 20 }),
    };
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["heal-1", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    let thrown: unknown;
    let result: RuleResult | void = undefined;
    try {
      result = await dispatch({ commandId: command.commandId, characterId: character.id, capabilityId: "heal-1", kind: "damage" }) as RuleResult;
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toBeUndefined();
    expect(result && "status" in result ? result.status : undefined).toBe("rejected");
  });

  it("capacidade desconhecida (ex.: expirou após recarregar) devolve rejected sem lançar", async () => {
    const character: Character = { ...minimalCharacter };
    const { service } = await activeService(character);
    const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map(), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

    const result = await dispatch({ commandId: asCommandId("cmd-missing"), characterId: character.id, capabilityId: "does-not-exist", kind: "attack" }) as RuleResult;

    expect(result.status).toBe("rejected");
  });

  it("cancelamento nunca aciona o dispatcher: não chamar a função retornada não gasta nada", async () => {
    // Actions.tsx (UI-003) só limpa estado local e chama onCancel no botão "Cancelar"; nunca
    // chama onIntent/o dispatcher. Este teste documenta a garantia do lado do dispatcher: a
    // única forma de chegar a `commit` é invocar a função devolvida por createActionDispatcher.
    const character: Character = { ...minimalCharacter };
    const { service, saves } = await activeService(character);
    const { execution } = buildAttackExecution(character);
    const commitSpy = vi.spyOn(service.commands!, "commit");

    createActionDispatcher({ characterService: service, capabilitiesById: new Map([["attack-1", execution]]), rng: createSequenceRandomSource([15, 4]), idGenerator: fakeIdGenerator(), clock });
    // dispatch nunca foi chamado ("cancelar" na UI não invoca onIntent).

    expect(commitSpy).not.toHaveBeenCalled();
    expect(saves).toHaveLength(0);
  });

  describe("spend-resource", () => {
    const resourceId = asUuid("33333333-3333-4333-8333-000000000001");
    function characterWithResource(spent: number): Character {
      return {
        ...minimalCharacter,
        resources: [{ id: resourceId, definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("second-wind") }, ownerInstanceId: minimalCharacter.id, spent }],
      };
    }
    function buildExecution(character: Character): ActionCapabilityExecution {
      const command: Command = { commandId: asCommandId("cmd-spend-1"), characterId: character.id, expectedRevision: character.revision, kind: "spend-resource", payload: { resourceStateId: resourceId, amount: 1 } };
      return { command, rollPlan: [], resolve: ({ character: liveCharacter }) => spendResource(liveCharacter, { ...command.payload, capacity: 2 }) };
    }

    it("gasta o recurso com sucesso e persiste via characterService.commands.commit", async () => {
      const character = characterWithResource(0);
      const { service, saves } = await activeService(character);
      const execution = buildExecution(character);
      const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["spend-1", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

      const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "spend-1", kind: "resource" }) as RuleResult;

      expect(result.status).toBe("success");
      if (result.status === "success") expect(result.nextState.resources[0].spent).toBe(1);
      expect(saves).toHaveLength(1);
    });

    it("saldo insuficiente é rejeitado e nada é persistido", async () => {
      const character = characterWithResource(2); // já no teto (capacity 2)
      const { service, saves } = await activeService(character);
      const execution = buildExecution(character);
      const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["spend-1", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

      const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "spend-1", kind: "resource" }) as RuleResult;

      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.errors[0].code).toBe("insufficient-resource");
      expect(saves).toHaveLength(0);
    });

    it("falha de persistência é reportada como rejected sem mascarar o RuleResult calculado", async () => {
      const character = characterWithResource(0);
      const { service } = await activeService(character, err(appError.conflict(character.revision, asRevision((character.revision as unknown as number) + 1), "revisão desatualizada")));
      const execution = buildExecution(character);
      const dispatch = createActionDispatcher({ characterService: service, capabilitiesById: new Map([["spend-1", execution]]), rng: createSequenceRandomSource([]), idGenerator: fakeIdGenerator(), clock });

      const result = await dispatch({ commandId: execution.command.commandId, characterId: character.id, capabilityId: "spend-1", kind: "resource" }) as RuleResult;

      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.errors[0].message).toContain("Falha ao persistir o comando");
    });
  });
});
