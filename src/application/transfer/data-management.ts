import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import type { BackupEnvelope } from "@domain/contracts/backup";
import type { BackupService } from "@application/ports/backup-service";
import type { RecoveryStore, ResetRequest, ResetWriter } from "./types";

export interface DataManagementDependencies extends ResetWriter {
  readonly backup: BackupService;
  readonly recovery?: RecoveryStore;
}

/** Fachada de operações destrutivas: cada reset exige confirmação explícita. */
export class DataManagementService {
  constructor(private readonly dependencies: DataManagementDependencies) {}
  exportCharacter(id: Parameters<BackupService["exportCharacter"]>[0]): ReturnType<BackupService["exportCharacter"]> { return this.dependencies.backup.exportCharacter(id); }
  exportCampaign(id: Parameters<BackupService["exportCampaign"]>[0]): ReturnType<BackupService["exportCampaign"]> { return this.dependencies.backup.exportCampaign(id); }
  import(envelope: BackupEnvelope, mode: "copy" | "replace"): ReturnType<BackupService["commitImport"]> { return this.dependencies.backup.commitImport(envelope, mode); }
  reset(request: ResetRequest): Promise<Result<void, AppError>> { if (request.confirmation !== "explicit") return Promise.resolve(err(appError.validation("confirmation", "Reset exige confirmação explícita."))); return this.dependencies.reset(request); }
  listRecovery(): ReturnType<RecoveryStore["list"]> { return this.dependencies.recovery ? this.dependencies.recovery.list() : Promise.resolve(ok([])); }
  restoreRecovery(id: string): ReturnType<RecoveryStore["restore"]> { return this.dependencies.recovery ? this.dependencies.recovery.restore(id) : Promise.resolve(err(appError.storageUnavailable("Recuperação não está disponível."))); }
  discardRecovery(id: string): ReturnType<RecoveryStore["discard"]> { return this.dependencies.recovery ? this.dependencies.recovery.discard(id) : Promise.resolve(err(appError.storageUnavailable("Recuperação não está disponível."))); }
}

