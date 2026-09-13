import { type CampaignRole } from "@domain/contracts/cloud-sync";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";

/** Implementado pela camada de membership; sessão não infere papel pelo cliente. */
export interface SessionAuthorizationPort {
  getCampaignRole(campaignId: Uuid, accountId: AccountId): Promise<Result<CampaignRole, AppError>>;
}
