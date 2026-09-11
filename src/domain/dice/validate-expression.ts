/**
 * Validação de `DiceExpression`. Autoridade: 11-DICE-ENGINE.md ("Contrato independente de
 * UI"). Função pura, sem RNG: nenhuma chamada aqui consome `RandomSource`.
 */

import { type DiceExpression, type DiceMode } from "@domain/contracts/dice";
import { appError, err, ok, type Result, type ValidationError } from "@domain/contracts/errors";
import { type DiceFaces } from "@domain/contracts/primitives";

const ALLOWED_FACES: readonly DiceFaces[] = [4, 6, 8, 10, 12, 20, 100];
const ALLOWED_MODES: readonly DiceMode[] = ["normal", "advantage", "disadvantage"];

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

/**
 * Valida entrada não confiável (`unknown`) contra o contrato de `DiceExpression`: quantity
 * inteiro 1-100, faces em {4,6,8,10,12,20,100}, modifier inteiro -1000..1000, mode em
 * normal|advantage|disadvantage, com advantage/disadvantage restritos a exatamente 1d20. Cada
 * rejeição identifica o `field` responsável.
 */
export function validateDiceExpression(input: unknown): Result<DiceExpression, ValidationError> {
  if (typeof input !== "object" || input === null) {
    return err(appError.validation("expression", "Expressão de dados deve ser um objeto com quantity, faces, modifier e mode."));
  }

  const candidate = input as Record<string, unknown>;
  const { quantity, faces, modifier, mode } = candidate;

  if (!isFiniteInteger(quantity) || quantity < 1 || quantity > 100) {
    return err(appError.validation("quantity", "Quantidade de dados deve ser um número inteiro entre 1 e 100."));
  }

  if (typeof faces !== "number" || !ALLOWED_FACES.includes(faces as DiceFaces)) {
    return err(appError.validation("faces", "Faces deve ser um dos valores suportados: 4, 6, 8, 10, 12, 20 ou 100."));
  }

  if (!isFiniteInteger(modifier) || modifier < -1000 || modifier > 1000) {
    return err(appError.validation("modifier", "Modificador deve ser um número inteiro entre -1000 e 1000."));
  }

  if (typeof mode !== "string" || !ALLOWED_MODES.includes(mode as DiceMode)) {
    return err(appError.validation("mode", "Modo deve ser normal, advantage ou disadvantage."));
  }

  if (mode !== "normal" && !(quantity === 1 && faces === 20)) {
    return err(
      appError.validation("mode", "Vantagem/desvantagem só é válida para exatamente 1d20 (11-DICE-ENGINE.md)."),
    );
  }

  const expression: DiceExpression = {
    quantity,
    faces: faces as DiceFaces,
    modifier,
    mode: mode as DiceMode,
  };
  return ok(expression);
}
