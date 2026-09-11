/**
 * Barrel do Dice Engine (DICE-001). Autoridade: 11-DICE-ENGINE.md. Consumidores (RULE-001,
 * DICE-002) devem importar por aqui ou pelos arquivos específicos — nunca redefinir
 * `DiceExpression`/`DiceRoll`/`RandomSource` (contratos congelados em
 * `@domain/contracts/dice`).
 */

export * from "./validate-expression";
export * from "./parse-formula";
export * from "./random-source";
export * from "./roll";
export * from "./roll-plan";
export * from "./ability-scores";
export * from "./reroll";
