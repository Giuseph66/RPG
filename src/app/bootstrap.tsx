import { useEffect, useMemo, useState } from "react";

import {
  ApplicationServicesProvider,
  createApplicationServices,
  useExternalStore,
  type ApplicationServices,
} from "@application/state";
import {
  IndexedDbCampaignRepository,
  IndexedDbCharacterRepository,
  IndexedDbDiceHistoryRepository,
  IndexedDbUnitOfWork,
  CryptoIdGenerator,
  SystemClock,
  openDatabase,
  type OpenDatabaseOptions,
} from "@infrastructure/persistence/indexeddb";
import { LocalStorageSettingsRepository } from "@infrastructure/preferences";
import { createPlatformRandomSource } from "@domain/dice";
import { createDiceOverlayController, type DiceOverlayController } from "@features/dice";
import { createCompendiumService } from "@application/compendium";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { STATIC_COMPENDIUM_ITEMS } from "@data/compendium";
import { registerPwa, type PwaPlatform, type RegisteredPwa } from "@infrastructure/pwa";
import { deriveCharacter } from "@domain/rules";
import { deriveActionCapabilities, type DeriveActionCapabilitiesResult } from "@application/character/action-capabilities";
import { createActionDispatcher } from "@application/character/action-dispatcher";
import { createInventoryDispatcher } from "@application/character/inventory-dispatcher";
import { createCampaignDispatcher } from "@application/campaign/campaign-dispatcher";
import { createCampaignRecordDispatcher } from "@application/campaign/campaign-record-dispatcher";
import { createJournalDispatcher } from "@application/campaign/journal-dispatcher";
import { chooseCampaignForRestore } from "@application/campaign";
import type { Character, CharacterDraft } from "@domain/contracts/character";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { AvailableAction, RuleContext } from "@domain/contracts/rules";
import type { ActionCapability } from "@features/actions";
import { createCharacterDraft } from "@domain/character/creation";
import type { CreationWizardService } from "@features/character/creation";
import { createFeatureRegistry, type FeatureRegistry } from "./feature-registry";
import { AppRouter } from "./router";

/**
 * Contexto de regra estático usado para derivar capacidades de Ações. Não há relógio de jogo
 * nem rastreador de turno na V1 (03-ARQUITETURA.md não exige um); listar os quatro tipos de
 * ação sempre disponíveis é uma constante de apresentação, não uma decisão de mestre inferida —
 * `RuleContext.availableActions` só filtra QUAIS TIPOS existem, nunca decide se o jogador pode
 * agir agora.
 */
const STATIC_RULE_CONTEXT: RuleContext = {
  gameTime: { day: 1, hour: 0, minute: 0 },
  availableActions: ["action", "bonus-action", "reaction", "free"] satisfies readonly AvailableAction[],
  tablePolicies: [],
};

export interface ApplicationRuntime {
  readonly database: IDBDatabase;
  readonly services: ApplicationServices;
  readonly diceOverlayController: DiceOverlayController;
  /** Recalcula `ActionCapability[]` para o personagem informado; atualiza o dispatcher acoplado. */
  readonly computeActionCapabilities: (character: Character | undefined) => readonly ActionCapability[];
  readonly registry: FeatureRegistry;
  /** Pack ativo, exposto para a rota de criação montar `CharacterCreationWizard`. */
  readonly pack: RulePack;
  /** Gera um `CharacterDraft` novo (novo ID/timestamp) a cada chamada; UI decide quando chamar. */
  readonly createDraft: () => CharacterDraft;
  readonly onCharacterCreated: (character: Character) => void;
}

export interface BootstrapProps {
  /** Útil para SSR e testes de navegação; em produção a URL atual é usada. */
  readonly initialPath?: string;
  /** Permite renderizar uma composição já aberta em testes de integração. */
  readonly runtime?: ApplicationRuntime;
  /** Injeta a fronteira do browser para testes/hosts que controlam o registro PWA. */
  readonly pwaPlatform?: PwaPlatform;
}

export interface ApplicationRuntimeOptions {
  /** Permite isolar uma instância de runtime sem alterar a composição de produção. */
  readonly database?: OpenDatabaseOptions;
  readonly settingsStorage?: Storage;
}

/** Abre os adapters e hidrata preferências, personagem ativo e campanha persistida. */
export async function createApplicationRuntime(options: ApplicationRuntimeOptions = {}): Promise<ApplicationRuntime> {
  const opened = await openDatabase(options.database);
  if (!opened.ok) throw new Error(opened.error.message);

  const database = opened.value;
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();
  const characterRepository = new IndexedDbCharacterRepository(database, clock);
  const campaignRepository = new IndexedDbCampaignRepository(database, clock);
  const services = createApplicationServices({
    characterRepository,
    campaignRepository,
    settingsRepository: new LocalStorageSettingsRepository(options.settingsStorage),
    diceHistoryRepository: new IndexedDbDiceHistoryRepository(database, clock),
    unitOfWork: new IndexedDbUnitOfWork(database),
    clock,
    idGenerator,
  });

  try {
    const settings = await services.settings.hydrate();
    if (!settings.ok) throw new Error(settings.error.message);

    if (settings.value.activeCharacterId !== undefined) {
      // `select` (não `hydrate`) marca o ID como selecionado antes de buscar o agregado —
      // `AggregateStore.hydrate(id)` só publica o snapshot quando `this.selected === id`
      // (guarda contra corrida entre trocas de personagem); sem `select` primeiro, o
      // personagem ativo nunca é restaurado ao recarregar a página, mesmo com sucesso na
      // leitura. Bug pré-existente descoberto ao verificar o achado #1 de QA-004.
      const character = await services.character.select(settings.value.activeCharacterId);
      if (!character.ok) throw new Error(character.error.message);
    }

    const campaigns = await services.campaign.list();
    if (!campaigns.ok) throw new Error(campaigns.error.message);
    const campaignToRestore = chooseCampaignForRestore(campaigns.value);
    if (campaignToRestore) {
      const campaign = await services.campaign.hydrate(campaignToRestore.id);
      if (!campaign.ok) throw new Error(campaign.error.message);
    }

    const diceOverlayController = createDiceOverlayController({
      history: services.dice,
      rng: createPlatformRandomSource(),
      idGenerator,
      clock,
    });

    const pack = loadPhbPtBrLocal2017();
    if (!pack.ok) throw new Error(pack.error.message);
    const activePack = pack.value;
    const compendiumService = createCompendiumService({ packs: [activePack], items: STATIC_COMPENDIUM_ITEMS });

    // `executionsHolder` liga a lista reativa de capacidades (recalculada a cada snapshot de
    // personagem por `computeActionCapabilities`, chamado de `ReadyApplication`) ao dispatcher
    // estático abaixo, sem recriar o dispatcher a cada render — `capabilitiesById` é uma função
    // de leitura, nunca um Map fixo, para nunca resolver contra uma lista de capacidades velha.
    const executionsHolder: { current: DeriveActionCapabilitiesResult["executions"] } = { current: new Map() };
    const actionDispatcher = createActionDispatcher({
      characterService: services.character,
      capabilitiesById: (id) => executionsHolder.current.get(id),
      rng: createPlatformRandomSource(),
      idGenerator,
      clock,
    });
    const inventoryDispatcher = createInventoryDispatcher({ characterService: services.character });

    // `saveCharacter` não existe em `CharacterApplicationService` de propósito (ele só grava o
    // agregado já selecionado no store, ver `features/character/creation/types.ts`); o wizard
    // recebe este adaptador fino sobre o repository, nunca o port diretamente.
    const creationService: CreationWizardService = {
      saveDraft: (draft) => services.character.saveDraft(draft),
      deleteDraft: (id) => services.character.deleteDraft(id),
      saveCharacter: (character, expectedRevision) => characterRepository.save(character, expectedRevision),
    };

    function createDraft(): CharacterDraft {
      const created = createCharacterDraft({
        id: idGenerator.uuid(),
        rulesetRef: { id: activePack.manifest.id, version: activePack.manifest.version },
        createdAt: clock.now(),
      });
      if (!created.ok) throw new Error(created.error.message);
      return created.value;
    }

    function computeActionCapabilities(character: Character | undefined): readonly ActionCapability[] {
      if (!character) {
        executionsHolder.current = new Map();
        return [];
      }
      const derived = deriveCharacter(character, activePack, STATIC_RULE_CONTEXT);
      if (!derived.ok) {
        executionsHolder.current = new Map();
        return [];
      }
      const { capabilities, executions } = deriveActionCapabilities(character, derived.value, activePack, idGenerator);
      executionsHolder.current = executions;
      return capabilities;
    }

    const rulesetRef = { id: activePack.manifest.id, version: activePack.manifest.version };
    const campaignDispatcher = createCampaignDispatcher({ campaignService: services.campaign, repository: campaignRepository, idGenerator, clock, rulesetRef });
    const campaignRecordDispatcher = createCampaignRecordDispatcher({ campaignService: services.campaign });
    const journalDispatcher = createJournalDispatcher({ campaignService: services.campaign, repository: campaignRepository, idGenerator, clock });

    const registry = createFeatureRegistry({
      services,
      compendiumService,
      diceOverlayController,
      actionDispatcher,
      inventoryDispatcher,
      creationService,
      campaignDispatcher,
      campaignRecordDispatcher,
      journalDispatcher,
    });

    return { database, services, diceOverlayController, registry, computeActionCapabilities, pack: activePack, createDraft, onCharacterCreated: (character: Character) => { void services.character.select(character.id); } };
  } catch (cause) {
    services.character.dispose();
    services.campaign.dispose();
    services.settings.dispose();
    services.dice.dispose();
    database.close();
    throw cause;
  }
}

function errorMessage(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : undefined;
}

const PENDING_STORE_STATUSES = new Set(["dirty", "saving", "conflict"]);

/** Predicado conservador: só bloqueia atualização quando um store expõe trabalho real pendente. */
export function hasPendingApplicationWork(services: ApplicationServices): boolean {
  return [services.character.store, services.campaign.store, services.settings.store, services.dice.store].some((store) => {
    const snapshot = store.getSnapshot();
    return snapshot.hasPendingChanges || PENDING_STORE_STATUSES.has(snapshot.status);
  });
}

function ReadyApplication({ services, diceOverlayController, registry, computeActionCapabilities, pack, createDraft, onCharacterCreated, initialPath, onRetryBoot, pwaPlatform }: { readonly services: ApplicationServices; readonly diceOverlayController: DiceOverlayController; readonly registry: FeatureRegistry; readonly computeActionCapabilities: ApplicationRuntime["computeActionCapabilities"]; readonly pack: RulePack; readonly createDraft: () => CharacterDraft; readonly onCharacterCreated: (character: Character) => void; readonly initialPath?: string; readonly onRetryBoot: () => void; readonly pwaPlatform?: PwaPlatform }) {
  const characterSnapshot = useExternalStore(services.character.store);
  const campaignSnapshot = useExternalStore(services.campaign.store);
  // Recalculado a cada revisão do personagem ativo — nunca reaproveita capacidades de outro
  // personagem/estado (achado #1 de QA-004: a lista não pode ficar presa a um snapshot velho).
  const actionCapabilities = useMemo(
    () => computeActionCapabilities(characterSnapshot.value),
    [computeActionCapabilities, characterSnapshot.value],
  );
  useEffect(() => {
    let active = true;
    let registered: RegisteredPwa | undefined;
    void registerPwa({ platform: pwaPlatform, hasPendingWork: () => hasPendingApplicationWork(services) }).then((result) => {
      if (!result.ok) return;
      if (!active) {
        result.value.dispose();
        return;
      }
      registered = result.value;
    });
    return () => {
      active = false;
      registered?.dispose();
    };
  }, [pwaPlatform, services]);
  const character = {
    value: characterSnapshot.value,
    status: characterSnapshot.status,
    errorMessage: errorMessage(characterSnapshot.error),
  };

  return (
    <ApplicationServicesProvider services={services}>
      <AppRouter
        initialPath={initialPath}
        bootState="ready"
        navigate={() => undefined}
        character={character}
        campaign={{ value: campaignSnapshot.value, status: campaignSnapshot.status, errorMessage: errorMessage(campaignSnapshot.error) }}
        settingsStore={services.settings.store}
        diceOverlayController={diceOverlayController}
        registry={registry}
        actionCapabilities={actionCapabilities}
        pack={pack}
        createDraft={createDraft}
        onCharacterCreated={onCharacterCreated}
        onRetryBoot={onRetryBoot}
      />
    </ApplicationServicesProvider>
  );
}

export function Bootstrap({ initialPath, runtime: suppliedRuntime, pwaPlatform }: BootstrapProps = {}) {
  const [attempt, setAttempt] = useState(0);
  const [runtime, setRuntime] = useState<ApplicationRuntime | undefined>(suppliedRuntime);
  const [bootState, setBootState] = useState<"booting" | "ready" | "error">(suppliedRuntime ? "ready" : "booting");
  const [bootErrorMessage, setBootErrorMessage] = useState<string>();

  useEffect(() => {
    if (suppliedRuntime) return;
    let active = true;
    let openedRuntime: ApplicationRuntime | undefined;

    setBootState("booting");
    setBootErrorMessage(undefined);
    void createApplicationRuntime().then(
      (nextRuntime) => {
        openedRuntime = nextRuntime;
        if (!active) {
          nextRuntime.services.character.dispose();
          nextRuntime.services.campaign.dispose();
          nextRuntime.services.settings.dispose();
          nextRuntime.services.dice.dispose();
          nextRuntime.database.close();
          return;
        }
        setRuntime(nextRuntime);
        setBootState("ready");
      },
      (cause) => {
        if (!active) return;
        setBootErrorMessage(cause instanceof Error ? cause.message : "Não foi possível abrir os dados locais.");
        setBootState("error");
      },
    );

    return () => {
      active = false;
      if (openedRuntime) {
        openedRuntime.services.character.dispose();
        openedRuntime.services.campaign.dispose();
        openedRuntime.services.settings.dispose();
        openedRuntime.services.dice.dispose();
        openedRuntime.database.close();
      }
    };
  }, [attempt, suppliedRuntime]);

  const retry = () => {
    setRuntime(undefined);
    setBootErrorMessage(undefined);
    setBootState("booting");
    setAttempt((current) => current + 1);
  };

  if (runtime) return <ReadyApplication services={runtime.services} diceOverlayController={runtime.diceOverlayController} registry={runtime.registry} computeActionCapabilities={runtime.computeActionCapabilities} pack={runtime.pack} createDraft={runtime.createDraft} onCharacterCreated={runtime.onCharacterCreated} initialPath={initialPath} onRetryBoot={retry} pwaPlatform={pwaPlatform} />;

  return (
    <AppRouter
      initialPath={initialPath}
      bootState={bootState}
      navigate={() => undefined}
      bootErrorMessage={bootErrorMessage}
      onRetryBoot={retry}
    />
  );
}
