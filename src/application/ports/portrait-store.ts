export const MAX_PORTRAIT_BASE64_LENGTH = 900_000;
export const MAX_PORTRAIT_BYTES = Math.floor(MAX_PORTRAIT_BASE64_LENGTH / 4) * 3;

export interface PortraitRecord {
  readonly id: string;
  readonly ownerUid: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly data: string;
}

export interface PortraitRemoteStore {
  /** Sem `campaignId`, lê a cópia privada do dono; com ele, a cópia da campanha (legível pelos membros). */
  get(id: string, campaignId?: string): Promise<PortraitRecord | undefined>;
  /** Cria a cópia do retrato dentro da campanha; rejeita quando o Firebase recusa. */
  putCampaignCopy?(record: PortraitRecord & { readonly campaignId: string; readonly width?: number; readonly height?: number }): Promise<void>;
}
