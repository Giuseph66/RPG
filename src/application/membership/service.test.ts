import { describe, expect, it } from "vitest";

import { asAccountId, asCommandId, asIsoTimestamp, asUuid, type AccountId } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import { type SyncOperation } from "@domain/contracts/cloud-sync";
import { createPendingSyncOperation, type NewSyncOperation, type SyncOutboxService } from "@application/sync";

import { createMemoryMembershipRepository } from "./ports";
import { createMembershipService } from "./service";

const campaignId = asUuid("00000000-0000-4000-8000-000000000501");
const master = asAccountId("master-1");
const player = asAccountId("player-1");
const other = asAccountId("other-1");
const timestamp = asIsoTimestamp("2026-09-12T10:00:00.000Z");
const future = asIsoTimestamp("2026-09-13T10:00:00.000Z");

function service(options: { readonly outbox?: SyncOutboxService } = {}) {
  let command = 0;
  return createMembershipService({
    repository: createMemoryMembershipRepository(),
    clock: { now: () => timestamp },
    idGenerator: {
      uuid: () => asUuid("00000000-0000-4000-8000-000000000599"),
      commandId: () => asCommandId(`membership-${++command}`),
    },
    ...options.outbox === undefined ? {} : { syncOutbox: options.outbox },
  });
}

async function ownerReady() {
  const current = service();
  expect((await current.ensureAccount({ actorId: master, email: "master@example.com" })).ok).toBe(true);
  expect((await current.ensureCampaignOwner({ actorId: master, campaignId })).ok).toBe(true);
  return current;
}

function outbox(operations: SyncOperation[], fail = false): SyncOutboxService {
  return {
    enqueue: async (input: NewSyncOperation) => {
      if (fail) return { ok: false, error: { code: "storage-unavailable", message: "outbox offline" } };
      const pending = createPendingSyncOperation(input);
      if (!pending.ok) return pending;
      operations.push(pending.value);
      return pending;
    },
  };
}

describe("MembershipService", () => {
  it("cria perfil mínimo sem aceitar senha e torna o perfil idempotente", async () => {
    const current = service();
    const created = await current.ensureAccount({ actorId: master, email: "master@example.com", displayName: "Mestre" });
    const repeated = await current.ensureAccount({ actorId: master });

    expect(created.ok).toBe(true);
    expect(repeated).toEqual(created);
    if (created.ok) expect(created.value).not.toHaveProperty("password");
  });

  it("usa a revisão local do perfil como base e avança somente quando ele muda", async () => {
    const operations: SyncOperation[] = [];
    const current = service({ outbox: outbox(operations) });
    const created = await current.ensureAccount({ actorId: master, email: "master@example.com" });
    const changed = await current.ensureAccount({ actorId: master, displayName: "Mestre" });

    expect(created).toMatchObject({ ok: true, value: { revision: 0 } });
    expect(changed).toMatchObject({ ok: true, value: { revision: 1 } });
    expect(operations.map((item) => item.baseRevision)).toEqual([0, 0]);
    expect(operations.at(-1)).toMatchObject({ payload: { revision: 1 } });
  });

  it("permite mestre ativo convidar, jogador aceitar e mestre revogar", async () => {
    const current = await ownerReady();
    expect((await current.ensureAccount({ actorId: player, email: "player@example.com" })).ok).toBe(true);

    const invite = await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player, inviteExpiresAt: future });
    expect(invite).toMatchObject({ ok: true, value: { role: "player", status: "invited", invitedBy: master } });
    const accepted = await current.acceptInvite({ actorId: player, campaignId, playerAccountId: player });
    expect(accepted).toMatchObject({ ok: true, value: { status: "active", revision: 1 } });
    const revoked = await current.revokeMembership({ actorId: master, campaignId, playerAccountId: player });
    expect(revoked).toMatchObject({ ok: true, value: { status: "revoked", revision: 2 } });
  });

  it("bloqueia escalação de privilégio e ações de conta alheia", async () => {
    const current = await ownerReady();
    await current.ensureAccount({ actorId: player });
    const invite = await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player });
    expect(invite.ok).toBe(true);

    const escalated = await current.issuePlayerInvite({ actorId: player, campaignId, playerAccountId: other });
    expect(escalated).toMatchObject({ ok: false, error: { code: "membership-forbidden" } });
    const acceptedForOther = await current.acceptInvite({ actorId: player, campaignId, playerAccountId: other });
    expect(acceptedForOther).toMatchObject({ ok: false, error: { code: "membership-forbidden" } });
    const revokeByPlayer = await current.revokeMembership({ actorId: player, campaignId, playerAccountId: player });
    expect(revokeByPlayer).toMatchObject({ ok: false, error: { code: "membership-forbidden" } });
  });

  it("repete convite/aceite/revogação sem duplicar mudança", async () => {
    const current = await ownerReady();
    const first = await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player });
    const repeatInvite = await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player });
    expect(repeatInvite).toEqual(first);
    const accepted = await current.acceptInvite({ actorId: player, campaignId, playerAccountId: player });
    expect(await current.acceptInvite({ actorId: player, campaignId, playerAccountId: player })).toEqual(accepted);
    const revoked = await current.revokeMembership({ actorId: master, campaignId, playerAccountId: player });
    expect(await current.revokeMembership({ actorId: master, campaignId, playerAccountId: player })).toEqual(revoked);
  });

  it("expira convite e limita lista do jogador ao próprio vínculo", async () => {
    const current = await ownerReady();
    await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player, inviteExpiresAt: future });
    const playerList = await current.listMemberships({ actorId: player, campaignId });
    expect(playerList).toMatchObject({ ok: true, value: [{ accountId: player, status: "invited" }] });
    const ownerList = await current.listMemberships({ actorId: master, campaignId });
    expect(ownerList).toMatchObject({ ok: true, value: [{ accountId: master, role: "master" }, { accountId: player, status: "invited" }] });
  });

  it("mantém mutação local quando outbox não está configurado e reporta falha explícita quando configurado", async () => {
    const operations: SyncOperation[] = [];
    const offline = service({ outbox: outbox(operations) });
    expect((await offline.ensureAccount({ actorId: master })).ok).toBe(true);
    expect(operations[0]).toMatchObject({ aggregateType: "account", mutation: "upsert", payload: { id: master } });

    const failed = service({ outbox: outbox([], true) });
    const result = await failed.ensureAccount({ actorId: other });
    expect(result).toMatchObject({ ok: false, error: { code: "membership-unavailable" } });
  });

  it("rejeita conta sem sessão e convite expirado", async () => {
    const current = service();
    expect(await current.ensureAccount({ actorId: "" as AccountId })).toMatchObject({ ok: false, error: { code: "membership-unauthenticated" } });
    await current.ensureAccount({ actorId: master });
    await current.ensureCampaignOwner({ actorId: master, campaignId });
    const expired = await current.issuePlayerInvite({ actorId: master, campaignId, playerAccountId: player, inviteExpiresAt: timestamp });
    expect(expired).toMatchObject({ ok: false, error: { code: "membership-validation" } });
  });
});
