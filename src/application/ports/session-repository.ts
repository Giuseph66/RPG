import { type CampaignSession } from "@domain/session";
import { type Uuid } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type Revision } from "@domain/contracts/versioning";
import { type TransactionContext } from "./unit-of-work";

export interface SessionRepository {
  get(id: Uuid, context?: TransactionContext): Promise<Result<CampaignSession, AppError>>;
  list(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly CampaignSession[], AppError>>;
  save(session: CampaignSession, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;
  delete(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;
}
