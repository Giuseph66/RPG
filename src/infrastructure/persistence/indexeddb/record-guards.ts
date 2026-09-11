/**
 * Validação de forma mínima e recuperação de registros corrompidos.
 * Autoridade: docs/criacao/08-PERSISTENCIA-LOCAL.md ("Recuperação").
 *
 * Decisão de infraestrutura: só `Character` e `Campaign` carregam `schemaVersion` no
 * contrato congelado (src/domain/contracts) — `MapRecord`/`Asset`/`JournalEntry` não têm
 * esse campo. Por isso `unsupported-schema` só se aplica à leitura de personagem/campanha
 * nesta camada; mapas/assets/diário só passam pela checagem estrutural mínima
 * (id/revision quando existir) antes de `corrupt-record`.
 */

import { type IsoTimestamp } from "@domain/contracts/ids";
import { type Asset } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";

import { requestToPromise, runTransaction } from "./transaction";
import { STORE_NAMES } from "./schema";

export interface RecoveryRecord {
  readonly id: string;
  readonly sourceStore: string;
  readonly raw: unknown;
  readonly recordedAt: IsoTimestamp;
}

/** Registro com `id` string e `revision` inteiro >= 0 (Character, Campaign, MapRecord). */
export function hasIdAndRevision(value: unknown): value is { readonly id: string; readonly revision: number } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.revision === "number" &&
    Number.isInteger(record.revision) &&
    record.revision >= 0
  );
}

/** Registro com envelope de schema (Character, Campaign): id + schemaVersion + revision. */
export function hasSchemaEnvelope(
  value: unknown,
): value is { readonly id: string; readonly schemaVersion: number; readonly revision: number } {
  if (!hasIdAndRevision(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.schemaVersion === "number" && Number.isInteger(record.schemaVersion) && record.schemaVersion >= 1;
}

/** Registro simples com apenas `id` string (Asset não tem revision/schemaVersion). */
export function hasIdOnly(value: unknown): value is { readonly id: string } {
  return typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).id === "string";
}

export function isValidAssetShape(
  value: unknown,
): value is Asset {
  if (!hasIdOnly(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.hash === "string" &&
    record.hash.length > 0 &&
    ArrayBuffer.isView(record.bytes) && record.bytes.constructor.name === "Uint8Array" &&
    typeof record.mediaType === "string" &&
    record.mediaType.length > 0 &&
    typeof record.originalName === "string"
  );
}

/** Copia bytes originais do registro corrompido para a store `recovery`, preservando-os
 * para eventual download/restauração manual (fora do escopo de DATA-003). Best-effort:
 * falha ao gravar a cópia de recuperação não deve mascarar o `corrupt-record` original,
 * por isso o chamador ignora o `Result` de erro aqui e segue reportando `corrupt-record`. */
export async function persistToRecovery(
  db: IDBDatabase,
  id: string,
  sourceStore: string,
  raw: unknown,
  recordedAt: IsoTimestamp,
): Promise<Result<void, AppError>> {
  return runTransaction(db, [STORE_NAMES.recovery], "readwrite", async (tx) => {
    const record: RecoveryRecord = { id, sourceStore, raw, recordedAt };
    await requestToPromise(tx.objectStore(STORE_NAMES.recovery).put(record));
    return ok(undefined);
  });
}

/**
 * Lê um registro por `id`, valida forma mínima via `guard` e, se inválido, preserva os
 * bytes originais em `recovery` antes de reportar `corrupt-record`. Ausência do registro
 * é `not-found`, nunca confundido com banco indisponível.
 */
export async function readValidated<T>(
  db: IDBDatabase,
  storeName: string,
  id: string,
  now: IsoTimestamp,
  guard: (value: unknown) => value is T,
  entityLabel: string,
): Promise<Result<T, AppError>> {
  const readResult = await runTransaction<unknown>(db, [storeName], "readonly", async (tx) => {
    const raw = await requestToPromise(tx.objectStore(storeName).get(id));
    return ok(raw);
  });
  if (!readResult.ok) return err(readResult.error);

  const raw = readResult.value;
  if (raw === undefined) return err(appError.notFound(entityLabel, id));

  if (!guard(raw)) {
    await persistToRecovery(db, id, storeName, raw, now);
    return err(appError.corruptRecord(id, undefined, id));
  }
  return ok(raw);
}
