import type { ApplicationServices } from "@application/state";
import type { CharacterApplicationService } from "@application/character";
import type { CompendiumService } from "@application/compendium";
import type { CreationWizardService } from "@features/character/creation";
import type { CharacterCreationWizardProps as CreationProps } from "@features/character/creation";
import type { CharacterProgressionProps } from "@features/character/progression";
import type { CharacterSelectionProps } from "@features/character/selection";
import type { CharacterSheetProps, SheetPortrait } from "@features/character/sheet";
import type { ActionCommitResult, ActionsProps } from "@features/actions";
import type { InventoryIntent, InventoryProps } from "@features/inventory";
import type { CampaignIntent, CampaignPanelProps, CampaignRecordIntent, CampaignRecordsProps, JourneyCampaignProps } from "@features/journey/campaign";
import type { JournalEditorProps, JournalEntryListProps, JournalIntent } from "@features/journey/journal";
import type { MapViewerProps } from "@features/journey/map";
import type { CompendiumProps } from "@features/compendium";
import type { DiceHistoryProps, DiceOverlayController, DiceOverlayProps, DiceHistoryService } from "@features/dice";
import type { CompendiumFilters } from "@application/compendium";
import type { Character, CharacterDraft, CharacterSummary } from "@domain/contracts/character";
import type { CharacterDerived } from "@domain/contracts/derived";
import type { JournalEntry } from "@domain/contracts/campaign";
import type { JournalDraftState } from "@domain/campaign/journal";
import type { EntityType, Uuid } from "@domain/contracts/ids";
import type { Result, AppError } from "@domain/contracts/errors";
import type { DataManagementService } from "@application/transfer";
import type { BackupEnvelope, ImportPreview } from "@domain/contracts/backup";
import type { AuthPort } from "@application/ports/auth-port";
import type { AccountAvailability, AccountPanelProps } from "@features/account";
import type { MembershipService } from "@application/membership";
import type { SessionService } from "@application/session";

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
  /** Valores derivados (RULE-001) calculados pelo bootstrap; a ficha nunca recomputa regras. */
  readonly deriveCharacter?: (character: Character) => CharacterDerived | undefined;
  /** Nome de exibição de uma definição do pack ativo (classe, raça, antecedente…). */
  readonly resolveDefinitionName?: (entityType: EntityType, entityId: string) => string | undefined;
  /** Retratos: cópia local em IndexedDB e bytes no Cloud Storage quando há sessão. */
  readonly portraits?: SheetPortrait;
  /** Read models are supplied by bootstrap; the registry does not own persistence. */
  readonly listCharacters?: () => Promise<Result<readonly CharacterSummary[], AppError>>;
  readonly listCharacterDrafts?: () => Promise<Result<readonly CharacterDraft[], AppError>>;
  readonly listJournalEntries?: (campaignId: Uuid) => Promise<Result<readonly JournalEntry[], AppError>>;
  readonly journalDraftState?: () => JournalDraftState | undefined;
  readonly dataManagement?: {
    readonly service: DataManagementService;
    readonly previewImport: (envelope: BackupEnvelope) => Promise<Result<ImportPreview, AppError>>;
  };
  /** Optional remote identity; absence keeps the full local-first path available. */
  readonly auth?: AuthPort;
  readonly authAvailability?: AccountAvailability;
  readonly membership?: MembershipService;
  readonly session?: SessionService;
  readonly publishLocalCharacters?: () => Promise<Result<number, AppError>>;
}

export interface FeatureRegistry {
  readonly destinations: typeof FEATURE_DESTINATIONS;
  readonly character: {
    readonly service: CharacterApplicationService;
    readonly pendingDependencies: readonly string[];
    readonly bindSelectionProps: (props: CharacterSelectionProps) => CharacterSelectionProps;
    readonly bindSheetProps: (props: Omit<CharacterSheetProps, "service">) => CharacterSheetProps;
    readonly bindCreationProps: (props: Omit<CreationProps, "service">) => CreationProps;
    readonly bindProgressionProps: (props: CharacterProgressionProps) => CharacterProgressionProps;
    readonly list?: () => Promise<Result<readonly CharacterSummary[], AppError>>;
    readonly listDrafts?: () => Promise<Result<readonly CharacterDraft[], AppError>>;
  };
  readonly actions: {
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: ActionsProps) => ActionsProps;
  };
  readonly inventory: {
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: InventoryProps) => InventoryProps;
  };
  readonly journey: {
    readonly service: ApplicationServices["campaign"];
    readonly pendingDependencies: readonly string[];
    readonly bindCampaignProps: (props: JourneyCampaignProps) => JourneyCampaignProps;
    readonly bindCampaignPanelProps: (props: CampaignPanelProps) => CampaignPanelProps;
    readonly bindCampaignRecordsProps: (props: CampaignRecordsProps) => CampaignRecordsProps;
    readonly bindJournalProps: (props: JournalEditorProps & JournalEntryListProps) => JournalEditorProps & JournalEntryListProps;
    readonly bindMapProps: (props: MapViewerProps) => MapViewerProps;
    readonly listJournalEntries?: (campaignId: Uuid) => Promise<Result<readonly JournalEntry[], AppError>>;
    readonly getJournalDraftState?: () => JournalDraftState | undefined;
  };
  readonly compendium: {
    readonly service: CompendiumService;
    readonly pendingDependencies: readonly string[];
    readonly bindProps: (props: CompendiumRegistryProps) => CompendiumProps;
  };
  readonly dice: {
    readonly controller?: DiceOverlayController;
    readonly history: DiceHistoryService;
    readonly pendingDependencies: readonly string[];
    readonly bindOverlayProps: (props: Omit<DiceOverlayProps, "controller">) => DiceOverlayProps | undefined;
    readonly bindHistoryProps: (props: DiceHistoryProps) => DiceHistoryProps;
  };
  readonly dataManagement?: {
    readonly service: DataManagementService;
    readonly previewImport: (envelope: BackupEnvelope) => Promise<Result<ImportPreview, AppError>>;
  };
  readonly account: {
    readonly auth?: AuthPort;
    readonly availability: AccountAvailability;
    readonly bindProps: (props?: Omit<AccountPanelProps, "auth" | "availability">) => AccountPanelProps;
  };
  readonly membership?: MembershipService;
  readonly session?: SessionService;
}

export type CompendiumRegistryProps = Omit<CompendiumProps, "entries" | "categories" | "totalEntries"> & Partial<Pick<CompendiumProps, "entries" | "categories" | "totalEntries">>;

/**
 * Composes public feature exports with already-created application services.
 * It only binds callbacks and read models; it does not hydrate, persist, or invent state.
 */
export function createFeatureRegistry(dependencies: FeatureRegistryDependencies): FeatureRegistry {
  const { services } = dependencies;
  const character = {
    service: services.character,
    pendingDependencies: dependencies.creationService ? [] : ["CreationWizardService.saveCharacter (adaptador de criação pendente)"],
    bindSelectionProps: (props: CharacterSelectionProps): CharacterSelectionProps => ({
      ...props,
      resolveClassName: props.resolveClassName ?? (dependencies.resolveDefinitionName ? (classId) => dependencies.resolveDefinitionName?.("class", classId) : undefined),
      onSelect: (id) => { void services.character.select(id); props.onSelect?.(id); },
      onRetry: props.onRetry ?? (() => { void services.character.retry(); }),
    }),
    bindSheetProps: (props: Omit<CharacterSheetProps, "service">): CharacterSheetProps => ({
      ...props,
      service: services.character,
      derived: props.derived ?? (props.character && dependencies.deriveCharacter ? dependencies.deriveCharacter(props.character) : undefined),
      resolveName: props.resolveName ?? dependencies.resolveDefinitionName,
      portrait: props.portrait ?? dependencies.portraits,
    }),
    bindCreationProps: (props: Omit<CreationProps, "service">): CreationProps => ({ ...props, ...(dependencies.creationService ? { service: dependencies.creationService } : {}) }),
    bindProgressionProps: (props: CharacterProgressionProps): CharacterProgressionProps => props,
    list: dependencies.listCharacters,
    listDrafts: dependencies.listCharacterDrafts,
  };

  const actionsPending = dependencies.actionDispatcher ? [] : ["ActionDispatcher (dispatcher de comandos CORE-002 pendente)"];
  const actions = {
    pendingDependencies: actionsPending,
    bindProps: (props: ActionsProps): ActionsProps => ({ ...props, onIntent: props.onIntent ?? dependencies.actionDispatcher }),
  };

  const inventoryPending = dependencies.inventoryDispatcher ? [] : ["InventoryDispatcher (comandos de inventário pendentes)"];
  const inventory = {
    pendingDependencies: inventoryPending,
    bindProps: (props: InventoryProps): InventoryProps => ({ ...props, onIntent: props.onIntent ?? dependencies.inventoryDispatcher }),
  };

  const journeyPending = [
    ...(dependencies.campaignDispatcher ? [] : ["CampaignDispatcher (comandos de campanha pendentes)"]),
    ...(dependencies.campaignRecordDispatcher ? [] : ["CampaignRecordDispatcher (missões/NPCs pendente)"]),
    ...(dependencies.journalDispatcher ? [] : ["JournalDispatcher (rascunho/diário pendente)"]),
  ];
  const journey = {
    service: services.campaign,
    pendingDependencies: journeyPending,
    bindCampaignProps: (props: JourneyCampaignProps): JourneyCampaignProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignDispatcher, onRecordIntent: props.onRecordIntent ?? dependencies.campaignRecordDispatcher }),
    bindCampaignPanelProps: (props: CampaignPanelProps): CampaignPanelProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignDispatcher }),
    bindCampaignRecordsProps: (props: CampaignRecordsProps): CampaignRecordsProps => ({ ...props, onIntent: props.onIntent ?? dependencies.campaignRecordDispatcher }),
    bindJournalProps: (props: JournalEditorProps & JournalEntryListProps): JournalEditorProps & JournalEntryListProps => ({ ...props, onIntent: props.onIntent ?? dependencies.journalDispatcher }),
    bindMapProps: (props: MapViewerProps): MapViewerProps => props,
    listJournalEntries: dependencies.listJournalEntries,
    getJournalDraftState: dependencies.journalDraftState,
  };

  const compendium = {
    service: dependencies.compendiumService,
    pendingDependencies: [],
    bindProps: (props: CompendiumRegistryProps): CompendiumProps => {
      const filters: CompendiumFilters = props.filters ?? { query: "" };
      return { ...props, entries: props.entries ?? dependencies.compendiumService.search(filters).entries, categories: props.categories ?? dependencies.compendiumService.getCategories(), totalEntries: props.totalEntries ?? dependencies.compendiumService.getIndex().length };
    },
  };

  const dicePending = dependencies.diceOverlayController ? [] : ["DiceOverlayController (overlay global pendente)"];
  const dice = {
    controller: dependencies.diceOverlayController,
    history: services.dice,
    pendingDependencies: dicePending,
    bindOverlayProps: (props: Omit<DiceOverlayProps, "controller">): DiceOverlayProps | undefined => dependencies.diceOverlayController ? { ...props, controller: dependencies.diceOverlayController } : undefined,
    bindHistoryProps: (props: DiceHistoryProps): DiceHistoryProps => props,
  };

  const account = {
    auth: dependencies.auth,
    availability: dependencies.authAvailability ?? { available: Boolean(dependencies.auth) },
    bindProps: (props: Omit<AccountPanelProps, "auth" | "availability" | "membership"> = {}): AccountPanelProps => ({
      ...props,
      ...(dependencies.auth ? { auth: dependencies.auth } : {}),
      ...(dependencies.membership ? { membership: dependencies.membership } : {}),
      ...(dependencies.publishLocalCharacters ? { onPublishLocalCharacters: dependencies.publishLocalCharacters } : {}),
      availability: dependencies.authAvailability ?? { available: Boolean(dependencies.auth) },
    }),
  };

  return Object.freeze({ destinations: FEATURE_DESTINATIONS, character, actions, inventory, journey, compendium, dice, account, ...(dependencies.membership ? { membership: dependencies.membership } : {}), ...(dependencies.session ? { session: dependencies.session } : {}), ...(dependencies.dataManagement ? { dataManagement: dependencies.dataManagement } : {}) });
}
