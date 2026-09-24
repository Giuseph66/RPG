import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { AppShell, type AppShellProps } from "@components/layout/AppShell";
import { InlineStatus } from "@components/ui";
import type { Character, CharacterDraft } from "@domain/contracts/character";
import type { CharacterSummary } from "@domain/contracts/character";
import type { DraftSummary } from "@features/character/selection";
import type { Campaign } from "@domain/contracts/campaign";
import type { JournalDraft, JournalDraftState } from "@domain/campaign/journal";
import { createJournalDraft, draftFromJournalEntry } from "@domain/campaign/journal";
import { asAccountId, asUuid, isUuid } from "@domain/contracts/ids";
import { parseBackupJson, serializeBackup } from "@application/transfer";
import type { RecoveryRecordView } from "@application/transfer/types";
import type { DataManagementIntent } from "@features/data-management";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { Revision } from "@domain/contracts/versioning";
import type { StoreStatus } from "@application/state";
import type { ActionCapability, ActionsDice } from "@features/actions";
import type { AccountSyncState } from "@features/account";
import type { AccountCampaign } from "@features/account/types";
import type { CollaborationCharacter } from "@features/collaboration/types";
import type { CompendiumCategoryId, CompendiumDetail, CompendiumFilters } from "@application/compendium";
import type { FeatureRegistry } from "./feature-registry";
import { matchRoute, type RouteMatch } from "./routes";
import { carryingFor, conditionOptionsFor, equipmentCatalog, equipmentInfo, spellOptionsFor } from "./character-route-data";

const LazyCharacterSelection = lazy(() => import("@features/character/selection").then((module) => ({ default: module.CharacterSelection })));
const LazyCharacterSheet = lazy(() => import("@features/character/sheet").then((module) => ({ default: module.CharacterSheet })));
const LazyCharacterCreation = lazy(() => import("@features/character/creation").then((module) => ({ default: module.CharacterCreationWizard })));
const LazyActions = lazy(() => import("@features/actions").then((module) => ({ default: module.Actions })));
const LazyInventory = lazy(() => import("@features/inventory").then((module) => ({ default: module.Inventory })));
const LazyJourneyCampaign = lazy(() => import("@features/journey/campaign").then((module) => ({ default: module.JourneyCampaign })));
const LazyMapViewer = lazy(() => import("@features/journey/map").then((module) => ({ default: module.MapViewer })));
const LazyJournalWorkspace = lazy(() => import("@features/journey/journal").then((module) => ({ default: module.JournalWorkspace })));
const LazyCompendium = lazy(() => import("@features/compendium").then((module) => ({ default: module.Compendium })));
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

function CharacterSelectionRoute({ registry, navigate }: { readonly registry: FeatureRegistry; readonly navigate: (to: string) => void }) {
  const [characters, setCharacters] = useState<readonly CharacterSummary[]>([]);
  const [drafts, setDrafts] = useState<readonly DraftSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("idle");
  const [error, setError] = useState<unknown>();

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
      setCharacters(result.value);
      setDrafts(draftResult.value.map((draft) => ({ id: draft.id, name: draft.partial.name, currentStep: draft.currentStep, updatedAt: draft.updatedAt })));
      setStatus("idle");
    });
    return () => { active = false; };
  }, [registry.character.list]);

  const Selection = LazyCharacterSelection;
  return <Selection {...registry.character.bindSelectionProps({ characters, drafts, status, error, onSelect: (id) => navigate(`/character/${id}`), onCreate: () => navigate("/character/create"), onResumeDraft: (id) => navigate(`/character/create/${id}`) })} />;
}

function CharacterDetailRoute({ registry, character, pack, id }: { readonly registry: FeatureRegistry; readonly character: AppRouterProps["character"]; readonly pack?: RulePack; readonly id: string }) {
  const validId = isUuid(id) ? asUuid(id) : undefined;
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
  return <div><Sheet {...sheetProps} />{registry.inventory.pendingDependencies.length ? <InlineStatus tone="warning">{registry.inventory.pendingDependencies.join(" ")}</InlineStatus> : null}<Inventory {...registry.inventory.bindProps({ items: inventory, currency: currentCharacter.currency, catalog: equipmentCatalog(pack), carrying: carryingFor(currentCharacter, sheetProps.derived, pack) })} /></div>;
}

function JournalRoute({ registry, campaign }: { readonly registry: FeatureRegistry; readonly campaign: AppRouterProps["campaign"] }) {
  const campaignId = campaign?.value?.id;
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
    void registry.journey.listJournalEntries(campaignId).then((result) => {
      if (!active) return;
      if (!result.ok) { setError(result.error.message); setStatus("error"); return; }
      setEntries(result.value);
      const first = result.value[0];
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
  }, [campaignId, dispatchJournal, registry.journey.listJournalEntries]);

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
          void (campaignId && registry.journey.listJournalEntries ? registry.journey.listJournalEntries(campaignId).then((result) => { if (result.ok) setEntries(result.value); }) : undefined);
        }
      };
      window.setTimeout(poll, 0);
    }
  }, [campaignId, draft, entries, getState, refreshFromDispatcher, registry.journey, selectedEntryId]);

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
  return <div><JourneyStatus campaign={campaign} error={error} /><Journal {...journal} /></div>;
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
    onOpenCollaboration: () => navigate("/collaboration"),
    onOpenSession: (campaignId) => navigate(`/session/${campaignId}`),
    onOpenSettings: () => navigate("/settings"),
  })} campaigns={accountCampaigns} {...(syncState ? { syncState } : {})} {...(syncMessage ? { syncMessage } : {})} />;
}

function CollaborationRoute({ registry, campaign, navigate }: { readonly registry: FeatureRegistry; readonly campaign: AppRouterProps["campaign"]; readonly navigate: (to: string) => void }) {
  const [campaigns, setCampaigns] = useState<readonly Campaign[]>(campaign?.value ? [campaign.value] : []);
  const [characters, setCharacters] = useState<readonly CollaborationCharacter[]>([]);
  useEffect(() => {
    let active = true;
    void registry.journey.service.list().then((result) => { if (active && result.ok) setCampaigns(result.value); });
    return () => { active = false; };
  }, [registry.journey.service]);
  useEffect(() => {
    let active = true;
    if (!registry.character.list) { setCharacters([]); return () => { active = false; }; }
    void registry.character.list().then(async (result) => {
      if (!active) return;
      if (!result.ok) { setCharacters([]); return; }
      const summaries = await Promise.all(result.value.map(async (summary): Promise<CollaborationCharacter> => {
        const base = { id: summary.id, name: summary.name, campaignId: summary.campaignId, revision: summary.revision };
        const loaded = await registry.character.service.get(summary.id);
        if (!loaded.ok) return base;
        const character = loaded.value;
        const sheet = registry.character.bindSheetProps({ character });
        const derived = sheet.derived;
        const resourceTotal = derived?.resourceCapacities.reduce((total, resource) => total + resource.capacity.value, 0) ?? 0;
        const resourceSpent = character.resources.reduce((total, resource) => total + resource.spent, 0);
        const displayDefinition = (type: "class" | "condition", id: string) => sheet.resolveName?.(type, id) ?? id.replace(/[-_]/g, " ");
        return {
          ...base,
          ...(character.playerName ? { playerName: character.playerName } : {}),
          className: summary.classSummary.map((entry) => displayDefinition("class", entry.classId)).join(" / "),
          totalLevel: summary.totalLevel,
          hitPoints: { current: character.hp.current, temporary: character.hp.temp, ...(derived ? { maximum: derived.hitPointsMax.value } : {}) },
          ...(derived ? { armorClass: derived.armorClass.value, initiative: derived.initiative.value } : {}),
          conditions: character.conditions.map((condition) => displayDefinition("condition", condition.definitionRef.entityId)),
          concentration: Boolean(character.concentration),
          inspiration: character.inspiration,
          deathSaves: { successes: character.deathSaves.successes, failures: character.deathSaves.failures },
          pendingResolutions: character.pendingResolutions.length,
          ...(resourceTotal > 0 ? { resources: { available: Math.max(0, resourceTotal - resourceSpent), total: resourceTotal } } : {}),
        };
      }));
      if (active) setCharacters(summaries);
    });
    return () => { active = false; };
  }, [registry.character.bindSheetProps, registry.character.list, registry.character.service]);
  const Component = LazyCollaborationPanel;
  const session = registry.account.auth?.currentSession() ?? null;
  return <Component
    membership={registry.membership}
    session={session}
    campaigns={campaigns.map((item) => ({ id: item.id, name: item.name }))}
    characters={characters}
    activeCampaignId={campaign?.value?.id}
    onOpenSession={(id) => navigate(`/session/${id}`)}
    onOpenJourney={() => navigate("/journey")}
    onLinkCharacter={(characterId, campaignId, expectedRevision) => registry.character.service.linkToCampaign(characterId, campaignId, expectedRevision)}
    onUnlinkCharacter={(characterId, campaignId, expectedRevision) => registry.character.service.unlinkFromCampaign(characterId, campaignId, expectedRevision)}
  />;
}

function SessionRoute({ registry, match }: { readonly registry: FeatureRegistry; readonly match: RouteMatch }) {
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
    void registry.character.list().then((result) => {
      if (!active || !result.ok) return;
      const playerId = session ? asAccountId(session.uid) : registry.session?.localActor()?.accountId;
      if (!playerId) { setCharacters([]); return; }
      setCharacters(result.value
        .filter((character) => character.campaignId === activeCampaignId)
        .map((character) => ({ id: character.id, name: character.name, playerId })));
    });
    return () => { active = false; };
  }, [activeCampaignId, registry.character.list, registry.session, session]);
  const Component = LazySessionPanel;
  return <Component session={registry.session} authSession={session} campaignId={activeCampaignId} characters={characters} />;
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
  actionsDice: ActionsDice | undefined,
  navigate: (to: string) => void,
  replace: (to: string) => void,
): ReactNode | undefined {
  const currentCharacter = character?.value ?? undefined;
  if (match.kind === "character") {
    if (match.params.mode === "create") {
      if (registry.character.pendingDependencies.length === 0 && pack && createDraft) {
        return <CreateCharacterRoute registry={registry} pack={pack} createDraft={createDraft} onCharacterCreated={onCharacterCreated} navigate={navigate} replace={replace} draftId={match.params.draftId} />;
      }
      return <PendingDestination title="Criação de personagem" reasons={registry.character.pendingDependencies.length ? registry.character.pendingDependencies : ["Catálogo e draft de criação não foram fornecidos nesta composição."]} />;
    }
    if (!match.params.id) return <CharacterSelectionRoute registry={registry} navigate={navigate} />;
    return <CharacterDetailRoute registry={registry} character={character} pack={pack} id={match.params.id} />;
  }
  if (match.kind === "actions") {
    const ActionPage = LazyActions;
    const content = <ActionPage {...registry.actions.bindProps({ character: currentCharacter, capabilities: actionCapabilities ?? [], availableActions: AVAILABLE_ACTION_KINDS })} dice={actionsDice} />;
    return registry.actions.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.actions.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
  }
  if (match.kind === "journey") {
    const Journey = LazyJourneyCampaign;
    const Map = LazyMapViewer;
    const activeCampaign = campaign?.value ?? undefined;
    const campaignProps = registry.journey.bindCampaignProps({
      campaign: activeCampaign,
      campaigns: activeCampaign ? [{ id: String(activeCampaign.id), name: activeCampaign.name, description: activeCampaign.description }] : [],
      activeCampaignId: activeCampaign ? String(activeCampaign.id) : undefined,
      activeCampaignName: activeCampaign?.name,
      status: campaignStatus(campaign?.status),
      error: campaign?.errorMessage,
    });
    const content = <Journey {...campaignProps} mapPanel={<Map {...registry.journey.bindMapProps({ markers: [] })} />} journalPanel={<JournalRoute registry={registry} campaign={campaign} />} />;
    return registry.journey.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.journey.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
  }
  if (match.kind === "compendium") {
    return <CompendiumRoute registry={registry} />;
  }
  if (match.kind === "collaboration") return <CollaborationRoute registry={registry} campaign={campaign} navigate={navigate} />;
  if (match.kind === "session") return <SessionRoute registry={registry} match={match} />;
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

/** Small History API router: keeps the shell usable without adding a package. */
export function AppRouter({ renderRoute, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated, syncState, syncMessage, initialPath, diceOverlayController, ...shellProps }: AppRouterProps) {
  const navigation = useAppNavigation(initialPath);
  const accountAuth = registry?.account.auth;
  const membership = registry?.membership;
  const [accountSession, setAccountSession] = useState(() => accountAuth?.currentSession() ?? null);
  const [isCampaignMaster, setIsCampaignMaster] = useState(false);
  const localIdentity = membership?.localActor();
  const actorId = accountSession ? asAccountId(accountSession.uid) : localIdentity?.accountId;
  const activeCampaignId = campaign?.value?.id;

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
    setIsCampaignMaster(false);
    if (!membership || !actorId || !activeCampaignId) return () => { current = false; };
    void membership.listMemberships({ actorId, campaignId: activeCampaignId }).then((result) => {
      if (!current || !result.ok) return;
      const ownMembership = result.value.find((item) => item.accountId === actorId);
      setIsCampaignMaster(ownMembership?.role === "master" && ownMembership.status === "active");
    }).catch(() => {
      if (current) setIsCampaignMaster(false);
    });
    return () => { current = false; };
  }, [activeCampaignId, actorId, membership]);

  const diceState = useSyncExternalStore(
    diceOverlayController?.subscribe ?? EMPTY_DICE_SUBSCRIBE,
    diceOverlayController?.getSnapshot ?? EMPTY_DICE_GET_SNAPSHOT,
    diceOverlayController?.getSnapshot ?? EMPTY_DICE_GET_SNAPSHOT,
  );
  const actionsDice: ActionsDice | undefined = diceOverlayController ? {
    history: diceState.history,
    busy: diceState.status === "rolling" || diceState.status === "saving" || diceState.awaitingPhysics,
    onRoll: (faces) => {
      const characterId = character?.value?.id;
      diceOverlayController.open({ source: "actions", ...(characterId ? { characterId } : {}), formula: `1d${faces}` });
      void diceOverlayController.roll();
    },
  } : undefined;
  const outlet = renderRoute?.(navigation.match) ?? (registry ? renderRegistryRoute(navigation.match, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated, syncState, syncMessage, actionsDice, navigation.navigate, navigation.replace) : undefined) ?? (navigation.match.kind === "account" ? <LazyAccountPanel availability={{ available: false }} /> : navigation.match.kind === "settings" ? <LazySettingsPanel store={shellProps.settingsStore} /> : undefined);

  return (
    <AppShell
      {...shellProps}
      character={character}
      campaign={campaign}
      isCampaignMaster={isCampaignMaster}
      diceOverlayController={diceOverlayController}
      route={navigation.match}
      navigate={navigation.navigate}
    >
      <Suspense fallback={<RouteLoadingFallback />}>{outlet}</Suspense>
    </AppShell>
  );
}
