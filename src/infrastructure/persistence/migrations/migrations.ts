import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { SchemaVersion } from "@domain/contracts/versioning";
import type { BackupMigration } from "./types";

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

/** A cadeia é deliberadamente explícita: não há salto ou escolha implícita de versão. */
export function migratePayload(
  payload: unknown,
  fromVersion: SchemaVersion,
  migrations: readonly BackupMigration[] = [],
  toVersion = CURRENT_BACKUP_SCHEMA_VERSION,
): Result<unknown, AppError> {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    return err(appError.validation("schemaVersion", "schemaVersion deve ser um inteiro positivo."));
  }
  if (fromVersion > toVersion) return err(appError.unsupportedSchema(fromVersion, { min: 1, max: toVersion }));
  let current = payload;
  let version = fromVersion;
  while (version < toVersion) {
    const migration = migrations.find((candidate) => candidate.fromVersion === version);
    if (!migration || migration.toVersion <= version) {
      return err(appError.unsupportedSchema(version, { min: 1, max: toVersion }, "Cadeia de migração incompleta."));
    }
    const result = migration.migrate(current);
    if (!result.ok) return result;
    current = result.value;
    version = migration.toVersion;
  }
  return ok(current);
}

export function validateMigrationChain(migrations: readonly BackupMigration[], current = CURRENT_BACKUP_SCHEMA_VERSION): Result<void, AppError> {
  const seen = new Set<number>();
  for (const migration of migrations) {
    if (!Number.isInteger(migration.fromVersion) || !Number.isInteger(migration.toVersion) || migration.toVersion <= migration.fromVersion || seen.has(migration.fromVersion)) {
      return err(appError.validation("migrations", "Cadeia de migração inválida ou ambígua."));
    }
    seen.add(migration.fromVersion);
  }
  return migratePayload({}, 1, migrations, current).ok ? ok(undefined) : err(appError.validation("migrations", "Cadeia não alcança a versão atual."));
}

