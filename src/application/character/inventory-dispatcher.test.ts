import { describe, expect, it } from "vitest";

import { type Character, type InventoryItem } from "@domain/contracts/character";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asEntityId, asUuid, type DefinitionRef } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type InventoryIntent } from "@features/inventory/types";

import { createCharacterApplicationService } from "./service";
import { createInventoryDispatcher } from "./inventory-dispatcher";

const daggerRef: DefinitionRef = { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("dagger") };
const daggerId = asUuid("55555555-5555-4555-8555-555555555555");

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

/** Fake mínimo do port `CharacterRepository`; guarda um único personagem em memória. */
function createFakeRepository(initial: Character) {
  let stored: Character = initial;
  let saveCount = 0;
  const repository: CharacterRepository = {
    get: async (id) => (id === stored.id ? ok(stored) : err(appError.notFound("character", id))),
    list: async () => ok([]),
    save: async (character, expectedRevision): Promise<Result<Revision, AppError>> => {
      if (expectedRevision !== stored.revision) {
        return err(appError.conflict(expectedRevision, stored.revision));
      }
      saveCount += 1;
      const nextRevision = asRevision(stored.revision + 1);
      stored = { ...character, revision: nextRevision };
      return ok(nextRevision);
    },
    delete: async () => ok(undefined),
    getDraft: async (id) => err(appError.notFound("draft", id)),
    saveDraft: async (draft) => ok(draft),
    deleteDraft: async () => ok(undefined),
  };
  return {
    repository,
    getStored: () => stored,
    getSaveCount: () => saveCount,
  };
}

async function setUp(inventory: readonly InventoryItem[], currency: Character["currency"] = minimalCharacter.currency) {
  const initial: Character = { ...minimalCharacter, inventory, currency };
  const fake = createFakeRepository(initial);
  const characterService = createCharacterApplicationService({ repository: fake.repository, debounceMs: 0 });
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
});
