import type { Asset, Campaign, JournalEntry, MapRecord } from "@domain/contracts/campaign";
import type { Character } from "@domain/contracts/character";
import type { BackupEnvelope, ImportMode } from "@domain/contracts/backup";
import type { AppError, Result } from "@domain/contracts/errors";
import type { Uuid } from "@domain/contracts/ids";
import type { BackupMigration } from "@infrastructure/persistence/migrations";
import type { AssetRepository } from "@application/ports/asset-repository";
import type { CampaignRepository } from "@application/ports/campaign-repository";
import type { CharacterRepository } from "@application/ports/character-repository";
import type { DiceHistoryRepository } from "@application/ports/dice-history-repository";
import type { IdGenerator } from "@application/ports/id-generator";

export interface BackupRepositories {
  readonly characters: CharacterRepository;
  readonly campaigns: CampaignRepository;
  readonly assets: AssetRepository;
  readonly diceHistory?: DiceHistoryRepository;
}

/** O compositor fornece esta operação para ligar todos os stores numa transação real. */
export interface AtomicImportWriter {
  readonly commitImport: (input: { readonly envelope: BackupEnvelope; readonly mode: ImportMode }) => Promise<Result<{ readonly rootId: Uuid }, AppError>>;
}

export interface BackupServiceOptions extends BackupRepositories, AtomicImportWriter {
  readonly appVersion: string;
  readonly now: () => string;
  readonly idGenerator?: IdGenerator;
  readonly availableRulesets?: readonly { readonly id: string; readonly version: string }[];
  readonly listExistingIds?: () => Promise<Result<readonly string[], AppError>>;
  readonly migrations?: readonly BackupMigration[];
  readonly maxImportBytes?: number;
  readonly maxAssetBytes?: number;
}

export interface ResetRequest {
  readonly scope: "characters" | "campaigns" | "assets" | "dice-history" | "all";
  readonly confirmation: "explicit";
}

export interface ResetWriter { readonly reset: (request: ResetRequest) => Promise<Result<void, AppError>>; }

export interface RecoveryRecordView { readonly id: string; readonly sourceStore: string; readonly recordedAt: string; readonly raw: unknown; }
export interface RecoveryStore {
  readonly list: () => Promise<Result<readonly RecoveryRecordView[], AppError>>;
  readonly restore: (id: string) => Promise<Result<void, AppError>>;
  readonly discard: (id: string) => Promise<Result<void, AppError>>;
}

export type BackupEntity = Character | Campaign | JournalEntry | MapRecord | Asset;
