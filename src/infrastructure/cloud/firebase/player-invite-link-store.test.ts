import { describe, expect, it } from "vitest";

import { asAccountId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { createFirebasePlayerInviteLinkStore, type PlayerInviteLinkFirestoreDeps } from "./player-invite-link-store";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");
const ownerUid = asAccountId("master-1");
const playerUid = asAccountId("player-1");
const now = asIsoTimestamp("2026-09-12T10:00:00.000Z");
const expiresAt = asIsoTimestamp("2026-09-19T10:00:00.000Z");
const tokenHash = "a".repeat(64);

function fakeStore(initial: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map(Object.entries(initial));
  const deps: Partial<PlayerInviteLinkFirestoreDeps> = {
    doc: (_firestore, path) => ({ path }) as never,
    runTransaction: async (_firestore, update) => update({
      get: async (reference: { readonly path: string }) => {
        const path = (reference as unknown as { readonly path: string }).path;
        const data = documents.get(path);
        return { exists: () => data !== undefined, data: () => data } as never;
      },
      set: (reference: { readonly path: string }, data: Record<string, unknown>) => {
        const path = (reference as unknown as { readonly path: string }).path;
        documents.set(path, data as Record<string, unknown>);
      },
    } as never),
    serverTimestamp: () => now,
    timestampFromDate: (date) => date.toISOString(),
  };
  return { documents, store: createFirebasePlayerInviteLinkStore({} as never, deps) };
}

function inviteRecord(overrides: Record<string, unknown> = {}) {
  return {
    campaignId,
    ownerUid,
    status: "open",
    createdAt: now,
    expiresAt,
    ...overrides,
  };
}

describe("FirebasePlayerInviteLinkStore", () => {
  it("creates a hashed, expiring invite document", async () => {
    const { documents, store } = fakeStore();
    const result = await store.create({ campaignId, ownerUid, tokenHash, expiresAt });

    expect(result).toEqual({ ok: true, value: undefined });
    expect(documents.get(`campaigns/${campaignId}/inviteLinks/${tokenHash}`)).toMatchObject({
      campaignId,
      ownerUid,
      status: "open",
      expiresAt,
    });
  });

  it("accepts once, creates the active membership atomically, and permits same-account retry", async () => {
    const invitePath = `campaigns/${campaignId}/inviteLinks/${tokenHash}`;
    const memberPath = `campaigns/${campaignId}/members/${playerUid}`;
    const { documents, store } = fakeStore({ [invitePath]: inviteRecord() });
    const input = { campaignId, accountId: playerUid, tokenHash, now };

    const accepted = await store.accept(input);
    expect(accepted).toMatchObject({ ok: true, value: { accountId: playerUid, role: "player", status: "active", invitedBy: ownerUid } });
    expect(documents.get(memberPath)).toMatchObject({ accountId: playerUid, ownerUid, inviteLinkId: tokenHash, status: "active" });
    expect(documents.get(invitePath)).toMatchObject({ status: "accepted", acceptedBy: playerUid });
    for (const document of documents.values()) expect(document).not.toHaveProperty("token");
    expect(await store.accept(input)).toMatchObject({ ok: true, value: { accountId: playerUid, status: "active" } });
  });

  it("rejects expired, reused-by-another-account, and unknown links", async () => {
    const invitePath = `campaigns/${campaignId}/inviteLinks/${tokenHash}`;
    const expired = fakeStore({ [invitePath]: inviteRecord({ expiresAt: now }) });
    expect(await expired.store.accept({ campaignId, accountId: playerUid, tokenHash, now })).toMatchObject({ ok: false, error: { code: "membership-invalid-state" } });

    const reused = fakeStore({ [invitePath]: inviteRecord({ status: "accepted", acceptedBy: ownerUid }) });
    expect(await reused.store.accept({ campaignId, accountId: playerUid, tokenHash, now })).toMatchObject({ ok: false, error: { code: "membership-invalid-state" } });

    const missing = fakeStore();
    expect(await missing.store.accept({ campaignId, accountId: playerUid, tokenHash, now })).toMatchObject({ ok: false, error: { code: "membership-not-found" } });
  });
});
