/**
 * Backup JSON. Autoridade: dados/persistencia.md ("Envelope de exportação, versão 1").
 */

import { type IsoTimestamp, type RulesetRef, type Uuid } from "./ids";
import { type AppVersion, type SchemaVersion } from "./versioning";
import { type Campaign, type JournalEntry, type MapRecord } from "./campaign";
import { type Character } from "./character";
import { type DiceRoll } from "./dice";

export const BACKUP_FORMAT_VERSION = 1;

export type BackupKind = "character" | "campaign";
export type ImportMode = "copy" | "replace";

export interface ExportedAsset {
  readonly id: Uuid;
  readonly mediaType: string;
  readonly encoding: "base64";
  readonly bytes: string;
  readonly hash: string;
  readonly width?: number;
  readonly height?: number;
}

export interface BackupManifest {
  readonly counts: Readonly<Record<string, number>>;
  readonly hashes: Readonly<Record<string, string>>;
  readonly historyRange?: { readonly from: IsoTimestamp; readonly to: IsoTimestamp };
}

/** Coleções não aplicáveis ficam vazias, nunca omitidas ambiguamente (09-MODELO-DE-DADOS.md). */
export interface BackupRecords {
  readonly characters: readonly Character[];
  readonly campaigns: readonly Campaign[];
  readonly journalEntries: readonly JournalEntry[];
  readonly maps: readonly MapRecord[];
  readonly rolls: readonly DiceRoll[];
  readonly favorites: readonly Uuid[];
}

export interface BackupEnvelope {
  readonly format: "rpg-companion-backup";
  readonly formatVersion: typeof BACKUP_FORMAT_VERSION;
  readonly exportedAt: IsoTimestamp;
  readonly appVersion: AppVersion;
  readonly kind: BackupKind;
  readonly schemaVersion: SchemaVersion;
  readonly rulesetRefs: readonly RulesetRef[];
  readonly rootId: Uuid;
  readonly records: BackupRecords;
  readonly assets: readonly ExportedAsset[];
  readonly manifest: BackupManifest;
}

export type ImportConflict =
  | { readonly kind: "duplicate-id"; readonly id: Uuid; readonly entity: string }
  | { readonly kind: "missing-ruleset"; readonly rulesetRef: RulesetRef }
  | { readonly kind: "broken-reference"; readonly referrerId: Uuid; readonly targetId: string }
  | { readonly kind: "unsupported-schema"; readonly foundVersion: number };

export interface ImportPreview {
  readonly kind: BackupKind;
  readonly rootName: string;
  readonly schemaVersion: SchemaVersion;
  readonly rulesetRefs: readonly RulesetRef[];
  readonly counts: Readonly<Record<string, number>>;
  readonly conflicts: readonly ImportConflict[];
  readonly warnings: readonly string[];
  readonly estimatedBytes: number;
}
