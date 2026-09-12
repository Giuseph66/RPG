import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AppShell, type AppShellProps } from "@components/layout/AppShell";
import { InlineStatus } from "@components/ui";
import type { Character, CharacterDraft } from "@domain/contracts/character";
import type { Campaign } from "@domain/contracts/campaign";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { Revision } from "@domain/contracts/versioning";
import type { StoreStatus } from "@application/state";
import type { ActionCapability } from "@features/actions";
import type { CompendiumCategoryId, CompendiumDetail, CompendiumFilters } from "@application/compendium";
import { Compendium } from "@features/compendium";
import type { FeatureRegistry } from "./feature-registry";
import { SettingsPanel } from "@features/settings";
import { matchRoute, type RouteMatch } from "./routes";

/** Mesma constante de apresentação usada em `bootstrap.tsx` para derivar as capacidades; aqui só
 * informa à UI quais tipos de ação existem, sem decidir se o jogador pode agir agora. */
const AVAILABLE_ACTION_KINDS = ["action", "bonus-action", "reaction", "free"] as const;

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
}

export interface AppNavigation {
  readonly path: string;
  readonly match: RouteMatch;
  readonly navigate: (to: string) => void;
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
}: {
  readonly registry: FeatureRegistry;
  readonly pack: RulePack;
  readonly createDraft: () => CharacterDraft;
  readonly onCharacterCreated?: (character: Character, revision: Revision) => void;
}) {
  const [draft, setDraft] = useState<CharacterDraft>(createDraft);
  const Creation = registry.character.components.Creation;
  return (
    <Creation
      {...registry.character.bindCreationProps({
        draft,
        catalog: pack,
        onDraftChange: setDraft,
        onCreated: onCharacterCreated,
      })}
    />
  );
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

  const CompendiumComponent = registry.compendium.component ?? Compendium;
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
): ReactNode | undefined {
  const currentCharacter = character?.value ?? undefined;
  if (match.kind === "character") {
    if (match.params.mode === "create") {
      if (registry.character.pendingDependencies.length === 0 && pack && createDraft) {
        return <CreateCharacterRoute registry={registry} pack={pack} createDraft={createDraft} onCharacterCreated={onCharacterCreated} />;
      }
      return <PendingDestination title="Criação de personagem" reasons={registry.character.pendingDependencies.length ? registry.character.pendingDependencies : ["Catálogo e draft de criação não foram fornecidos nesta composição."]} />;
    }
    const Sheet = registry.character.components.Sheet;
    if (!currentCharacter) return <Sheet {...registry.character.bindSheetProps({ character: undefined, status: character?.status, error: character?.errorMessage })} />;
    const Inventory = registry.inventory.component;
    const inventory = currentCharacter.inventory.map((item) => ({ item, name: item.customName ?? String(item.equipmentRef.entityId) }));
    const sheet = <Sheet {...registry.character.bindSheetProps({ character: currentCharacter, status: character?.status, error: character?.errorMessage })} />;
    const inventoryView = <Inventory {...registry.inventory.bindProps({ items: inventory, currency: currentCharacter.currency })} />;
    return <div>{sheet}{registry.inventory.pendingDependencies.length ? <InlineStatus tone="warning">{registry.inventory.pendingDependencies.join(" ")}</InlineStatus> : null}{inventoryView}</div>;
  }
  if (match.kind === "actions") {
    const ActionPage = registry.actions.component;
    const content = <ActionPage {...registry.actions.bindProps({ character: currentCharacter, capabilities: actionCapabilities ?? [], availableActions: AVAILABLE_ACTION_KINDS })} />;
    return registry.actions.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.actions.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
  }
  if (match.kind === "journey") {
    const Journey = registry.journey.components.Campaign;
    const Map = registry.journey.components.Map;
    const activeCampaign = campaign?.value ?? undefined;
    const campaignProps = registry.journey.bindCampaignProps({
      campaign: activeCampaign,
      campaigns: activeCampaign ? [{ id: String(activeCampaign.id), name: activeCampaign.name, description: activeCampaign.description }] : [],
      activeCampaignId: activeCampaign ? String(activeCampaign.id) : undefined,
      activeCampaignName: activeCampaign?.name,
      status: campaignStatus(campaign?.status),
      error: campaign?.errorMessage,
    });
    const content = <div><Journey {...campaignProps} /><Map {...registry.journey.bindMapProps({ markers: [] })} /></div>;
    return registry.journey.pendingDependencies.length ? <div><InlineStatus tone="warning">{registry.journey.pendingDependencies.join(" ")}</InlineStatus>{content}</div> : content;
  }
  if (match.kind === "compendium") {
    return <CompendiumRoute registry={registry} />;
  }
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

  return useMemo(() => ({ path, match: matchRoute(path), navigate }), [path, navigate]);
}

/** Small History API router: keeps the shell usable without adding a package. */
export function AppRouter({ renderRoute, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated, initialPath, diceOverlayController, ...shellProps }: AppRouterProps) {
  const navigation = useAppNavigation(initialPath);
  const outlet = renderRoute?.(navigation.match) ?? (registry ? renderRegistryRoute(navigation.match, registry, character, campaign, actionCapabilities, pack, createDraft, onCharacterCreated) : undefined) ?? (navigation.match.kind === "settings" ? <SettingsPanel store={shellProps.settingsStore} /> : undefined);

  return (
    <AppShell
      {...shellProps}
      character={character}
      diceOverlayController={diceOverlayController}
      route={navigation.match}
      navigate={navigation.navigate}
    >
      {outlet}
    </AppShell>
  );
}
