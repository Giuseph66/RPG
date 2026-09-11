/**
 * Operação central do Dice Engine: resolve uma `DiceExpression` já validada (ou não — este
 * caso de uso valida de novo, defensivamente) contra um `RandomSource` injetado. Autoridade:
 * 11-DICE-ENGINE.md ("Aleatoriedade e avaliação", "Casos determinísticos obrigatórios").
 */

import { type CommandId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { type DiceExpression, type DicePurpose, type DiceRoll, type RandomSource } from "@domain/contracts/dice";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { assertInRange, RandomSourceContractError, RNG_VERSION } from "./random-source";
import { validateDiceExpression } from "./validate-expression";

export interface RollMeta {
  readonly id: Uuid;
  readonly timestamp: IsoTimestamp;
  readonly purpose: DicePurpose;
  readonly characterId?: Uuid;
  readonly commandId?: CommandId;
}

/** Seleciona o índice vencedor entre dois d20 (`a` = primeiro rolado, `b` = segundo). Empate
 * sempre resolve para o índice 0 ("selecionar primeiro para consistência do histórico",
 * 11-DICE-ENGINE.md), tanto em vantagem quanto em desvantagem. */
function pickAdvantageIndex(a: number, b: number, mode: "advantage" | "disadvantage"): 0 | 1 {
  if (mode === "advantage") {
    return b > a ? 1 : 0;
  }
  return b < a ? 1 : 0;
}

function rollRawDice(expr: DiceExpression, rng: RandomSource): readonly number[] {
  if (expr.mode === "normal") {
    const rawDice: number[] = [];
    for (let i = 0; i < expr.quantity; i += 1) {
      rawDice.push(assertInRange(rng.nextInt(1, expr.faces), 1, expr.faces));
    }
    return rawDice;
  }
  // advantage/disadvantage: validateDiceExpression já garantiu exatamente 1d20.
  const a = assertInRange(rng.nextInt(1, expr.faces), 1, expr.faces);
  const b = assertInRange(rng.nextInt(1, expr.faces), 1, expr.faces);
  return [a, b];
}

function buildSelection(
  expr: DiceExpression,
  rawDice: readonly number[],
): { selectedIndexes: readonly number[]; discardedIndexes: readonly number[]; subtotal: number } {
  if (expr.mode === "normal") {
    return {
      selectedIndexes: rawDice.map((_value, index) => index),
      discardedIndexes: [],
      subtotal: rawDice.reduce((sum, value) => sum + value, 0),
    };
  }
  const chosenIndex = pickAdvantageIndex(rawDice[0], rawDice[1], expr.mode);
  const discardedIndex = chosenIndex === 0 ? 1 : 0;
  return {
    selectedIndexes: [chosenIndex],
    discardedIndexes: [discardedIndex],
    subtotal: rawDice[chosenIndex],
  };
}

/**
 * Resolve `expr` contra `rng`, produzindo um `DiceRoll` completo. Valida a expressão ANTES de
 * qualquer chamada a `rng.nextInt` — rejeição de validação nunca consome RNG. `meta` fornece
 * id/timestamp/purpose/characterId/commandId, todos injetados pela aplicação (o engine nunca
 * gera UUID nem lê relógio).
 */
export function rollExpression(expr: DiceExpression, rng: RandomSource, meta: RollMeta): Result<DiceRoll, AppError> {
  const validated = validateDiceExpression(expr);
  if (!validated.ok) {
    return validated;
  }
  const safeExpr = validated.value;

  try {
    const rawDice = rollRawDice(safeExpr, rng);
    const { selectedIndexes, discardedIndexes, subtotal } = buildSelection(safeExpr, rawDice);
    const total = subtotal + safeExpr.modifier;

    const roll: DiceRoll = {
      id: meta.id,
      expression: safeExpr,
      purpose: meta.purpose,
      characterId: meta.characterId,
      commandId: meta.commandId,
      timestamp: meta.timestamp,
      rawDice,
      selectedIndexes,
      discardedIndexes,
      subtotal,
      modifier: safeExpr.modifier,
      total,
      rngVersion: RNG_VERSION,
    };
    return ok(roll);
  } catch (error) {
    if (error instanceof RandomSourceContractError) {
      return err(appError.validation("rng", error.message));
    }
    throw error;
  }
}

// Reexportados para reroll.ts/roll-plan.ts reaproveitarem a mesma lógica de seleção sem duplicar
// a regra de empate/soma.
export { buildSelection as buildRollSelection, pickAdvantageIndex };
