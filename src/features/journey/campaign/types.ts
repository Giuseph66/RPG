import type { Campaign, NpcRecord, Quest } from "@domain/contracts/campaign";

export interface CampaignSummary {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly updatedAt?: string;
}

export type CampaignIntent =
  | { readonly kind: "create-campaign"; readonly name: string; readonly description: string }
  | { readonly kind: "select-campaign"; readonly campaignId: string }
  | { readonly kind: "switch-campaign"; readonly campaignId: string }
  | { readonly kind: "delete-campaign"; readonly campaignId: string; readonly scope: "campaign-only" | "campaign-and-content"; readonly backupConfirmed: true };

export type CampaignRecordIntent =
  | { readonly kind: "complete-quest"; readonly questId: string }
  | { readonly kind: "update-quest"; readonly questId: string; readonly patch: Partial<Pick<Quest, "title" | "description" | "status" | "linkedEntityIds">> }
  | { readonly kind: "update-npc"; readonly npcId: string; readonly patch: Partial<Pick<NpcRecord, "name" | "description" | "linkedEntityIds">> };

export interface CampaignPanelProps {
  readonly campaigns: readonly CampaignSummary[];
  readonly activeCampaignId?: string;
  readonly activeCampaignName?: string;
  readonly draftPending?: boolean;
  readonly status?: "idle" | "loading" | "error" | "saving";
  readonly error?: string;
  readonly onIntent?: (intent: CampaignIntent) => void;
  readonly className?: string;
}

export interface CampaignRecordsProps {
  readonly quests?: readonly Quest[];
  readonly npcs?: readonly NpcRecord[];
  readonly objectives?: readonly string[];
  readonly onIntent?: (intent: CampaignRecordIntent) => void;
}

export interface JourneyCampaignProps extends CampaignPanelProps {
  readonly campaign?: Campaign;
  readonly quests?: readonly Quest[];
  readonly npcs?: readonly NpcRecord[];
  readonly onRecordIntent?: (intent: CampaignRecordIntent) => void;
}
