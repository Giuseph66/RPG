import type { BackupEnvelope, ImportMode, ImportPreview } from "@domain/contracts/backup";
import type { ResetRequest, RecoveryRecordView } from "@application/transfer/types";

export type DataManagementIntent =
  | { readonly kind: "export-character"; readonly characterId: string }
  | { readonly kind: "export-campaign"; readonly campaignId: string }
  | { readonly kind: "import-json"; readonly json: string }
  | { readonly kind: "preview-import"; readonly envelope: BackupEnvelope }
  | { readonly kind: "commit-import"; readonly envelope: BackupEnvelope; readonly mode: ImportMode }
  | { readonly kind: "reset"; readonly request: ResetRequest }
  | { readonly kind: "restore-recovery"; readonly id: string }
  | { readonly kind: "discard-recovery"; readonly id: string };

export interface DataManagementProps {
  readonly characterId?: string;
  readonly campaignId?: string;
  readonly status?: "idle" | "loading" | "saving" | "error";
  readonly error?: string;
  readonly preview?: ImportPreview;
  readonly pendingEnvelope?: BackupEnvelope;
  readonly recovery?: readonly RecoveryRecordView[];
  readonly onIntent?: (intent: DataManagementIntent) => void;
  readonly className?: string;
}
