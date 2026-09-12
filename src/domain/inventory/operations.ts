import { type Character, type InventoryEquippedState, type InventoryItem } from "@domain/contracts/character";
import { appError, err, ok, type Result, type AppError } from "@domain/contracts/errors";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { type DefinitionRef } from "@domain/contracts/ids";
import { type Command, type Effect, type RuleError, type RuleResult } from "@domain/contracts/rules";
import { type CoinDenomination, type Currency, type SourceRef } from "@domain/contracts/primitives";
import { type InventoryItemInput, type InventoryMutation, type InventoryState, type InventoryTransfer } from "./model";
import { normalizeCurrency, validateContainerGraph, validateCurrency, validateInventoryItem, validateQuantity } from "./validation";

function itemIndex(items: readonly InventoryItem[], itemId: string): number {
  return items.findIndex((item) => String(item.id) === itemId);
}

function mutation(inventory: readonly InventoryItem[], explanations: InventoryMutation["explanations"], extras: Omit<InventoryMutation, "inventory" | "explanations"> = {}): Result<InventoryMutation, AppError> {
  return ok({ inventory, explanations, ...extras });
}

export function createInventoryItem(input: InventoryItemInput): Result<InventoryItem, AppError> {
  const item: InventoryItem = {
    id: input.id,
    equipmentRef: input.equipmentRef,
    quantity: input.quantity,
    equippedState: input.equippedState ?? "carried",
    ...(input.containerId ? { containerId: input.containerId } : {}),
    ...(input.customName ? { customName: input.customName } : {}),
    notes: input.notes ?? "",
    ...(input.chargesSpent === undefined ? {} : { chargesSpent: input.chargesSpent }),
  };
  const valid = validateInventoryItem(item);
  return valid.ok ? ok(item) : valid;
}

export function createInventoryState(inventory: readonly InventoryItem[] = [], currency?: Partial<Currency>): Result<InventoryState, AppError> {
  const seen = new Set<string>();
  for (const item of inventory) {
    const valid = validateInventoryItem(item);
    if (!valid.ok) return valid;
    if (seen.has(String(item.id))) return err(appError.validation("inventory", `Instância duplicada "${item.id}".`));
    seen.add(String(item.id));
  }
  const validContainers = validateContainerGraph(inventory);
  if (!validContainers.ok) return validContainers;
  const normalized = normalizeCurrency(currency);
  const validCurrency = validateCurrency(normalized);
  if (!validCurrency.ok) return validCurrency;
  return ok({ inventory: [...inventory], currency: normalized });
}

export function addInventoryItem(state: InventoryState, item: InventoryItem): Result<InventoryMutation, AppError> {
  const valid = validateInventoryItem(item);
  if (!valid.ok) return valid;
  if (itemIndex(state.inventory, String(item.id)) !== -1) {
    return err(appError.validation("item.id", `Instância "${item.id}" já existe no inventário.`));
  }
  const validContainers = validateContainerGraph([...state.inventory, item]);
  if (!validContainers.ok) return validContainers;
  return mutation([...state.inventory, item], [{ itemId: item.id, amount: item.quantity, description: "Instância adicionada ao inventário." }], { changedItem: item });
}

export function setItemQuantity(state: InventoryState, itemId: string, quantity: number): Result<InventoryMutation, AppError> {
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  if (quantity === 0) return removeInventoryItem(state, itemId);
  const valid = validateQuantity(quantity);
  if (!valid.ok) return valid;
  const previous = state.inventory[index];
  const changedItem = { ...previous, quantity };
  const inventory = state.inventory.map((item, itemIndexValue) => itemIndexValue === index ? changedItem : item);
  return mutation(inventory, [{ itemId: previous.id, amount: quantity - previous.quantity, description: "Quantidade da instância atualizada." }], { changedItem });
}

export function adjustItemQuantity(state: InventoryState, itemId: string, delta: number): Result<InventoryMutation, AppError> {
  if (!Number.isInteger(delta) || !Number.isFinite(delta) || delta === 0) return err(appError.validation("delta", "Ajuste deve ser um inteiro diferente de zero."));
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  return setItemQuantity(state, itemId, state.inventory[index].quantity + delta);
}

export function removeInventoryItem(state: InventoryState, itemId: string): Result<InventoryMutation, AppError> {
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  const removedItem = state.inventory[index];
  const description = removedItem.equippedState === "equipped"
    ? "Instância equipada removida; seus efeitos deixam de contribuir."
    : "Instância removida do inventário.";
  return mutation(state.inventory.filter((_, itemIndexValue) => itemIndexValue !== index), [{ itemId: removedItem.id, description }], { removedItem });
}

function setEquippedState(state: InventoryState, itemId: string, equippedState: InventoryEquippedState): Result<InventoryMutation, AppError> {
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  const previous = state.inventory[index];
  if (previous.equippedState === equippedState) return mutation([...state.inventory], [{ itemId: previous.id, description: `Instância já está em estado "${equippedState}".` }], { changedItem: previous });
  const changedItem = { ...previous, equippedState };
  return mutation(state.inventory.map((item, itemIndexValue) => itemIndexValue === index ? changedItem : item), [{ itemId: previous.id, description: equippedState === "equipped" ? "Instância equipada." : "Instância desequipada." }], { changedItem });
}

export function equipInventoryItem(state: InventoryState, itemId: string): Result<InventoryMutation, AppError> {
  return setEquippedState(state, itemId, "equipped");
}

export function unequipInventoryItem(state: InventoryState, itemId: string): Result<InventoryMutation, AppError> {
  return setEquippedState(state, itemId, "carried");
}

export function moveInventoryItem(state: InventoryState, itemId: string, containerId?: InventoryItem["containerId"]): Result<InventoryMutation, AppError> {
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  if (containerId && String(containerId) === itemId) return err(appError.validation("containerId", "Um item não pode conter a si próprio."));
  if (containerId && itemIndex(state.inventory, String(containerId)) === -1) return err(appError.notFound("container", String(containerId)));
  const previous = state.inventory[index];
  const changedItem = containerId ? { ...previous, containerId } : (({ containerId: _removed, ...rest }) => rest)(previous);
  const inventory = state.inventory.map((item, itemIndexValue) => itemIndexValue === index ? changedItem : item);
  const validContainers = validateContainerGraph(inventory);
  if (!validContainers.ok) return validContainers;
  return mutation(inventory, [{ itemId: previous.id, description: containerId ? "Instância movida para o contêiner." : "Instância retirada do contêiner." }], { changedItem });
}

export function removeItemQuantity(state: InventoryState, itemId: string, quantity: number): Result<InventoryMutation, AppError> {
  const valid = validateQuantity(quantity);
  if (!valid.ok) return valid;
  const index = itemIndex(state.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  const current = state.inventory[index];
  if (quantity > current.quantity) return err(appError.validation("quantity", "Quantidade removida excede a quantidade disponível."));
  if (quantity === current.quantity) return removeInventoryItem(state, itemId);
  return setItemQuantity(state, itemId, current.quantity - quantity);
}

export interface ConsumeItemContext {
  readonly processedCommandIds?: ReadonlySet<string>;
}

function consumeSource(equipment: EquipmentDefinition, fallback: DefinitionRef): DefinitionRef | SourceRef {
  return equipment.sourceRefs[0] ?? fallback;
}

function consumeSourceRef(equipment: EquipmentDefinition): SourceRef | undefined {
  return equipment.sourceRefs[0];
}

function consumeRejected(message: string, source: DefinitionRef | SourceRef, code: RuleError["code"] = "invalid-command"): RuleResult {
  return {
    status: "rejected",
    errors: [{ code, message, sourceRef: source }],
    sourceRefs: "chapter" in source ? [source] : [],
  };
}

/**
 * Resolve o comando de consumo sem inventar cura, dano ou outro efeito. A definição do
 * equipamento é fornecida pelo catálogo imutável; seu `effectDescription` é preservado na
 * explicação para a mesa resolver efeitos ainda não automatizados.
 */
export function consumeItem(
  character: Character,
  command: Extract<Command, { readonly kind: "consume-item" }>,
  equipment: EquipmentDefinition,
  context: ConsumeItemContext = {},
): RuleResult {
  const fallbackRef: DefinitionRef = command.payload.equipmentRef;
  const source = consumeSource(equipment, fallbackRef);
  const sourceRefs = consumeSourceRef(equipment);
  if (command.characterId !== character.id) return consumeRejected("Comando de consumo não pertence ao personagem recebido.", source, "invalid-context");
  if (context.processedCommandIds?.has(String(command.commandId))) {
    return { status: "success", nextState: character, effects: [], explanations: [{ value: "Comando de consumo já processado; nenhum item foi consumido novamente.", contributions: [{ sourceRef: source, description: "Idempotência do comando de consumo." }] }], sourceRefs: sourceRefs ? [sourceRefs] : [] };
  }
  if (command.payload.equipmentRef.rulesetId !== equipment.sourceRefs[0]?.sourceId && equipment.sourceRefs.length > 0) {
    return consumeRejected("A definição do item pertence a outro ruleset.", source, "invalid-context");
  }
  if (command.payload.equipmentRef.entityId !== equipment.id) return consumeRejected("A definição resolvida não corresponde ao item solicitado.", source, "invalid-command");
  const consumable = equipment.consumable;
  if (!consumable || consumable.consumeOnUse !== true) return consumeRejected(`Item "${equipment.name}" não é consumível.`, source, "invalid-context");
  const validInventory = createInventoryState(character.inventory, character.currency);
  if (!validInventory.ok) return consumeRejected(validInventory.error.message, source, "invalid-command");
  const itemIndexValue = character.inventory.findIndex((item) => item.id === command.payload.inventoryItemId);
  if (itemIndexValue === -1) return consumeRejected(`Item "${command.payload.inventoryItemId}" não está na posse do personagem.`, source, "invalid-context");
  const item = character.inventory[itemIndexValue];
  if (item.equipmentRef.rulesetId !== command.payload.equipmentRef.rulesetId || item.equipmentRef.entityId !== command.payload.equipmentRef.entityId) {
    return consumeRejected("A instância do inventário não corresponde à definição consumida.", source, "invalid-command");
  }
  if (!Number.isInteger(item.quantity) || !Number.isFinite(item.quantity) || item.quantity < 1) return consumeRejected("Quantidade inválida para consumo.", source, "invalid-command");
  const inventory = item.quantity === 1
    ? character.inventory.filter((_, index) => index !== itemIndexValue)
    : character.inventory.map((entry, index) => index === itemIndexValue ? { ...entry, quantity: entry.quantity - 1 } : entry);
  const effect: Effect = { kind: "inventory-changed", targetCharacterId: character.id, sourceRef: fallbackRef, payload: { inventoryItemId: item.id } };
  const description = consumable.effectDescription
    ? `${equipment.name} consumido: ${consumable.effectDescription} Efeito mecânico permanece pendente de resolução específica.`
    : `${equipment.name} consumido; a definição não declara efeito mecânico automatizável.`;
  return {
    status: "success",
    nextState: { ...character, inventory },
    effects: [effect],
    explanations: [{ value: description, contributions: [{ sourceRef: source, description }] }],
    sourceRefs: sourceRefs ? [sourceRefs] : [],
  };
}

export function adjustCurrency(state: InventoryState, denomination: CoinDenomination, delta: number): Result<InventoryState, AppError> {
  if (!Number.isInteger(delta) || !Number.isFinite(delta)) return err(appError.validation(`currency.${denomination}`, "Ajuste de moeda deve ser inteiro."));
  const next = { ...state.currency, [denomination]: state.currency[denomination] + delta };
  const valid = validateCurrency(next);
  if (!valid.ok) return valid;
  return ok({ ...state, currency: next });
}

export function setCurrency(state: InventoryState, currency: Currency): Result<InventoryState, AppError> {
  const valid = validateCurrency(currency);
  return valid.ok ? ok({ ...state, currency: { ...currency } }) : valid;
}

export function transferInventoryItem(source: InventoryState, destination: InventoryState, itemId: string, quantity?: number): Result<InventoryTransfer, AppError> {
  const index = itemIndex(source.inventory, itemId);
  if (index === -1) return err(appError.notFound("inventory-item", itemId));
  const item = source.inventory[index];
  const amount = quantity ?? item.quantity;
  const valid = validateQuantity(amount);
  if (!valid.ok) return valid;
  if (amount > item.quantity) return err(appError.validation("quantity", "Quantidade transferida excede a quantidade disponível."));
  if (item.equippedState === "equipped" && amount !== item.quantity) return err(appError.validation("quantity", "Não é possível transferir parte de uma instância equipada."));
  const transferredItem: InventoryItem = { ...item, quantity: amount, equippedState: "carried" };
  const sourceResult = amount === item.quantity
    ? removeInventoryItem(source, itemId)
    : setItemQuantity(source, itemId, item.quantity - amount);
  if (!sourceResult.ok) return sourceResult;
  const destinationResult = addInventoryItem(destination, transferredItem);
  if (!destinationResult.ok) return destinationResult;
  return ok({
    source: { ...source, inventory: sourceResult.value.inventory },
    destination: { ...destination, inventory: destinationResult.value.inventory },
    transferredItem,
    explanations: [
      { itemId: item.id, amount, description: item.equippedState === "equipped" ? "Instância equipada transferida como carregada; efeito removido da origem." : "Instância transferida como carregada." },
    ],
  });
}

/** Alias curto para consumidores que trabalham com o agregado de inventário. */
export const transferItem = transferInventoryItem;
export const removeItem = removeInventoryItem;
export const equipItem = equipInventoryItem;
export const unequipItem = unequipInventoryItem;
