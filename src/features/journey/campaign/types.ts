import type { Campaign, NpcRecord, Quest } from "@domain/contracts/campaign";
import type { ReactNode } from "react";
import type { EntityId, Uuid } from "@domain/contracts/ids";
import type { Result } from "@domain/contracts/errors";

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
  | { readonly kind: "create-npc"; readonly name: string; readonly description: string; readonly recordKind: "npc" | "enemy"; readonly characterRef?: Uuid }
  | { readonly kind: "update-npc"; readonly npcId: string; readonly patch: Partial<Pick<NpcRecord, "name" | "description" | "linkedEntityIds" | "kind" | "characterRef">> }
  | { readonly kind: "delete-npc"; readonly npcId: string };

export type JourneySectionId = "map" | "journal" | "sessions" | "npcs";

export interface PlayerJourneySummary {
  readonly accountId: string;
  readonly name: string;
  readonly detail?: string;
  readonly journalEntries: number;
  readonly creaturesKnown: number;
  readonly guesses: number;
}

export interface CampaignPanelProps {
  readonly campaigns: readonly CampaignSummary[];
  readonly activeCampaignId?: string;
  readonly activeCampaignName?: string;
  readonly overviewStats?: {
    readonly objectives: number;
    readonly activeQuests: number;
    readonly npcs: number;
    readonly enemies: number;
  };
  readonly activityStats?: { readonly maps?: number; readonly journalEntries?: number; readonly sessions?: number; readonly creatures?: number };
  readonly onOpenSection?: (id: JourneySectionId) => void;
  /** Substitui os quatro indicadores padrão (ex.: visão própria do jogador). */
  readonly metrics?: readonly { readonly label: string; readonly value: number }[];
  /** Atalhos exibidos abaixo dos indicadores. */
  readonly sectionLinks?: readonly JourneySectionId[];
  /** Jogadores não excluem a campanha do mestre. */
  readonly canDelete?: boolean;
  readonly eyebrow?: string;
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
  readonly sections?: readonly ("objectives" | "quests" | "npcs")[];
  readonly availableCharacters?: readonly { readonly id: Uuid; readonly name: string }[];
  readonly onCreateSheet?: () => void;
  readonly onOpenSheet?: (id: Uuid) => void;
  readonly raceOptions?: readonly { readonly id: EntityId; readonly name: string }[];
  readonly classOptions?: readonly { readonly id: EntityId; readonly name: string }[];
  readonly onGenerateSheet?: (input: { readonly name: string; readonly raceId: EntityId; readonly classId?: EntityId }) => Promise<Result<Uuid>>;
}

export interface JourneyCampaignProps extends CampaignPanelProps {
  readonly campaign?: Campaign;
  readonly quests?: readonly Quest[];
  readonly npcs?: readonly NpcRecord[];
  readonly onRecordIntent?: (intent: CampaignRecordIntent) => void;
  readonly availableCharacters?: CampaignRecordsProps["availableCharacters"];
  readonly onCreateSheet?: () => void;
  readonly onOpenSheet?: (id: Uuid) => void;
  readonly raceOptions?: CampaignRecordsProps["raceOptions"];
  readonly classOptions?: CampaignRecordsProps["classOptions"];
  readonly onGenerateSheet?: CampaignRecordsProps["onGenerateSheet"];
  readonly mapPanel?: ReactNode;
  readonly journalPanel?: ReactNode;
  readonly sessionsPanel?: ReactNode;
  readonly participantsPanel?: ReactNode;
  readonly creaturesPanel?: ReactNode;
  /** Mestre vê tudo; jogador vê a própria jornada. Ausente = mestre local. */
  readonly role?: "master" | "player";
  readonly playerJourneys?: readonly PlayerJourneySummary[];
  readonly onOpenPlayerJourney?: (accountId: string) => void;
  readonly requestedTabId?: string;
  readonly onTabChange?: (id: string) => void;
}
