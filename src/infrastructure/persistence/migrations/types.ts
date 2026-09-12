import type { AppError, Result } from "@domain/contracts/errors";
import type { SchemaVersion } from "@domain/contracts/versioning";

/** Migração pura: recebe um payload já desserializado e devolve uma cópia migrada. */
export interface BackupMigration {
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  readonly migrate: (payload: unknown) => Result<unknown, AppError>;
}

