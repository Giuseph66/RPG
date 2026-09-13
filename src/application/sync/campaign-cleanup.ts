import { type TransactionContext } from "@application/ports/unit-of-work";
import { type CampaignCleanupManifest } from "@domain/contracts/cloud-sync";
import { type Uuid } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";

export type { CampaignCleanupAsset, CampaignCleanupManifest } from "@domain/contracts/cloud-sync";

/**
 * Leitor local opcional. Deve executar dentro do mesmo contexto da remoção e
 * devolver somente referências já conhecidas localmente. O remoto não é
 * consultado para descobrir o que apagar.
 */
export interface CampaignCleanupManifestReader {
  read(campaignId: Uuid, campaignRevision: number, context?: TransactionContext): Promise<Result<CampaignCleanupManifest, AppError>>;
}

export function emptyCampaignCleanupManifest(campaignId: Uuid, campaignRevision: number): CampaignCleanupManifest {
  return {
    schemaVersion: 1,
    campaignId,
    campaignRevision: asRevision(campaignRevision),
    memberAccountIds: [],
    characterIds: [],
    journalIds: [],
    mapIds: [],
    sessionIds: [],
    assets: [],
  };
}
