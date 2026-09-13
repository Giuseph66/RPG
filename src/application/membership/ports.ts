import { type Account, type Membership } from "@domain/contracts/cloud-sync";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "@application/ports/unit-of-work";

/** Persistência local de perfis e vínculos. Não depende de Firebase. */
export interface MembershipRepository {
  getAccount(accountId: AccountId, context?: TransactionContext): Promise<Result<Account, AppError>>;
  saveAccount(account: Account, context?: TransactionContext): Promise<Result<Account, AppError>>;
  getMembership(campaignId: Uuid, accountId: AccountId, context?: TransactionContext): Promise<Result<Membership, AppError>>;
  saveMembership(membership: Membership, context?: TransactionContext): Promise<Result<Membership, AppError>>;
  listMemberships(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly Membership[], AppError>>;
}

/** Implementação local mínima para testes, fallback e sessões sem rede. */
export function createMemoryMembershipRepository(
  accounts: readonly Account[] = [],
  memberships: readonly Membership[] = [],
): MembershipRepository {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const membershipMap = new Map(memberships.map((membership) => [membershipKey(membership.campaignId, membership.accountId), membership]));

  return {
    async getAccount(accountId) {
      const value = accountMap.get(accountId);
      return value ? { ok: true, value } : { ok: false, error: { code: "not-found", entity: "account", id: accountId, message: `Conta "${accountId}" não encontrada.` } };
    },
    async saveAccount(account) {
      accountMap.set(account.id, account);
      return { ok: true, value: account };
    },
    async getMembership(campaignId, accountId) {
      const value = membershipMap.get(membershipKey(campaignId, accountId));
      return value ? { ok: true, value } : { ok: false, error: { code: "not-found", entity: "membership", id: membershipKey(campaignId, accountId), message: "Vínculo não encontrado." } };
    },
    async saveMembership(membership) {
      membershipMap.set(membershipKey(membership.campaignId, membership.accountId), membership);
      return { ok: true, value: membership };
    },
    async listMemberships(campaignId) {
      return { ok: true, value: [...membershipMap.values()].filter((membership) => membership.campaignId === campaignId) };
    },
  };
}

export function membershipKey(campaignId: Uuid, accountId: AccountId): string {
  return `${campaignId}:${accountId}`;
}
