import { beforeEach, describe, expect, it } from "vitest";

import { asAccountId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { appError, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";
import { type Account, type Membership } from "@domain/contracts/cloud-sync";

import { IndexedDbMembershipRepository } from "./membership-repository";
import { openDatabase } from "./open-database";
import { IndexedDbUnitOfWork } from "./unit-of-work";

let sequence = 0;
const campaignId = asUuid("00000000-0000-4000-8000-000000000701");
const accountId = asAccountId("account-701");
const timestamp = asIsoTimestamp("2026-09-12T10:00:00.000Z");

const account: Account = {
  id: accountId,
  email: "account@example.test",
  displayName: "Mesa",
  schemaVersion: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const membership: Membership = {
  campaignId,
  accountId,
  role: "master",
  status: "active",
  invitedBy: accountId,
  revision: asRevision(0),
  createdAt: timestamp,
  updatedAt: timestamp,
};

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function createDb(): Promise<IDBDatabase> {
  const result = await openDatabase({ name: `rpg-membership-${sequence++}` });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe("IndexedDbMembershipRepository", () => {
  let db: IDBDatabase;

  beforeEach(async () => {
    db = await createDb();
  });

  it("persiste perfis e vínculos entre aberturas do repositório", async () => {
    const first = new IndexedDbMembershipRepository(db);
    unwrap(await first.saveAccount(account));
    unwrap(await first.saveMembership(membership));

    const second = new IndexedDbMembershipRepository(db);
    expect(unwrap(await second.getAccount(accountId))).toEqual(account);
    expect(unwrap(await second.getMembership(campaignId, accountId))).toEqual(membership);
    expect(unwrap(await second.listMemberships(campaignId))).toEqual([membership]);
  });

  it("faz rollback de perfil e vínculo no mesmo UnitOfWork", async () => {
    const repository = new IndexedDbMembershipRepository(db);
    const uow = new IndexedDbUnitOfWork(db);
    const result = await uow.run(async (context) => {
      const savedAccount = await repository.saveAccount(account, context);
      if (!savedAccount.ok) return savedAccount;
      const savedMembership = await repository.saveMembership(membership, context);
      if (!savedMembership.ok) return savedMembership;
      return { ok: false as const, error: appError.validation("test", "rollback") };
    });

    expect(result.ok).toBe(false);
    expect((await repository.getAccount(accountId)).ok).toBe(false);
    expect((await repository.getMembership(campaignId, accountId)).ok).toBe(false);
  });
});
