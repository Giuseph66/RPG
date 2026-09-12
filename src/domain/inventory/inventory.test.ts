import { describe, expect, it } from "vitest";

import { isErr, isOk } from "@domain/contracts/errors";
import { asCommandId, asEntityId, asUuid, type DefinitionRef } from "@domain/contracts/ids";
import { type Character } from "@domain/contracts/character";
import { minimalCharacter } from "@domain/contracts/fixtures";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

import {
  addInventoryItem,
  adjustCurrency,
  createInventoryItem,
  createInventoryState,
  deriveEquipmentImpact,
  equipInventoryItem,
  removeInventoryItem,
  transferInventoryItem,
  validateQuantity,
  consumeItem,
} from "./index";

const PACK_RESULT = loadPhbPtBrLocal2017();
if (!PACK_RESULT.ok) throw new Error("O pack local deve estar disponível para os testes do inventário.");
const PACK = PACK_RESULT.value;
const id = (value: string) => asUuid(`00000000-0000-4000-8000-${value.padStart(12, "0")}`);
const ref = (entityId: string): DefinitionRef => ({ rulesetId: PACK.manifest.id, entityId: asEntityId(entityId) });
const item = (itemId: string, equipmentId: string, quantity = 1, equippedState: "equipped" | "carried" | "stored" = "carried") => ({
  id: id(itemId),
  equipmentRef: ref(equipmentId),
  quantity,
  equippedState,
  notes: "",
});
const character = (inventory: readonly ReturnType<typeof item>[], currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }) => ({ inventory, currency }) as unknown as Character;

describe("inventory domain", () => {
  it("mantém instâncias imutáveis e explicita remoção de item equipado", () => {
    const original = item("1", "leather-armor");
    const stateResult = createInventoryState([original]);
    expect(isOk(stateResult)).toBe(true);
    if (!isOk(stateResult)) return;

    const equipped = equipInventoryItem(stateResult.value, String(original.id));
    expect(isOk(equipped)).toBe(true);
    expect(stateResult.value.inventory[0].equippedState).toBe("carried");
    if (!isOk(equipped)) return;

    const removed = removeInventoryItem({ ...stateResult.value, inventory: equipped.value.inventory }, String(original.id));
    expect(isOk(removed)).toBe(true);
    if (isOk(removed)) {
      expect(removed.value.removedItem?.equippedState).toBe("equipped");
      expect(removed.value.explanations[0].description).toContain("efeitos deixam");
    }
  });

  it("rejeita quantidade fracionária/negativa e não permite estoque abaixo de zero", () => {
    expect(isErr(validateQuantity(1.5))).toBe(true);
    expect(isErr(validateQuantity(-1))).toBe(true);
    const stateResult = createInventoryState([item("2", "dagger", 2)]);
    expect(isOk(stateResult)).toBe(true);
    if (!isOk(stateResult)) return;
    const removed = removeInventoryItem({ ...stateResult.value, inventory: [] }, String(id("2")));
    expect(isErr(removed)).toBe(true);
  });

  it("transfere o item equipado inteiro como carregado e preserva a definição", () => {
    const sourceResult = createInventoryState([item("3", "shield", 1, "equipped")]);
    const destinationResult = createInventoryState();
    expect(isOk(sourceResult) && isOk(destinationResult)).toBe(true);
    if (!isOk(sourceResult) || !isOk(destinationResult)) return;
    const transfer = transferInventoryItem(sourceResult.value, destinationResult.value, String(id("3")));
    expect(isOk(transfer)).toBe(true);
    if (isOk(transfer)) {
      expect(transfer.value.source.inventory).toHaveLength(0);
      expect(transfer.value.destination.inventory[0].equippedState).toBe("carried");
      expect(transfer.value.explanations[0].description).toContain("efeito removido");
    }
    expect(PACK.equipment.get(asEntityId("shield"))?.name).toBe("Escudo");
  });

  it("valida moedas sem normalizar denominações e recusa saldo negativo", () => {
    const stateResult = createInventoryState([], { gp: 2, cp: 3 });
    expect(isOk(stateResult)).toBe(true);
    if (!isOk(stateResult)) return;
    const spent = adjustCurrency(stateResult.value, "gp", -1);
    expect(isOk(spent)).toBe(true);
    if (isOk(spent)) expect(spent.value.currency).toEqual({ cp: 3, sp: 0, ep: 0, gp: 1, pp: 0 });
    expect(isErr(adjustCurrency(stateResult.value, "gp", -3))).toBe(true);
  });

  it("deriva CA de armadura/escudo, propriedades, proficiência e carga opcional", () => {
    const armor = item("4", "leather-armor", 1, "equipped");
    const shield = item("5", "shield", 1, "equipped");
    const before = JSON.stringify(PACK.equipment.get(asEntityId("leather-armor")));
    const result = deriveEquipmentImpact(character([armor, shield], { cp: 0, sp: 0, ep: 0, gp: 0, pp: 2 }), PACK, {
      dexterityModifier: 4,
      strengthScore: 10,
      proficiencyRefs: [ref("light"), ref("shield")],
      encumbrance: { enabled: true },
    });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.armorClass.value).toBe(17);
      expect(result.value.armor?.proficiency.proficient).toBe(true);
      expect(result.value.shield?.proficiency.proficient).toBe(true);
      expect(result.value.encumbrance?.enabled).toBe(true);
      expect(result.value.encumbrance?.totalWeightGrams).toBe(8000);
      expect(result.value.explanations.some((entry) => entry.description.includes("Escudo"))).toBe(true);
    }
    expect(JSON.stringify(PACK.equipment.get(asEntityId("leather-armor")))).toBe(before);
  });

  it("deixa a carga ausente quando a regra opcional está desligada", () => {
    const result = deriveEquipmentImpact(character([item("6", "plate-armor", 1, "equipped")]), PACK, { encumbrance: { enabled: false } });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.encumbrance).toBeUndefined();
  });

  it("rejeita duas armaduras ativas sem escolher precedência", () => {
    const result = deriveEquipmentImpact(character([item("7", "leather-armor", 1, "equipped"), item("8", "plate-armor", 1, "equipped")]), PACK);
    expect(isErr(result)).toBe(true);
  });

  it("cria item com defaults e adiciona sem compartilhar o array de origem", () => {
    const created = createInventoryItem({ id: id("9"), equipmentRef: ref("dagger"), quantity: 1 });
    expect(isOk(created)).toBe(true);
    const state = createInventoryState();
    if (!isOk(created) || !isOk(state)) return;
    const added = addInventoryItem(state.value, created.value);
    expect(isOk(added)).toBe(true);
    expect(state.value.inventory).toHaveLength(0);
  });

  it("consome exatamente uma unidade e deixa o efeito declarado como pendência", () => {
    const inventoryItem = item("10", "healing-potion", 2);
    const command = { commandId: asCommandId("consume-10"), characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "consume-item" as const, payload: { inventoryItemId: inventoryItem.id, equipmentRef: inventoryItem.equipmentRef } };
    const result = consumeItem({ ...minimalCharacter, inventory: [inventoryItem] }, command, PACK.equipment.get(asEntityId("healing-potion"))!);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.inventory[0]?.quantity).toBe(1);
      expect(result.effects[0]?.kind).toBe("inventory-changed");
      expect(result.explanations[0]?.value).toContain("pendente");
    }
  });

  it("remove a última unidade, rejeita item ausente/não consumível e respeita idempotência", () => {
    const potion = item("11", "healing-potion", 1);
    const command = { commandId: asCommandId("consume-11"), characterId: minimalCharacter.id, expectedRevision: minimalCharacter.revision, kind: "consume-item" as const, payload: { inventoryItemId: potion.id, equipmentRef: potion.equipmentRef } };
    const consumed = consumeItem({ ...minimalCharacter, inventory: [potion] }, command, PACK.equipment.get(asEntityId("healing-potion"))!);
    expect(consumed.status).toBe("success");
    if (consumed.status === "success") expect(consumed.nextState.inventory).toHaveLength(0);
    const absent = consumeItem({ ...minimalCharacter, inventory: [] }, command, PACK.equipment.get(asEntityId("healing-potion"))!);
    expect(absent.status).toBe("rejected");
    const nonConsumable = item("12", "dagger", 1);
    const nonConsumableCommand = { ...command, commandId: asCommandId("consume-12"), payload: { inventoryItemId: nonConsumable.id, equipmentRef: nonConsumable.equipmentRef } };
    const rejected = consumeItem({ ...minimalCharacter, inventory: [nonConsumable] }, nonConsumableCommand, PACK.equipment.get(asEntityId("dagger"))!);
    expect(rejected.status).toBe("rejected");
    const duplicate = consumeItem({ ...minimalCharacter, inventory: [potion] }, command, PACK.equipment.get(asEntityId("healing-potion"))!, { processedCommandIds: new Set([String(command.commandId)]) });
    expect(duplicate.status).toBe("success");
    if (duplicate.status === "success") {
      expect(duplicate.nextState.inventory).toHaveLength(1);
      expect(duplicate.effects).toHaveLength(0);
    }
  });
});
