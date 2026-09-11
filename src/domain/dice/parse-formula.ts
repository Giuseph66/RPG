/**
 * Parser de texto livre para expressão de dados. Autoridade: 11-DICE-ENGINE.md
 * ("Texto livre... gramática fechada NdF, NdF + M, NdF - M... nunca eval").
 *
 * Gramática fechada: `<quantity:digits> [espaços] d [espaços] <faces:digits>` seguido
 * opcionalmente de `[espaços] (+|-) [espaços] <modifier:digits>`. Nada além disso — sem
 * multiplicação, sem múltiplos termos, sem `eval`.
 */

import { type DiceExpression } from "@domain/contracts/dice";
import { appError, err, type Result, type ValidationError } from "@domain/contracts/errors";

import { validateDiceExpression } from "./validate-expression";

// Âncora em ^...$: qualquer caractere fora da gramática (ex.: "*2", segundo termo "d4") invalida
// a fórmula inteira. Flag "i" torna o "d" (e só ele) case-insensitive.
const FORMULA_PATTERN = /^\s*(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i;

/**
 * Interpreta `text` como `NdF`, `NdF + M` ou `NdF - M` (espaços opcionais, "d" case-insensitive)
 * e delega a validação de limites/modo a `validateDiceExpression` (modo sempre "normal" — a
 * gramática de texto livre não expressa vantagem/desvantagem).
 */
export function parseDiceFormula(text: string): Result<DiceExpression, ValidationError> {
  if (typeof text !== "string") {
    return err(appError.validation("text", "Fórmula de dados deve ser uma string."));
  }

  const match = FORMULA_PATTERN.exec(text);
  if (!match) {
    return err(
      appError.validation(
        "text",
        `Fórmula de dados inválida: "${text}". Use o formato NdF, NdF + M ou NdF - M.`,
      ),
    );
  }

  const quantity = Number.parseInt(match[1], 10);
  const faces = Number.parseInt(match[2], 10);
  const sign = match[3];
  const modifierMagnitude = match[4] !== undefined ? Number.parseInt(match[4], 10) : 0;
  const modifier = sign === "-" ? -modifierMagnitude : modifierMagnitude;

  return validateDiceExpression({ quantity, faces, modifier, mode: "normal" });
}

/**
 * Decisão de contrato: `DiceFormula` em `src/domain/contracts/primitives.ts` é uma interface
 * estrutural `{quantity, faces}` (usada por definitions estáticas, ex.: dado de dano de arma),
 * NÃO uma string com brand. Não existe portanto um tipo de contrato para "texto de fórmula" —
 * esta função devolve `string` puro. Se DATA-001 quiser um brand dedicado (ex.: `DiceFormulaText`)
 * para diferenciar de string livre, é uma mudança de contrato a pedir separadamente (ver
 * handoff).
 */
export function formatDiceFormula(expr: DiceExpression): string {
  const base = `${expr.quantity}d${expr.faces}`;
  if (expr.modifier === 0) {
    return base;
  }
  const sign = expr.modifier > 0 ? "+" : "-";
  return `${base}${sign}${Math.abs(expr.modifier)}`;
}
