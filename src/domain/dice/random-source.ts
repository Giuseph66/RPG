/**
 * Fontes de aleatoriedade para o Dice Engine. Autoridade: 11-DICE-ENGINE.md
 * ("Aleatoriedade e avaliação") — produção usa gerador da plataforma com amostragem sem viés
 * (rejection sampling, nunca módulo simples); testes injetam sequência fixa.
 *
 * Este módulo é a ÚNICA fronteira do pacote que toca uma API de plataforma (`crypto`), e mesmo
 * assim não é DOM/React/storage — é a fonte de entropia exigida pelo próprio contrato
 * `RandomSource` (dice.ts). A entropia vem exclusivamente de `crypto.getRandomValues`.
 */

import { type RandomSource } from "@domain/contracts/dice";

/** Versão do algoritmo de RNG de produção; gravada em `DiceRoll.rngVersion`/`AbilityScoreRollResult.rngVersion`. */
export const RNG_VERSION = "platform-rejection-v1";

/**
 * Versão gravada em `DiceRoll.rngVersion` quando o resultado veio da física
 * real do dado 3D — não de um sorteio de RNG. O número foi lido de
 * `lerDado()` depois que o dado assentou na mesa.
 */
export const RNG_VERSION_PHYSICAL = "physical-v1";

/**
 * Erro lançado quando um `RandomSource` (produção ou injetado em teste) devolve um valor fora
 * do contrato (`min <= valor <= max`, inteiro). O engine (roll.ts/ability-scores.ts/reroll.ts)
 * captura este erro no limite da função pública e o converte em `Result` com `AppError`
 * tipado (`appError.validation("rng", ...)`) — nunca deixa o valor inválido silenciosamente
 * seguir para a soma/seleção.
 */
export class RandomSourceContractError extends Error {
  constructor(
    message: string,
    public readonly value: number,
    public readonly min: number,
    public readonly max: number,
  ) {
    super(message);
    this.name = "RandomSourceContractError";
  }
}

/**
 * Valida que `value` é um inteiro dentro de `[min, max]`; devolve o próprio valor quando válido
 * ou lança `RandomSourceContractError` (nunca devolve silenciosamente um valor fora do
 * intervalo). Usado pelo engine logo após cada chamada a `RandomSource.nextInt`.
 */
export function assertInRange(value: number, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RandomSourceContractError(
      `RandomSource devolveu ${value}, esperado inteiro entre ${min} e ${max}.`,
      value,
      min,
      max,
    );
  }
  return value;
}

const TWO_POW_32 = 0x100000000;

/**
 * Sorteia um inteiro uniforme em `[min, max]` usando `crypto.getRandomValues` e rejection
 * sampling: descarta amostras de `Uint32` acima do maior múltiplo do tamanho do intervalo que
 * cabe em 32 bits, eliminando o viés de módulo que ocorreria com `bruto % range` direto.
 */
function uniformInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RandomSourceContractError(`Intervalo inválido para RandomSource: [${min}, ${max}].`, NaN, min, max);
  }
  const range = max - min + 1;
  const rejectionLimit = Math.floor(TWO_POW_32 / range) * range;
  const buffer = new Uint32Array(1);
  let candidate: number;
  do {
    globalThis.crypto.getRandomValues(buffer);
    candidate = buffer[0];
  } while (candidate >= rejectionLimit);
  return min + (candidate % range);
}

/** RNG de produção: `crypto.getRandomValues` da plataforma, sem viés de módulo. */
export function createPlatformRandomSource(): RandomSource {
  return {
    nextInt(minInclusive: number, maxInclusive: number): number {
      return uniformInt(minInclusive, maxInclusive);
    },
  };
}

/**
 * RNG determinístico para testes: devolve os valores de `seq`, em ordem, a cada chamada de
 * `nextInt` (ignora os limites recebidos — quem monta a sequência é responsável por respeitar
 * o intervalo esperado pelo chamador; violações de intervalo são pegas por `assertInRange` no
 * engine). Lança erro se a sequência se esgotar. `calls` conta quantas vezes `nextInt` foi
 * efetivamente invocado — usado nos testes para provar que rejeição de validação não consome
 * RNG.
 */
export function createSequenceRandomSource(seq: readonly number[]): RandomSource & { readonly calls: number } {
  let index = 0;
  let calls = 0;
  return {
    nextInt(_minInclusive: number, _maxInclusive: number): number {
      if (index >= seq.length) {
        throw new Error(`Sequência de RNG esgotada: pedido ${index + 1}, apenas ${seq.length} valor(es) disponível(is).`);
      }
      const value = seq[index];
      index += 1;
      calls += 1;
      return value;
    },
    get calls(): number {
      return calls;
    },
  };
}
