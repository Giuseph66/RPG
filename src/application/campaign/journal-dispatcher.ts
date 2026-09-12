/**
 * JournalDispatcher — liga `JournalEditorProps.onIntent` (`src/features/journey/journal/types.ts`,
 * `JournalIntent`) ao rascunho de entrada de diário e à persistência de `JournalEntry`.
 *
 * Por que este dispatcher recebe `repository` além de `campaignService`
 * ---------------------------------------------------------------------
 * `JournalEntry` NÃO é um campo de `Campaign` (`src/domain/contracts/campaign.ts` não declara
 * `journalEntries` no agregado) — é uma coleção própria no port, sem revisão otimista dedicada
 * (`getJournalEntry`/`listJournalEntries`/`saveJournalEntry`/`deleteJournalEntry` em
 * `@application/ports/campaign-repository`). `CampaignApplicationService` só expõe
 * select/hydrate/update/save do agregado `Campaign` inteiro (`./service.ts`); não há sub-mutação
 * possível para o diário como existe para `quests`/`npcs` (ver `campaign-record-dispatcher.ts`).
 * Por isso este dispatcher usa o `CampaignRepository` diretamente para ler/gravar entradas de
 * diário — mesma instância injetada em `createCampaignApplicationService({ repository })` pelo
 * bootstrap, nenhuma porta paralela. Ver "Pedido a STATE-001" no handoff desta tarefa propondo
 * expor essas operações em `CampaignApplicationService` para dispensar esse acesso direto.
 *
 * Rascunho em memória
 * --------------------
 * `update-draft` mantém o rascunho (`JournalDraftState`, `src/domain/campaign/journal/types.ts`)
 * em uma variável de fechamento — nunca grava a cada tecla (política de autosave é do editor,
 * não deste dispatcher). O rascunho é reiniciado sempre que a campanha ativa
 * (`campaignService.store.selectedId`) muda, para nunca vazar texto de uma campanha para outra.
 * `save-draft` valida (`validateJournalDraft`) e persiste via `createJournalEntry`/
 * `updateJournalEntry` + `repository.saveJournalEntry`. `reload-draft` descarta as edições não
 * salvas relendo a entrada persistida (ou volta a um rascunho em branco se a entrada é nova);
 * `discard-draft` limpa o rascunho em memória. Nenhum dos dois toca a campanha persistida — são
 * leitura (reload) ou limpeza local (discard).
 *
 * `dispatch.getDraftState()` é exposto como propriedade extra na função retornada — não faz
 * parte do tipo `JournalDispatcher = (intent: JournalIntent) => void` de
 * `src/app/feature-registry.ts` (que continua satisfeito estruturalmente) e não é exigido pelo
 * escopo desta tarefa, mas fica disponível caso o coordenador precise ler o rascunho atual para
 * popular `JournalEditorProps.draft`/`status` sem duplicar este estado em outro lugar.
 */

import { type JournalEntry } from "@domain/contracts/campaign";
import { type AppError, appError } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import {
  createJournalDraft,
  createJournalEntry,
  draftFromJournalEntry,
  markDraftError,
  markDraftSaved,
  markDraftSaving,
  updateJournalDraft,
  updateJournalEntry,
  validateJournalDraft,
  type JournalDraft,
  type JournalDraftState,
} from "@domain/campaign/journal";
import { type JournalIntent } from "@features/journey/journal/types";

import { type CampaignRepository } from "@application/ports/campaign-repository";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";

import { type CampaignApplicationService } from "./service";
import { mapJournalError } from "./map-journal-error";

export interface JournalDispatcherOptions {
  readonly campaignService: CampaignApplicationService;
  /** Mesma instância passada a `createCampaignApplicationService({ repository })`. */
  readonly repository: CampaignRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
  /**
   * `JournalEditorProps.onIntent` não tem canal de erro no tipo. Erros de domínio (validação,
   * entrada não encontrada ao recarregar) e falhas de persistência são reportados aqui quando
   * fornecido; sem `onError`, são silenciosamente ignorados.
   */
  readonly onError?: (error: AppError, intent: JournalIntent) => void;
}

/**
 * Tipo do valor retornado por `createJournalDispatcher`. Estruturalmente compatível com
 * `JournalDispatcher = (intent: JournalIntent) => void` de `src/app/feature-registry.ts` (é uma
 * função com a mesma assinatura de chamada, apenas com uma propriedade extra) — nome diferente
 * aqui só para não colidir com o alias de tipo já declarado naquele arquivo.
 */
export interface JournalIntentDispatcher {
  (intent: JournalIntent): void;
  /** Ver nota "Rascunho em memória" no cabeçalho do arquivo. */
  getDraftState(): JournalDraftState | undefined;
}

function blankState(campaignId: Uuid): JournalDraftState {
  return { draft: createJournalDraft(campaignId), status: "clean" };
}

export function createJournalDispatcher(options: JournalDispatcherOptions): JournalIntentDispatcher {
  const { campaignService, repository, idGenerator, clock, onError } = options;

  let state: JournalDraftState | undefined;

  function activeCampaignId(): Uuid | undefined {
    return campaignService.store.selectedId;
  }

  /** Garante que `state` existe e pertence à campanha ativa; nunca vaza rascunho entre campanhas. */
  function currentState(campaignId: Uuid): JournalDraftState {
    if (state === undefined || state.draft.campaignId !== campaignId) {
      state = blankState(campaignId);
    }
    return state;
  }

  function fail(error: AppError, intent: JournalIntent): void {
    onError?.(error, intent);
  }

  function handleUpdateDraft(intent: Extract<JournalIntent, { kind: "update-draft" }>): void {
    const campaignId = activeCampaignId();
    if (campaignId === undefined) {
      fail(appError.validation("campaign", "Nenhuma campanha ativa para editar o diário."), intent);
      return;
    }
    state = updateJournalDraft(currentState(campaignId), intent.patch);
  }

  function draftPatch(draft: JournalDraft, updatedAt: JournalEntry["updatedAt"]) {
    return {
      title: draft.title,
      body: draft.body,
      sessionNumber: draft.sessionNumber,
      gameDate: draft.gameDate,
      linkedEntityIds: draft.linkedEntityIds,
      tags: draft.tags,
      updatedAt,
    };
  }

  async function handleSaveDraft(intent: Extract<JournalIntent, { kind: "save-draft" }>): Promise<void> {
    const campaignId = activeCampaignId();
    if (campaignId === undefined) {
      fail(appError.validation("campaign", "Nenhuma campanha ativa para salvar o diário."), intent);
      return;
    }
    const before = currentState(campaignId);
    const validated = validateJournalDraft(before.draft);
    if (!validated.ok) {
      state = markDraftError(before, validated.error.message);
      fail(mapJournalError(validated.error), intent);
      return;
    }

    state = markDraftSaving(before);
    const draft = before.draft;
    const now = clock.now();

    if (draft.entryId !== undefined) {
      const existing = await repository.getJournalEntry(draft.entryId);
      if (!existing.ok) {
        state = markDraftError(before, existing.error.message);
        fail(existing.error, intent);
        return;
      }
      const patched = updateJournalEntry(existing.value, draftPatch(draft, now));
      if (!patched.ok) {
        state = markDraftError(before, patched.error.message);
        fail(mapJournalError(patched.error), intent);
        return;
      }
      const saved = await repository.saveJournalEntry(patched.value);
      if (!saved.ok) {
        state = markDraftError(before, saved.error.message);
        fail(saved.error, intent);
        return;
      }
      state = markDraftSaved(before, saved.value);
      return;
    }

    const created = createJournalEntry({
      id: idGenerator.uuid(),
      campaignId,
      title: draft.title,
      body: draft.body,
      sessionNumber: draft.sessionNumber,
      gameDate: draft.gameDate,
      linkedEntityIds: draft.linkedEntityIds,
      tags: draft.tags,
      createdAt: now,
    });
    if (!created.ok) {
      state = markDraftError(before, created.error.message);
      fail(mapJournalError(created.error), intent);
      return;
    }
    const saved = await repository.saveJournalEntry(created.value);
    if (!saved.ok) {
      state = markDraftError(before, saved.error.message);
      fail(saved.error, intent);
      return;
    }
    state = markDraftSaved(before, saved.value);
  }

  async function handleReloadDraft(intent: Extract<JournalIntent, { kind: "reload-draft" }>): Promise<void> {
    const campaignId = activeCampaignId();
    if (campaignId === undefined) {
      fail(appError.validation("campaign", "Nenhuma campanha ativa para recarregar o diário."), intent);
      return;
    }
    const entryId = state?.draft.entryId;
    if (entryId === undefined) {
      state = blankState(campaignId);
      return;
    }
    const existing = await repository.getJournalEntry(entryId);
    if (!existing.ok) {
      fail(existing.error, intent);
      state = blankState(campaignId);
      return;
    }
    state = { draft: draftFromJournalEntry(existing.value), status: "clean" };
  }

  function handleDiscardDraft(intent: Extract<JournalIntent, { kind: "discard-draft" }>): void {
    const campaignId = activeCampaignId();
    if (campaignId === undefined) {
      fail(appError.validation("campaign", "Nenhuma campanha ativa para descartar o diário."), intent);
      return;
    }
    state = blankState(campaignId);
  }

  const dispatch = ((intent: JournalIntent): void => {
    switch (intent.kind) {
      case "update-draft":
        handleUpdateDraft(intent);
        return;
      case "save-draft":
        void handleSaveDraft(intent);
        return;
      case "reload-draft":
        void handleReloadDraft(intent);
        return;
      case "discard-draft":
        handleDiscardDraft(intent);
        return;
    }
  }) as JournalIntentDispatcher;

  dispatch.getDraftState = () => state;

  return dispatch;
}
