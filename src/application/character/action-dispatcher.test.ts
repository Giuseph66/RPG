import { describe, expect, it, vi } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { type Character, type CharacterSummary, type CharacterDraft } from "@domain/contracts/character";
import { appError, type AppError, err, ok, type Result } from "@domain/contracts/errors";
import { type CommandReceipt, type Command, type RuleResult } from "@domain/contracts/rules";
import { asCommandId, asEntityId, asIsoTimestamp, asUuid, type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { createSequenceRandomSource } from "@domain/dice";
import { resolveCombatCommand } from "@domain/rules/combat";
import { spendResource } from "@domain/rules/resources";

import { type ActionCapabilityExecution } from "./action-capabilities";
import { createActionDispatcher } from "./action-dispatcher";
import { createCharacterApplicationService } from "./service";

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
