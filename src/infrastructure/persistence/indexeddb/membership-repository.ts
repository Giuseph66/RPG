/** Persistência local de perfis e vínculos de campanha. */

import { type Account, type Membership } from "@domain/contracts/cloud-sync";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type TransactionContext } from "@application/ports/unit-of-work";

import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransactionOrContext } from "./transaction";

function isAccount(value: unknown): value is Account {
  if (typeof value !== "object" || value === null) return false;
  const account = value as Record<string, unknown>;
  return typeof account.id === "string" &&
    (typeof account.email === "string" || account.email === null) &&
    Number.isInteger(account.schemaVersion) &&
    typeof account.createdAt === "string" && typeof account.updatedAt === "string";
}

function isMembership(value: unknown): value is Membership {
  if (typeof value !== "object" || value === null) return false;
  const membership = value as Record<string, unknown>;
  return typeof membership.campaignId === "string" &&
    typeof membership.accountId === "string" &&
    (membership.role === "master" || membership.role === "player") &&
    (membership.status === "invited" || membership.status === "active" || membership.status === "revoked") &&
    Number.isInteger(membership.revision) && Number(membership.revision) >= 0 &&
    typeof membership.createdAt === "string" && typeof membership.updatedAt === "string";
}

export class IndexedDbMembershipRepository {
  constructor(private readonly db: IDBDatabase) {}

  async getAccount(accountId: AccountId, context?: TransactionContext): Promise<Result<Account, AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.accounts], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.accounts).get(accountId));
      if (raw === undefined) return err(appError.notFound("account", accountId, `Conta "${accountId}" não encontrada.`));
      return isAccount(raw) ? ok(raw) : err(appError.corruptRecord(accountId));
    });
  }

  async saveAccount(account: Account, context?: TransactionContext): Promise<Result<Account, AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.accounts], "readwrite", context, async (tx) => {
      await requestToPromise(tx.objectStore(STORE_NAMES.accounts).put(account));
      return ok(account);
    });
  }

  async getMembership(campaignId: Uuid, accountId: AccountId, context?: TransactionContext): Promise<Result<Membership, AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.memberships], "readonly", context, async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.memberships).get([campaignId, accountId]));
      const id = `${campaignId}:${accountId}`;
      if (raw === undefined) return err(appError.notFound("membership", id, "Vínculo não encontrado."));
      return isMembership(raw) ? ok(raw) : err(appError.corruptRecord(id));
    });
  }

  async saveMembership(membership: Membership, context?: TransactionContext): Promise<Result<Membership, AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.memberships], "readwrite", context, async (tx) => {
      await requestToPromise(tx.objectStore(STORE_NAMES.memberships).put(membership));
      return ok(membership);
    });
  }

  async listMemberships(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly Membership[], AppError>> {
    return runTransactionOrContext(this.db, [STORE_NAMES.memberships], "readonly", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.memberships);
      const raws = await requestToPromise(store.index("campaignId").getAll(campaignId));
      const values: Membership[] = [];
      for (const [index, raw] of raws.entries()) {
        if (!isMembership(raw)) return err(appError.corruptRecord(`${campaignId}:row-${index}`));
        values.push(raw);
      }
      return ok(values);
    });
  }
}
