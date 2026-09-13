import { type CampaignSession, SESSION_SCHEMA_VERSION } from "@domain/session";
import { isAccountId, isUuid, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type SessionRepository } from "@application/ports/session-repository";
import { type Clock } from "@application/ports/clock";
import { type TransactionContext } from "@application/ports/unit-of-work";

import { requestToPromise, runTransaction, runTransactionOrContext } from "./transaction";
import { STORE_NAMES } from "./schema";

function isSessionRecord(value: unknown): value is CampaignSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !isUuid(record.id) || typeof record.campaignId !== "string" || !isUuid(record.campaignId) || record.schemaVersion !== SESSION_SCHEMA_VERSION) return false;
  if (!Number.isInteger(record.revision) || Number(record.revision) < 0 || !Number.isInteger(record.number) || Number(record.number) < 1) return false;
  if (typeof record.title !== "string" || typeof record.notes !== "string" || typeof record.summary !== "string") return false;
  if (record.status !== "planned" && record.status !== "active" && record.status !== "ended") return false;
  if (!Array.isArray(record.attendance) || !record.attendance.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const attendance = item as Record<string, unknown>;
    return typeof attendance.characterId === "string" && isUuid(attendance.characterId) && isAccountId(attendance.playerId) && typeof attendance.present === "boolean";
  })) return false;
  if (typeof record.createdAt !== "string" || typeof record.updatedAt !== "string") return false;
  if (record.startedAt !== undefined && typeof record.startedAt !== "string") return false;
  if (record.endedAt !== undefined && typeof record.endedAt !== "string") return false;
  return true;
}

export class IndexedDbSessionRepository implements SessionRepository {
  constructor(private readonly db: IDBDatabase, private readonly clock: Clock) {}

  async get(id: Uuid, context?: TransactionContext): Promise<Result<CampaignSession, AppError>> {
    const result = await runTransactionOrContext(this.db, [STORE_NAMES.sessions], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.sessions).get(id));
      if (raw === undefined) return err(appError.notFound("session", id));
      return isSessionRecord(raw) ? ok(raw) : err(appError.corruptRecord(id));
    });
    return result;
  }

  async list(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly CampaignSession[], AppError>> {
    const result = await runTransactionOrContext(this.db, [STORE_NAMES.sessions], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.sessions).index("campaignId").getAll(campaignId));
      return ok(raw as unknown[]);
    });
    if (!result.ok) return result;
    const sessions: CampaignSession[] = [];
    for (const raw of result.value) {
      if (!isSessionRecord(raw)) return err(appError.corruptRecord(typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : "sessions:unknown"));
      sessions.push(raw);
    }
    sessions.sort((left, right) => left.number - right.number || left.createdAt.localeCompare(right.createdAt));
    return ok(sessions);
  }

  async save(session: CampaignSession, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>> {
    if (!isSessionRecord(session)) return err(appError.validation("session", "Registro de sessão inválido."));
    const now = this.clock.now();
    return runTransactionOrContext(this.db, [STORE_NAMES.sessions], "readwrite", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.sessions);
      const raw = await requestToPromise(store.get(session.id));
      let actualRevision: Revision;
      if (raw === undefined) actualRevision = asRevision(0);
      else if (!isSessionRecord(raw)) return err(appError.corruptRecord(session.id));
      else actualRevision = asRevision(raw.revision);
      if (actualRevision !== expectedRevision) return err(appError.conflict(expectedRevision, actualRevision));
      const nextRevision = asRevision(expectedRevision + 1);
      await requestToPromise(store.put({ ...session, revision: nextRevision, updatedAt: now }));
      return ok(nextRevision);
    });
  }

  async delete(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.sessions], "readwrite", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.sessions);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("session", id));
      if (!isSessionRecord(raw)) return err(appError.corruptRecord(id));
      if (asRevision(raw.revision) !== expectedRevision) return err(appError.conflict(expectedRevision, asRevision(raw.revision)));
      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }
}
