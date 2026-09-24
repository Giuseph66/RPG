import { type Account, type CampaignRole, type Membership, type SyncScope } from "@domain/contracts/cloud-sync";
import { type AccountId, asAccountId, type IsoTimestamp, type Uuid } from "@domain/contracts/ids";
import { err, ok, type MembershipError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";
import { type SyncOutboxService } from "@application/sync";
import { toJsonSnapshot } from "@application/sync";

import { type MembershipRepository, membershipKey } from "./ports";
import { type LocalIdentity } from "./identity";

export type MembershipResult<T> = Result<T, MembershipError>;

export interface EnsureAccountInput {
  readonly actorId: AccountId;
  readonly email?: string | null;
  readonly displayName?: string;
  /** Preferência de papel padrão; nunca é autoridade para permissões em campanhas existentes. */
  readonly preferredCampaignRole?: CampaignRole;
}

export interface EnsureOwnerInput {
  readonly actorId: AccountId;
  readonly campaignId: Uuid;
}

export interface IssueInviteInput {
  readonly actorId: AccountId;
  readonly campaignId: Uuid;
  readonly playerAccountId: AccountId;
  /** Dono da campanha, obtido do agregado de campanha confiável. */
  readonly campaignOwnerId?: AccountId;
  readonly inviteExpiresAt?: IsoTimestamp;
}

export interface MembershipActionInput {
  readonly actorId: AccountId;
  readonly campaignId: Uuid;
  readonly playerAccountId: AccountId;
  readonly campaignOwnerId?: AccountId;
}

export interface ListMembershipsInput {
  readonly actorId: AccountId;
  readonly campaignId: Uuid;
}

export interface MembershipServiceOptions {
  readonly repository: MembershipRepository;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly syncOutbox?: SyncOutboxService;
  readonly unitOfWork?: UnitOfWork;
  readonly localIdentity?: LocalIdentity;
}

function failure(code: MembershipError["code"], message: string, campaignId?: Uuid, accountId?: AccountId): MembershipResult<never> {
  return err({ code, message, ...(campaignId ? { campaignId } : {}), ...(accountId ? { accountId } : {}) });
}

function validActor(actorId: AccountId): MembershipResult<void> {
  return actorId.trim().length > 0 ? ok(undefined) : failure("membership-unauthenticated", "Sessão autenticada é necessária.");
}

function mapPersistenceError(error: { readonly message: string }, campaignId: Uuid, accountId?: AccountId): MembershipError {
  return {
    code: error.message.includes("não encontrado") ? "membership-not-found" : "membership-unavailable",
    message: error.message,
    campaignId,
    ...(accountId ? { accountId } : {}),
  };
}

function isActiveMaster(value: Membership | undefined, actorId: AccountId): boolean {
  return value?.accountId === actorId && value.role === "master" && value.status === "active";
}

function isExpired(membership: Membership, now: IsoTimestamp): boolean {
  return membership.status === "invited" && membership.inviteExpiresAt !== undefined && membership.inviteExpiresAt <= now;
}

function nextRevision(value: Revision): Revision {
  return asRevision(value + 1);
}

/**
 * Casos de uso locais de conta e participação. Toda mutação é aplicada primeiro
 * localmente e, quando o outbox existe, publicada como snapshot serializável.
 * O serviço nunca recebe senha, token ou papel vindo da UI como autoridade.
 */
export class MembershipService {
  constructor(private readonly options: MembershipServiceOptions) {}

  /** Fallback de UI para colaboração offline; sessão Firebase tem precedência quando presente. */
  localActor(): LocalIdentity | undefined {
    return this.options.localIdentity;
  }

  private async write<T>(operation: (context?: TransactionContext) => Promise<MembershipResult<T>>): Promise<MembershipResult<T>> {
    if (!this.options.unitOfWork) return operation();
    // O callback só produz MembershipError; o cast preserva o port público
    // enquanto a UnitOfWork continua compartilhando o contexto opaco.
    return (await this.options.unitOfWork.run((context) => operation(context))) as MembershipResult<T>;
  }

  private async queue(
    aggregateType: "account" | "membership",
    aggregateId: AccountId,
    mutation: "upsert" | "delete",
    baseRevision: Revision,
    payload: unknown,
    createdAt: IsoTimestamp,
    context?: TransactionContext,
    scope?: SyncScope,
  ): Promise<MembershipResult<void>> {
    if (!this.options.syncOutbox) return ok(undefined);
    const snapshot = payload === undefined ? undefined : toJsonSnapshot(payload);
    if (payload !== undefined && snapshot === undefined) return failure("membership-unavailable", "Perfil ou vínculo contém dados não serializáveis.");
    const queued = await this.options.syncOutbox.enqueue({
      operationId: this.options.idGenerator.commandId(),
      aggregateType,
      aggregateId,
      mutation,
      baseRevision,
      ...(scope === undefined ? {} : { scope }),
      ...(snapshot === undefined ? {} : { payload: snapshot }),
      createdAt,
    }, context);
    return queued.ok ? ok(undefined) : failure("membership-unavailable", queued.error.message);
  }

  async ensureAccount(input: EnsureAccountInput): Promise<MembershipResult<Account>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    if (input.email !== undefined && input.email !== null && !/^\S+@\S+\.\S+$/.test(input.email)) {
      return failure("membership-validation", "E-mail da conta inválido.", undefined, input.actorId);
    }
    return this.write(async (context) => {
      const current = await this.options.repository.getAccount(input.actorId, context);
      const now = this.options.clock.now();
      const currentRevision = current.ok ? (current.value.revision ?? asRevision(0)) : asRevision(0);
      const changed = !current.ok ||
        (input.email !== undefined && input.email !== current.value.email) ||
        (input.displayName !== undefined && input.displayName !== current.value.displayName) ||
        (input.preferredCampaignRole !== undefined && input.preferredCampaignRole !== current.value.preferredCampaignRole);
      if (current.ok && !changed) return ok(current.value);
      const account: Account = current.ok
        ? {
          ...current.value,
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
          ...(input.preferredCampaignRole !== undefined ? { preferredCampaignRole: input.preferredCampaignRole } : {}),
          revision: nextRevision(currentRevision),
          updatedAt: now,
        }
        : {
          id: input.actorId,
          email: input.email ?? null,
          ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
          ...(input.preferredCampaignRole === undefined ? {} : { preferredCampaignRole: input.preferredCampaignRole }),
          revision: asRevision(0),
          schemaVersion: 1,
          createdAt: now,
          updatedAt: now,
        };
      const saved = await this.options.repository.saveAccount(account, context);
      if (!saved.ok) return failure("membership-unavailable", saved.error.message, undefined, input.actorId);
      const queued = await this.queue("account", input.actorId, "upsert", currentRevision, account, now, context);
      return queued.ok ? ok(account) : queued;
    });
  }

  async ensureCampaignOwner(input: EnsureOwnerInput): Promise<MembershipResult<Membership>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    return this.write(async (context) => {
      const existing = await this.options.repository.getMembership(input.campaignId, input.actorId, context);
      if (existing.ok) {
        if (existing.value.role !== "master") return failure("membership-forbidden", "A conta já possui papel de jogador nesta campanha.", input.campaignId, input.actorId);
        if (existing.value.status === "active") return ok(existing.value);
        return failure("membership-invalid-state", "O vínculo do mestre não pode estar pendente ou revogado.", input.campaignId, input.actorId);
      }
      const now = this.options.clock.now();
      const membership: Membership = {
        campaignId: input.campaignId,
        accountId: input.actorId,
        role: "master",
        status: "active",
        revision: asRevision(0),
        createdAt: now,
        updatedAt: now,
        invitedBy: input.actorId,
      };
      const saved = await this.options.repository.saveMembership(membership, context);
      if (!saved.ok) return failure("membership-unavailable", saved.error.message, input.campaignId, input.actorId);
      const queued = await this.queue("membership", asAccountId(membershipKey(input.campaignId, input.actorId)), "upsert", membership.revision, membership, now, context, { campaignId: input.campaignId, accountId: input.actorId });
      return queued.ok ? ok(membership) : queued;
    });
  }

  async issuePlayerInvite(input: IssueInviteInput): Promise<MembershipResult<Membership>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    if (input.playerAccountId === input.actorId) return failure("membership-validation", "O mestre não pode convidar a própria conta.", input.campaignId, input.playerAccountId);
    if (input.campaignOwnerId !== undefined && input.campaignOwnerId !== input.actorId) return failure("membership-forbidden", "Somente o mestre da campanha pode convidar jogadores.", input.campaignId, input.actorId);
    if (input.inviteExpiresAt !== undefined && input.inviteExpiresAt <= this.options.clock.now()) return failure("membership-validation", "O convite deve expirar no futuro.", input.campaignId, input.playerAccountId);
    return this.write(async (context) => {
      const owner = await this.options.repository.getMembership(input.campaignId, input.actorId, context);
      if (!(owner.ok && isActiveMaster(owner.value, input.actorId))) return failure("membership-forbidden", "Somente um mestre ativo pode convidar jogadores.", input.campaignId, input.actorId);
      const existing = await this.options.repository.getMembership(input.campaignId, input.playerAccountId, context);
      if (existing.ok && existing.value.status === "active") return ok(existing.value);
      if (existing.ok && existing.value.status === "invited" && existing.value.inviteExpiresAt !== undefined && !isExpired(existing.value, this.options.clock.now())) return ok(existing.value);
      const now = this.options.clock.now();
      const inviteExpiresAt = input.inviteExpiresAt ?? (new Date(Date.parse(now) + 7 * 24 * 60 * 60 * 1000).toISOString() as IsoTimestamp);
      const membership: Membership = {
        campaignId: input.campaignId,
        accountId: input.playerAccountId,
        role: "player",
        status: "invited",
        invitedBy: input.actorId,
        revision: existing.ok ? nextRevision(existing.value.revision) : asRevision(0),
        createdAt: existing.ok ? existing.value.createdAt : now,
        updatedAt: now,
        inviteExpiresAt,
      };
      const saved = await this.options.repository.saveMembership(membership, context);
      if (!saved.ok) return failure("membership-unavailable", saved.error.message, input.campaignId, input.playerAccountId);
      const queued = await this.queue("membership", asAccountId(membershipKey(input.campaignId, input.playerAccountId)), "upsert", existing.ok ? existing.value.revision : asRevision(0), membership, now, context, { campaignId: input.campaignId, accountId: input.playerAccountId });
      return queued.ok ? ok(membership) : queued;
    });
  }

  async acceptInvite(input: MembershipActionInput): Promise<MembershipResult<Membership>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    if (input.playerAccountId !== input.actorId) return failure("membership-forbidden", "Somente a própria conta pode aceitar o convite.", input.campaignId, input.playerAccountId);
    return this.write(async (context) => {
      const existing = await this.options.repository.getMembership(input.campaignId, input.actorId, context);
      if (!existing.ok) return failure("membership-not-found", "Convite não encontrado.", input.campaignId, input.actorId);
      if (existing.value.role !== "player") return failure("membership-forbidden", "Mestres não aceitam convites de jogador.", input.campaignId, input.actorId);
      if (existing.value.status === "active") return ok(existing.value);
      if (existing.value.status !== "invited") return failure("membership-invalid-state", "Este convite já foi revogado.", input.campaignId, input.actorId);
      if (isExpired(existing.value, this.options.clock.now())) return failure("membership-invalid-state", "Este convite expirou.", input.campaignId, input.actorId);
      const now = this.options.clock.now();
      const membership: Membership = { ...existing.value, status: "active", revision: nextRevision(existing.value.revision), updatedAt: now };
      const saved = await this.options.repository.saveMembership(membership, context);
      if (!saved.ok) return failure("membership-unavailable", saved.error.message, input.campaignId, input.actorId);
      const queued = await this.queue("membership", asAccountId(membershipKey(input.campaignId, input.actorId)), "upsert", existing.value.revision, membership, now, context, { campaignId: input.campaignId, accountId: input.actorId });
      return queued.ok ? ok(membership) : queued;
    });
  }

  async revokeMembership(input: MembershipActionInput): Promise<MembershipResult<Membership>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    if (input.campaignOwnerId !== undefined && input.campaignOwnerId !== input.actorId) return failure("membership-forbidden", "Somente o mestre pode revogar jogadores.", input.campaignId, input.actorId);
    return this.write(async (context) => {
      const owner = await this.options.repository.getMembership(input.campaignId, input.actorId, context);
      if (!(owner.ok && isActiveMaster(owner.value, input.actorId))) return failure("membership-forbidden", "Somente um mestre ativo pode revogar jogadores.", input.campaignId, input.actorId);
      const existing = await this.options.repository.getMembership(input.campaignId, input.playerAccountId, context);
      if (!existing.ok) return failure("membership-not-found", "Vínculo do jogador não encontrado.", input.campaignId, input.playerAccountId);
      if (existing.value.role !== "player") return failure("membership-forbidden", "O vínculo do mestre não pode ser revogado por esta operação.", input.campaignId, input.playerAccountId);
      if (existing.value.status === "revoked") return ok(existing.value);
      const now = this.options.clock.now();
      const membership: Membership = { ...existing.value, status: "revoked", revision: nextRevision(existing.value.revision), updatedAt: now };
      const saved = await this.options.repository.saveMembership(membership, context);
      if (!saved.ok) return failure("membership-unavailable", saved.error.message, input.campaignId, input.playerAccountId);
      const queued = await this.queue("membership", asAccountId(membershipKey(input.campaignId, input.playerAccountId)), "upsert", existing.value.revision, membership, now, context, { campaignId: input.campaignId, accountId: input.playerAccountId });
      return queued.ok ? ok(membership) : queued;
    });
  }

  async listMemberships(input: ListMembershipsInput): Promise<MembershipResult<readonly Membership[]>> {
    const actor = validActor(input.actorId);
    if (!actor.ok) return actor;
    const own = await this.options.repository.getMembership(input.campaignId, input.actorId);
    if (!own.ok) return failure("membership-forbidden", "A conta não participa desta campanha.", input.campaignId, input.actorId);
    const all = await this.options.repository.listMemberships(input.campaignId);
    if (!all.ok) return failure("membership-unavailable", all.error.message, input.campaignId);
    if (isActiveMaster(own.value, input.actorId)) return ok(all.value);
    return ok(all.value.filter((membership) => membership.accountId === input.actorId));
  }

  async listReceivedInvitations(actorId: AccountId): Promise<MembershipResult<readonly Membership[]>> {
    const actor = validActor(actorId);
    if (!actor.ok) return actor;
    const listed = await this.options.repository.listMembershipsForAccount(actorId);
    if (!listed.ok) return failure("membership-unavailable", listed.error.message, undefined, actorId);
    return ok(listed.value.filter((entry) => entry.role === "player" && entry.status === "invited" && !isExpired(entry, this.options.clock.now())));
  }
}

export function createMembershipService(options: MembershipServiceOptions): MembershipService {
  return new MembershipService(options);
}
