/**
 * Operações compostas: várias `DiceExpression` nomeadas por chave, resolvidas pelo mesmo
 * engine (`rollExpression`). Autoridade: 11-DICE-ENGINE.md ("Operações compostas").
 */

import { type DiceRoll, type RandomSource, type RollPlan, type RollPlanPart } from "@domain/contracts/dice";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { rollExpression, type RollMeta } from "./roll";
import { validateDiceExpression } from "./validate-expression";

/**
 * Resolve todas as parcelas de `plan`. Valida TODAS as expressões antes de rolar qualquer uma
 * — uma parcela inválida rejeita o plano inteiro sem consumir RNG de nenhuma parcela (inclusive
 * as válidas que viriam antes dela na lista).
 */
export function rollPlan(
  plan: RollPlan,
  rng: RandomSource,
  metaFactory: (part: RollPlanPart) => RollMeta,
): Result<Record<string, DiceRoll>, AppError> {
  const seenKeys = new Set<string>();
  for (const part of plan.parts) {
    if (seenKeys.has(part.key)) {
      return err(
        appError.validation(
          "parts",
          `Chave de parcela duplicada: "${part.key}". Cada parcela deve ter uma chave única.`,
        ),
      );
    }
    seenKeys.add(part.key);
  }

  for (const part of plan.parts) {
    const validated = validateDiceExpression(part.expression);
    if (!validated.ok) {
      return validated;
    }
  }

  const results: Record<string, DiceRoll> = {};
  for (const part of plan.parts) {
    const rolled = rollExpression(part.expression, rng, metaFactory(part));
    if (!rolled.ok) {
      return rolled;
    }
    results[part.key] = rolled.value;
  }

  return ok(results);
}
