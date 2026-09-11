/**
 * Abertura de conexão IndexedDB. Autoridade: docs/criacao/08-PERSISTENCIA-LOCAL.md.
 *
 * `factory` é injetável para isolar bancos por teste (nome único ou `new IDBFactory()` do
 * `fake-indexeddb`), evitando vazamento de estado entre casos.
 */

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { applySchema, DB_NAME, DB_VERSION } from "./schema";

export interface OpenDatabaseOptions {
  readonly name?: string;
  readonly version?: number;
  readonly factory?: IDBFactory;
  /** Chamado quando outra conexão (mesma aba ou outra) inicia um upgrade; esta conexão se
   * fecha automaticamente antes de notificar, conforme 08-PERSISTENCIA-LOCAL.md
   * ("BroadcastChannel ... apenas avisa invalidação; não oferece exclusão mútua"). */
  readonly onVersionChange?: () => void;
  /** Chamado quando a abertura fica bloqueada por outra conexão aberta com versão menor. */
  readonly onBlocked?: () => void;
}

/**
 * Abre (ou cria) o banco `rpg-companion` e aplica o schema v1 em `onupgradeneeded`.
 * Nunca resolve com sucesso antes do evento `success` do `IDBOpenDBRequest`.
 */
export async function openDatabase(opts: OpenDatabaseOptions = {}): Promise<Result<IDBDatabase, AppError>> {
  const name = opts.name ?? DB_NAME;
  const version = opts.version ?? DB_VERSION;
  const factory = opts.factory ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);

  if (!factory) {
    return err(appError.storageUnavailable("IndexedDB não está disponível neste ambiente."));
  }

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, version);
    } catch (cause) {
      resolve(err(appError.storageUnavailable("Falha ao abrir o banco de dados.", String(cause))));
      return;
    }

    request.onupgradeneeded = (event) => {
      applySchema(request.result, event.oldVersion);
    };

    request.onblocked = () => {
      opts.onBlocked?.();
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opts.onVersionChange?.();
      };
      resolve(ok(db));
    };

    request.onerror = () => {
      resolve(
        err(appError.storageUnavailable("Falha ao abrir o banco de dados.", String(request.error))),
      );
    };
  });
}
