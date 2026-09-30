import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase/firestore";

import type { PlayerInviteLinkStore } from "@application/membership/ports";
import { asAccountId, asIsoTimestamp, type AccountId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { err, ok, type MembershipError, type MembershipErrorCode, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";
import type { Membership } from "@domain/contracts/cloud-sync";

type FirestoreData = Record<string, unknown>;
type InviteTransaction = Pick<Transaction, "get" | "set">;
type InviteSnapshot = { exists(): boolean; data(): unknown };

export interface PlayerInviteLinkFirestoreDeps {
  readonly doc: (firestore: Firestore, path: string) => DocumentReference;
  readonly runTransaction: <T>(
    firestore: Firestore,
    update: (transaction: InviteTransaction) => Promise<T>,
  ) => Promise<T>;
  readonly serverTimestamp: () => unknown;
  readonly timestampFromDate: (date: Date) => unknown;
}

const defaultDeps: PlayerInviteLinkFirestoreDeps = {
  doc: (firestore, path) => doc(firestore, path),
  runTransaction: <T>(firestore: Firestore, update: (transaction: InviteTransaction) => Promise<T>) =>
    runTransaction(firestore, update as (transaction: Transaction) => Promise<T>),
  serverTimestamp: () => serverTimestamp(),
  timestampFromDate: (date) => Timestamp.fromDate(date),
};

function isRecord(value: unknown): value is FirestoreData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(
  code: MembershipErrorCode,
  message: string,
  campaignId: Uuid,
  accountId?: AccountId,
): Result<never, MembershipError> {
  return err({ code, message, campaignId, ...(accountId ? { accountId } : {}) });
}

function timestampMillis(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === "object" && value !== null) {
    if ("toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
    if ("toDate" in value && typeof value.toDate === "function") return value.toDate().getTime();
  }
  return undefined;
}

function timestampIso(value: unknown, fallback: IsoTimestamp): IsoTimestamp {
  if (value instanceof Date) return asIsoTimestamp(value.toISOString());
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return asIsoTimestamp(new Date(value).toISOString());
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return asIsoTimestamp(value.toDate().toISOString());
  }
  return fallback;
}

function membershipFromRemote(
  data: FirestoreData,
  campaignId: Uuid,
  accountId: AccountId,
  fallbackTime: IsoTimestamp,
): Membership | undefined {
  if (data.campaignId !== campaignId || data.accountId !== accountId ||
      (data.role !== "master" && data.role !== "player") ||
      (data.status !== "invited" && data.status !== "active" && data.status !== "revoked")) return undefined;
  const expires = timestampMillis(data.inviteExpiresAt);
  return {
    campaignId,
    accountId,
    role: data.role,
    status: data.status,
    ...(typeof data.invitedBy === "string" ? { invitedBy: asAccountId(data.invitedBy) } : {}),
    revision: asRevision(typeof data.revision === "number" && Number.isInteger(data.revision) ? data.revision : 0),
    createdAt: timestampIso(data.createdAt, fallbackTime),
    updatedAt: timestampIso(data.updatedAt, fallbackTime),
    ...(expires === undefined ? {} : { inviteExpiresAt: asIsoTimestamp(new Date(expires).toISOString()) }),
  };
}

function remoteFailure(cause: unknown, campaignId: Uuid, accountId?: AccountId): Result<never, MembershipError> {
  const code = typeof cause === "object" && cause !== null && "code" in cause
    ? String((cause as { readonly code: unknown }).code).replace(/^firestore\//, "")
    : "";
  return failure(
    code === "permission-denied" || code === "unauthenticated" ? "membership-forbidden" : "membership-unavailable",
    code === "permission-denied" || code === "unauthenticated"
      ? "Link inválido, expirado ou sem permissão para esta conta."
      : "Não foi possível acessar o convite. Verifique a conexão e tente novamente.",
    campaignId,
    accountId,
  );
}

export class FirebasePlayerInviteLinkStore implements PlayerInviteLinkStore {
  private readonly deps: PlayerInviteLinkFirestoreDeps;

  constructor(private readonly firestore: Firestore, deps: Partial<PlayerInviteLinkFirestoreDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async create(input: {
    readonly campaignId: Uuid;
    readonly ownerUid: AccountId;
    readonly tokenHash: string;
    readonly expiresAt: IsoTimestamp;
  }): Promise<Result<void, MembershipError>> {
    if (!/^[a-f0-9]{64}$/.test(input.tokenHash)) {
      return failure("membership-validation", "Token de convite inválido.", input.campaignId, input.ownerUid);
    }
    try {
      return await this.deps.runTransaction(this.firestore, async (transaction) => {
        const reference = this.deps.doc(this.firestore, `campaigns/${input.campaignId}/inviteLinks/${input.tokenHash}`);
        const existing = await transaction.get(reference) as InviteSnapshot;
        if (existing.exists()) return failure("membership-invalid-state", "Este link já foi criado.", input.campaignId, input.ownerUid);
        transaction.set(reference, {
          campaignId: input.campaignId,
          ownerUid: input.ownerUid,
          status: "open",
          createdAt: this.deps.serverTimestamp(),
          expiresAt: this.deps.timestampFromDate(new Date(input.expiresAt)),
        });
        return ok(undefined);
      });
    } catch (cause) {
      return remoteFailure(cause, input.campaignId, input.ownerUid);
    }
  }

  async accept(input: {
    readonly campaignId: Uuid;
    readonly accountId: AccountId;
    readonly tokenHash: string;
    readonly now: IsoTimestamp;
  }): Promise<Result<Membership, MembershipError>> {
    if (!/^[a-f0-9]{64}$/.test(input.tokenHash)) {
      return failure("membership-validation", "Link de convite inválido.", input.campaignId, input.accountId);
    }
    try {
      return await this.deps.runTransaction(this.firestore, async (transaction) => {
        const inviteReference = this.deps.doc(this.firestore, `campaigns/${input.campaignId}/inviteLinks/${input.tokenHash}`);
        const memberReference = this.deps.doc(this.firestore, `campaigns/${input.campaignId}/members/${input.accountId}`);
        const [inviteSnapshot, memberSnapshot] = await Promise.all([
          transaction.get(inviteReference) as Promise<InviteSnapshot>,
          transaction.get(memberReference) as Promise<InviteSnapshot>,
        ]);
        if (!inviteSnapshot.exists()) return failure("membership-not-found", "Link de convite não encontrado.", input.campaignId, input.accountId);
        const invite = inviteSnapshot.data();
        if (!isRecord(invite) || invite.campaignId !== input.campaignId || typeof invite.ownerUid !== "string") {
          return failure("membership-invalid-state", "Link de convite inválido.", input.campaignId, input.accountId);
        }
        if (invite.status === "accepted") {
          if (invite.acceptedBy === input.accountId && memberSnapshot.exists()) {
            const existing = memberSnapshot.data();
            const membership = isRecord(existing) ? membershipFromRemote(existing, input.campaignId, input.accountId, input.now) : undefined;
            if (membership?.status === "active") return ok(membership);
          }
          return failure("membership-invalid-state", "Este link já foi usado.", input.campaignId, input.accountId);
        }
        if (invite.status !== "open") return failure("membership-invalid-state", "Este link foi revogado.", input.campaignId, input.accountId);
        const expiresAt = timestampMillis(invite.expiresAt);
        if (expiresAt === undefined || expiresAt <= Date.parse(input.now)) {
          return failure("membership-invalid-state", "Este link expirou.", input.campaignId, input.accountId);
        }

        const existing = memberSnapshot.exists() ? memberSnapshot.data() : undefined;
        if (existing !== undefined && !isRecord(existing)) {
          return failure("membership-invalid-state", "O vínculo atual está inválido.", input.campaignId, input.accountId);
        }
        if (isRecord(existing) && existing.role !== "player") {
          return failure("membership-forbidden", "Mestres não aceitam convites de jogador.", input.campaignId, input.accountId);
        }
        if (isRecord(existing) && existing.ownerUid !== undefined && existing.ownerUid !== invite.ownerUid) {
          return failure("membership-forbidden", "Este convite pertence a outra campanha.", input.campaignId, input.accountId);
        }

        const currentRevision = isRecord(existing) && typeof existing.revision === "number" && Number.isInteger(existing.revision)
          ? existing.revision
          : -1;
        const membership: Membership = {
          campaignId: input.campaignId,
          accountId: input.accountId,
          role: "player",
          status: "active",
          invitedBy: asAccountId(invite.ownerUid),
          revision: asRevision(currentRevision + 1),
          createdAt: isRecord(existing) ? timestampIso(existing.createdAt, input.now) : input.now,
          updatedAt: input.now,
          inviteExpiresAt: asIsoTimestamp(new Date(expiresAt).toISOString()),
        };
        transaction.set(memberReference, {
          ...membership,
          ownerUid: invite.ownerUid,
          inviteLinkId: input.tokenHash,
          createdAt: isRecord(existing) ? existing.createdAt ?? this.deps.serverTimestamp() : this.deps.serverTimestamp(),
          updatedAt: this.deps.serverTimestamp(),
          inviteExpiresAt: invite.expiresAt,
        });
        transaction.set(inviteReference, {
          ...invite,
          status: "accepted",
          acceptedBy: input.accountId,
          acceptedAt: this.deps.serverTimestamp(),
        });
        return ok(membership);
      });
    } catch (cause) {
      return remoteFailure(cause, input.campaignId, input.accountId);
    }
  }
}

export function createFirebasePlayerInviteLinkStore(
  firestore: Firestore,
  deps?: Partial<PlayerInviteLinkFirestoreDeps>,
): FirebasePlayerInviteLinkStore {
  return new FirebasePlayerInviteLinkStore(firestore, deps);
}
