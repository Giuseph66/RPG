/**
 * Histórico da mesa: rolagens e mudanças de estado das fichas de uma campanha, visíveis em
 * tempo real para o mestre e o grupo. Cada entrada é imutável depois de criada.
 */

import { type DicePurpose } from "./dice";
import { type IsoTimestamp } from "./ids";

export type CampaignLogKind = "roll" | "hit-points" | "conditions" | "adjustments";

export const CAMPAIGN_LOG_KINDS: readonly CampaignLogKind[] = ["roll", "hit-points", "conditions", "adjustments"];

export interface CampaignLogEntry {
  readonly id: string;
  readonly campaignId: string;
  readonly characterId: string;
  readonly characterName: string;
  /** Conta que fez a ação; `byMaster` marca ajustes feitos pelo mestre na ficha de um jogador. */
  readonly actorUid: string;
  readonly byMaster: boolean;
  readonly kind: CampaignLogKind;
  /** Frase curta ("Iniciativa: 17", "PV 10 → 6"). */
  readonly summary: string;
  /** Complemento opcional ("1d20 [15] + 2", "4 de dano"). */
  readonly detail?: string;
  readonly rollPurpose?: DicePurpose;
  readonly rollTotal?: number;
  readonly createdAt: IsoTimestamp;
}

export const CAMPAIGN_LOG_LIMITS = { summary: 200, detail: 300, characterName: 120 } as const;
