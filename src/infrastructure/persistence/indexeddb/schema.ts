/**
 * Schema declarativo do banco `rpg-companion`, versão 1.
 * Autoridade: docs/criacao/08-PERSISTENCIA-LOCAL.md ("Distribuição").
 *
 * DATA-003 só cria as stores da versão 1. Ponto de extensão para versões futuras:
 * `applySchema` recebe `oldVersion` e decide o que criar; uma migração de versão >= 2
 * (dados existentes, renomeação de índice, etc.) é responsabilidade de DATA-006
 * (`src/infrastructure/persistence/migrations/**`), que deve adicionar um novo bloco
 * `if (oldVersion < 2) { ... }` abaixo, sem reescrever o bloco da v1.
 */

export const DB_NAME = "rpg-companion";
export const DB_VERSION = 1;

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
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

interface IndexSpec {
  readonly name: string;
  readonly keyPath: string | readonly string[];
  readonly options?: IDBIndexParameters;
}

interface StoreSpec {
  readonly name: StoreName;
  readonly keyPath: string;
  readonly indexes?: readonly IndexSpec[];
}

/**
 * Stores da v1. Índices seguem 08-PERSISTENCIA-LOCAL.md: "Índices por campaignId,
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
];

/** Chamado em `onupgradeneeded`. Idempotente: não recria store/índice já existente. */
export function applySchema(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    for (const spec of STORE_SPECS) {
      const store = db.objectStoreNames.contains(spec.name)
        ? undefined
        : db.createObjectStore(spec.name, { keyPath: spec.keyPath });
      if (store === undefined) continue;
      for (const index of spec.indexes ?? []) {
        if (!store.indexNames.contains(index.name)) {
          store.createIndex(index.name, index.keyPath as string | string[], index.options);
        }
      }
    }
  }
  // Ponto de extensão DATA-006: if (oldVersion < 2) { ... }
}
