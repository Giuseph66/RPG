/**
 * Campaign e agregados de jornada. Autoridade: dados/schemas.md ("Campanha e jornada"),
 * 09-MODELO-DE-DADOS.md.
 */

import { type IsoTimestamp, type RulesetRef, type Uuid } from "./ids";
import { type AbilityGenerationMethod } from "./character";
import { type GameTime } from "./primitives";
import { type Revision } from "./versioning";

export const CAMPAIGN_SCHEMA_VERSION = 1;

/** "avanço sem XP é decisão de produto/mesa, não regra atribuída ao livro." */
export type AdvancementMethod = "xp" | "milestone";

export interface CampaignSettings {
  readonly optionalRules: readonly string[];
  readonly abilityGenerationMethod: AbilityGenerationMethod;
  readonly advancementMethod: AdvancementMethod;
}

export type QuestStatus = "active" | "completed" | "failed" | "abandoned";

export interface Quest {
  readonly id: Uuid;
  readonly title: string;
  readonly description: string;
  readonly status: QuestStatus;
  readonly linkedEntityIds: readonly Uuid[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface NpcRecord {
  readonly id: Uuid;
  readonly name: string;
  readonly description: string;
  readonly linkedEntityIds: readonly Uuid[];
  /** Presente quando o NPC tem ficha completa (Character) além do registro narrativo. */
  readonly characterRef?: Uuid;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface Campaign {
  readonly id: Uuid;
  readonly schemaVersion: typeof CAMPAIGN_SCHEMA_VERSION;
  readonly revision: Revision;
  readonly name: string;
  readonly description: string;
  readonly rulesetRef: RulesetRef;
  readonly characterIds: readonly Uuid[];
  readonly sessionCounter: number;
  readonly npcs: readonly NpcRecord[];
  readonly quests: readonly Quest[];
  readonly objectives: readonly string[];
  readonly settings: CampaignSettings;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface JournalEntry {
  readonly id: Uuid;
  readonly campaignId: Uuid;
  readonly title: string;
  readonly body: string;
  readonly sessionNumber?: number;
  readonly gameDate?: GameTime;
  readonly linkedEntityIds: readonly Uuid[];
  readonly tags: readonly string[];
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface MapPin {
  readonly id: Uuid;
  /** 0..1: coordenada normalizada; pan/zoom são transitórios de UI, fora deste contrato. */
  readonly normalizedX: number;
  readonly normalizedY: number;
  readonly label: string;
  readonly locationId?: Uuid;
  readonly noteIds: readonly Uuid[];
  readonly iconToken: string;
}

export interface MapRecord {
  readonly id: Uuid;
  readonly campaignId: Uuid;
  readonly name: string;
  readonly assetId: Uuid;
  readonly pins: readonly MapPin[];
  readonly groupPosition?: number;
  readonly revision: Revision;
}

export interface Asset {
  readonly id: Uuid;
  readonly mediaType: string;
  /** Bytes crus; nunca Blob do DOM em um contrato de domínio puro. */
  readonly bytes: Uint8Array;
  readonly hash: string;
  readonly width?: number;
  readonly height?: number;
  readonly originalName: string;
}
