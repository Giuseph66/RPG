/**
 * CampaignDispatcher — liga `CampaignPanelProps.onIntent`/`JourneyCampaignProps.onIntent`
 * (`src/features/journey/campaign/types.ts`, `CampaignIntent`) à criação/seleção/troca/exclusão
 * de campanhas.
 *
 * Por que este dispatcher recebe `repository` além de `campaignService`
 * ---------------------------------------------------------------------
 * `CampaignApplicationService` (./service.ts) só opera sobre uma campanha JÁ selecionada e
 * hidratada: `update()`/`save()` (herdados de `AggregateStore`, ver
 * `src/application/state/aggregate-store.ts`) exigem `entry.value` populado, e a única forma de
 * popular `entry.value` é `hydrate()` chamando `repository.get(id)` — que retorna `not-found`
 * para um ID que ainda não existe. Não há, hoje, um método do serviço que persista um
 * `Campaign` novo sem uma seleção prévia bem-sucedida. Esta é a MESMA lacuna já documentada
 * para personagem: `src/app/bootstrap.tsx` monta `creationService.saveCharacter` chamando
 * `characterRepository.save(...)` diretamente (o repositório bruto, ao lado de
 * `services.character`) porque `CharacterApplicationService` tem exatamente a mesma limitação
 * (comentário no próprio bootstrap: "saveCharacter não existe em CharacterApplicationService de
 * propósito"). Seguimos o mesmo padrão aqui em vez de inventar uma porta paralela: `repository`
 * é a mesma instância de `CampaignRepository` (`@application/ports/campaign-repository`) já
 * injetada em `createCampaignApplicationService({ repository })` pelo bootstrap.
 *
 * `delete-campaign` também precisa do repositório diretamente: apagar com escopo
 * "campaign-and-content" alcança `JournalEntry`/`MapRecord` (coleções à parte da campanha no
 * port, sem revisão própria em `JournalEntry`), que `CampaignApplicationService` não expõe.
 *
 * Ver "Pedido a STATE-001" no handoff desta tarefa para a proposta de fechar essa lacuna no
 * serviço em vez de repetir este padrão em cada dispatcher que precisa criar/apagar um agregado
 * do zero.
 */

import { type AppError, appError } from "@domain/contracts/errors";
import { asRevision } from "@domain/contracts/versioning";
import { asUuid, type RulesetRef, type Uuid } from "@domain/contracts/ids";
import { createCampaign, prepareCampaignDeletion } from "@domain/campaign/journal";
import { type CampaignIntent } from "@features/journey/campaign/types";

import { type CampaignRepository } from "@application/ports/campaign-repository";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";

import { type CampaignApplicationService } from "./service";
import { mapJournalError } from "./map-journal-error";

export interface CampaignDispatcherOptions {
  readonly campaignService: CampaignApplicationService;
  /** Mesma instância passada a `createCampaignApplicationService({ repository })`. */
  readonly repository: CampaignRepository;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
  /**
   * Ruleset padrão da campanha nova. A UI de `create-campaign` (`CampaignIntent`) não coleta
   * ruleset (app é single-ruleset local, ver `docs/criacao/interface/pagina-jornada.md`); o
   * bootstrap já resolve o mesmo valor para personagens via
   * `{ id: activePack.manifest.id, version: activePack.manifest.version }`.
   */
  readonly rulesetRef: RulesetRef;
  /**
   * `CampaignPanelProps.onIntent` não tem canal de erro no tipo. Erros de domínio (nome vazio,
   * escopo de exclusão ausente, backup não confirmado, campanha inexistente) e falhas de
   * persistência são reportados aqui quando fornecido; sem `onError`, são silenciosamente
   * ignorados e nenhuma mutação é aplicada.
   */
  readonly onError?: (error: AppError, intent: CampaignIntent) => void;
}

function toUuid(value: string, field: string): { readonly ok: true; readonly value: Uuid } | { readonly ok: false; readonly error: AppError } {
  try {
    return { ok: true, value: asUuid(value) };
  } catch {
    return { ok: false, error: appError.validation(field, `"${value}" não é um identificador de campanha válido.`) };
  }
}

export function createCampaignDispatcher(options: CampaignDispatcherOptions): (intent: CampaignIntent) => void {
  const { campaignService, repository, idGenerator, clock, rulesetRef, onError } = options;

  function fail(error: AppError, intent: CampaignIntent): void {
    onError?.(error, intent);
  }

  async function handleCreate(intent: Extract<CampaignIntent, { kind: "create-campaign" }>): Promise<void> {
    const now = clock.now();
    const created = createCampaign({
      id: idGenerator.uuid(),
      name: intent.name,
      description: intent.description,
      rulesetRef,
      createdAt: now,
    });
    if (!created.ok) {
      fail(mapJournalError(created.error), intent);
      return;
    }

    const campaign = created.value;
    const saved = await campaignService.saveCampaign(campaign, asRevision(0));
    if (!saved.ok) {
      fail(saved.error, intent);
      return;
    }

    const selected = await campaignService.select(campaign.id);
    if (!selected.ok) fail(selected.error, intent);
  }

  async function handleSelect(intent: Extract<CampaignIntent, { kind: "select-campaign" | "switch-campaign" }>): Promise<void> {
    const id = toUuid(intent.campaignId, "campaignId");
    if (!id.ok) {
      fail(id.error, intent);
      return;
    }
    const result = await campaignService.select(id.value);
    if (!result.ok) fail(result.error, intent);
  }

  async function handleDelete(intent: Extract<CampaignIntent, { kind: "delete-campaign" }>): Promise<void> {
    const id = toUuid(intent.campaignId, "campaignId");
    if (!id.ok) {
      fail(id.error, intent);
      return;
    }

    const plan = prepareCampaignDeletion({
      campaignId: id.value,
      scope: intent.scope,
      backupConfirmed: intent.backupConfirmed,
    });
    if (!plan.ok) {
      fail(mapJournalError(plan.error), intent);
      return;
    }

    const current = await repository.get(id.value);
    if (!current.ok) {
      fail(current.error, intent);
      return;
    }

    const deleted = plan.value.scope === "campaign-and-content"
      ? await campaignService.deleteCampaignAndContent(id.value, current.value.revision)
      : await campaignService.deleteCampaign(id.value, current.value.revision);
    if (!deleted.ok) {
      fail(deleted.error, intent);
      return;
    }

    if (campaignService.store.selectedId === id.value) {
      const cleared = await campaignService.select(undefined);
      if (!cleared.ok) fail(cleared.error, intent);
    }
  }

  return (intent: CampaignIntent): void => {
    switch (intent.kind) {
      case "create-campaign":
        void handleCreate(intent);
        return;
      case "select-campaign":
      case "switch-campaign":
        void handleSelect(intent);
        return;
      case "delete-campaign":
        void handleDelete(intent);
        return;
    }
  };
}
