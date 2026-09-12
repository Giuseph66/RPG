import type { Campaign, JournalEntry, NpcRecord, Quest } from "@domain/contracts/campaign";
import type { Result } from "@domain/contracts/errors";
import type { IsoTimestamp, RulesetRef, Uuid } from "@domain/contracts/ids";
import type { GameTime } from "@domain/contracts/primitives";
import type { Revision } from "@domain/contracts/versioning";

export interface JournalDraft {
  readonly campaignId: Uuid;
  readonly entryId?: Uuid;
  readonly title: string;
  readonly body: string;
  readonly sessionNumber?: number;
  readonly gameDate?: GameTime;
  readonly linkedEntityIds: readonly Uuid[];
  readonly tags: readonly string[];
}

export interface JournalLinkStatus {
  readonly id: Uuid;
  readonly exists: boolean;
  readonly label?: string;
  readonly kind?: "location" | "npc" | "quest" | "journal" | "character" | "unknown";
}

export interface JournalDraftState {
  readonly draft: JournalDraft;
  readonly status: "clean" | "dirty" | "saving" | "saved" | "error" | "conflict";
  readonly error?: string;
  readonly baseRevision?: Revision;
}

export interface JournalSaveSuccess {
  readonly entry: JournalEntry;
  readonly revision?: Revision;
}

export interface JournalConflict {
  readonly expectedRevision: Revision;
  readonly actualRevision: Revision;
}

export type JournalDomainError =
  | { readonly code: "validation-error"; readonly field: string; readonly message: string }
  | { readonly code: "invalid-link"; readonly field: "linkedEntityIds"; readonly id: string; readonly message: string }
  | { readonly code: "conflict"; readonly field: "revision"; readonly expectedRevision: Revision; readonly actualRevision: Revision; readonly message: string }
  | { readonly code: "deletion-scope-required"; readonly field: "scope"; readonly message: string }
  | { readonly code: "backup-confirmation-required"; readonly field: "backupConfirmed"; readonly message: string };

export type JournalResult<T> = Result<T, JournalDomainError>;

export interface CreateCampaignInput {
  readonly id: Uuid;
  readonly name: string;
  readonly description?: string;
  readonly rulesetRef: RulesetRef;
  readonly characterIds?: readonly Uuid[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt?: IsoTimestamp;
  readonly abilityGenerationMethod?: Campaign["settings"]["abilityGenerationMethod"];
  readonly advancementMethod?: Campaign["settings"]["advancementMethod"];
  readonly optionalRules?: readonly string[];
}

export interface JournalEntryInput {
  readonly id: Uuid;
  readonly campaignId: Uuid;
  readonly title: string;
  readonly body: string;
  readonly sessionNumber?: number;
  readonly gameDate?: GameTime;
  readonly linkedEntityIds?: readonly Uuid[];
  readonly tags?: readonly string[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt?: IsoTimestamp;
}

export interface JournalEntryPatch {
  readonly title?: string;
  readonly body?: string;
  readonly sessionNumber?: number;
  readonly gameDate?: GameTime;
  readonly linkedEntityIds?: readonly Uuid[];
  readonly tags?: readonly string[];
  readonly updatedAt?: IsoTimestamp;
}

export interface CampaignDeletionRequest {
  readonly campaignId: Uuid;
  readonly scope?: "campaign-only" | "campaign-and-content";
  readonly backupConfirmed?: boolean;
}

export interface CampaignDeletionPlan extends CampaignDeletionRequest {
  readonly scope: "campaign-only" | "campaign-and-content";
  readonly backupConfirmed: true;
}

export type CampaignRecord = Campaign;
export type CampaignQuest = Quest;
export type CampaignNpc = NpcRecord;
