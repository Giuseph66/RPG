import type { MembershipService } from "@application/membership";
import type { AuthSession } from "@application/ports/auth-port";
import type { AccountId, DefinitionRef, Uuid } from "@domain/contracts/ids";
import type { Revision } from "@domain/contracts/versioning";
import type { AppError, Result } from "@domain/contracts/errors";

export interface CollaborationCampaign {
  readonly id: Uuid;
  readonly name: string;
}

export interface CollaborationCharacter {
  readonly id: Uuid;
  readonly name: string;
  readonly playerName?: string;
  readonly className?: string;
  readonly totalLevel?: number;
  readonly hitPoints?: { readonly current: number; readonly temporary: number; readonly maximum?: number };
  readonly armorClass?: number;
  readonly initiative?: number;
  readonly conditions?: readonly string[];
  readonly conditionIds?: readonly string[];
  readonly adjustments?: readonly CampaignCharacterAdjustment[];
  readonly concentration?: boolean;
  readonly inspiration?: boolean;
  readonly deathSaves?: { readonly successes: number; readonly failures: number };
  readonly pendingResolutions?: number;
  readonly resources?: { readonly available: number; readonly total: number };
  readonly campaignId?: Uuid;
  readonly revision: Revision;
}

export type CampaignAdjustmentTarget = "armor-class" | "initiative" | "attack-roll" | "ability-check";

export interface CampaignCharacterAdjustment {
  readonly id: Uuid;
  readonly target: CampaignAdjustmentTarget;
  readonly amount: number;
  readonly reason: string;
}

export type CollaborationSyncState = "local" | "pending" | "offline" | "synced" | "error";

export interface CollaborationPanelProps {
  readonly view?: "characters" | "participants";
  readonly membership?: MembershipService;
  readonly session?: AuthSession | null;
  readonly campaigns?: readonly CollaborationCampaign[];
  readonly characters?: readonly CollaborationCharacter[];
  readonly activeCampaignId?: Uuid;
  readonly syncState?: CollaborationSyncState;
  readonly syncHydration?: object;
  readonly onRefreshSync?: () => Promise<void>;
  readonly onOpenSession?: (campaignId: Uuid) => void;
  readonly onOpenJourney?: () => void;
  readonly onOpenParticipants?: () => void;
  readonly onCreateCharacter?: () => void;
  readonly onLinkCharacter?: (characterId: Uuid, campaignId: Uuid, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly onUnlinkCharacter?: (characterId: Uuid, campaignId: Uuid, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
  readonly conditionOptions?: readonly { readonly ref: DefinitionRef; readonly name: string }[];
  readonly onUpdateCharacter?: (characterId: Uuid, expectedRevision: Revision, values: { readonly hp: number; readonly tempHp: number; readonly conditionIds: readonly string[]; readonly adjustments: readonly CampaignCharacterAdjustment[] }) => Promise<Result<Revision, AppError>>;
}

export interface CollaborationActor {
  readonly id: AccountId;
  readonly email?: string | null;
}
