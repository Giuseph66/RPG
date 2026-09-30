import { describe, expect, it } from "vitest";

import { asUuid } from "@domain/contracts/ids";
import { parsePlayerInviteHash, playerInviteUrl } from "./player-invite-link";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");
const token = "a".repeat(64);

describe("player invite links", () => {
  it("encodes a reusable app route without sending the token in the request URL", () => {
    const url = new URL(playerInviteUrl("https://rpg.example", campaignId, token));

    expect(url.pathname).toBe("/journey/participants");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#invite=${campaignId}.${token}`);
    expect(parsePlayerInviteHash(url.hash)).toEqual({ campaignId, token });
  });

  it("ignores malformed links", () => {
    expect(parsePlayerInviteHash("#invite=bad.token")).toBeUndefined();
    expect(parsePlayerInviteHash(`#invite=${campaignId}.short`)).toBeUndefined();
    expect(parsePlayerInviteHash("#campaign=other")).toBeUndefined();
  });
});
