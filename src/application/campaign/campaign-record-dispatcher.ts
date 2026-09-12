/**
 * CampaignRecordDispatcher — liga `CampaignRecordsProps.onIntent`/`JourneyCampaignProps.onRecordIntent`
 * (`src/features/journey/campaign/types.ts`, `CampaignRecordIntent`) às funções puras de
 * `src/domain/campaign/journal/campaign.ts` (`updateQuest`/`updateNpc`), persistindo o
 * resultado através de `CampaignApplicationService`.
 *
 * Não existe um `Command`/`RuleResult` dedicado a missões/NPCs em `domain/contracts/rules.ts` —
 * assim como inventário (`character/inventory-dispatcher.ts`), isso é mutação direta dos
 * arrays `Campaign.quests`/`Campaign.npcs`, não uma regra do Rules Engine. Por isso este
 * dispatcher lê o snapshot síncrono da campanha ativa em `campaignService.store.getSnapshot()`
 * e aplica a operação pura correspondente à variante do intent, sempre reescrevendo o `Campaign`
 * inteiro via `update()`+`save()` (mesmo padrão de `inventory-dispatcher.ts`).
 *
 * `complete-quest` não usa `completeQuest()` de `domain/campaign/journal` porque essa função
 * exige um `updatedAt: IsoTimestamp` (terceiro parâmetro) e `CampaignRecordIntent` não expõe
 * timestamp algum (nem o próprio `Quest.updatedAt` é atingível pela UI — o patch de
 * `update-quest` também nunca inclui `updatedAt`, ver `CampaignRecordIntent` em
 * `src/features/journey/campaign/types.ts`). Para manter a assinatura de opções deste
 * dispatcher igual à combinada no handoff (`{ campaignService }`, sem `Clock`), `complete-quest`
 * chama `updateQuest(campaign, questId, { status: "completed" })` diretamente — equivalente ao
 * corpo de `completeQuest()` menos o carimbo de tempo. Ver "Pedido a STATE-001" no handoff desta
 * tarefa se um `updatedAt` correto por mutação for necessário no futuro.
 */

import { type Campaign } from "@domain/contracts/campaign";
import { type AppError, appError } from "@domain/contracts/errors";
import { type JournalResult, updateNpc, updateQuest } from "@domain/campaign/journal";
import { type CampaignRecordIntent } from "@features/journey/campaign/types";

import { type CampaignApplicationService } from "./service";
import { mapJournalError } from "./map-journal-error";

export interface CampaignRecordDispatcherOptions {
  readonly campaignService: CampaignApplicationService;
  /**
   * `CampaignRecordsProps.onIntent` não tem canal de erro no tipo. Erros de domínio (missão/NPC
   * inexistente, patch inválido) e a ausência de campanha ativa são reportados aqui quando
   * fornecido; sem `onError`, são silenciosamente ignorados e o estado permanece intocado
   * (nenhum `update`/`save` é disparado).
   */
  readonly onError?: (error: AppError, intent: CampaignRecordIntent) => void;
}

function applyIntent(campaign: Campaign, intent: CampaignRecordIntent): JournalResult<Campaign> {
  switch (intent.kind) {
    case "complete-quest":
      return updateQuest(campaign, intent.questId, { status: "completed" });
    case "update-quest":
      return updateQuest(campaign, intent.questId, intent.patch);
    case "update-npc":
      return updateNpc(campaign, intent.npcId, intent.patch);
  }
}

/**
 * Cria o handler para `CampaignRecordsProps.onIntent`/`JourneyCampaignProps.onRecordIntent`.
 * Assinatura estável para wiring em `src/app/bootstrap.tsx`:
 *
 * `createCampaignRecordDispatcher(options: { readonly campaignService: CampaignApplicationService; readonly onError?: (error: AppError, intent: CampaignRecordIntent) => void }): (intent: CampaignRecordIntent) => void`
 */
export function createCampaignRecordDispatcher(options: CampaignRecordDispatcherOptions): (intent: CampaignRecordIntent) => void {
  const { campaignService, onError } = options;

  return (intent: CampaignRecordIntent): void => {
    const campaign: Campaign | undefined = campaignService.store.getSnapshot().value;
    if (!campaign) {
      onError?.(appError.validation("campaign", "Nenhuma campanha ativa para aplicar o intent de registro."), intent);
      return;
    }

    const mutationResult = applyIntent(campaign, intent);
    if (!mutationResult.ok) {
      onError?.(mapJournalError(mutationResult.error), intent);
      return;
    }

    const nextCampaign = mutationResult.value;
    const updateResult = campaignService.update(() => nextCampaign, true);
    if (!updateResult.ok) {
      onError?.(updateResult.error, intent);
      return;
    }

    void campaignService.save().then((saveResult) => {
      if (!saveResult.ok) onError?.(saveResult.error, intent);
    });
  };
}
