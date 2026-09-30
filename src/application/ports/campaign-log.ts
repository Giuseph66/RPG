import type { CampaignLogEntry } from "@domain/contracts/campaign-log";

/** Histórico da mesa na nuvem: gravação e leitura em tempo real por campanha. */
export interface CampaignLogPort {
  /** Rejeita quando o Firebase recusa; o chamador decide se registra ou ignora. */
  append(entry: CampaignLogEntry): Promise<void>;
  /** Entrega as entradas mais recentes primeiro, a cada mudança. Retorna o cancelamento. */
  watch(campaignId: string, onEntries: (entries: readonly CampaignLogEntry[]) => void, onError?: (cause: unknown) => void): () => void;
}
