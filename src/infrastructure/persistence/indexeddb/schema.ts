/**
 * Schema declarativo do banco `rpg-companion`, versão 4.
 * Autoridade: docs/criacao/08-PERSISTENCIA-LOCAL.md ("Distribuição").
 *
 * DATA-003 criou as stores da versão 1. CLOUD-001b acrescenta somente a store do outbox
 * na versão 2, sem reescrever nem tocar os dados já existentes. CLOUD-SESSION acrescenta
 * a store de sessões na versão 4.
 * `applySchema` recebe `oldVersion` e decide o que criar; cada versão nova só acrescenta
 * stores/índices e preserva os blocos anteriores.
 */

export const DB_NAME = "rpg-companion";
export const DB_VERSION = 4;

export const STORE_NAMES = {
  characters: "characters",
  campaigns: "campaigns",
  journalEntries: "journalEntries",
  maps: "maps",
  assets: "assets",
  rolls: "rolls",
  favorites: "favorites",
  drafts: "drafts",
  commandReceipts: "commandReceipts",
  meta: "meta",
  recovery: "recovery",
  outbox: "outbox",
  accounts: "accounts",
  memberships: "memberships",
  sessions: "sessions",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

interface IndexSpec {
  readonly name: string;
  readonly keyPath: string | readonly string[];
  readonly options?: IDBIndexParameters;
}

interface StoreSpec {
  readonly name: StoreName;
  readonly keyPath: string | readonly string[];
  readonly indexes?: readonly IndexSpec[];
}

/**
 * Stores legadas e do outbox. Índices seguem 08-PERSISTENCIA-LOCAL.md: "Índices por campaignId,
 * characterId, updatedAt quando necessários; não indexar toda nota" — por isso
 * `journalEntries`/`maps` só indexam `campaignId` (não indexam corpo/notas).
 */
const STORE_SPECS: readonly StoreSpec[] = [
  {
    name: STORE_NAMES.characters,
    keyPath: "id",
    indexes: [
      { name: "campaignId", keyPath: "campaignId" },
      { name: "updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORE_NAMES.campaigns,
    keyPath: "id",
    indexes: [{ name: "updatedAt", keyPath: "updatedAt" }],
  },
  {
    name: STORE_NAMES.journalEntries,
    keyPath: "id",
    indexes: [{ name: "campaignId", keyPath: "campaignId" }],
  },
  {
    name: STORE_NAMES.maps,
    keyPath: "id",
    indexes: [{ name: "campaignId", keyPath: "campaignId" }],
  },
  {
    name: STORE_NAMES.assets,
    keyPath: "id",
  },
  {
    name: STORE_NAMES.rolls,
    keyPath: "id",
    indexes: [
      { name: "characterId", keyPath: "characterId" },
      { name: "timestamp", keyPath: "timestamp" },
    ],
  },
  {
    name: STORE_NAMES.favorites,
    keyPath: "id",
  },
  {
    name: STORE_NAMES.drafts,
    keyPath: "id",
  },
  {
    name: STORE_NAMES.commandReceipts,
    keyPath: "commandId",
    indexes: [{ name: "characterId", keyPath: "characterId" }],
  },
  {
    name: STORE_NAMES.meta,
    keyPath: "key",
  },
  {
    name: STORE_NAMES.recovery,
    keyPath: "id",
  },
  {
    name: STORE_NAMES.outbox,
    keyPath: "operationId",
    indexes: [
      { name: "dedupeKey", keyPath: "dedupeKey", options: { unique: true } },
      { name: "status", keyPath: "status" },
      { name: "createdAt", keyPath: "createdAt" },
      { name: "nextRetryAt", keyPath: "nextRetryAt" },
    ],
  },
  {
    name: STORE_NAMES.accounts,
    keyPath: "id",
    indexes: [{ name: "updatedAt", keyPath: "updatedAt" }],
  },
  {
    name: STORE_NAMES.memberships,
    keyPath: ["campaignId", "accountId"],
    indexes: [
      { name: "campaignId", keyPath: "campaignId" },
      { name: "accountId", keyPath: "accountId" },
      { name: "updatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORE_NAMES.sessions,
    keyPath: "id",
    indexes: [
      { name: "campaignId", keyPath: "campaignId" },
      { name: "updatedAt", keyPath: "updatedAt" },
    ],
  },
];

/** Chamado em `onupgradeneeded`. Idempotente: não recria store/índice já existente. */
export function applySchema(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    for (const spec of STORE_SPECS) {
      const store = db.objectStoreNames.contains(spec.name)
        ? undefined
        : db.createObjectStore(spec.name, { keyPath: spec.keyPath as string | string[] });
      if (store === undefined) continue;
      for (const index of spec.indexes ?? []) {
        if (!store.indexNames.contains(index.name)) {
          store.createIndex(index.name, index.keyPath as string | string[], index.options);
        }
      }
    }
  }
  if (oldVersion < 2) {
    const spec = STORE_SPECS.find(({ name }) => name === STORE_NAMES.outbox)!;
    const store = db.objectStoreNames.contains(spec.name)
      ? undefined
      : db.createObjectStore(spec.name, { keyPath: spec.keyPath as string | string[] });
    if (store !== undefined) {
      for (const index of spec.indexes ?? []) {
        if (!store.indexNames.contains(index.name)) {
          store.createIndex(index.name, index.keyPath as string | string[], index.options);
        }
      }
    }
  }
  if (oldVersion < 3) {
    for (const name of [STORE_NAMES.accounts, STORE_NAMES.memberships] as const) {
      const spec = STORE_SPECS.find(({ name: specName }) => specName === name)!;
      const store = db.objectStoreNames.contains(spec.name)
        ? undefined
        : db.createObjectStore(spec.name, { keyPath: spec.keyPath as string | string[] });
      if (store === undefined) continue;
      for (const index of spec.indexes ?? []) {
        if (!store.indexNames.contains(index.name)) {
          store.createIndex(index.name, index.keyPath as string | string[], index.options);
        }
      }
    }
  }
  if (oldVersion < 4) {
    const spec = STORE_SPECS.find(({ name }) => name === STORE_NAMES.sessions)!;
    const store = db.objectStoreNames.contains(spec.name)
      ? undefined
      : db.createObjectStore(spec.name, { keyPath: spec.keyPath as string | string[] });
    if (store !== undefined) {
      for (const index of spec.indexes ?? []) {
        if (!store.indexNames.contains(index.name)) {
          store.createIndex(index.name, index.keyPath as string | string[], index.options);
        }
      }
    }
  }
}
