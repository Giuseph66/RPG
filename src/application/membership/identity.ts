import { asAccountId, type AccountId, type Uuid } from "@domain/contracts/ids";
import { type IdGenerator } from "@application/ports/id-generator";

/** Identidade do dispositivo. Não é uma sessão Firebase e nunca pode drenar o outbox. */
export interface LocalIdentity {
  readonly source: "local";
  readonly accountId: AccountId;
  readonly email: null;
  readonly displayName: string;
}

/** Port mínimo para manter a identidade entre reinícios sem acoplar a aplicação ao browser. */
export interface LocalIdentityStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalIdentityOptions {
  readonly storage?: LocalIdentityStorage;
  readonly idGenerator: Pick<IdGenerator, "uuid">;
}

export const LOCAL_IDENTITY_STORAGE_KEY = "rpg-companion.local-identity.v1";

function isStoredIdentity(value: unknown): value is { readonly accountId: string; readonly displayName?: string } {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.accountId === "string" && record.accountId.startsWith("local-") &&
    record.accountId.trim().length > 0 &&
    (record.displayName === undefined || typeof record.displayName === "string");
}

function read(storage?: LocalIdentityStorage): { readonly accountId: AccountId; readonly displayName: string } | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(LOCAL_IDENTITY_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredIdentity(parsed)) return undefined;
    return { accountId: asAccountId(parsed.accountId), displayName: parsed.displayName?.trim() || "Jogador local" };
  } catch {
    return undefined;
  }
}

export function loadOrCreateLocalIdentity(options: LocalIdentityOptions): LocalIdentity {
  const stored = read(options.storage);
  if (stored) return { source: "local", accountId: stored.accountId, email: null, displayName: stored.displayName };

  const accountId = asAccountId(`local-${options.idGenerator.uuid() as Uuid}`);
  const identity: LocalIdentity = { source: "local", accountId, email: null, displayName: "Jogador local" };
  try {
    options.storage?.setItem(LOCAL_IDENTITY_STORAGE_KEY, JSON.stringify({ accountId, displayName: identity.displayName }));
  } catch {
    // A indisponibilidade do storage não impede o modo local; só torna a identidade desta execução efêmera.
  }
  return identity;
}
