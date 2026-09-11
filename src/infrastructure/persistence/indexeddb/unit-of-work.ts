/** UnitOfWork IndexedDB com uma transação real compartilhada pelos repositórios. */

import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";
import { appError, err, type AppError, type Result } from "@domain/contracts/errors";

import { createTransactionContext, releaseTransactionContext, toAppError } from "./transaction";
import { STORE_NAMES } from "./schema";

const ALL_STORES = Object.values(STORE_NAMES);

export class IndexedDbUnitOfWork implements UnitOfWork {
  constructor(private readonly db: IDBDatabase) {}

  run<T>(fn: (context: TransactionContext) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
    return new Promise((resolve) => {
      let transaction: IDBTransaction;
      try {
        transaction = this.db.transaction(ALL_STORES, "readwrite");
      } catch (cause) {
        resolve(err(appError.storageUnavailable("Falha ao iniciar transação.", String(cause))));
        return;
      }

      const context = createTransactionContext(this.db, transaction);
      let outcome: Result<T, AppError> | undefined;
      let settled = false;

      const settle = (result: Result<T, AppError>) => {
        if (settled) return;
        settled = true;
        releaseTransactionContext(context);
        resolve(result);
      };

      transaction.oncomplete = () => {
        if (outcome) settle(outcome);
        else settle(err(appError.storageUnavailable("Transação concluída sem resultado definido.")));
      };

      transaction.onerror = () => {
        /* onabort converte e resolve a falha, preservando a semântica atômica. */
      };

      transaction.onabort = () => {
        const fallback = transaction.error ?? new Error("Transação abortada.");
        settle(outcome && !outcome.ok ? outcome : err(toAppError(fallback)));
      };

      Promise.resolve()
        .then(() => fn(context))
        .then(
          (result) => {
            outcome = result;
            if (!result.ok) {
              try {
                transaction.abort();
              } catch {
                /* já concluída/abortando; o evento correspondente resolverá. */
              }
            }
          },
          (cause) => {
            outcome = err(toAppError(cause));
            try {
              transaction.abort();
            } catch {
              /* já concluída/abortando; o evento correspondente resolverá. */
            }
          },
        );
    });
  }
}
