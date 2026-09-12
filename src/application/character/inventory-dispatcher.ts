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

import { type Character } from "@domain/contracts/character";
import { type AppError, ok, type Result } from "@domain/contracts/errors";
import {
  createInventoryState,
  equipInventoryItem,
  removeInventoryItem,
  setCurrency,
  setItemQuantity,
  unequipInventoryItem,
} from "@domain/inventory/operations";
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
}

function applyIntent(state: InventoryState, intent: InventoryIntent): Result<InventoryState, AppError> {
  switch (intent.kind) {
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
  }
}

/**
 * Cria o handler para `InventoryProps.onIntent`. Assinatura estável para wiring em
 * `src/app/bootstrap.tsx`:
 *
 * `createInventoryDispatcher(options: { readonly characterService: CharacterApplicationService; readonly onError?: (error: AppError, intent: InventoryIntent) => void }): (intent: InventoryIntent) => void`
 */
export function createInventoryDispatcher(options: InventoryDispatcherOptions): (intent: InventoryIntent) => void {
  const { characterService, onError } = options;

  return (intent: InventoryIntent): void => {
    const character: Character | undefined = characterService.store.getSnapshot().value;
    if (!character) {
      onError?.(
        { code: "validation-error", field: "character", message: "Nenhum personagem ativo para aplicar o intent de inventário." },
        intent,
      );
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
