import type { ChatCredential, ChatModelUsage, ChatUsageChange } from "@application/ports/chat";

/** Pseudo key of the rows that say a model is overloaded for everyone. */
export const ALL_KEYS = "all";
const NO_HASH = "0".repeat(16);

/** Only tells whether the secret of a slot changed; the key itself never reaches the usage table. */
export function keyHash(apiKey: string): string {
  let a = 0xdeadbeef, b = 0x41c6ce57;
  for (let i = 0; i < apiKey.length; i++) {
    const code = apiKey.charCodeAt(i);
    a = Math.imul(a ^ code, 2654435761); b = Math.imul(b ^ code, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (b >>> 0).toString(16).padStart(8, "0") + (a >>> 0).toString(16).padStart(8, "0");
}
export const hashFor = (key: ChatCredential | undefined) => key ? keyHash(key.apiKey) : NO_HASH;
export const usageId = (keyId: string, model: string) => `${keyId}~${model}`;
export const usageMinute = (now: number) => Math.floor(now / 60_000);
/** Google renews daily quotas at midnight Pacific time. */
export const usageDay = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** Applies one change to a row, restarting whatever window (or secret) is over. */
export function nextUsage(previous: ChatModelUsage | undefined, change: ChatUsageChange): ChatModelUsage {
  const same = previous && previous.keyHash === change.keyHash ? previous : undefined;
  const day = usageDay(change.now), minute = usageMinute(change.now), today = same?.day === day, current = same?.minute === minute;
  return {
    keyId: change.keyId, model: change.model, keyHash: change.keyHash, day, minute,
    requests: (today ? same.requests : 0) + (change.requests ?? 0), tokens: (today ? same.tokens : 0) + (change.tokens ?? 0),
    minuteRequests: (current ? same.minuteRequests : 0) + (change.requests ?? 0), minuteTokens: (current ? same.minuteTokens : 0) + (change.tokens ?? 0),
    dayLimit: change.dayLimit ?? same?.dayLimit ?? 0, blockedUntil: change.block?.until ?? same?.blockedUntil ?? 0, reason: change.block?.reason ?? same?.reason ?? "",
    lastUsedAt: change.requests ? change.now : same?.lastUsedAt ?? 0,
  };
}

/** Row of a key and model, ignoring what was recorded for a secret already replaced. */
export function usageOf(rows: ReadonlyMap<string, ChatModelUsage>, key: ChatCredential | undefined, model: string): ChatModelUsage | undefined {
  const row = rows.get(usageId(key?.id ?? ALL_KEYS, model));
  return row?.keyHash === hashFor(key) ? row : undefined;
}
export const blockedUntil = (rows: ReadonlyMap<string, ChatModelUsage>, key: ChatCredential | undefined, model: string) => usageOf(rows, key, model)?.blockedUntil ?? 0;
/** When the first model of a fully blocked key is released; undefined while any model is free. */
export function keyReleasedAt(rows: ReadonlyMap<string, ChatModelUsage>, key: ChatCredential, models: readonly string[], now: number): number | undefined {
  const ends = models.map((model) => blockedUntil(rows, key, model));
  return ends.every((end) => end > now) ? Math.min(...ends) : undefined;
}

export interface KeySlot { readonly key: ChatCredential; readonly index: number }
/**
 * Order of attempts without any pair known to be blocked: the key used longest ago goes first with all
 * its models, then the next key. Pairs past their learned daily limit, and then overloaded models, go last.
 */
export function planSlots(keys: readonly ChatCredential[], rows: ReadonlyMap<string, ChatModelUsage>, models: readonly string[], now: number, preferred?: { readonly keyId: string; readonly index: number }): readonly KeySlot[] {
  const lastUse = (key: ChatCredential) => Math.max(0, ...models.map((model) => usageOf(rows, key, model)?.lastUsedAt ?? 0));
  const rotation = [...keys].sort((a, b) => lastUse(a) - lastUse(b) || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const day = usageDay(now);
  const tier = ({ key, index }: KeySlot) => {
    if (blockedUntil(rows, undefined, models[index]) > now) return 3;
    if (preferred?.keyId === key.id && preferred.index === index) return 0;
    const row = usageOf(rows, key, models[index]);
    return row && row.day === day && row.dayLimit > 0 && row.requests >= row.dayLimit ? 2 : 1;
  };
  return rotation.flatMap((key) => models.map((_model, index) => ({ key, index })))
    .filter(({ key, index }) => blockedUntil(rows, key, models[index]) <= now)
    .map((slot, position) => ({ slot, position, tier: tier(slot) }))
    .sort((a, b) => a.tier - b.tier || a.position - b.position).map(({ slot }) => slot);
}
