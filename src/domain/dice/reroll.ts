/**
 * Re-rolagem POR REGRA (ex.: Sorte de halfling) — operação distinta de "rolar novamente" da
 * UI. Autoridade: 11-DICE-ENGINE.md ("Re-rolagem por regra é operação distinta de 'rolar
 * novamente' da UI. A primeira conserva vínculo com rolagem original e limita dados conforme
 * característica...; a segunda cria novo ID e resultado independente.").
 *
 * "Rolar novamente" da UI NÃO usa este arquivo: é apenas chamar `rollExpression` de novo com um
 * novo `id`/`timestamp` — um resultado totalmente independente, sem vínculo. `rerollDice` é só
 * para quando a REGRA do jogo exige re-rolar dados específicos de uma rolagem já existente,
 * preservando `rerolledFromId` para a UI conseguir mostrar "substituiu o resultado X".
 */

import { type DiceRoll, type RandomSource } from "@domain/contracts/dice";
import { type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { assertInRange, RandomSourceContractError, RNG_VERSION } from "./random-source";
import { buildRollSelection } from "./roll";

export interface RerollMeta {
  readonly id: Uuid;
  readonly timestamp: IsoTimestamp;
}

export type RerolledDiceRoll = DiceRoll & { readonly rerolledFromId: Uuid };

/**
 * Re-rola os dados de `original` nos índices de `indexesToReroll` (deve conter apenas índices
 * válidos de `original.rawDice`; caso contrário rejeita sem consumir RNG), recalcula
 * seleção/subtotal/total conforme o `mode` da expressão original, e devolve um novo `DiceRoll`
 * com `rerolledFromId` apontando para `original.id`. `purpose`/`characterId`/`commandId` são
 * herdados de `original` — é a mesma jogada, apenas com dados substituídos, não uma nova
 * intenção de rolagem.
 */
export function rerollDice(
  original: DiceRoll,
  indexesToReroll: readonly number[],
  rng: RandomSource,
  meta: RerollMeta,
): Result<RerolledDiceRoll, AppError> {
  const maxIndex = original.rawDice.length - 1;
  const seenIndexes = new Set<number>();
  for (const index of indexesToReroll) {
    if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
      return err(
        appError.validation(
          "indexesToReroll",
          `Índice de rerrolagem inválido: ${index}. Deve ser inteiro entre 0 e ${maxIndex}.`,
        ),
      );
    }
    if (seenIndexes.has(index)) {
      return err(
        appError.validation(
          "indexesToReroll",
          `Índice de rerrolagem duplicado: ${index}. Cada índice deve aparecer uma única vez.`,
        ),
      );
    }
    seenIndexes.add(index);
  }

  try {
    const newRawDice = [...original.rawDice];
    for (const index of indexesToReroll) {
      newRawDice[index] = assertInRange(
        rng.nextInt(1, original.expression.faces),
        1,
        original.expression.faces,
      );
    }

    const { selectedIndexes, discardedIndexes, subtotal } = buildRollSelection(original.expression, newRawDice);
    const total = subtotal + original.modifier;

    const rerolled: RerolledDiceRoll = {
      id: meta.id,
      expression: original.expression,
      purpose: original.purpose,
      characterId: original.characterId,
      commandId: original.commandId,
      timestamp: meta.timestamp,
      rawDice: newRawDice,
      selectedIndexes,
      discardedIndexes,
      subtotal,
      modifier: original.modifier,
      total,
      rngVersion: RNG_VERSION,
      rerolledFromId: original.id,
    };
    return ok(rerolled);
  } catch (error) {
    if (error instanceof RandomSourceContractError) {
      return err(appError.validation("rng", error.message));
    }
    throw error;
  }
}
