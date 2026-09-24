import { type AccountId, isUuid, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { SESSION_SCHEMA_VERSION, type CampaignSession, type EncounterState, type SessionAttendance } from "@domain/session";
import { type SyncOutboxService, toJsonSnapshot } from "@application/sync";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { type SessionRepository } from "@application/ports/session-repository";
import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";

import { type SessionAuthorizationPort } from "./authorization";
import { type LocalIdentity } from "@application/membership";

function sessionAggregateId(session: Pick<CampaignSession, "campaignId" | "id">): Uuid {
  // SyncOperation deletes cannot carry a payload. Keep the campaign scope in
  // the opaque aggregate ID so the remote adapter can address the document.
  return `${session.campaignId}/${session.id}` as Uuid;
}

export interface SessionServiceOptions {
  readonly repository: SessionRepository;
  readonly authorization: SessionAuthorizationPort;
  readonly unitOfWork?: UnitOfWork;
  readonly syncOutbox?: SyncOutboxService;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly localIdentity?: LocalIdentity;
  /** Opcional: materializa o dono local ao criar uma sessão recém-criada. */
  readonly ensureLocalOwner?: (campaignId: Uuid, accountId: AccountId) => Promise<Result<unknown, AppError>>;
}

export interface CreateSessionInput {
  readonly campaignId: Uuid;
  readonly accountId: AccountId;
  readonly number: number;
  readonly title?: string;
  readonly notes?: string;
  readonly attendance?: readonly SessionAttendance[];
}

export interface SessionService {
  create(input: CreateSessionInput): Promise<Result<CampaignSession, AppError>>;
  start(id: Uuid, accountId: AccountId): Promise<Result<CampaignSession, AppError>>;
  end(id: Uuid, accountId: AccountId, summary?: string): Promise<Result<CampaignSession, AppError>>;
  updateNotes(id: Uuid, accountId: AccountId, notes: string): Promise<Result<CampaignSession, AppError>>;
  setAttendance(id: Uuid, accountId: AccountId, attendance: readonly SessionAttendance[]): Promise<Result<CampaignSession, AppError>>;
  setEncounter(id: Uuid, accountId: AccountId, encounter: EncounterState | undefined): Promise<Result<CampaignSession, AppError>>;
  get(id: Uuid): Promise<Result<CampaignSession, AppError>>;
  list(campaignId: Uuid): Promise<Result<readonly CampaignSession[], AppError>>;
  delete(id: Uuid, accountId: AccountId): Promise<Result<void, AppError>>;
  localActor(): LocalIdentity | undefined;
}

function authorizationError(campaignId: Uuid, accountId: AccountId): AppError {
  return {
    code: "membership-forbidden",
    campaignId,
    accountId,
    message: "Somente o mestre da campanha pode alterar sessões.",
  };
}

function validateAttendance(attendance: readonly SessionAttendance[]): Result<readonly SessionAttendance[], AppError> {
  const seen = new Set<string>();
  for (const item of attendance) {
    if (!item.characterId || !item.playerId || typeof item.present !== "boolean") {
      return err(appError.validation("attendance", "Presença de sessão inválida."));
    }
    if (seen.has(item.characterId)) {
      return err(appError.validation("attendance", "Cada personagem pode aparecer uma vez na presença."));
    }
    seen.add(item.characterId);
  }
  return ok(attendance.map((item) => ({ ...item })));
}

function validateEncounter(encounter: EncounterState | undefined): Result<EncounterState | undefined, AppError> {
  if (encounter === undefined) return ok(undefined);
  if (!Number.isInteger(encounter.round) || encounter.round < 1 || !Array.isArray(encounter.combatants)) {
    return err(appError.validation("encounter", "Rodada ou lista do encontro inválida."));
  }
  const keys = new Set<string>();
  const combatants: EncounterState["combatants"][number][] = [];
  for (const item of encounter.combatants) {
    if ((item.entityType !== "character" && item.entityType !== "npc") || !isUuid(String(item.entityId)) || !Number.isInteger(item.initiative)) {
      return err(appError.validation("encounter", "Participante ou iniciativa inválida."));
    }
    const key = item.entityType + ":" + item.entityId;
    if (keys.has(key)) return err(appError.validation("encounter", "O mesmo participante não pode entrar duas vezes no encontro."));
    keys.add(key);
    combatants.push({ entityType: item.entityType, entityId: item.entityId, initiative: item.initiative });
  }
  if (encounter.activeCombatantKey && !keys.has(encounter.activeCombatantKey)) {
    return err(appError.validation("encounter", "O turno atual precisa pertencer a um participante do encontro."));
  }
  return ok({ round: encounter.round, ...(encounter.activeCombatantKey ? { activeCombatantKey: encounter.activeCombatantKey } : {}), combatants });
}

function withUpdatedAt(session: CampaignSession, patch: Partial<CampaignSession>, clock: Clock): CampaignSession {
  return { ...session, ...patch, updatedAt: clock.now() };
}

export function createSessionService(options: SessionServiceOptions): SessionService {
  const { repository, authorization, unitOfWork, syncOutbox, clock, idGenerator } = options;

  async function requireMaster(campaignId: Uuid, accountId: AccountId): Promise<Result<void, AppError>> {
    if (options.localIdentity?.accountId === accountId && options.ensureLocalOwner) {
      const owner = await options.ensureLocalOwner(campaignId, accountId);
      if (!owner.ok) return err(owner.error);
    }
    const role = await authorization.getCampaignRole(campaignId, accountId);
    if (!role.ok) return role;
    return role.value === "master" ? ok(undefined) : err(authorizationError(campaignId, accountId));
  }

  async function persist(
    session: CampaignSession,
    expectedRevision: Revision,
    context?: TransactionContext,
  ): Promise<Result<CampaignSession, AppError>> {
    const saved = await repository.save(session, expectedRevision, context);
    if (!saved.ok) return saved;
    const persisted: CampaignSession = { ...session, revision: saved.value, updatedAt: clock.now() };
    if (syncOutbox) {
      const payload = toJsonSnapshot(persisted);
      if (payload === undefined) return err(appError.validation("session", "Sessão não é serializável."));
      const queued = await syncOutbox.enqueue({
        operationId: idGenerator.commandId(),
        aggregateType: "session",
        aggregateId: sessionAggregateId(session),
        mutation: "upsert",
        baseRevision: expectedRevision,
        payload,
        createdAt: clock.now(),
      }, context);
      if (!queued.ok) return err(queued.error);
    }
    return ok(persisted);
  }

  async function remove(
    session: CampaignSession,
    context?: TransactionContext,
  ): Promise<Result<void, AppError>> {
    const deleted = await repository.delete(session.id, session.revision, context);
    if (!deleted.ok) return deleted;
    if (!syncOutbox) return ok(undefined);
    const queued = await syncOutbox.enqueue({
      operationId: idGenerator.commandId(), aggregateType: "session", aggregateId: sessionAggregateId(session),
      mutation: "delete", baseRevision: session.revision, scope: { campaignId: session.campaignId }, createdAt: clock.now(),
    }, context);
    return queued.ok ? ok(undefined) : err(queued.error);
  }

  async function run<T>(fn: (context?: TransactionContext) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
    return unitOfWork ? unitOfWork.run((context) => fn(context)) : fn();
  }

  async function mutate(
    id: Uuid,
    accountId: AccountId,
    patch: (current: CampaignSession) => Result<CampaignSession, AppError>,
  ): Promise<Result<CampaignSession, AppError>> {
    const current = await repository.get(id);
    if (!current.ok) return current;
    const allowed = await requireMaster(current.value.campaignId, accountId);
    if (!allowed.ok) return allowed;
    const next = patch(current.value);
    if (!next.ok) return next;
    return run((context) => persist(next.value, current.value.revision, context));
  }

  return {
    localActor: () => options.localIdentity,
    async create(input) {
      if (!Number.isInteger(input.number) || input.number < 1) {
        return err(appError.validation("number", "Número da sessão deve ser inteiro positivo."));
      }
      const allowed = await requireMaster(input.campaignId, input.accountId);
      if (!allowed.ok) return allowed;
      const attendance = validateAttendance(input.attendance ?? []);
      if (!attendance.ok) return attendance;
      const now = clock.now();
      const session: CampaignSession = {
        id: idGenerator.uuid(), campaignId: input.campaignId, schemaVersion: SESSION_SCHEMA_VERSION,
        revision: asRevision(0), number: input.number,
        title: input.title?.trim() || `Sessão ${input.number}`,
        notes: input.notes ?? "", summary: "", status: "planned", attendance: attendance.value,
        createdAt: now, updatedAt: now,
      };
      return run((context) => persist(session, asRevision(0), context));
    },
    start: (id, accountId) => mutate(id, accountId, (current) => {
      if (current.status === "ended") return err(appError.validation("status", "Sessão encerrada não pode ser iniciada novamente."));
      if (current.status === "active") return ok(current);
      return ok(withUpdatedAt(current, { status: "active", startedAt: clock.now() }, clock));
    }),
    end: (id, accountId, summary = "") => mutate(id, accountId, (current) => {
      if (current.status !== "active") return err(appError.validation("status", "Somente sessão ativa pode ser encerrada."));
      return ok(withUpdatedAt(current, { status: "ended", endedAt: clock.now(), summary }, clock));
    }),
    updateNotes: (id, accountId, notes) => mutate(id, accountId, (current) => ok(withUpdatedAt(current, { notes }, clock))),
    setAttendance: (id, accountId, attendance) => mutate(id, accountId, (current) => {
      const valid = validateAttendance(attendance);
      return valid.ok ? ok(withUpdatedAt(current, { attendance: valid.value }, clock)) : valid;
    }),
    setEncounter: (id, accountId, encounter) => mutate(id, accountId, (current) => {
      const valid = validateEncounter(encounter);
      return valid.ok ? ok(withUpdatedAt(current, { encounter: valid.value }, clock)) : valid;
    }),
    get: (id) => repository.get(id),
    list: (campaignId) => repository.list(campaignId),
    async delete(id, accountId) {
      const current = await repository.get(id);
      if (!current.ok) return current;
      const allowed = await requireMaster(current.value.campaignId, accountId);
      if (!allowed.ok) return allowed;
      return run((context) => remove(current.value, context));
    },
  };
}
