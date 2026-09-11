/**
 * Geração de atributos: seis grupos de 4d6, descarta o menor de cada grupo. Operação própria,
 * não reaproveita `DiceExpression.mode` (11-DICE-ENGINE.md, "Operações compostas"; fonte:
 * Livro do Jogador cap. 1 p. 13/PDF 12).
 */

import { type AbilityScoreRollGroup, type AbilityScoreRollResult, type RandomSource } from "@domain/contracts/dice";
import { type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { assertInRange, RandomSourceContractError, RNG_VERSION } from "./random-source";

export interface AbilityScoreRollMeta {
  readonly id: Uuid;
  readonly timestamp: IsoTimestamp;
}

const GROUP_COUNT = 6;
const DICE_PER_GROUP = 4;
const ABILITY_DIE_FACES = 6;

/** Índice do menor valor do grupo; empate descarta o PRIMEIRO índice menor (regras/testes.md
 * segue a mesma convenção de "selecionar primeiro" usada em vantagem/desvantagem). */
function findLowestIndex(rawDice: readonly [number, number, number, number]): 0 | 1 | 2 | 3 {
  let lowest: 0 | 1 | 2 | 3 = 0;
  for (let i = 1; i < DICE_PER_GROUP; i += 1) {
    if (rawDice[i] < rawDice[lowest]) {
      lowest = i as 0 | 1 | 2 | 3;
    }
  }
  return lowest;
}

function rollGroup(rng: RandomSource): AbilityScoreRollGroup {
  const rawDice: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < DICE_PER_GROUP; i += 1) {
    rawDice[i] = assertInRange(rng.nextInt(1, ABILITY_DIE_FACES), 1, ABILITY_DIE_FACES);
  }
  const discardedIndex = findLowestIndex(rawDice);
  const total = rawDice.reduce((sum, value, index) => (index === discardedIndex ? sum : sum + value), 0);
  return { rawDice, discardedIndex, total };
}

/** Sorteia os seis grupos de 4d6-descarta-o-menor para geração de atributos. */
export function rollAbilityScores(rng: RandomSource, meta: AbilityScoreRollMeta): Result<AbilityScoreRollResult, AppError> {
  try {
    const groups: AbilityScoreRollGroup[] = [];
    for (let g = 0; g < GROUP_COUNT; g += 1) {
      groups.push(rollGroup(rng));
    }

    const [g0, g1, g2, g3, g4, g5] = groups;
    const result: AbilityScoreRollResult = {
      id: meta.id,
      groups: [g0, g1, g2, g3, g4, g5],
      rngVersion: RNG_VERSION,
      timestamp: meta.timestamp,
    };
    return ok(result);
  } catch (error) {
    if (error instanceof RandomSourceContractError) {
      return err(appError.validation("rng", error.message));
    }
    throw error;
  }
}
