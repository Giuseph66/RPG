import type { ApplicationServices } from "@application/state";
import type { CharacterApplicationService } from "@application/character";
import type { CompendiumService } from "@application/compendium";
import type { CreationWizardService } from "@features/character/creation";
import { CharacterCreationWizard, type CharacterCreationWizardProps as CreationProps } from "@features/character/creation";
import { CharacterProgression, type CharacterProgressionProps } from "@features/character/progression";
import { CharacterSelection, type CharacterSelectionProps } from "@features/character/selection";
import { CharacterSheet, type CharacterSheetProps } from "@features/character/sheet";
import { Actions, type ActionCommitResult, type ActionsProps } from "@features/actions";
import { Inventory, type InventoryIntent, type InventoryProps } from "@features/inventory";
import { CampaignPanel, CampaignRecords, JourneyCampaign, type CampaignIntent, type CampaignPanelProps, type CampaignRecordIntent, type CampaignRecordsProps, type JourneyCampaignProps } from "@features/journey/campaign";
import { JournalEditor, JournalWorkspace, type JournalEditorProps, type JournalEntryListProps, type JournalIntent } from "@features/journey/journal";
import { MapViewer, type MapViewerProps } from "@features/journey/map";
import { Compendium, type CompendiumProps } from "@features/compendium";
import { DiceHistory, DiceOverlay, type DiceHistoryProps, type DiceOverlayController, type DiceOverlayProps, type DiceHistoryService } from "@features/dice";
import type { CompendiumFilters } from "@application/compendium";

export const FEATURE_DESTINATIONS = ["character", "actions", "journey", "compendium"] as const;
export type FeatureDestinationId = (typeof FEATURE_DESTINATIONS)[number];

export type ActionDispatcher = (intent: Parameters<NonNullable<ActionsProps["onIntent"]>>[0]) => ActionCommitResult;
export type InventoryDispatcher = (intent: InventoryIntent) => void;
export type CampaignDispatcher = (intent: CampaignIntent) => void;
export type CampaignRecordDispatcher = (intent: CampaignRecordIntent) => void;
export type JournalDispatcher = (intent: JournalIntent) => void;

export interface FeatureRegistryDependencies {
  /** Application services must be created by bootstrap/application composition. */
  readonly services: ApplicationServices;
  /** CompendiumService is injected so the registry never creates an empty catalog implicitly. */
  readonly compendiumService: CompendiumService;
  readonly diceOverlayController?: DiceOverlayController;
  readonly actionDispatcher?: ActionDispatcher;
  readonly inventoryDispatcher?: InventoryDispatcher;
  readonly campaignDispatcher?: CampaignDispatcher;
  readonly campaignRecordDispatcher?: CampaignRecordDispatcher;
  readonly journalDispatcher?: JournalDispatcher;
  /** Optional only because character creation has no adapter in ApplicationServices yet. */
  readonly creationService?: CreationWizardService;
}

export interface FeatureRegistry {
  readonly destinations: typeof FEATURE_DESTINATIONS;
  readonly character: {
    readonly components: {
      readonly Selection: typeof CharacterSelection;
      readonly Sheet: typeof CharacterSheet;
      readonly Creation: typeof CharacterCreationWizard;
      readonly Progression: typeof CharacterProgression;
    };
    readonly service: CharacterApplicationService;
    readonly pendingDependencies: readonly string[];
    readonly bindSelectionProps: (props: CharacterSelectionProps) => CharacterSelectionProps;
    readonly bindSheetProps: (props: Omit<CharacterSheetProps, "service">) => CharacterSheetProps;
    readonly bindCreationProps: (props: Omit<CreationProps, "service">) => CreationProps;
    readonly bindProgressionProps: (props: CharacterProgressionProps) => CharacterProgressionProps;
  };
  readonly actions: {
    readonly component: typeof Actions;
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: ActionsProps) => ActionsProps;
  };
  readonly inventory: {
    readonly component: typeof Inventory;
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: InventoryProps) => InventoryProps;
  };
  readonly journey: {
    readonly components: {
      readonly Campaign: typeof JourneyCampaign;
      readonly CampaignPanel: typeof CampaignPanel;
      readonly CampaignRecords: typeof CampaignRecords;
      readonly Journal: typeof JournalWorkspace;
      readonly JournalEditor: typeof JournalEditor;
      readonly Map: typeof MapViewer;
    };
    readonly service: ApplicationServices["campaign"];
    readonly pendingDependencies: readonly string[];
    readonly bindCampaignProps: (props: JourneyCampaignProps) => JourneyCampaignProps;
    readonly bindCampaignPanelProps: (props: CampaignPanelProps) => CampaignPanelProps;
    readonly bindCampaignRecordsProps: (props: CampaignRecordsProps) => CampaignRecordsProps;
    readonly bindJournalProps: (props: JournalEditorProps & JournalEntryListProps) => JournalEditorProps & JournalEntryListProps;
    readonly bindMapProps: (props: MapViewerProps) => MapViewerProps;
  };
  readonly compendium: {
    readonly component: typeof Compendium;
    readonly service: CompendiumService;
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: CompendiumRegistryProps) => CompendiumProps;
  };
  readonly dice: {
    readonly components: {
      readonly Overlay: typeof DiceOverlay;
      readonly History: typeof DiceHistory;
    };
    readonly controller?: DiceOverlayController;
    readonly history: DiceHistoryService;
    readonly pendingDependencies: readonly string[];
    readonly bindOverlayProps: (props: Omit<DiceOverlayProps, "controller">) => DiceOverlayProps | undefined;
    readonly bindHistoryProps: (props: DiceHistoryProps) => DiceHistoryProps;
  };
}

export type CompendiumRegistryProps = Omit<CompendiumProps, "entries" | "categories"> & Partial<Pick<CompendiumProps, "entries" | "categories">>;

/**
 * Composes public feature exports with already-created application services.
 * It only binds callbacks and read models; it does not hydrate, persist, or invent state.
 */
export function createFeatureRegistry(dependencies: FeatureRegistryDependencies): FeatureRegistry {
  const { services } = dependencies;
  const character = {
    components: { Selection: CharacterSelection, Sheet: CharacterSheet, Creation: CharacterCreationWizard, Progression: CharacterProgression },
    service: services.character,
    pendingDependencies: dependencies.creationService ? [] : ["CreationWizardService.saveCharacter (adaptador de criação pendente)"],
    bindSelectionProps: (props: CharacterSelectionProps): CharacterSelectionProps => ({
      ...props,
      onSelect: (id) => { void services.character.select(id); props.onSelect?.(id); },
      onRetry: props.onRetry ?? (() => { void services.character.retry(); }),
    }),
    bindSheetProps: (props: Omit<CharacterSheetProps, "service">): CharacterSheetProps => ({ ...props, service: services.character }),
    bindCreationProps: (props: Omit<CreationProps, "service">): CreationProps => ({ ...props, ...(dependencies.creationService ? { service: dependencies.creationService } : {}) }),
    bindProgressionProps: (props: CharacterProgressionProps): CharacterProgressionProps => props,
  };

  const actionsPending = dependencies.actionDispatcher ? [] : ["ActionDispatcher (dispatcher de comandos CORE-002 pendente)"];
  const actions = {
    component: Actions,
    pendingDependencies: actionsPending,
    bindProps: (props: ActionsProps): ActionsProps => ({ ...props, onIntent: props.onIntent ?? dependencies.actionDispatcher }),
  };

  const inventoryPending = dependencies.inventoryDispatcher ? [] : ["InventoryDispatcher (comandos de inventário pendentes)"];
  const inventory = {
    component: Inventory,
    pendingDependencies: inventoryPending,
    bindProps: (props: InventoryProps): InventoryProps => ({ ...props, onIntent: props.onIntent ?? dependencies.inventoryDispatcher }),
  };

  const journeyPending = [
    ...(dependencies.campaignDispatcher ? [] : ["CampaignDispatcher (comandos de campanha pendentes)"]),
    ...(dependencies.campaignRecordDispatcher ? [] : ["CampaignRecordDispatcher (missões/NPCs pendente)"]),
    ...(dependencies.journalDispatcher ? [] : ["JournalDispatcher (rascunho/diário pendente)"]),
    "Map/asset read model e callbacks de mapa devem ser fornecidos pela composição da Jornada",
  ];
  const journey = {
    components: { Campaign: JourneyCampaign, CampaignPanel, CampaignRecords, Journal: JournalWorkspace, JournalEditor, Map: MapViewer },
    service: services.campaign,
    pendingDependencies: journeyPending,
    bindCampaignProps: (props: JourneyCampaignProps): JourneyCampaignProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignDispatcher, onRecordIntent: props.onRecordIntent ?? dependencies.campaignRecordDispatcher }),
    bindCampaignPanelProps: (props: CampaignPanelProps): CampaignPanelProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignDispatcher }),
    bindCampaignRecordsProps: (props: CampaignRecordsProps): CampaignRecordsProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignRecordDispatcher }),
    bindJournalProps: (props: JournalEditorProps & JournalEntryListProps): JournalEditorProps & JournalEntryListProps => ({ ...props, onIntent: props.onIntent ?? dependencies.journalDispatcher }),
    bindMapProps: (props: MapViewerProps): MapViewerProps => props,
  };

  const compendium = {
    component: Compendium,
    service: dependencies.compendiumService,
    pendingDependencies: [],
    bindProps: (props: CompendiumRegistryProps): CompendiumProps => {
      const filters: CompendiumFilters = props.filters ?? { query: "" };
      return { ...props, entries: props.entries ?? dependencies.compendiumService.search(filters).entries, categories: props.categories ?? dependencies.compendiumService.getCategories() };
    },
  };

  const dicePending = dependencies.diceOverlayController ? [] : ["DiceOverlayController (overlay global pendente)"];
  const dice = {
    components: { Overlay: DiceOverlay, History: DiceHistory },
    controller: dependencies.diceOverlayController,
    history: services.dice,
    pendingDependencies: dicePending,
    bindOverlayProps: (props: Omit<DiceOverlayProps, "controller">): DiceOverlayProps | undefined => dependencies.diceOverlayController ? { ...props, controller: dependencies.diceOverlayController } : undefined,
    bindHistoryProps: (props: DiceHistoryProps): DiceHistoryProps => props,
  };

  return Object.freeze({ destinations: FEATURE_DESTINATIONS, character, actions, inventory, journey, compendium, dice });
}
