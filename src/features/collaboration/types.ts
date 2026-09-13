import type { MembershipService } from "@application/membership";
import type { AuthSession } from "@application/ports/auth-port";
import type { AccountId, Uuid } from "@domain/contracts/ids";
import type { Revision } from "@domain/contracts/versioning";
import type { AppError, Result } from "@domain/contracts/errors";

export interface CollaborationCampaign {
  readonly id: Uuid;
  readonly name: string;
}

export interface CollaborationCharacter {
  readonly id: Uuid;
  readonly name: string;
  readonly campaignId?: Uuid;
  readonly revision: Revision;
}

export type CollaborationSyncState = "local" | "pending" | "offline" | "synced";

export interface CollaborationPanelProps {
  readonly membership?: MembershipService;
  readonly session?: AuthSession | null;
  readonly campaigns?: readonly CollaborationCampaign[];
  readonly characters?: readonly CollaborationCharacter[];
  readonly activeCampaignId?: Uuid;
  readonly syncState?: CollaborationSyncState;
  readonly onOpenSession?: (campaignId: Uuid) => void;
  readonly onLinkCharacter?: (characterId: Uuid, campaignId: Uuid, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly onUnlinkCharacter?: (characterId: Uuid, campaignId: Uuid, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
}

export interface CollaborationActor {
  readonly id: AccountId;
  readonly email?: string | null;
}
