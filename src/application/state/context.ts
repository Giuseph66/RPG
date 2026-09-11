import { createContext, createElement, useContext, type ReactNode } from "react";

import { type CampaignRepository } from "@application/ports/campaign-repository";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type DiceHistoryRepository } from "@application/ports/dice-history-repository";
import { type SettingsRepository } from "@application/ports/settings-repository";
import { type UnitOfWork } from "@application/ports/unit-of-work";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";

import { createCampaignApplicationService, type CampaignApplicationService } from "@application/campaign";
import { createCharacterApplicationService, type CharacterApplicationService } from "@application/character";
import { createDiceApplicationService, type DiceApplicationService } from "@application/dice";
import { createSettingsApplicationService, type SettingsApplicationService } from "@application/settings";

export interface ApplicationDependencies {
  readonly characterRepository: CharacterRepository;
  readonly campaignRepository: CampaignRepository;
  readonly settingsRepository: SettingsRepository;
  readonly diceHistoryRepository: DiceHistoryRepository;
  /** Disponíveis para serviços de comando futuros; a composição segue por ports. */
  readonly unitOfWork?: UnitOfWork;
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
}

export interface ApplicationServices {
  readonly character: CharacterApplicationService;
  readonly campaign: CampaignApplicationService;
  readonly settings: SettingsApplicationService;
  readonly dice: DiceApplicationService;
}

export interface ApplicationServicesOptions {
  readonly characterDebounceMs?: number;
  readonly campaignDebounceMs?: number;
}

export function createApplicationServices(
  dependencies: ApplicationDependencies,
  options: ApplicationServicesOptions = {},
): ApplicationServices {
  return Object.freeze({
    character: createCharacterApplicationService({
      repository: dependencies.characterRepository,
      debounceMs: options.characterDebounceMs,
      ...(dependencies.clock
        ? {
            commandDependencies: {
              clock: dependencies.clock,
              diceHistoryRepository: dependencies.diceHistoryRepository,
              unitOfWork: dependencies.unitOfWork,
            },
          }
        : {}),
    }),
    campaign: createCampaignApplicationService({
      repository: dependencies.campaignRepository,
      debounceMs: options.campaignDebounceMs,
    }),
    settings: createSettingsApplicationService(dependencies.settingsRepository),
    dice: createDiceApplicationService(dependencies.diceHistoryRepository),
  });
}

export const ApplicationServicesContext = createContext<ApplicationServices | undefined>(undefined);
export const ApplicationContext = ApplicationServicesContext;

export function ApplicationServicesProvider(props: { readonly services: ApplicationServices; readonly children?: ReactNode }) {
  return createElement(ApplicationServicesContext.Provider, { value: props.services }, props.children);
}

export function useApplicationServices(): ApplicationServices {
  const services = useContext(ApplicationServicesContext);
  if (!services) throw new Error("ApplicationServicesProvider ausente na composição da aplicação.");
  return services;
}

export const ApplicationProvider = ApplicationServicesProvider;
export const useApplication = useApplicationServices;
