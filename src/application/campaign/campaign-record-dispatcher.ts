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
 * Missões novas usam `createQuest()` e recebem ID/relógio injetados; objetivos continuam sendo
 * textos do agregado Campaign e são validados por `updateCampaign()`. Toda mutação é aplicada ao
 * snapshot local e salva pelo serviço, que também enfileira a mesma revisão no outbox quando o
 * modo remoto está ativo.
 */

import { type Campaign } from "@domain/contracts/campaign";
import { type AppError, appError } from "@domain/contracts/errors";
import { type JournalResult, createNpc, createQuest, updateCampaign, updateNpc, updateQuest } from "@domain/campaign/journal";
import { type CampaignRecordIntent } from "@features/journey/campaign/types";
import type { IdGenerator } from "@application/ports/id-generator";
import type { Clock } from "@application/ports/clock";

import { type CampaignApplicationService } from "./service";
import { mapJournalError } from "./map-journal-error";

export interface CampaignRecordDispatcherOptions {
  readonly campaignService: CampaignApplicationService;
  readonly idGenerator?: IdGenerator;
  readonly clock?: Clock;
  /**
   * `CampaignRecordsProps.onIntent` não tem canal de erro no tipo. Erros de domínio (missão/NPC
   * inexistente, patch inválido) e a ausência de campanha ativa são reportados aqui quando
   * fornecido; sem `onError`, são silenciosamente ignorados e o estado permanece intocado
   * (nenhum `update`/`save` é disparado).
   */
  readonly onError?: (error: AppError, intent: CampaignRecordIntent) => void;
}

function applyIntent(campaign: Campaign, intent: CampaignRecordIntent, idGenerator?: IdGenerator, clock?: Clock): JournalResult<Campaign> {
  switch (intent.kind) {
    case "complete-quest":
      return updateQuest(campaign, intent.questId, { status: "completed", ...(clock ? { updatedAt: clock.now() } : {}) });
    case "update-quest":
      return updateQuest(campaign, intent.questId, { ...intent.patch, ...(clock ? { updatedAt: clock.now() } : {}) });
    case "create-quest": {
      if (!idGenerator || !clock) return { ok: false, error: { code: "validation-error", field: "quest", message: "Criação de missão indisponível nesta composição." } };
      const title = intent.title.trim();
      const description = intent.description.trim();
      const now = clock.now();
      const created = createQuest({ id: idGenerator.uuid(), title, description, status: "active", linkedEntityIds: [], createdAt: now, updatedAt: now });
      return created.ok ? { ok: true, value: { ...campaign, quests: [...campaign.quests, created.value] } } : created;
    }
    case "delete-quest": {
      if (!campaign.quests.some((quest) => String(quest.id) === intent.questId)) return { ok: false, error: { code: "validation-error", field: "questId", message: "Esta missão já não existe na campanha." } };
      return { ok: true, value: { ...campaign, quests: campaign.quests.filter((quest) => String(quest.id) !== intent.questId) } };
    }
    case "create-objective": {
      const text = intent.text.trim();
      if (!text) return { ok: false, error: { code: "validation-error", field: "objective", message: "Informe o texto do objetivo." } };
      return updateCampaign(campaign, { objectives: [...campaign.objectives, text] });
    }
    case "update-objective": {
      if (!Number.isInteger(intent.index) || intent.index < 0 || intent.index >= campaign.objectives.length) return { ok: false, error: { code: "validation-error", field: "objective", message: "Objetivo não encontrado nesta campanha." } };
      const text = intent.text.trim();
      if (!text) return { ok: false, error: { code: "validation-error", field: "objective", message: "Informe o texto do objetivo." } };
      const objectives = [...campaign.objectives];
      objectives[intent.index] = text;
      return updateCampaign(campaign, { objectives });
    }
    case "delete-objective":
      if (!Number.isInteger(intent.index) || intent.index < 0 || intent.index >= campaign.objectives.length) return { ok: false, error: { code: "validation-error", field: "objective", message: "Objetivo não encontrado nesta campanha." } };
      return updateCampaign(campaign, { objectives: campaign.objectives.filter((_objective, index) => index !== intent.index) });
    case "update-npc":
      return updateNpc(campaign, intent.npcId, intent.patch);
    case "create-npc": {
      if (!idGenerator || !clock) return { ok: false, error: { code: "validation-error", field: "npc", message: "Criação de registro indisponível nesta composição." } };
      const name = intent.name.trim();
      if (!name) return { ok: false, error: { code: "validation-error", field: "name", message: "Informe um nome para este registro." } };
      const now = clock.now();
      const created = createNpc({ id: idGenerator.uuid(), kind: intent.recordKind, name, description: intent.description.trim(), linkedEntityIds: [], ...(intent.characterRef ? { characterRef: intent.characterRef } : {}), createdAt: now, updatedAt: now });
      return created.ok ? { ok: true, value: { ...campaign, npcs: [...campaign.npcs, created.value] } } : created;
    }
    case "delete-npc": {
      const exists = campaign.npcs.some((npc) => String(npc.id) === intent.npcId);
      if (!exists) return { ok: false, error: { code: "validation-error", field: "npcId", message: "Este registro já não existe na campanha." } };
      return { ok: true, value: { ...campaign, npcs: campaign.npcs.filter((npc) => String(npc.id) !== intent.npcId) } };
    }
  }
}

/**
 * Cria o handler para `CampaignRecordsProps.onIntent`/`JourneyCampaignProps.onRecordIntent`.
 * Assinatura estável para wiring em `src/app/bootstrap.tsx`:
 *
 * `createCampaignRecordDispatcher(options: { readonly campaignService: CampaignApplicationService; readonly onError?: (error: AppError, intent: CampaignRecordIntent) => void }): (intent: CampaignRecordIntent) => void`
 */
export function createCampaignRecordDispatcher(options: CampaignRecordDispatcherOptions): (intent: CampaignRecordIntent) => void {
  const { campaignService, onError, idGenerator, clock } = options;

  return (intent: CampaignRecordIntent): void => {
    const campaign: Campaign | undefined = campaignService.store.getSnapshot().value;
    if (!campaign) {
      onError?.(appError.validation("campaign", "Nenhuma campanha ativa para aplicar o intent de registro."), intent);
      return;
    }

    const mutationResult = applyIntent(campaign, intent, idGenerator, clock);
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
    }).catch((cause) => onError?.(appError.storageUnavailable(cause instanceof Error ? cause.message : "Não foi possível salvar o registro da campanha."), intent));
  };
}
