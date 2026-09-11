import { useEffect, useState } from "react";

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
} from "@infrastructure/persistence/indexeddb";
import { LocalStorageSettingsRepository } from "@infrastructure/preferences";
import { AppRouter } from "./router";

export interface ApplicationRuntime {
  readonly database: IDBDatabase;
  readonly services: ApplicationServices;
}

export interface BootstrapProps {
  /** Útil para SSR e testes de navegação; em produção a URL atual é usada. */
  readonly initialPath?: string;
  /** Permite renderizar uma composição já aberta em testes de integração. */
  readonly runtime?: ApplicationRuntime;
}

/** Abre os adapters e hidrata somente preferências e o personagem ativo. */
export async function createApplicationRuntime(): Promise<ApplicationRuntime> {
  const opened = await openDatabase();
  if (!opened.ok) throw new Error(opened.error.message);

  const database = opened.value;
  const clock = new SystemClock();
  const services = createApplicationServices({
    characterRepository: new IndexedDbCharacterRepository(database, clock),
    campaignRepository: new IndexedDbCampaignRepository(database, clock),
    settingsRepository: new LocalStorageSettingsRepository(),
    diceHistoryRepository: new IndexedDbDiceHistoryRepository(database, clock),
    unitOfWork: new IndexedDbUnitOfWork(database),
    clock,
    idGenerator: new CryptoIdGenerator(),
  });

  try {
    const settings = await services.settings.hydrate();
    if (!settings.ok) throw new Error(settings.error.message);

    if (settings.value.activeCharacterId !== undefined) {
      const character = await services.character.hydrate(settings.value.activeCharacterId);
      if (!character.ok) throw new Error(character.error.message);
    }

    return { database, services };
  } catch (cause) {
    services.character.dispose();
    services.settings.dispose();
    database.close();
    throw cause;
  }
}

function errorMessage(value: unknown): string | undefined {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : undefined;
}

function ReadyApplication({ services, initialPath, onRetryBoot }: { readonly services: ApplicationServices; readonly initialPath?: string; readonly onRetryBoot: () => void }) {
  const characterSnapshot = useExternalStore(services.character.store);
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
        settingsStore={services.settings.store}
        onRetryBoot={onRetryBoot}
      />
    </ApplicationServicesProvider>
  );
}

export function Bootstrap({ initialPath, runtime: suppliedRuntime }: BootstrapProps = {}) {
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
          nextRuntime.services.settings.dispose();
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
        openedRuntime.services.settings.dispose();
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

  if (runtime) return <ReadyApplication services={runtime.services} initialPath={initialPath} onRetryBoot={retry} />;

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
