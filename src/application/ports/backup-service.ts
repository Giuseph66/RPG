/**
 * BackupService. Autoridade: dados/persistencia.md, 09-MODELO-DE-DADOS.md.
 * Coordena repositórios e assets sem expor formato de banco à UI.
 */

import { type Uuid } from "@domain/contracts/ids";
import { type BackupEnvelope, type ImportMode, type ImportPreview } from "@domain/contracts/backup";
import { type AppError, type Result } from "@domain/contracts/errors";

export interface BackupService {
  exportCharacter(characterId: Uuid): Promise<Result<BackupEnvelope, AppError>>;
  exportCampaign(campaignId: Uuid): Promise<Result<BackupEnvelope, AppError>>;
  previewImport(envelope: BackupEnvelope): Promise<Result<ImportPreview, AppError>>;
  /** Commit único sobre todos os stores afetados; falha em qualquer parte aborta tudo. */
  commitImport(envelope: BackupEnvelope, mode: ImportMode): Promise<Result<{ readonly rootId: Uuid }, AppError>>;
}
