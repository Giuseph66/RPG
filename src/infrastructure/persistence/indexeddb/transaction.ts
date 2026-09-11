/**
 * Helpers de transação IndexedDB. Autoridade: docs/criacao/08-PERSISTENCIA-LOCAL.md
 * ("Ler revisão e escrever na mesma transação evita corrida entre abas"),
 * docs/criacao/03-ARQUITETURA.md ("Salvo significa transação concluída").
 *
 * ATENÇÃO — autocommit do IndexedDB: uma `IDBTransaction` se encerra sozinha assim que o
 * event loop volta a ela sem nenhuma requisição pendente. Isso significa que `fn` (o
 * callback passado a `runTransaction`) NUNCA pode `await` algo que não seja, em última
 * instância, uma requisição desta mesma transação (ex.: `fetch`, `setTimeout`, uma
 * chamada a outro repositório que abre outra transação). Um `await` "estranho" deixa a
 * transação órfã sem nenhuma requisição pendente, e ela se autocommita (ou fecha) antes
 * de `fn` retomar — a requisição seguinte falhará com `TransactionInactiveError`. Ver
 * uma composição via `UnitOfWork` deve passar o contexto aos repositórios para reutilizar
 * a mesma transação.
 */

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "@application/ports/unit-of-work";

interface ActiveTransaction {
  readonly db: IDBDatabase;
  readonly transaction: IDBTransaction;
}

const activeTransactions = new WeakMap<object, ActiveTransaction>();

/** Cria o token opaco que vincula uma chamada de repositório à transação do UoW. */
export function createTransactionContext(db: IDBDatabase, transaction: IDBTransaction): TransactionContext {
  const context: TransactionContext = Object.freeze({ kind: "rpg-transaction" as const });
  activeTransactions.set(context, { db, transaction });
  return context;
}

/** Remove o vínculo quando a transação termina; tokens não vazam para operações futuras. */
export function releaseTransactionContext(context: TransactionContext): void {
  activeTransactions.delete(context);
}

function transactionForContext(db: IDBDatabase, context: TransactionContext): IDBTransaction | undefined {
  const active = activeTransactions.get(context);
  return active?.db === db ? active.transaction : undefined;
}

/** Converte um `IDBRequest` em Promise; resolve em `onsuccess`, rejeita em `onerror`. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha desconhecida em requisição IndexedDB."));
  });
}

/** Marcador para um repositório sinalizar explicitamente que a transação deve abortar
 * (nada é gravado) preservando o `AppError` de domínio a ser reportado. Uso raro: a
 * maioria dos erros de negócio (not-found, conflict) deve ser devolvida como `Result`
 * normal por `fn`, já que nada foi escrito ainda e a transação pode concluir sem efeito. */
export class TxAbortError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.message);
    this.name = "TxAbortError";
  }
}

function isAppErrorShape(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { code?: unknown }).code === "string" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/** Mapeia uma falha (DOMException do IDB, TxAbortError ou erro genérico) para `AppError`. */
export function toAppError(reason: unknown): AppError {
  if (reason instanceof TxAbortError) return reason.appError;
  if (isAppErrorShape(reason)) return reason;
  if (typeof DOMException !== "undefined" && reason instanceof DOMException) {
    if (reason.name === "QuotaExceededError") {
      return appError.quotaExceeded("Cota de armazenamento excedida.");
    }
    return appError.storageUnavailable(`Erro de IndexedDB (${reason.name}).`, reason.message);
  }
  if (reason instanceof Error) {
    return appError.storageUnavailable("Erro inesperado na transação.", reason.message);
  }
  return appError.storageUnavailable("Erro inesperado na transação.", String(reason));
}

export type TransactionFn<T> = (tx: IDBTransaction) => Promise<Result<T, AppError>>;

/** Executa uma operação usando a transação já aberta pelo UnitOfWork. */
export async function runInTransactionContext<T>(
  db: IDBDatabase,
  context: TransactionContext,
  fn: TransactionFn<T>,
): Promise<Result<T, AppError>> {
  const transaction = transactionForContext(db, context);
  if (!transaction) {
    return err(appError.storageUnavailable("O contexto de transação não está mais ativo."));
  }

  try {
    return await fn(transaction);
  } catch (reason) {
    try {
      transaction.abort();
    } catch {
      /* o UoW resolverá o abort já iniciado */
    }
    return err(toAppError(reason));
  }
}

/** Escolhe a transação compartilhada quando há contexto; caso contrário abre uma própria. */
export function runTransactionOrContext<T>(
  db: IDBDatabase,
  storeNames: readonly string[],
  mode: IDBTransactionMode,
  context: TransactionContext | undefined,
  fn: TransactionFn<T>,
): Promise<Result<T, AppError>> {
  return context
    ? runInTransactionContext(db, context, fn)
    : runTransaction(db, storeNames, mode, fn);
}

/**
 * Executa `fn` dentro de uma transação sobre `storeNames`. Resolve com `ok(valor)` SOMENTE
 * depois de `transaction.oncomplete` (nunca antes — "salvo" é pós-commit). Resolve com
 * `err(...)` quando `fn` retorna um `Result` de erro (transação ainda completa
 * normalmente, pois nada precisa ser desfeito) ou quando a transação aborta — por rejeição
 * de `fn` (bug/erro inesperado, inclusive `TxAbortError`) ou por falha nativa do IDB (ex.:
 * quota excedida num `put`), caso em que o IDB desfaz sozinho qualquer escrita anterior da
 * mesma transação.
 */
export async function runTransaction<T>(
  db: IDBDatabase,
  storeNames: readonly string[],
  mode: IDBTransactionMode,
  fn: TransactionFn<T>,
): Promise<Result<T, AppError>> {
  return new Promise((resolve) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeNames as string[], mode);
    } catch (cause) {
      resolve(err(appError.storageUnavailable("Falha ao iniciar transação.", String(cause))));
      return;
    }

    let settled = false;
    let outcome: Result<T, AppError> | undefined;

    const settle = (result: Result<T, AppError>) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    tx.oncomplete = () => {
      settle(outcome ?? err(appError.storageUnavailable("Transação concluída sem resultado definido.")));
    };

    // Não usamos tx.onerror para resolver: por padrão (sem preventDefault) o IDB aborta a
    // transação automaticamente após um erro de requisição não tratado, e o evento
    // `abort` sempre dispara em seguida — é lá que resolvemos.
    tx.onerror = () => {
      /* silencioso de propósito: o abort natural cobre a resolução. */
    };

    tx.onabort = () => {
      const fallback = tx.error ?? new Error("Transação abortada.");
      settle(outcome && !outcome.ok ? outcome : err(toAppError(fallback)));
    };

    fn(tx).then(
      (result) => {
        outcome = result;
        // Não resolve aqui: aguarda oncomplete/onabort conforme o destino real da transação.
      },
      (reason) => {
        outcome = err(toAppError(reason));
        try {
          tx.abort();
        } catch {
          /* já abortando ou já concluída — ignorar. */
        }
      },
    );
  });
}
