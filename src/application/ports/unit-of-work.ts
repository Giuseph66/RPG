/**
 * UnitOfWork. Autoridade: dados/schemas.md ("transações compostas coordenadas por UnitOfWork
 * específico"), 03-ARQUITETURA.md ("Salvo significa transação concluída").
 *
 * Semântica "commit-antes-de-status": `fn` só deve reportar/observar estado "salvo" depois que
 * a transação subjacente é confirmada (`transaction.complete`), nunca antes — nenhum efeito
 * colateral observável (snapshot publicado, "salvo" exibido) pode preceder o commit real.
 */

import { type AppError, type Result } from "@domain/contracts/errors";

/**
 * Contexto opaco devolvido por `UnitOfWork`.
 *
 * A infraestrutura associa este token à transação ativa; contratos de aplicação
 * não conhecem IndexedDB, DOM ou qualquer outro mecanismo de armazenamento. Um
 * repositório que recebe o mesmo contexto reutiliza a transação, em vez de abrir
 * outra. O valor só é válido durante a execução do callback de `run`.
 */
export interface TransactionContext {
  readonly kind: "rpg-transaction";
}

export interface UnitOfWork {
  /**
   * Executa uma composição de repositórios em uma transação única. Um `err(...)`
   * retornado pelo callback deve abortar a transação antes do resultado ser
   * observado pelo chamador.
   */
  run<T>(fn: (context: TransactionContext) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>>;
}
