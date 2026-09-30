import { isUuid, type Uuid } from "@domain/contracts/ids";

export interface ParsedPlayerInviteLink {
  readonly campaignId: Uuid;
  readonly token: string;
}

export function parsePlayerInviteHash(hash: string): ParsedPlayerInviteLink | undefined {
  const invite = new URLSearchParams(hash.replace(/^#/, "")).get("invite");
  if (!invite) return undefined;
  const separator = invite.indexOf(".");
  if (separator < 0) return undefined;
  const campaignId = invite.slice(0, separator);
  const token = invite.slice(separator + 1);
  if (!isUuid(campaignId) || !/^[a-f0-9]{64}$/i.test(token)) return undefined;
  return { campaignId, token: token.toLowerCase() };
}

export function playerInviteUrl(origin: string, campaignId: Uuid, token: string): string {
  const url = new URL("/journey/participants", origin);
  url.hash = new URLSearchParams({ invite: `${campaignId}.${token}` }).toString();
  return url.toString();
}
