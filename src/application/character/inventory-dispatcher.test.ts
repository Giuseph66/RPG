import { describe, expect, it } from "vitest";

import { type Character, type InventoryItem } from "@domain/contracts/character";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asCommandId, asEntityId, asUuid, type DefinitionRef } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type InventoryIntent } from "@features/inventory/types";

import { createCharacterApplicationService } from "./service";
import { createInventoryDispatcher } from "./inventory-dispatcher";

const daggerRef: DefinitionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("dagger") };
const daggerId = asUuid("55555555-5555-4555-8555-555555555555");
const potionRef: DefinitionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("healing-potion") };
const potionId = asUuid("66666666-6666-4666-8666-666666666666");

function daggerItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: daggerId,
    equipmentRef: daggerRef,
    quantity: 1,
    equippedState: "carried",
    notes: "",
    ...overrides,
  };
}

function potionItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return { id: potionId, equipmentRef: potionRef, quantity: 1, equippedState: "carried", notes: "", ...overrides };
}

/** Fake mínimo do port `CharacterRepository`; guarda um único personagem em memória. */
function createFakeRepository(initial: Character, saveError?: AppError) {
  let stored: Character = initial;
  let saveCount = 0;
  const commandRevisions = new Map<string, Revision>();
  const repository: CharacterRepository = {
    get: async (id) => (id === stored.id ? ok(stored) : err(appError.notFound("character", id))),
    list: async () => ok([]),
    save: async (character, expectedRevision, commandReceipt): Promise<Result<Revision, AppError>> => {
      if (saveError) return err(saveError);
      const recorded = commandReceipt ? commandRevisions.get(String(commandReceipt.commandId)) : undefined;
      if (recorded !== undefined) return ok(recorded);
      if (expectedRevision !== stored.revision) {
        return err(appError.conflict(expectedRevision, stored.revision));
      }
      saveCount += 1;
      const nextRevision = asRevision(stored.revision + 1);
      stored = { ...character, revision: nextRevision };
      if (commandReceipt) commandRevisions.set(String(commandReceipt.commandId), nextRevision);
      return ok(nextRevision);
    },
    delete: async () => ok(undefined),
    getDraft: async (id) => err(appError.notFound("draft", id)),
    listDrafts: async () => ok([]),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
  return {
    repository,
    getStored: () => stored,
    getSaveCount: () => saveCount,
  };
}

async function setUp(inventory: readonly InventoryItem[], currency: Character["currency"] = minimalCharacter.currency, saveError?: AppError) {
  const initial: Character = { ...minimalCharacter, inventory, currency };
  const fake = createFakeRepository(initial, saveError);
  const characterService = createCharacterApplicationService({ repository: fake.repository, debounceMs: 0, commandDependencies: { clock: { now: () => minimalCharacter.updatedAt } } });
  const selected = await characterService.select(initial.id);
  expect(selected.ok).toBe(true);
  const errors: Array<{ readonly error: AppError; readonly intent: InventoryIntent }> = [];
  const dispatch = createInventoryDispatcher({
    characterService,
    onError: (error, intent) => errors.push({ error, intent }),
  });
  return { characterService, fake, dispatch, errors };
}

describe("createInventoryDispatcher", () => {
  it("aplica add criando uma nova instância carregada", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem()]);
    const ropeRef: DefinitionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("hempen-rope") };

    dispatch({ kind: "add", equipmentRef: ropeRef, quantity: 2 });
    await characterService.save();

    expect(errors).toHaveLength(0);
    const added = fake.getStored().inventory.find((entry) => entry.equipmentRef.entityId === ropeRef.entityId);
    expect(added).toEqual(expect.objectContaining({ quantity: 2, equippedState: "carried", notes: "" }));
    expect(fake.getStored().inventory).toHaveLength(2);
  });

  it("aplica add somando na instância existente quando o item é empilhável", async () => {
    const arrowsRef: DefinitionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("arrows") };
    const arrowsId = asUuid("77777777-7777-4777-8777-777777777777");
    const { characterService, fake, dispatch, errors } = await setUp([{ id: arrowsId, equipmentRef: arrowsRef, quantity: 20, equippedState: "carried", notes: "" }]);

    dispatch({ kind: "add", equipmentRef: arrowsRef, quantity: 20 });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory).toEqual([expect.objectContaining({ id: arrowsId, quantity: 40 })]);
  });

  it("aplica set-quantity e persiste a nova quantidade", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem({ quantity: 1 })]);

    dispatch({ kind: "set-quantity", itemId: daggerId, quantity: 5 });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory).toEqual([daggerItem({ quantity: 5 })]);
    expect(fake.getSaveCount()).toBe(1);
  });

  it("aplica set-currency e persiste a nova moeda mantendo as demais denominações", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([], { cp: 0, sp: 0, ep: 0, gp: 3, pp: 0 });

    dispatch({ kind: "set-currency", denomination: "gp", amount: 15 });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 });
  });

  it("aplica equip e muda equippedState para 'equipped'", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem({ equippedState: "carried" })]);

    dispatch({ kind: "equip", itemId: daggerId });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory[0]?.equippedState).toBe("equipped");
  });

  it("aplica unequip e muda equippedState para 'carried'", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem({ equippedState: "equipped" })]);

    dispatch({ kind: "unequip", itemId: daggerId });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory[0]?.equippedState).toBe("carried");
  });

  it("aplica remove e retira a instância do inventário", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem()]);

    dispatch({ kind: "remove", itemId: daggerId, equipped: false });
    await characterService.save();

    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory).toEqual([]);
  });

  it("erro de domínio (remover item inexistente) é reportado e não corrompe o estado", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([daggerItem()]);
    const before = fake.getStored();

    dispatch({ kind: "remove", itemId: asUuid("99999999-9999-4999-8999-999999999999"), equipped: false });
    await characterService.save();

    expect(errors).toHaveLength(1);
    expect(errors[0]?.error.code).toBe("not-found");
    expect(fake.getSaveCount()).toBe(0);
    expect(fake.getStored()).toBe(before);
    expect(characterService.store.getSnapshot().value?.inventory).toEqual([daggerItem()]);
    expect(characterService.store.getSnapshot().hasPendingChanges).toBe(false);
  });

  it("consome uma unidade da poção e remove a última unidade", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([potionItem({ quantity: 2 })]);
    dispatch({ kind: "consume", itemId: potionId, equipmentRef: potionRef, commandId: asCommandId("consume-potion-1") });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory[0]?.quantity).toBe(1);
    dispatch({ kind: "consume", itemId: potionId, equipmentRef: potionRef, commandId: asCommandId("consume-potion-2") });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fake.getStored().inventory).toHaveLength(0);
  });

  it("rejeita consumo de item ausente ou não consumível sem salvar", async () => {
    const { fake, dispatch, errors } = await setUp([daggerItem()]);
    dispatch({ kind: "consume", itemId: daggerId, equipmentRef: daggerRef, commandId: asCommandId("consume-dagger") });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors[0]?.error.code).toBe("validation-error");
    expect(fake.getSaveCount()).toBe(0);
    dispatch({ kind: "consume", itemId: asUuid("99999999-9999-4999-8999-999999999999"), equipmentRef: potionRef, commandId: asCommandId("consume-missing") });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors).toHaveLength(2);
    expect(fake.getSaveCount()).toBe(0);
  });

  it("preserva o snapshot confirmado quando a persistência do consumo falha", async () => {
    const { characterService, fake, dispatch, errors } = await setUp([potionItem({ quantity: 2 })], minimalCharacter.currency, appError.storageUnavailable("falha injetada"));
    const before = characterService.store.getSnapshot().value;
    dispatch({ kind: "consume", itemId: potionId, equipmentRef: potionRef, commandId: asCommandId("consume-fails") });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors[0]?.error.code).toBe("storage-unavailable");
    expect(fake.getStored().inventory[0]?.quantity).toBe(2);
    expect(characterService.store.getSnapshot().value).toEqual(before);
    expect(characterService.store.getSnapshot().hasPendingChanges).toBe(false);
  });

  it("não reaplica o consumo quando o mesmo commandId é reenviado", async () => {
    const { fake, dispatch, errors } = await setUp([potionItem({ quantity: 2 })]);
    const intent = { kind: "consume" as const, itemId: potionId, equipmentRef: potionRef, commandId: asCommandId("consume-idempotent") };
    dispatch(intent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    dispatch(intent);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors).toHaveLength(0);
    expect(fake.getStored().inventory[0]?.quantity).toBe(1);
  });
});
