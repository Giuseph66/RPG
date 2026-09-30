import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { AppShell, type AppShellProps } from "@components/layout/AppShell";
import { InlineStatus } from "@components/ui";
import type { Character, CharacterDraft, ManualAdjustment } from "@domain/contracts/character";
import { appError, err, ok } from "@domain/contracts/errors";
import type { CharacterSummary } from "@domain/contracts/character";
import type { DraftSummary } from "@features/character/selection";
import type { Campaign, JournalEntry, MapRecord } from "@domain/contracts/campaign";
import type { CreatureGuess, CreatureRecord, CreatureSighting } from "@domain/campaign/creatures";
import type { JourneyPlayer } from "@features/journey/creatures";
import type { JournalDraft, JournalDraftState } from "@domain/campaign/journal";
import { createJournalDraft, draftFromJournalEntry } from "@domain/campaign/journal";
import { asAccountId, asIsoTimestamp, asUuid, isUuid, type EntityId, type Uuid } from "@domain/contracts/ids";
import { parseBackupJson, serializeBackup } from "@application/transfer";
import type { RecoveryRecordView } from "@application/transfer/types";
import type { DataManagementIntent } from "@features/data-management";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { Revision } from "@domain/contracts/versioning";
import type { StoreStatus } from "@application/state";
import type { ActionCapability, ActionsDice, ActionsRollRequest } from "@features/actions";
import type { SettingsCharacterOption, SettingsDraftOption } from "@features/settings";
import { DRAFT_STEP_LABELS } from "@features/character/selection/types";
import type { AccountSyncState } from "@features/account";
import type { AccountCampaign } from "@features/account/types";
import type { CampaignAdjustmentTarget, CollaborationCharacter } from "@features/collaboration/types";
import type { CampaignLogEntry } from "@domain/contracts/campaign-log";
import type { CompendiumCategoryId, CompendiumDetail, CompendiumFilters } from "@application/compendium";
import type { FeatureRegistry } from "./feature-registry";
import { matchRoute, type RouteMatch } from "./routes";
import { createRuleLookup } from "./rule-lookup";
import { generateNpcCharacter } from "@application/character/generate-npc-character";
import { equipmentBundles } from "@data/equipment/bundles";
import { RACE_CHOICE_ALLOWED_OPTIONS } from "@data/races/races";
import { attackRollsFor, carryingFor, conditionOptionsFor, equipmentCatalog, equipmentInfo, spellOptionsFor, spellRollsFor, unequippedWeaponsFor } from "./character-route-data";

const LazyCampaignLog = lazy(() => import("@features/campaign-log").then((module) => ({ default: module.CampaignLog })));
const LazyCharacterSelection = lazy(() => import("@features/character/selection").then((module) => ({ default: module.CharacterSelection })));
const LazyCharacterSheet = lazy(() => import("@features/character/sheet").then((module) => ({ default: module.CharacterSheet })));
const LazyCharacterCreation = lazy(() => import("@features/character/creation").then((module) => ({ default: module.CharacterCreationWizard })));
const LazyActions = lazy(() => import("@features/actions").then((module) => ({ default: module.Actions })));
const LazyInventory = lazy(() => import("@features/inventory").then((module) => ({ default: module.Inventory })));
const LazyJourneyCampaign = lazy(() => import("@features/journey/campaign").then((module) => ({ default: module.JourneyCampaign })));
const LazyMapWorkspace = lazy(() => import("@features/journey/map").then((module) => ({ default: module.MapWorkspace })));
const LazyCreatureBoard = lazy(() => import("@features/journey/creatures").then((module) => ({ default: module.CreatureBoard })));
const LazyPlayerCreatureBoard = lazy(() => import("@features/journey/creatures").then((module) => ({ default: module.PlayerCreatureBoard })));
const LazyJournalWorkspace = lazy(() => import("@features/journey/journal").then((module) => ({ default: module.JournalWorkspace })));
const LazyCompendium = lazy(() => import("@features/compendium").then((module) => ({ default: module.Compendium })));
const LazyRuleLookupProvider = lazy(() => import("@features/compendium").then((module) => ({ default: module.RuleLookupProvider })));
const LazyDataManagementPanel = lazy(() => import("@features/data-management").then((module) => ({ default: module.DataManagementPanel })));
const LazySettingsPanel = lazy(() => import("@features/settings").then((module) => ({ default: module.SettingsPanel })));
const LazyAccountPanel = lazy(() => import("@features/account").then((module) => ({ default: module.AccountPanel })));
const LazyCollaborationPanel = lazy(() => import("@features/collaboration").then((module) => ({ default: module.CollaborationPanel })));
const LazySessionPanel = lazy(() => import("@features/session").then((module) => ({ default: module.SessionPanel })));

function RouteLoadingFallback() {
  return <section aria-live="polite" aria-busy="true"><h1>Carregando destino</h1><InlineStatus tone="info">Preparando a tela local…</InlineStatus></section>;
}

/** Mesma constante de apresentação usada em `bootstrap.tsx` para derivar as capacidades; aqui só
 * informa à UI quais tipos de ação existem, sem decidir se o jogador pode agir agora. */
const AVAILABLE_ACTION_KINDS = ["action", "bonus-action", "reaction", "free"] as const;
const EMPTY_DICE_STATE = Object.freeze({
  open: false,
  purpose: "free" as const,
  formula: "1d20",
  mode: "normal" as const,
  history: [] as const,
  status: "idle" as const,
  announcement: "",
  awaitingPhysics: false,
  quick: false,
});
const EMPTY_DICE_SUBSCRIBE = (_listener: () => void): (() => void) => () => undefined;
const EMPTY_DICE_GET_SNAPSHOT = () => EMPTY_DICE_STATE;

export interface AppRouterProps extends Omit<AppShellProps, "children" | "route"> {
  /** Route outlet owned by CORE-002 and the feature owners. */
  readonly renderRoute?: (match: RouteMatch) => ReactNode;
  /** Useful for isolated tests and embedded previews; browser navigation remains the default. */
  readonly initialPath?: string;
  /** Runtime composition created by bootstrap; omitted only for isolated shell tests. */
  readonly registry?: FeatureRegistry;
  readonly campaign?: { readonly value?: Campaign | null; readonly status?: StoreStatus; readonly errorMessage?: string };
  /** Capacidades reais da página Ações, derivadas do personagem ativo (achado #1 de QA-004). */
  readonly actionCapabilities?: readonly ActionCapability[];
  /** Pack ativo e fábrica de draft — presentes só quando o wizard de criação está conectado. */
  readonly pack?: RulePack;
  readonly createDraft?: () => CharacterDraft;
  readonly onCharacterCreated?: (character: Character, revision: Revision) => void;
  readonly syncMessage?: string;
  readonly syncHydration?: object;
  readonly onRefreshSync?: () => Promise<void>;
}

export interface AppNavigation {
  readonly path: string;
  readonly match: RouteMatch;
  readonly navigate: (to: string) => void;
  readonly replace: (to: string) => void;
}

function PendingDestination({ title, reasons }: { readonly title: string; readonly reasons: readonly string[] }) {
  return <section aria-labelledby="destination-pending-title"><p>{title}</p><h1 id="destination-pending-title">Integração pendente</h1><InlineStatus tone="warning">{reasons.join(" ")}</InlineStatus></section>;
}

/** Dono do estado local do rascunho — a criação nunca duplica isso no store de personagem
 * (dados/estado-personagem.md: "voltar ao wizard não reutiliza criação para gerar duplicata"). */
function CreateCharacterRoute({
  registry,
  pack,
  createDraft,
  onCharacterCreated,
  navigate,
  replace,
  draftId,
}: {
  readonly registry: FeatureRegistry;
  readonly pack: RulePack;
  readonly createDraft: () => CharacterDraft;
  readonly onCharacterCreated?: (character: Character, revision: Revision) => void;
  readonly navigate: (to: string) => void;
  readonly replace: (to: string) => void;
  readonly draftId?: string;
}) {
  const [draft, setDraft] = useState<CharacterDraft | undefined>(() => draftId ? undefined : createDraft());
  const [loadError, setLoadError] = useState<string>();
  useEffect(() => {
    if (!draftId) return;
    if (!isUuid(draftId)) {
      setLoadError("O identificador do rascunho é inválido.");
      return;
    }
    const normalizedDraftId = asUuid(draftId);
    if (draft?.id === normalizedDraftId) return;
    let active = true;
    void registry.character.service.loadDraft(normalizedDraftId).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadError(result.error.message);
        return;
      }
      setDraft(result.value);
    });
    return () => { active = false; };
  }, [draft, draftId, registry.character.service]);

  if (!draft) {
    return loadError
      ? <section aria-live="assertive"><h1>Não foi possível abrir o rascunho</h1><InlineStatus tone="error">{loadError}</InlineStatus></section>
      : <section aria-live="polite" aria-busy="true"><h1>Abrindo rascunho</h1><InlineStatus tone="info">Recuperando a ficha salva neste dispositivo.</InlineStatus></section>;
  }
  const Creation = LazyCharacterCreation;
  return (
    <Creation
      {...registry.character.bindCreationProps({
        draft,
        catalog: pack,
        onDraftChange: setDraft,
        onCreated: onCharacterCreated,
        onDraftSaved: (savedDraft) => {
          if (!draftId) replace(`/character/create/${savedDraft.id}`);
        },
        onCancel: () => navigate("/character"),
      })}
    />
  );
}

/**
 * Aba Ficha: abre a escolha da conta atual; no modo local, usa a ficha ativa ou a mais recente.
 */
function CharacterHomeRoute({ registry, character, navigate, replace, signedIn, accountCharacterId }: { readonly registry: FeatureRegistry; readonly character: AppRouterProps["character"]; readonly navigate: (to: string) => void; readonly replace: (to: string) => void; readonly signedIn: boolean; readonly accountCharacterId?: Character["id"] }) {
  const activeId = signedIn ? accountCharacterId : character?.value?.id;
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    if (activeId) { replace(`/character/${activeId}`); return undefined; }
    if (signedIn) { setEmpty(true); return undefined; }
    const list = registry.character.list;
    if (!list) { setEmpty(true); return undefined; }
    let active = true;
    void list().then((result) => {
      if (!active) return;
      const newest = result.ok ? [...result.value].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] : undefined;
      if (newest) replace(`/character/${newest.id}`);
      else setEmpty(true);
    });
    return () => { active = false; };
  }, [activeId, registry.character.list, replace, signedIn]);
  if (empty) return <CharacterSelectionRoute registry={registry} navigate={navigate} />;
  return <section aria-live="polite"><h1>Carregando personagem</h1><InlineStatus tone="info">Abrindo a ficha ativa.</InlineStatus></section>;
}

function CharacterSelectionRoute({ registry, navigate }: { readonly registry: FeatureRegistry; readonly navigate: (to: string) => void }) {
  const [characters, setCharacters] = useState<readonly CharacterSummary[]>([]);
  const [drafts, setDrafts] = useState<readonly DraftSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("idle");
  const [error, setError] = useState<unknown>();
  const sessionUid = registry.account.auth?.currentSession()?.uid;

  useEffect(() => {
    let active = true;
    const list = registry.character.list;
    if (!list) {
      setStatus("error");
      setError(new Error("A listagem local de personagens não foi composta."));
      return () => { active = false; };
    }
    setStatus("loading");
    void list().then(async (result) => {
      if (!active) return;
      if (!result.ok) { setError(result.error); setStatus("error"); return; }
      const draftResult = registry.character.listDrafts ? await registry.character.listDrafts() : { ok: true as const, value: [] };
      if (!active) return;
      if (!draftResult.ok) { setError(draftResult.error); setStatus("error"); return; }
      setCharacters(result.value.filter((summary) => !sessionUid || !summary.ownerUid || summary.ownerUid === sessionUid));
      setDrafts(draftResult.value.map((draft) => ({ id: draft.id, name: draft.partial.name, currentStep: draft.currentStep, updatedAt: draft.updatedAt })));
      setStatus("idle");
    });
    return () => { active = false; };
  }, [registry.character.list, sessionUid]);

  const Selection = LazyCharacterSelection;
  return <Selection {...registry.character.bindSelectionProps({ characters, drafts, status, error, onSelect: (id) => navigate(`/character/${id}`), onCreate: () => navigate("/character/create"), onResumeDraft: (id) => navigate(`/character/create/${id}`) })} />;
}

function CharacterDetailRoute({ registry, character, pack, id }: { readonly registry: FeatureRegistry; readonly character: AppRouterProps["character"]; readonly pack?: RulePack; readonly id: string }) {
  const validId = isUuid(id) ? asUuid(id) : undefined;
  const ruleLookup = useMemo(() => createRuleLookup(registry.compendium.service), [registry.compendium.service]);
  useEffect(() => {
    if (validId && character?.value?.id !== validId) void registry.character.service.select(validId);
  }, [character?.value?.id, registry.character.service, validId]);
  const Sheet = LazyCharacterSheet;
  if (!validId) return <PendingDestination title="Personagem" reasons={["O identificador da ficha é inválido."]} />;
  if (character?.status === "error") return <section aria-live="assertive"><h1>Não foi possível carregar o personagem</h1><InlineStatus tone="error">{character.errorMessage ?? "A ficha não está disponível neste dispositivo."}</InlineStatus></section>;
  if (character?.status === "hydrating" || character?.value?.id !== validId) return <section aria-live="polite"><h1>Carregando personagem</h1><InlineStatus tone="info">Buscando a ficha salva neste dispositivo.</InlineStatus></section>;
  const currentCharacter = character.value;
  const Inventory = LazyInventory;
  const inventory = currentCharacter.inventory.map((item) => {
    const definition = pack?.equipment.get(item.equipmentRef.entityId);
    return {
      item,
      name: definition?.name ?? item.customName ?? String(item.equipmentRef.entityId),
      category: definition?.category,
      unitWeightGrams: definition?.weightGrams,
      unitValueCp: definition?.valueCp,
      properties: definition?.properties,
      consumable: definition?.consumable,
    };
  });
  const sheetProps = registry.character.bindSheetProps({
    character: currentCharacter,
    status: character.status,
    error: character.errorMessage,
    equipmentInfo: (entityId) => equipmentInfo(pack, entityId),
    spellOptions: spellOptionsFor(currentCharacter, pack),
    conditionOptions: conditionOptionsFor(pack),
  });
  const RuleProvider = LazyRuleLookupProvider;
  return <RuleProvider lookup={ruleLookup}><div><Sheet {...sheetProps} />{registry.inventory.pendingDependencies.length ? <InlineStatus tone="warning">{registry.inventory.pendingDependencies.join(" ")}</InlineStatus> : null}<Inventory {...registry.inventory.bindProps({ items: inventory, currency: currentCharacter.currency, catalog: equipmentCatalog(pack), carrying: carryingFor(currentCharacter, sheetProps.derived, pack) })} /></div></RuleProvider>;
}

function JournalRoute({ registry, campaign, viewerId, role = "master", authors, authorFilter, refreshKey, onSaved }: { readonly registry: FeatureRegistry; readonly campaign: AppRouterProps["campaign"]; readonly viewerId?: string; readonly role?: "master" | "player"; readonly authors?: readonly { readonly id: string; readonly name: string }[]; readonly authorFilter?: string; readonly refreshKey?: object; readonly onSaved?: () => void }) {
  const campaignId = campaign?.value?.id;
  const listVisible = useCallback(async (id: Uuid) => {
    const result = await registry.journey.listJournalEntries!(id);
    return result.ok && role === "player" ? ok(result.value.filter((entry) => entry.authorId === viewerId)) : result;
  }, [registry.journey.listJournalEntries, role, viewerId]);
  const [entries, setEntries] = useState<readonly import("@domain/contracts/campaign").JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string>();
  const [draft, setDraft] = useState<JournalDraft>(() => createJournalDraft(campaignId ?? asUuid("00000000-0000-4000-8000-000000000000")));
  const [status, setStatus] = useState<JournalDraftState["status"]>("clean");
  const [error, setError] = useState<string>();
  const getState = registry.journey.getJournalDraftState;
  const dispatchJournal = useCallback((intent: import("@features/journey/journal").JournalIntent, nextDraft: JournalDraft, nextEntries: readonly import("@domain/contracts/campaign").JournalEntry[], nextSelected?: string) => {
    registry.journey.bindJournalProps({ draft: nextDraft, entries: nextEntries, selectedEntryId: nextSelected }).onIntent?.(intent);
  }, [registry.journey]);

  useEffect(() => {
    if (!campaignId || !registry.journey.listJournalEntries) {
      setEntries([]);
      setSelectedEntryId(undefined);
      return;
    }
    let active = true;
    setStatus("saving");
    void listVisible(campaignId).then((result) => {
      if (!active) return;
      if (!result.ok) { setError(result.error.message); setStatus("error"); return; }
      setEntries(result.value);
      const first = result.value.find((entry) => !viewerId || (entry.authorId ?? viewerId) === viewerId);
      if (first) {
        const firstDraft = draftFromJournalEntry(first);
        const firstId = String(first.id);
        setSelectedEntryId(firstId);
        setDraft(firstDraft);
        dispatchJournal({ kind: "update-draft", patch: firstDraft }, firstDraft, result.value, firstId);
      }
      else { setSelectedEntryId(undefined); setDraft(createJournalDraft(campaignId)); }
      setError(undefined);
      setStatus("clean");
    });
    return () => { active = false; };
  }, [campaignId, dispatchJournal, listVisible, refreshKey, registry.journey.listJournalEntries, viewerId]);

  const refreshFromDispatcher = useCallback(() => {
    const next = getState?.();
    if (next) { setDraft(next.draft); setStatus(next.status); setError(next.error); }
    return next;
  }, [getState]);

  const onIntent = useCallback((intent: import("@features/journey/journal").JournalIntent) => {
    const dispatch = registry.journey.bindJournalProps({ draft, entries, selectedEntryId }).onIntent;
    if (!dispatch) { setError("O diário não foi composto com um dispatcher local."); setStatus("error"); return; }
    if (intent.kind === "update-draft") { setDraft((current) => ({ ...current, ...intent.patch })); setStatus("dirty"); setError(undefined); }
    if (intent.kind === "save-draft") setStatus("saving");
    dispatch(intent);
    if (intent.kind === "save-draft" || intent.kind === "reload-draft") {
      let attempts = 0;
      const poll = () => {
        const next = refreshFromDispatcher();
        if (next?.status === "saving" && attempts < 30) { attempts += 1; window.setTimeout(poll, 25); return; }
        if (next?.status === "saved") {
          void (campaignId && registry.journey.listJournalEntries ? listVisible(campaignId).then((result) => { if (result.ok) setEntries(result.value); onSaved?.(); }) : undefined);
        }
      };
      window.setTimeout(poll, 0);
    }
  }, [campaignId, draft, entries, getState, listVisible, onSaved, refreshFromDispatcher, registry.journey, selectedEntryId]);

  const onSelect = useCallback((id: string) => {
    const entry = entries.find((candidate) => String(candidate.id) === id);
    if (!entry) return;
    const nextDraft = draftFromJournalEntry(entry);
    setSelectedEntryId(id);
    setDraft(nextDraft);
    dispatchJournal({ kind: "update-draft", patch: nextDraft }, nextDraft, entries, id);
    setStatus("clean");
    setError(undefined);
  }, [dispatchJournal, entries]);
  const onCreateEntry = useCallback(() => { if (campaignId) { dispatchJournal({ kind: "discard-draft" }, draft, entries, selectedEntryId); setSelectedEntryId(undefined); setDraft(createJournalDraft(campaignId)); setStatus("clean"); setError(undefined); } }, [campaignId, dispatchJournal, draft, entries, selectedEntryId]);
  const journal = registry.journey.bindJournalProps({ entries, selectedEntryId, onSelect, draft, status, error, onIntent, onCreateEntry, links: [] });
  const Journal = LazyJournalWorkspace;
  return <div><JourneyStatus campaign={campaign} error={error} /><Journal {...journal} {...(authors ? { authors } : {})} {...(authorFilter ? { authorFilter } : {})} /></div>;
}

function JourneyStatus({ campaign, error }: { readonly campaign: AppRouterProps["campaign"]; readonly error?: string }) {
  if (error) return <InlineStatus tone="error" assertive>{error}</InlineStatus>;
  if (!campaign?.value) return <InlineStatus tone="info">Crie ou selecione uma campanha para registrar o diário.</InlineStatus>;
  return null;
}

function downloadBackup(envelope: Parameters<typeof serializeBackup>[0]): void {
  const serialized = serializeBackup(envelope);
  if (!serialized.ok || typeof window === "undefined") return;
  const blob = new Blob([serialized.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rpg-backup-${envelope.kind}-${envelope.rootId}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DataManagementRoute({ registry, character, campaign }: { readonly registry: FeatureRegistry; readonly character: AppRouterProps["character"]; readonly campaign: AppRouterProps["campaign"] }) {
  const integration = registry.dataManagement;
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<import("@domain/contracts/backup").ImportPreview>();
  const [pendingEnvelope, setPendingEnvelope] = useState<import("@domain/contracts/backup").BackupEnvelope>();
  const [recovery, setRecovery] = useState<readonly RecoveryRecordView[]>([]);
  useEffect(() => {
    if (!integration) return;
    void integration.service.listRecovery().then((result) => { if (result.ok) setRecovery(result.value); });
  }, [integration]);
  if (!integration) return <PendingDestination title="Backup e recuperação" reasons={["Serviço de dados locais não foi composto."]} />;
  const onIntent = (intent: DataManagementIntent) => {
    setError(undefined);
    if (intent.kind === "import-json") {
      setStatus("loading");
      const parsed = parseBackupJson(intent.json);
      if (!parsed.ok) { setError(parsed.error.message); setStatus("error"); return; }
      setPendingEnvelope(parsed.value);
      void integration.previewImport(parsed.value).then((result) => { if (!result.ok) { setError(result.error.message); setStatus("error"); return; } setPreview(result.value); setStatus("idle"); });
      return;
    }
    if (intent.kind === "preview-import") {
      setStatus("loading");
      void integration.previewImport(intent.envelope).then((result) => { if (!result.ok) { setError(result.error.message); setStatus("error"); return; } setPreview(result.value); setPendingEnvelope(intent.envelope); setStatus("idle"); });
      return;
    }
    setStatus(intent.kind === "commit-import" || intent.kind === "reset" ? "saving" : "loading");
    const operation = intent.kind === "export-character" ? integration.service.exportCharacter(asUuid(intent.characterId)).then((result) => { if (result.ok) downloadBackup(result.value); return result; })
      : intent.kind === "export-campaign" ? integration.service.exportCampaign(asUuid(intent.campaignId)).then((result) => { if (result.ok) downloadBackup(result.value); return result; })
      : intent.kind === "commit-import" ? integration.service.import(intent.envelope, intent.mode)
      : intent.kind === "reset" ? integration.service.reset(intent.request)
      : intent.kind === "restore-recovery" ? integration.service.restoreRecovery(intent.id)
      : integration.service.discardRecovery(intent.id);
    void operation.then((result) => { if (!result.ok) { setError(result.error.message); setStatus("error"); return; } setPreview(undefined); setPendingEnvelope(undefined); setStatus("idle"); });
  };
  return <Suspense fallback={<section aria-live="polite"><h1>Backup e recuperação</h1><InlineStatus tone="info">Carregando ferramentas de dados locais…</InlineStatus></section>}><LazyDataManagementPanel characterId={character?.value?.id} campaignId={campaign?.value?.id} status={status} error={error} preview={preview} pendingEnvelope={pendingEnvelope} recovery={recovery} onIntent={onIntent} /></Suspense>;
}

function AccountRoute({ registry, navigate, syncState, syncMessage, campaign }: { readonly registry: FeatureRegistry; readonly navigate: (to: string) => void; readonly syncState?: AccountSyncState; readonly syncMessage?: string; readonly campaign?: AppRouterProps["campaign"] }) {
  const [accountUid, setAccountUid] = useState<string | null>(() => registry.account.auth?.currentSession()?.uid ?? null);
  const [campaigns, setCampaigns] = useState<readonly AccountCampaign[]>(campaign?.value ? [{ id: campaign.value.id, name: campaign.value.name }] : []);
  const membership = registry.membership;
  const auth = registry.account.auth;
  const localActor = membership?.localActor?.();
  const actorId = accountUid ? asAccountId(accountUid) : localActor?.accountId;
  useEffect(() => {
    if (!auth) return;
    try {
      return auth.observeSession((session) => setAccountUid(session?.uid ?? null));
    } catch {
      return undefined;
    }
  }, [auth]);
  useEffect(() => {
    let active = true;
    void registry.journey.service.list().then((result) => {
      if (!active || !result.ok) return;
      void (async () => {
        if (!membership || !actorId) {
          setCampaigns(result.value.map((item) => ({ id: item.id, name: item.name })));
          return;
        }
        const memberships = await Promise.all(result.value.map((item) => membership.listMemberships({ actorId, campaignId: item.id })));
        if (!active) return;
        const campaignsWithRoles = result.value.map((item, index) => {
          const result = memberships[index];
          const entries = result?.ok ? result.value : [];
          const own = entries.find((entry) => entry.accountId === actorId && entry.status === "active");
          const participantCount = entries.filter((entry) => entry.status === "active").length;
          return { id: item.id, name: item.name, ...(own ? { role: own.role } : {}), ...(result?.ok ? { participantCount } : {}) };
        });
        setCampaigns(campaignsWithRoles);
      })();
    });
    return () => { active = false; };
  }, [actorId, membership, registry.journey.service]);
  const Account = LazyAccountPanel;
  const accountCampaigns = campaigns.map((item) => ({ ...item }));
  return <Account {...registry.account.bindProps({
    onBackToLocal: () => navigate("/character"),
    onOpenCollaboration: () => navigate("/journey/participants"),
    onOpenSession: (campaignId) => navigate(`/session/${campaignId}`),
    onOpenSettings: () => navigate("/settings"),
  })} campaigns={accountCampaigns} {...(syncState ? { syncState } : {})} {...(syncMessage ? { syncMessage } : {})} />;
}

/** Assina o histórico da campanha no Firestore; some quando não há conta ou campanha. */
function CampaignLogRoute({ registry, campaignId, focusCharacterId }: { readonly registry: FeatureRegistry; readonly campaignId?: string; readonly focusCharacterId?: string }) {
  const port = registry.campaignLog;
  const signedIn = Boolean(registry.account.auth?.currentSession());
  const [state, setState] = useState<{ readonly key?: string; readonly entries: readonly CampaignLogEntry[]; readonly status: "loading" | "ready" | "error" }>({ entries: [], status: "loading" });
  useEffect(() => {
    if (!port || !campaignId || !signedIn) return undefined;
    setState({ key: campaignId, entries: [], status: "loading" });
    return port.watch(campaignId, (entries) => setState({ key: campaignId, entries, status: "ready" }), (cause) => {
      console.warn("[sync] Histórico da mesa indisponível", { campaignId, cause });
      setState({ key: campaignId, entries: [], status: "error" });
    });
  }, [port, campaignId, signedIn]);
  if (!port || !campaignId || !signedIn) return null;
  const current = state.key === campaignId ? state : { entries: [], status: "loading" as const };
  return <Suspense fallback={null}><LazyCampaignLog entries={current.entries} status={current.status} {...(focusCharacterId ? { focusCharacterId } : {})} /></Suspense>;
}

function CollaborationRoute({ registry, campaign, navigate, view, pack, syncState, syncMessage, syncHydration, onRefreshSync }: { readonly registry: FeatureRegistry; readonly campaign: AppRouterProps["campaign"]; readonly navigate: (to: string) => void; readonly view?: "characters" | "participants"; readonly pack?: RulePack; readonly syncState?: AccountSyncState; readonly syncMessage?: string; readonly syncHydration?: object; readonly onRefreshSync?: () => Promise<void> }) {
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>(campaign?.value ? [campaign.value] : []);
  const [characters, setCharacters] = useState<readonly CollaborationCharacter[]>([]);
  useEffect(() => {
    let active = true;
    void registry.journey.service.list().then((result) => { if (active && result.ok) setCampaigns(result.value); });
    return () => { active = false; };
  }, [registry.journey.service, syncHydration]);
  useEffect(() => {
    let active = true;
    const portraitUrls: string[] = [];
    if (!registry.character.list) { setCharacters([]); return () => { active = false; }; }
    void registry.character.list().then(async (result) => {
      if (!active) return;
      if (!result.ok) { setCharacters([]); return; }
      const summaries = await Promise.all(result.value.map(async (summary): Promise<CollaborationCharacter> => {
        const base = { id: summary.id, name: summary.name, campaignId: summary.campaignId, ownerUid: summary.ownerUid, revision: summary.revision };
        const loaded = await registry.character.service.get(summary.id);
        if (!loaded.ok) return base;
        const character = loaded.value;
        const sheet = registry.character.bindSheetProps({ character });
        const derived = sheet.derived;
        const resourceTotal = derived?.resourceCapacities.reduce((total, resource) => total + resource.capacity.value, 0) ?? 0;
        const resourceSpent = character.resources.reduce((total, resource) => total + resource.spent, 0);
        const displayDefinition = (type: "class" | "condition", id: string) => sheet.resolveName?.(type, id) ?? id.replace(/[-_]/g, " ");
        const supportedTargets: readonly CampaignAdjustmentTarget[] = ["armor-class", "initiative", "attack-roll", "ability-check"];
        const adjustments = character.manualAdjustments.flatMap((adjustment) => supportedTargets.includes(adjustment.target.kind as CampaignAdjustmentTarget) && adjustment.value.kind === "number" ? [{ id: adjustment.id, target: adjustment.target.kind as CampaignAdjustmentTarget, amount: adjustment.value.amount, reason: adjustment.reason }] : []);
        const portraitUrl = character.portraitAssetId && sheet.portrait ? await sheet.portrait.load(character.portraitAssetId, character.portraitSha256, { ...(character.campaignId ? { campaignId: String(character.campaignId) } : {}), ...(character.ownerUid ? { ownerUid: character.ownerUid } : {}) }).catch(() => undefined) : undefined;
        if (portraitUrl?.startsWith("blob:")) {
          if (active) portraitUrls.push(portraitUrl);
          else URL.revokeObjectURL(portraitUrl);
        }
        return {
          ...base,
          ...(character.playerName ? { playerName: character.playerName } : {}),
          className: summary.classSummary.map((entry) => displayDefinition("class", entry.classId)).join(" / "),
          classId: summary.classSummary[0]?.classId,
          ...(active && portraitUrl ? { portraitUrl } : {}),
          totalLevel: summary.totalLevel,
          hitPoints: { current: character.hp.current, temporary: character.hp.temp, ...(derived ? { maximum: derived.hitPointsMax.value } : {}) },
          ...(derived ? { armorClass: derived.armorClass.value, initiative: derived.initiative.value } : {}),
          conditions: character.conditions.map((condition) => displayDefinition("condition", condition.definitionRef.entityId)),
          conditionIds: character.conditions.map((condition) => String(condition.definitionRef.entityId)),
          adjustments,
          concentration: Boolean(character.concentration),
          inspiration: character.inspiration,
          deathSaves: { successes: character.deathSaves.successes, failures: character.deathSaves.failures },
          pendingResolutions: character.pendingResolutions.length,
          ...(resourceTotal > 0 ? { resources: { available: Math.max(0, resourceTotal - resourceSpent), total: resourceTotal } } : {}),
        };
      }));
      if (active) setCharacters(summaries);
    });
    return () => { active = false; portraitUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [registry.character.bindSheetProps, registry.character.list, registry.character.service, syncHydration]);
  const Component = LazyCollaborationPanel;
  const session = registry.account.auth?.currentSession() ?? null;
  return <Component
    membership={registry.membership}
    session={session}
    syncState={syncState}
    syncMessage={syncMessage}
    syncHydration={syncHydration}
    onRefreshSync={onRefreshSync}
    {...(view === "characters" && campaign?.value ? { historyPanel: <CampaignLogRoute registry={registry} campaignId={String(campaign.value.id)} /> } : {})}
    campaigns={campaigns.map((item) => ({ id: item.id, name: item.name }))}
    characters={characters}
    activeCampaignId={campaign?.value?.id}
    activeCharacterId={registry.character.service.store.selectedId}
    view={view}
    onOpenSession={(id) => navigate(`/session/${id}`)}
    onOpenJourney={() => navigate("/journey")}
    onOpenParticipants={() => navigate("/journey/participants")}
    onOpenAccount={() => navigate("/account")}
    onCreateCharacter={() => navigate("/character/create")}
    onOpenCharacter={(characterId) => navigate(`/character/${characterId}`)}
    onDeleteCharacter={async (target) => {
      // Ficha de outro jogador vive na conta dele; o Firebase só aceita a exclusão pelo dono.
      if (target.ownerUid && session && target.ownerUid !== session.uid) return err(appError.validation("owner", "Esta ficha pertence a outro jogador; só ele pode excluí-la."));
      const loaded = await registry.character.service.get(target.id);
      if (!loaded.ok) return loaded;
      const deleted = await registry.character.service.deleteCharacter(target.id, loaded.value.revision);
      // Tira só a ficha excluída da lista em memória; reler tudo faria os cartões e retratos piscarem.
      if (deleted.ok) setCharacters((current) => current.filter((item) => item.id !== target.id));
      return deleted;
    }}
    onLinkCharacter={(characterId, campaignId, expectedRevision) => registry.character.service.linkToCampaign(characterId, campaignId, expectedRevision)}
    onUnlinkCharacter={(characterId, campaignId, expectedRevision) => registry.character.service.unlinkFromCampaign(characterId, campaignId, expectedRevision)}
    conditionOptions={conditionOptionsFor(pack)}
    onUpdateCharacter={async (characterId, expectedRevision, values) => {
      const loaded = await registry.character.service.get(characterId);
      if (!loaded.ok) return loaded;
      const current = loaded.value;
      if (current.revision !== expectedRevision) return err(appError.conflict(expectedRevision, current.revision));
      const maximumHp = registry.character.bindSheetProps({ character: current }).derived?.hitPointsMax.value;
      if (!Number.isInteger(values.hp) || values.hp < 0 || (maximumHp !== undefined && values.hp > maximumHp)) return err(appError.validation("hp", `Informe PV entre 0 e ${maximumHp ?? "o máximo da ficha"}.`));
      if (!Number.isInteger(values.tempHp) || values.tempHp < 0) return err(appError.validation("tempHp", "PV temporários devem ser um número inteiro positivo."));
      if (values.adjustments.some((adjustment) => !["armor-class", "initiative", "attack-roll", "ability-check"].includes(adjustment.target) || !Number.isInteger(adjustment.amount) || adjustment.amount === 0 || Math.abs(adjustment.amount) > 20 || !adjustment.reason.trim())) return err(appError.validation("adjustments", "Confira o destino, o valor e o motivo de cada ajuste."));
      const existing = current.conditions.filter((condition) => values.conditionIds.includes(String(condition.definitionRef.entityId)));
      const conditionOptions = conditionOptionsFor(pack);
      const added = values.conditionIds.filter((id) => !existing.some((condition) => String(condition.definitionRef.entityId) === id)).flatMap((id) => {
        const option = conditionOptions.find((entry) => String(entry.ref.entityId) === id);
        return option ? [{ id: asUuid(crypto.randomUUID()), definitionRef: option.ref, origin: { kind: "table-decision" as const, description: "Aplicada pelo mestre" } }] : [];
      });
      const managedIds = new Set(values.adjustments.map((adjustment) => String(adjustment.id)));
      const retained = current.manualAdjustments.filter((adjustment) => (!(["armor-class", "initiative", "attack-roll", "ability-check"].includes(adjustment.target.kind) && adjustment.value.kind === "number")) && !managedIds.has(String(adjustment.id)));
      const manualAdjustments: ManualAdjustment[] = [...retained, ...values.adjustments.map((adjustment) => {
        const previous = current.manualAdjustments.find((entry) => entry.id === adjustment.id);
        return { id: adjustment.id, target: { kind: adjustment.target }, value: { kind: "number" as const, amount: adjustment.amount }, reason: adjustment.reason.trim(), createdAt: previous?.createdAt ?? asIsoTimestamp(new Date().toISOString()), ...(previous?.sourceRef ? { sourceRef: previous.sourceRef } : {}) };
      })];
      return registry.character.service.saveCharacter({ ...current, hp: { ...current.hp, current: values.hp, temp: values.tempHp }, conditions: [...existing, ...added], manualAdjustments }, expectedRevision);
    }}
  />;
}

type JourneyRole = "master" | "player";

interface JourneyData {
  readonly players: readonly JourneyPlayer[];
  readonly creatures: readonly CreatureRecord[];
  readonly sightings: readonly CreatureSighting[];
  readonly guesses: readonly CreatureGuess[];
  readonly journal: readonly JournalEntry[];
  readonly maps: number;
  readonly sessions?: number;
  readonly loaded: boolean;
}

const EMPTY_JOURNEY: JourneyData = { players: [], creatures: [], sightings: [], guesses: [], journal: [], maps: 0, loaded: false };

/** Mapas que a conta pode ver: tudo para o mestre, só o liberado para o jogador. */
function visibleMaps(maps: readonly MapRecord[], role: JourneyRole, viewerId?: string): readonly MapRecord[] {
  if (role === "master") return maps;
  return maps.filter((map) => (map.visibleTo ?? []).some((audience) => audience === "*" || audience === viewerId));
}

function JourneyRoute({ registry, campaign, campaignRole, match, navigate, pack, syncHydration }: { readonly registry: FeatureRegistry; readonly campaign: AppRouterProps["campaign"]; readonly campaignRole?: JourneyRole; readonly match: RouteMatch; readonly navigate: (to: string) => void; readonly pack?: RulePack; readonly syncHydration?: object }) {
  const activeCampaign = campaign?.value ?? undefined;
  const campaignId = activeCampaign?.id;
  // Sem vínculo remoto a campanha é deste aparelho e quem a usa é o mestre.
  const role: JourneyRole = campaignRole === "player" ? "player" : "master";
  const master = role === "master";
  const session = registry.account.auth?.currentSession() ?? null;
  const viewerId = session ? asAccountId(session.uid) : registry.membership?.localActor()?.accountId;
  const creaturesService = registry.journey.creatures;
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>(activeCampaign ? [activeCampaign] : []);
  const [availableCharacters, setAvailableCharacters] = useState<readonly CharacterSummary[]>([]);
  const [data, setData] = useState<JourneyData>(EMPTY_JOURNEY);
  const [version, setVersion] = useState(0);
  const [journalAuthor, setJournalAuthor] = useState<string>();
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    void registry.journey.service.list().then((result) => { if (active && result.ok) setCampaigns(result.value); });
    return () => { active = false; };
  }, [registry.journey.service, campaignId, syncHydration]);
  useEffect(() => {
    let active = true;
    // Inclui as fichas de elenco: é no Elenco que elas são vinculadas e geridas.
    const listAll = registry.character.listAll ?? registry.character.list;
    if (listAll) void listAll().then((result) => { if (active && result.ok) setAvailableCharacters(result.value); });
    return () => { active = false; };
  }, [registry.character.list, registry.character.listAll, syncHydration, version]);

  useEffect(() => {
    if (!campaignId) { setData(EMPTY_JOURNEY); return; }
    let active = true;
    void (async () => {
      const [memberships, characters, creatures, sightings, guesses, journal, maps, sessions] = await Promise.all([
        master && registry.membership && viewerId ? registry.membership.listMemberships({ actorId: viewerId, campaignId }) : undefined,
        registry.character.list?.(),
        master ? creaturesService?.listCreatures(campaignId) : undefined,
        master ? undefined : creaturesService?.listSightings(campaignId, viewerId),
        creaturesService?.listGuesses(campaignId, master ? undefined : viewerId),
        registry.journey.listJournalEntries?.(campaignId),
        registry.journey.service.listMaps(campaignId),
        master ? registry.session?.list(campaignId) : undefined,
      ]);
      if (!active) return;
      const campaignCharacters = characters?.ok ? characters.value.filter((item) => item.campaignId === campaignId) : [];
      const players: JourneyPlayer[] = (memberships?.ok ? memberships.value : [])
        .filter((item) => item.role === "player" && item.status === "active")
        .map((item) => {
          const own = campaignCharacters.filter((character) => character.ownerUid === item.accountId);
          const classes = own[0]?.classSummary.map((entry) => registry.character.bindSheetProps({}).resolveName?.("class", String(entry.classId)) ?? String(entry.classId)).join(" / ");
          return { accountId: item.accountId, name: own.map((character) => character.name).join(" / ") || `Jogador ${String(item.accountId).slice(0, 6)}`, ...(classes ? { detail: classes } : {}) };
        });
      const entries = journal?.ok ? journal.value : [];
      setData({
        players,
        creatures: creatures?.ok ? creatures.value : [],
        sightings: sightings?.ok ? sightings.value : [],
        guesses: guesses?.ok ? guesses.value : [],
        // Jogador só lê o próprio diário, mesmo que algo antigo tenha ficado neste aparelho.
        journal: master ? entries : entries.filter((entry) => entry.authorId === viewerId),
        maps: maps.ok ? visibleMaps(maps.value, role, viewerId).length : 0,
        ...(sessions?.ok ? { sessions: sessions.value.length } : {}),
        loaded: true,
      });
    })();
    return () => { active = false; };
  }, [campaignId, creaturesService, master, registry.character, registry.journey, registry.membership, registry.session, role, syncHydration, version, viewerId]);

  // Registros antigos ficavam dentro do documento da campanha, legível por todos os membros.
  // O mestre os move para a coleção privada de criaturas e limpa a campanha.
  const legacyNpcs = activeCampaign?.npcs ?? [];
  useEffect(() => {
    if (!master || !campaignId || !creaturesService || legacyNpcs.length === 0) return;
    let active = true;
    void creaturesService.importLegacyNpcs(campaignId, legacyNpcs).then((result) => {
      if (!active || !result.ok) return;
      const cleared = registry.journey.service.update((current) => ({ ...current, npcs: [] }), true);
      if (cleared.ok) void registry.journey.service.save().then(() => reload());
    });
    return () => { active = false; };
  }, [campaignId, creaturesService, legacyNpcs.length, master, registry.journey.service, reload]);

  const Journey = LazyJourneyCampaign;
  const Map = LazyMapWorkspace;
  const Creatures = LazyCreatureBoard;
  const PlayerCreatures = LazyPlayerCreatureBoard;
  const campaignProps = registry.journey.bindCampaignProps({
    campaign: activeCampaign,
    campaigns: campaigns.map((item) => ({ id: String(item.id), name: item.name, description: item.description })),
    activeCampaignId: campaignId ? String(campaignId) : undefined,
    activeCampaignName: activeCampaign?.name,
    status: campaignStatus(campaign?.status),
    error: campaign?.errorMessage,
  });
  const sheetTools = master ? {
    availableCharacters: availableCharacters.filter((item) => !item.campaignId || item.campaignId === campaignId).map((item) => ({ id: item.id, name: item.name, detail: [item.classSummary.map((entry) => registry.character.bindSheetProps({}).resolveName?.("class", String(entry.classId)) ?? String(entry.classId)).join("/"), item.totalLevel ? `nível ${item.totalLevel}` : ""].filter(Boolean).join(" ") || undefined })),
    onCreateSheet: () => navigate("/character/create"),
    onOpenSheet: (id: Uuid) => navigate(`/character/${id}`),
    raceOptions: pack ? [...pack.races.values()].map(({ id, name }) => ({ id, name })) : [],
    classOptions: pack ? [...pack.classes.values()].map(({ id, name }) => ({ id, name })) : [],
    onGenerateSheet: pack ? async (input: { readonly name: string; readonly raceId: EntityId; readonly classId?: EntityId }) => {
      const generated = generateNpcCharacter({ rulePack: pack, equipmentBundles, selectorOptions: RACE_CHOICE_ALLOWED_OPTIONS }, input);
      if (!generated.ok) return generated;
      const saved = await registry.character.service.saveCharacter(generated.value, generated.value.revision);
      return saved.ok ? ok(generated.value.id) : saved;
    } : undefined,
  } : {};
  // Toda ficha ligada a uma criatura é "de elenco": só aparece no Elenco, nunca nas listas gerais.
  const setCastSheet = async (sheetId: Uuid | undefined, cast: boolean) => {
    if (!sheetId) return;
    const loaded = await registry.character.service.get(sheetId);
    if (!loaded.ok || Boolean(loaded.value.castSheet) === cast) return;
    const { castSheet: _previous, ...rest } = loaded.value;
    await registry.character.service.saveCharacter(cast ? { ...rest, castSheet: true } : rest, loaded.value.revision);
  };
  const deleteSheet = async (sheetId: Uuid | undefined) => {
    if (!sheetId) return ok(undefined);
    const loaded = await registry.character.service.get(sheetId);
    // Ficha que já não existe: nada a apagar, o vínculo é que precisa sair.
    if (!loaded.ok) return ok(undefined);
    return registry.character.service.deleteCharacter(sheetId, loaded.value.revision);
  };
  const creatureActions = campaignId && creaturesService ? {
    onCreate: async (content: import("@domain/campaign/creatures").CreatureContent) => {
      const created = await creaturesService.create(campaignId, content);
      if (created.ok) { await setCastSheet(created.value.characterRef, true); reload(); }
      return created;
    },
    onSave: async (creature: CreatureRecord) => {
      const previous = data.creatures.find((item) => item.id === creature.id)?.characterRef;
      const saved = await creaturesService.save(creature);
      if (saved.ok) {
        await setCastSheet(saved.value.characterRef, true);
        // A ficha que saiu do vínculo volta a ser uma ficha comum, em vez de ficar escondida de todos.
        if (previous && previous !== saved.value.characterRef) await setCastSheet(previous, false);
        reload();
      }
      return saved;
    },
    onDelete: async (creature: CreatureRecord) => {
      const removed = await creaturesService.delete(creature);
      if (removed.ok) { await deleteSheet(creature.characterRef); reload(); }
      return removed;
    },
    onDeleteSheet: async (creature: CreatureRecord) => {
      const deleted = await deleteSheet(creature.characterRef);
      if (!deleted.ok) return deleted;
      const { characterRef: _gone, ...withoutSheet } = creature;
      const saved = await creaturesService.save(withoutSheet as CreatureRecord);
      reload();
      return saved;
    },
  } : undefined;
  const mutate = <T,>(result: Promise<import("@domain/contracts/errors").Result<T, import("@domain/contracts/errors").AppError>>) => result.then((value) => { if (value.ok) reload(); return value; });
  const creaturesPanel = !campaignId || !creaturesService ? undefined : master
    ? <Creatures {...sheetTools} creatures={data.creatures} guesses={data.guesses} players={data.players} loading={!data.loaded} {...creatureActions} />
    : <PlayerCreatures sightings={data.sightings} guesses={data.guesses} loading={!data.loaded} onSaveGuess={viewerId ? (creatureId, guess) => mutate(creaturesService.saveGuess({ campaignId, creatureId, accountId: viewerId, ...guess })) : undefined} />;

  const publication = registry.journey.mapPublication;
  const mapPanel = <Map campaignId={campaignId} canManage={master}
    listMaps={async (id) => { const result = await registry.journey.service.listMaps(id); return result.ok ? ok(visibleMaps(result.value, role, viewerId)) : result; }}
    getAsset={registry.journey.getLocalAsset}
    loadImage={publication ? (map) => publication.loadImage(map) : undefined}
    importMap={master ? (input) => registry.journey.service.importMapAsset(input) : undefined}
    addPin={master ? (input) => registry.journey.service.createMapPin(input) : undefined}
    updatePin={master ? (mapId, pin, revision) => registry.journey.service.updateMapPin(mapId, pin, revision) : undefined}
    removePin={master ? (mapId, pinId, revision) => registry.journey.service.removeMapPin(mapId, pinId, revision) : undefined}
    saveMap={master ? (map, revision) => registry.journey.service.saveMap(map, revision) : undefined}
    deleteMap={master ? (id, revision) => registry.journey.service.deleteMap(id, revision) : undefined}
    publication={master && publication ? { canPublish: publication.canPublish(), publish: (map) => publication.publish(map), share: (map, audience) => publication.share(map, audience) } : undefined}
    players={data.players} />;
  const authors = master && viewerId ? [{ id: String(viewerId), name: "Mestre" }, ...data.players.map((player) => ({ id: String(player.accountId), name: player.name }))] : undefined;
  const sessionMatch = campaignId && master ? matchRoute(`/session/${campaignId}`) : undefined;
  const creatureCounts = { npc: 0, enemy: 0, animal: 0, unknown: 0 };
  for (const creature of data.creatures) creatureCounts[creature.kind] += 1;
  const objectives = activeCampaign?.objectives.length ?? 0;
  const activeQuests = activeCampaign?.quests.filter((quest) => quest.status === "active").length ?? 0;
  const metrics = master
    ? [{ label: "Missões em andamento", value: activeQuests }, { label: "NPCs", value: creatureCounts.npc }, { label: "Ameaças", value: creatureCounts.enemy }, { label: "Animais e desconhecidos", value: creatureCounts.animal + creatureCounts.unknown }]
    : [{ label: "Objetivos", value: objectives }, { label: "Missões em andamento", value: activeQuests }, { label: "Encontros", value: data.sightings.length }, { label: "Meus palpites", value: data.guesses.length }];
  const playerJourneys = master ? data.players.map((player) => ({
    accountId: String(player.accountId),
    name: player.name,
    ...(player.detail ? { detail: player.detail } : {}),
    journalEntries: data.journal.filter((entry) => entry.authorId === player.accountId).length,
    creaturesKnown: data.creatures.filter((creature) => creature.reveals.some((reveal) => reveal.accountId === player.accountId)).length,
    guesses: data.guesses.filter((guess) => guess.accountId === player.accountId).length,
  })) : undefined;

  const content = <Journey {...campaignProps} role={role}
    activityStats={{ maps: data.maps, journalEntries: data.journal.filter((entry) => master ? (entry.authorId ?? viewerId) === viewerId : true).length, ...(data.sessions === undefined ? {} : { sessions: data.sessions }), creatures: master ? data.creatures.length : data.sightings.length }}
    metrics={campaignId ? metrics : undefined}
    playerJourneys={playerJourneys}
    onOpenPlayerJourney={(accountId) => { setJournalAuthor(accountId); navigate("/journey/journal"); }}
    requestedTabId={match.params.id} onTabChange={(id) => { if (id !== "journal") setJournalAuthor(undefined); navigate(id === "overview" ? "/journey" : `/journey/${id}`); }}
    mapPanel={mapPanel}
    journalPanel={<JournalRoute registry={registry} campaign={campaign} viewerId={viewerId ? String(viewerId) : undefined} role={role} authors={authors} authorFilter={journalAuthor} refreshKey={syncHydration} onSaved={reload} />}
    creaturesPanel={creaturesPanel}
    sessionsPanel={sessionMatch ? <SessionRoute registry={registry} match={sessionMatch} campaign={campaign} /> : undefined}
    participantsPanel={master ? <CollaborationRoute registry={registry} campaign={campaign} navigate={navigate} view="participants" /> : undefined} />;
  return registry.journey.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.journey.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
}

function SessionRoute({ registry, match, campaign }: { readonly registry: FeatureRegistry; readonly match: RouteMatch; readonly campaign: AppRouterProps["campaign"] }) {
  const campaignId = match.params.campaignId;
  const session = registry.account.auth?.currentSession() ?? null;
  const activeCampaignId = campaignId && isUuid(campaignId) ? asUuid(campaignId) : undefined;
  const [characters, setCharacters] = useState<readonly import("@features/session").SessionCharacterOption[]>([]);
  useEffect(() => {
    let active = true;
    if (!activeCampaignId || !registry.character.list) {
      setCharacters([]);
      return () => { active = false; };
    }
    void registry.character.list().then(async (result) => {
      if (!active || !result.ok) return;
      const playerId = session ? asAccountId(session.uid) : registry.session?.localActor()?.accountId;
      if (!playerId) { setCharacters([]); return; }
      const campaignCharacters = result.value.filter((character) => character.campaignId === activeCampaignId);
      const options = await Promise.all(campaignCharacters.map(async (summary) => {
        const loaded = await registry.character.service.get(summary.id);
        if (!loaded.ok) return { id: summary.id, name: summary.name, playerId };
        const derived = registry.character.bindSheetProps({ character: loaded.value }).derived;
        return { id: summary.id, name: summary.name, playerId, initiative: derived?.initiative.value, hitPoints: { current: loaded.value.hp.current, maximum: derived?.hitPointsMax.value } };
      }));
      if (active) setCharacters(options);
    });
    return () => { active = false; };
  }, [activeCampaignId, registry.character.list, registry.character.service, registry.character.bindSheetProps, registry.session, session]);
  const Component = LazySessionPanel;
  const [creatures, setCreatures] = useState<readonly CreatureRecord[]>([]);
  useEffect(() => {
    let active = true;
    if (!activeCampaignId || !registry.journey.creatures) { setCreatures([]); return () => { active = false; }; }
    void registry.journey.creatures.listCreatures(activeCampaignId).then((result) => { if (active && result.ok) setCreatures(result.value); });
    return () => { active = false; };
  }, [activeCampaignId, registry.journey.creatures]);
  const legacy = campaign?.value && campaign.value.id === activeCampaignId ? campaign.value.npcs : [];
  const npcs = [...legacy.filter((npc) => !creatures.some((creature) => creature.id === npc.id)), ...creatures.map((creature) => ({ id: creature.id, kind: creature.kind, name: creature.name, description: creature.description, linkedEntityIds: [], ...(creature.characterRef ? { characterRef: creature.characterRef } : {}), createdAt: creature.createdAt, updatedAt: creature.updatedAt }))];
  return <Component session={registry.session} authSession={session} campaignId={activeCampaignId} characters={characters} npcs={npcs} />;
}

function campaignStatus(status: StoreStatus | undefined): "idle" | "loading" | "error" | "saving" {
  if (status === "hydrating") return "loading";
  if (status === "saving" || status === "dirty") return "saving";
  if (status === "error" || status === "conflict") return "error";
  return "idle";
}

function CompendiumRoute({ registry }: { readonly registry: FeatureRegistry }): ReactNode {
  const service = registry.compendium.service;
  const [filters, setFilters] = useState<CompendiumFilters>({ query: "" });
  const [selected, setSelected] = useState<CompendiumDetail | undefined>();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | undefined>();
  const [favoriteRevision, setFavoriteRevision] = useState(0);
  void favoriteRevision;

  const search = service.search(filters);
  const categories = service.getCategories();
  const favorites = service.getFavorites();

  const onFiltersChange = (nextFilters: CompendiumFilters) => {
    setFilters(nextFilters);
    setError(undefined);
    setStatus("idle");
  };

  const onSelect = (entry: typeof search.entries[number]) => {
    const detail = service.getDetail(entry.ref);
    if (!detail.ok) {
      setSelected(undefined);
      setError(detail.error.message);
      setStatus("error");
      return;
    }
    setSelected(detail.value);
    setError(undefined);
    setStatus("idle");
  };

  const onToggleFavorite = (entry: typeof search.entries[number]) => {
    service.toggleFavorite(entry);
    setFavoriteRevision((revision) => revision + 1);
  };

  const onLoadCategory = async (category: CompendiumCategoryId) => {
    setStatus("loading");
    setError(undefined);
    const result = await service.loadCategory(category);
    if (!result.ok) {
      setStatus("error");
      setError(result.error.message);
      return;
    }
    setStatus("idle");
    if (result.value.status === "loaded") setFilters((current) => ({ ...current, category }));
  };

  const CompendiumComponent = LazyCompendium;
  return (
    <CompendiumComponent
      {...registry.compendium.bindProps({
        entries: search.entries,
        categories,
        filters,
        selected,
        favorites,
        status,
        error,
        offline: true,
        onFiltersChange,
        onSelect,
        onToggleFavorite,
        onLoadCategory,
      })}
    />
  );
}

function renderRegistryRoute(
  match: RouteMatch,
  registry: FeatureRegistry,
  character: AppRouterProps["character"],
  campaign: AppRouterProps["campaign"],
  actionCapabilities: AppRouterProps["actionCapabilities"],
  pack: AppRouterProps["pack"],
  createDraft: AppRouterProps["createDraft"],
  onCharacterCreated: AppRouterProps["onCharacterCreated"],
  syncState: AppRouterProps["syncState"],
  syncMessage: AppRouterProps["syncMessage"],
  syncHydration: AppRouterProps["syncHydration"],
  onRefreshSync: AppRouterProps["onRefreshSync"],
  signedIn: boolean,
  accountCharacterId: Character["id"] | undefined,
  actionsDice: ActionsDice | undefined,
  isCampaignMaster: boolean,
  navigate: (to: string) => void,
  replace: (to: string) => void,
  campaignRole?: "master" | "player",
): ReactNode | undefined {
  const currentCharacter = character?.value ?? undefined;
  if (match.kind === "character") {
    if (match.params.mode === "create") {
      if (registry.character.pendingDependencies.length === 0 && pack && createDraft) {
        return <CreateCharacterRoute registry={registry} pack={pack} createDraft={createDraft} onCharacterCreated={onCharacterCreated} navigate={navigate} replace={replace} draftId={match.params.draftId} />;
      }
      return <PendingDestination title="Criação de personagem" reasons={registry.character.pendingDependencies.length ? registry.character.pendingDependencies : ["Catálogo e draft de criação não foram fornecidos nesta composição."]} />;
    }
    if (!match.params.id) return isCampaignMaster ? <CollaborationRoute registry={registry} campaign={campaign} navigate={navigate} view="characters" pack={pack} syncState={syncState} syncMessage={syncMessage} syncHydration={syncHydration} onRefreshSync={onRefreshSync} /> : <CharacterHomeRoute registry={registry} character={character} navigate={navigate} replace={replace} signedIn={signedIn} accountCharacterId={accountCharacterId} />;
    return <CharacterDetailRoute registry={registry} character={character} pack={pack} id={match.params.id} />;
  }
  if (match.kind === "actions") {
    const ActionPage = LazyActions;
    const derived = currentCharacter ? registry.character.bindSheetProps({ character: currentCharacter }).derived : undefined;
    const content = <ActionPage {...registry.actions.bindProps({ character: currentCharacter, capabilities: actionCapabilities ?? [], availableActions: AVAILABLE_ACTION_KINDS })} derived={derived} attackRolls={currentCharacter ? attackRollsFor(currentCharacter, derived, pack) : undefined} unequippedWeapons={currentCharacter ? unequippedWeaponsFor(currentCharacter, pack) : undefined} spellRolls={currentCharacter ? spellRollsFor(currentCharacter, derived, pack) : undefined} dice={actionsDice} onOpenConditions={currentCharacter ? () => navigate(`/character/${currentCharacter.id}#condicoes`) : undefined} historyPanel={currentCharacter?.campaignId ? <CampaignLogRoute registry={registry} campaignId={String(currentCharacter.campaignId)} focusCharacterId={String(currentCharacter.id)} /> : undefined} />;
    return registry.actions.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.actions.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
  }
  if (match.kind === "journey") return <JourneyRoute registry={registry} campaign={campaign} campaignRole={campaignRole} match={match} navigate={navigate} pack={pack} syncHydration={syncHydration} />;
  if (match.kind === "compendium") {
    return <CompendiumRoute registry={registry} />;
  }
  if (match.kind === "collaboration") return <CollaborationRoute registry={registry} campaign={campaign} navigate={navigate} syncState={syncState} syncMessage={syncMessage} syncHydration={syncHydration} onRefreshSync={onRefreshSync} />;
  if (match.kind === "session") return <SessionRoute registry={registry} match={match} campaign={campaign} />;
  if (match.kind === "data") return <DataManagementRoute registry={registry} character={character} campaign={campaign} />;
  if (match.kind === "account") return <AccountRoute registry={registry} navigate={navigate} syncState={syncState} syncMessage={syncMessage} campaign={campaign} />;
  return undefined;
}

export function useAppNavigation(initialPath?: string): AppNavigation {
  const [path, setPath] = useState(() => initialPath !== undefined ? initialPath || "/" : (typeof window !== "undefined" ? window.location.pathname : "/") || "/");

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = to || "/";
    if (next === window.location.pathname) {
      setPath(next);
      return;
    }
    window.history.pushState({}, "", next);
    setPath(next);
  }, []);

  const replace = useCallback((to: string) => {
    const next = to || "/";
    window.history.replaceState({}, "", next);
    setPath(next);
  }, []);

  return useMemo(() => ({ path, match: matchRoute(path), navigate, replace }), [path, navigate, replace]);
}

/** Configurações com a escolha do personagem ativo (fichas deste aparelho). */
function SettingsRoute({ registry, store, character, navigate }: { readonly registry?: FeatureRegistry; readonly store: AppRouterProps["settingsStore"]; readonly character: AppRouterProps["character"]; readonly navigate: (to: string) => void }) {
  const [characters, setCharacters] = useState<readonly SettingsCharacterOption[]>([]);
  const [drafts, setDrafts] = useState<readonly SettingsDraftOption[]>([]);
  const list = registry?.character.list;
  const listDrafts = registry?.character.listDrafts;
  const sessionUid = registry?.account.auth?.currentSession()?.uid;
  useEffect(() => {
    if (!listDrafts) return;
    let active = true;
    void listDrafts().then((result) => {
      if (!active || !result.ok) return;
      setDrafts([...result.value].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((draft) => ({
        id: String(draft.id),
        name: draft.partial.name?.trim() || "Personagem sem nome",
        step: DRAFT_STEP_LABELS[draft.currentStep] ?? draft.currentStep,
      })));
    });
    return () => { active = false; };
  }, [listDrafts]);
  const resolveName = registry?.character.bindSheetProps({}).resolveName;
  useEffect(() => {
    if (!list) return;
    let active = true;
    void list().then((result) => {
      if (!active || !result.ok) return;
      setCharacters(result.value.filter((summary) => !sessionUid || !summary.ownerUid || summary.ownerUid === sessionUid).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).map((summary) => ({
        id: String(summary.id),
        name: summary.name || "Personagem sem nome",
        detail: summary.classSummary.map((entry) => `${resolveName?.("class", String(entry.classId)) ?? String(entry.classId)} ${entry.level}`).join(" / ") || undefined,
      })));
    });
    return () => { active = false; };
  }, [list, resolveName, sessionUid]);
  const Panel = LazySettingsPanel;
  return <Panel store={store} characters={characters} activeCharacterId={character?.value?.id ? String(character.value.id) : undefined} onSelectCharacter={registry ? (id) => { void registry.character.service.select(asUuid(id)); } : undefined} onCreateCharacter={() => navigate("/character/create")} drafts={drafts} onResumeDraft={(id) => navigate(`/character/create/${id}`)} />;
}

/** Conexão com o Firebase para o selo do cabeçalho; sem conta conectada não há o que indicar. */
function connectionFor(syncState: AccountSyncState | undefined, signedIn: boolean): "live" | "down" | undefined {
  if (!signedIn) return undefined;
  if (syncState === "synced" || syncState === "pending") return "live";
  if (syncState === "offline" || syncState === "error") return "down";
  return undefined;
}

/** Small History API router: keeps the shell usable without adding a package. */
export function AppRouter({ renderRoute, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated, syncState, syncMessage, syncHydration, onRefreshSync, initialPath, diceOverlayController, ...shellProps }: AppRouterProps) {
  const navigation = useAppNavigation(initialPath);
  const accountAuth = registry?.account.auth;
  const membership = registry?.membership;
  const [accountSession, setAccountSession] = useState(() => accountAuth?.currentSession() ?? null);
  const [roleResolution, setRoleResolution] = useState<{ readonly actorId: string; readonly campaignId: string; readonly syncHydration?: object; readonly role?: "master" | "player" }>();
  const localIdentity = membership?.localActor();
  const actorId = accountSession ? asAccountId(accountSession.uid) : localIdentity?.accountId;
  const activeCampaignId = campaign?.value?.id;
  const roleMatches = Boolean(membership && actorId && activeCampaignId && roleResolution?.actorId === actorId && roleResolution.campaignId === activeCampaignId && roleResolution.syncHydration === syncHydration);
  const roleReady = !membership || !actorId || !activeCampaignId || roleMatches;
  const campaignRole = roleMatches ? roleResolution?.role : undefined;
  const isCampaignMaster = campaignRole === "master";

  useEffect(() => {
    if (!accountAuth) {
      setAccountSession(null);
      return;
    }
    setAccountSession(accountAuth.currentSession());
    try {
      return accountAuth.observeSession((session) => setAccountSession(session));
    } catch {
      return undefined;
    }
  }, [accountAuth]);

  useEffect(() => {
    let current = true;
    if (!membership || !actorId || !activeCampaignId) return () => { current = false; };
    void membership.listMemberships({ actorId, campaignId: activeCampaignId }).then((result) => {
      if (!current) return;
      const ownMembership = result.ok ? result.value.find((item) => item.accountId === actorId) : undefined;
      const activeRole = ownMembership?.status === "active" ? ownMembership.role : undefined;
      setRoleResolution({ actorId, campaignId: activeCampaignId, syncHydration, role: activeRole === "master" || activeRole === "player" ? activeRole : undefined });
    }).catch(() => {
      if (current) setRoleResolution({ actorId, campaignId: activeCampaignId, syncHydration });
    });
    return () => { current = false; };
  }, [activeCampaignId, actorId, membership, syncHydration]);

  const diceState = useSyncExternalStore(
    diceOverlayController?.subscribe ?? EMPTY_DICE_SUBSCRIBE,
    diceOverlayController?.getSnapshot ?? EMPTY_DICE_GET_SNAPSHOT,
    diceOverlayController?.getSnapshot ?? EMPTY_DICE_GET_SNAPSHOT,
  );
  const actionCharacterId = character?.value?.id;
  // Funções estáveis (só mudam com o controller/personagem): a página de Ações hidrata o
  // histórico num efeito, e uma função nova a cada mudança de estado dos dados virava loop.
  const actionsDiceCommands = useMemo(() => diceOverlayController ? {
    roll: (request: ActionsRollRequest) => {
      void diceOverlayController.quickRoll({
        expression: { quantity: request.quantity ?? 1, faces: request.faces, modifier: request.modifier ?? 0, mode: "normal" },
        purpose: request.purpose ?? "free",
        ...(request.label ? { label: request.label } : {}),
        ...(actionCharacterId ? { characterId: actionCharacterId } : {}),
      });
    },
    openTable: () => diceOverlayController.open({ source: "actions", ...(actionCharacterId ? { characterId: actionCharacterId } : {}) }),
    hydrate: () => { void diceOverlayController.hydrate(actionCharacterId); },
  } : undefined, [actionCharacterId, diceOverlayController]);
  const actionsDice: ActionsDice | undefined = useMemo(() => {
    if (!actionsDiceCommands) return undefined;
    // O histórico hidratado chega na ordem do banco; a página mostra do mais recente ao mais antigo.
    const history = [...diceState.history].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
    ...actionsDiceCommands,
    history,
    lastResult: diceState.result ?? history[0],
    rolling: diceState.status === "rolling" || diceState.awaitingPhysics,
    };
  }, [actionsDiceCommands, diceState.awaitingPhysics, diceState.history, diceState.result, diceState.status]);
  const cloudHydrationPending = Boolean(accountSession && !syncHydration && (syncState === "pending" || syncState === "synced"));
  const awaitingCharacterRole = navigation.match.kind === "character" && !navigation.match.params.id && !navigation.match.params.mode && (!roleReady || cloudHydrationPending);
  const accountCharacterId = accountSession ? shellProps.settingsStore?.settings?.activeCharacterIdsByAccount?.[accountSession.uid] : undefined;
  const outlet = renderRoute?.(navigation.match) ?? (registry ? awaitingCharacterRole ? <section aria-live="polite" aria-busy="true"><h1>Carregando personagens</h1><InlineStatus tone="info">Confirmando seu papel na campanha.</InlineStatus></section> : renderRegistryRoute(navigation.match, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated, syncState, syncMessage, syncHydration, onRefreshSync, Boolean(accountSession), accountCharacterId, actionsDice, isCampaignMaster, navigation.navigate, navigation.replace, campaignRole) : undefined) ?? (navigation.match.kind === "account" ? <LazyAccountPanel availability={{ available: false }} /> : navigation.match.kind === "settings" ? <SettingsRoute registry={registry} store={shellProps.settingsStore} character={character} navigate={navigation.navigate} /> : undefined);

  return (
    <AppShell
      {...shellProps}
      character={character}
      campaign={campaign}
      isCampaignMaster={isCampaignMaster}
      campaignRole={campaignRole}
      connection={connectionFor(syncState, Boolean(accountSession))}
      diceOverlayController={diceOverlayController}
      route={navigation.match}
      navigate={navigation.navigate}
    >
      <Suspense fallback={<RouteLoadingFallback />}>{outlet}</Suspense>
    </AppShell>
  );
}
