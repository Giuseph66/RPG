/**
 * InventoryDispatcher — liga `InventoryProps.onIntent` (UI-004, `src/features/inventory/types.ts`)
 * às funções puras de `src/domain/inventory/operations.ts` (ITEM-002), persistindo o resultado
 * através de `CharacterApplicationService`.
 *
 * Não existe um `Command`/`RuleResult` dedicado a inventário em `domain/contracts/rules.ts` —
 * inventário é mutação direta de `Character.inventory`/`Character.currency`, não uma regra do
 * Rules Engine. Por isso este dispatcher lê o snapshot síncrono do personagem ativo em
 * `characterService.store.getSnapshot()`, revalida o par (inventory, currency) através de
 * `createInventoryState` (garante forma consistente e captura duplicatas/containers inválidos
 * antes de aplicar a mutação pontual) e aplica a operação pura correspondente à variante do
 * intent.
 *
 * `equip`/`unequip` só trocam `equippedState`; efeitos derivados (CA, carga, etc., ver
 * `src/domain/inventory/impact.ts`) são responsabilidade de `deriveCharacter` (RULE-001) na
 * próxima leitura da ficha — este dispatcher nunca recalcula derivados.
 */

import { type Character, type InventoryItem } from "@domain/contracts/character";
import { type AppError, ok, type Result } from "@domain/contracts/errors";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { asCommandId, asUuid, type CommandId } from "@domain/contracts/ids";
import { findEquipment } from "@data/equipment";
import {
  addInventoryItem,
  createInventoryItem,
  createInventoryState,
  equipInventoryItem,
  removeInventoryItem,
  setCurrency,
  setItemQuantity,
  unequipInventoryItem,
  consumeItem,
} from "@domain/inventory/operations";
import { type RuleResult } from "@domain/contracts/rules";
import { type InventoryState } from "@domain/inventory/model";
import { type InventoryIntent } from "@features/inventory/types";

import { type CharacterApplicationService } from "./service";

export interface InventoryDispatcherOptions {
  readonly characterService: CharacterApplicationService;
  /**
   * `InventoryProps.onIntent` não tem canal de erro no tipo (`src/features/inventory/types.ts`).
   * Erros de domínio (ex.: remover item inexistente, quantidade inválida) e a ausência de um
   * personagem ativo são reportados aqui quando fornecido; sem `onError`, são silenciosamente
   * ignorados e o estado permanece intocado (nenhum `update`/`save` é disparado).
   */
  readonly onError?: (error: AppError, intent: InventoryIntent) => void;
  readonly onResult?: (result: RuleResult, intent: InventoryIntent) => void;
}

let generatedCommandSequence = 0;

function commandIdFor(intent: Extract<InventoryIntent, { readonly kind: "consume" }>): CommandId {
  if (intent.commandId) return intent.commandId;
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${++generatedCommandSequence}`;
  return asCommandId(`consume-item-${random}`);
}

function ruleError(result: Exclude<RuleResult, { readonly status: "success" }>): AppError {
  if (result.status === "needsInput") {
    return { code: "validation-error", field: "consume-item", message: result.requests[0]?.reason ?? "O comando de consumo exige uma entrada adicional." };
  }
  const first = result.errors[0];
  return { code: "validation-error", field: first?.field ?? "consume-item", message: first?.message ?? "O comando de consumo foi rejeitado." };
}

function newItemId(): InventoryItem["id"] {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(16).padStart(8, "0").slice(-8)}-0000-4000-8000-${(++generatedCommandSequence).toString(16).padStart(12, "0")}`;
  return asUuid(random);
}

function applyIntent(state: InventoryState, intent: InventoryIntent): Result<InventoryState, AppError> {
  switch (intent.kind) {
    case "add": {
      // Empilháveis (flechas, rações…) somam na instância carregada existente.
      const stackable = findEquipment(String(intent.equipmentRef.entityId))?.stackable ?? false;
      const existing = stackable
        ? state.inventory.find((item) => item.equipmentRef.entityId === intent.equipmentRef.entityId && item.equippedState !== "equipped" && !item.customName)
        : undefined;
      if (existing) {
        const result = setItemQuantity(state, String(existing.id), existing.quantity + intent.quantity);
        return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
      }
      const item = createInventoryItem({ id: newItemId(), equipmentRef: intent.equipmentRef, quantity: intent.quantity });
      if (!item.ok) return item;
      const result = addInventoryItem(state, item.value);
      return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
    }
    case "set-quantity": {
      const result = setItemQuantity(state, String(intent.itemId), intent.quantity);
      return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
    }
    case "set-currency": {
      return setCurrency(state, { ...state.currency, [intent.denomination]: intent.amount });
    }
    case "equip": {
      const result = equipInventoryItem(state, String(intent.itemId));
      return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
    }
    case "unequip": {
      const result = unequipInventoryItem(state, String(intent.itemId));
      return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
    }
    case "remove": {
      const result = removeInventoryItem(state, String(intent.itemId));
      return result.ok ? ok({ inventory: result.value.inventory, currency: state.currency }) : result;
    }
    case "consume":
      return { ok: false, error: { code: "validation-error", field: "consume-item", message: "Consumo deve ser resolvido pelo comando dedicado." } };
  }
}

/**
 * Cria o handler para `InventoryProps.onIntent`. Assinatura estável para wiring em
 * `src/app/bootstrap.tsx`:
 *
 * `createInventoryDispatcher(options: { readonly characterService: CharacterApplicationService; readonly onError?: (error: AppError, intent: InventoryIntent) => void }): (intent: InventoryIntent) => void`
 */
export function createInventoryDispatcher(options: InventoryDispatcherOptions): (intent: InventoryIntent) => void {
  const { characterService, onError, onResult } = options;

  return (intent: InventoryIntent): void => {
    const character: Character | undefined = characterService.store.getSnapshot().value;
    if (!character) {
      onError?.(
        { code: "validation-error", field: "character", message: "Nenhum personagem ativo para aplicar o intent de inventário." },
        intent,
      );
      return;
    }

    if (intent.kind === "consume") {
      const definition: EquipmentDefinition | undefined = findEquipment(String(intent.equipmentRef.entityId));
      if (!definition) {
        onError?.({ code: "not-found", entity: "equipment", id: String(intent.equipmentRef.entityId), message: `Equipamento "${intent.equipmentRef.entityId}" não foi encontrado no catálogo local.` }, intent);
        return;
      }
      const command = {
        commandId: commandIdFor(intent),
        characterId: character.id,
        expectedRevision: character.revision,
        kind: "consume-item" as const,
        payload: { inventoryItemId: intent.itemId, equipmentRef: intent.equipmentRef },
      };
      const result = consumeItem(character, command, definition);
      if (result.status !== "success") {
        onResult?.(result, intent);
        onError?.(ruleError(result), intent);
        return;
      }
      if (!characterService.commands) {
        onError?.({ code: "validation-error", field: "commands", message: "A composição não conectou a persistência de comandos; o item não foi consumido." }, intent);
        return;
      }
      void characterService.commands.commit(command, result).then(async (committed) => {
        if (!committed.ok) {
          onError?.(committed.error, intent);
          return;
        }
        const refreshed = await characterService.select(character.id);
        if (!refreshed.ok) onError?.(refreshed.error, intent);
        else onResult?.(result, intent);
      });
      return;
    }

    const stateResult = createInventoryState(character.inventory, character.currency);
    if (!stateResult.ok) {
      onError?.(stateResult.error, intent);
      return;
    }

    const mutationResult = applyIntent(stateResult.value, intent);
    if (!mutationResult.ok) {
      onError?.(mutationResult.error, intent);
      return;
    }

    const nextInventory = mutationResult.value.inventory;
    const nextCurrency = mutationResult.value.currency;
    const updateResult = characterService.update(
      (current) => ({ ...current, inventory: nextInventory, currency: nextCurrency }),
      true,
    );
    if (!updateResult.ok) {
      onError?.(updateResult.error, intent);
      return;
    }

    void characterService.save().then((saveResult) => {
      if (!saveResult.ok) onError?.(saveResult.error, intent);
    });
  };
}
