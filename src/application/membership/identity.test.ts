import { describe, expect, it } from "vitest";
import { asUuid } from "@domain/contracts/ids";
import { loadOrCreateLocalIdentity, LOCAL_IDENTITY_STORAGE_KEY, type LocalIdentityStorage } from "./identity";

function storage(): LocalIdentityStorage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe("local device identity", () => {
  it("persists the same actor across runtime restarts", () => {
    const local = storage();
    const idGenerator = { uuid: () => asUuid("00000000-0000-4000-8000-000000000001") };
    const first = loadOrCreateLocalIdentity({ storage: local, idGenerator });
    const restarted = loadOrCreateLocalIdentity({ storage: local, idGenerator: { uuid: () => asUuid("00000000-0000-4000-8000-000000000002") } });
    expect(restarted).toEqual(first);
    expect(first.source).toBe("local");
    expect(first.email).toBeNull();
    expect(local.getItem(LOCAL_IDENTITY_STORAGE_KEY)).toContain(String(first.accountId));
  });

  it("recovers from malformed storage without trusting a remote identity", () => {
    const local = storage();
    local.setItem(LOCAL_IDENTITY_STORAGE_KEY, JSON.stringify({ uid: "firebase-user", email: "remote@example.com" }));
    const identity = loadOrCreateLocalIdentity({ storage: local, idGenerator: { uuid: () => asUuid("00000000-0000-4000-8000-000000000003") } });
    expect(identity.source).toBe("local");
    expect(identity.email).toBeNull();
    expect(identity.accountId).toContain("local-");
  });
});
