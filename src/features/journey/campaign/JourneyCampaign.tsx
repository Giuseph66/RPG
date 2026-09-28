import { useEffect, useState } from "react";
import { Button, Tabs } from "@components/ui";
import { ArrowsClockwise, BookOpen, ChatCircleDots, Eye } from "@phosphor-icons/react";
import { CampaignPanel } from "./CampaignPanel";
import { CampaignRecords } from "./CampaignRecords";
import type { JourneyCampaignProps, JourneySectionId } from "./types";
import styles from "./campaign.module.css";

const PLAYER_TABS = new Set(["overview", "map", "journal", "npcs"]);

function PlayerJourneys({ journeys = [], onOpen }: { readonly journeys?: JourneyCampaignProps["playerJourneys"]; readonly onOpen?: (accountId: string) => void }) {
  if (journeys.length === 0) return null;
  return <section className={styles.journeys} aria-labelledby="player-journeys-title">
    <div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Eye size={20} weight="duotone" /></span><h2 id="player-journeys-title">Jornadas dos jogadores</h2><span>{journeys.length}</span></div>
    <ul>{journeys.map((journey) => <li key={journey.accountId}>
      <div><strong>{journey.name}</strong>{journey.detail ? <small>{journey.detail}</small> : null}</div>
      <dl><div><dt>Diário</dt><dd>{journey.journalEntries}</dd></div><div><dt>Conhece</dt><dd>{journey.creaturesKnown}</dd></div><div><dt>Palpites</dt><dd>{journey.guesses}</dd></div></dl>
      {onOpen ? <Button size="sm" variant="secondary" onClick={() => onOpen(journey.accountId)}><BookOpen size={16} aria-hidden="true" /> Ler diário</Button> : null}
    </li>)}</ul>
  </section>;
}

export function JourneyCampaign({ campaign, quests, onRecordIntent, mapPanel, journalPanel, sessionsPanel, participantsPanel, creaturesPanel, role, playerJourneys, onOpenPlayerJourney, refresh, requestedTabId, onTabChange, availableCharacters: _characters, onCreateSheet: _create, onOpenSheet: _open, raceOptions: _races, classOptions: _classes, onGenerateSheet: _generate, npcs: _npcs, ...panelProps }: JourneyCampaignProps) {
  const player = role === "player";
  const allowed = (id: string) => !player || PLAYER_TABS.has(id);
  const initial = requestedTabId && allowed(requestedTabId) ? requestedTabId : "overview";
  const [activeTab, setActiveTab] = useState(initial);
  useEffect(() => setActiveTab(requestedTabId && allowed(requestedTabId) ? requestedTabId : "overview"), [requestedTabId, player]);
  const openTab = (id: string) => { setActiveTab(id); onTabChange?.(id); };
  const records = { quests: quests ?? campaign?.quests, objectives: campaign?.objectives, onIntent: player ? undefined : onRecordIntent };
  const baseStats = { objectives: records.objectives?.length ?? 0, activeQuests: records.quests?.filter((quest) => quest.status === "active").length ?? 0 };
  const sectionLinks: readonly JourneySectionId[] = player ? ["map", "journal", "npcs"] : ["map", "journal", "npcs", "sessions"];
  const overview = <div className={styles.overview}>
    <CampaignPanel {...panelProps} eyebrow={player ? "Jornada · sua visão" : "Jornada · visão do mestre"} canDelete={!player} sectionLinks={sectionLinks} overviewStats={{ ...baseStats, npcs: 0, enemies: 0 }} onOpenSection={(id) => openTab(id)} />
    {player ? null : <PlayerJourneys journeys={playerJourneys} onOpen={onOpenPlayerJourney} />}
    <CampaignRecords {...records} sections={["objectives", "quests"]} />
  </div>;
  const tabs = [
    { id: "overview", label: "Visão geral", panel: overview },
    { id: "map", label: "Mapa", panel: mapPanel ?? <p className={styles.muted}>O mapa da campanha ainda não está disponível.</p> },
    { id: "journal", label: player ? "Meu diário" : "Diário", panel: journalPanel ?? <p className={styles.muted}>O diário da campanha ainda não está disponível.</p> },
    { id: "npcs", label: "Elenco", panel: creaturesPanel ?? <p className={styles.muted}>Selecione uma campanha para ver o elenco.</p> },
    ...(player ? [] : [
      { id: "sessions", label: "Sessões", panel: sessionsPanel ?? <p className={styles.muted}>Selecione uma campanha para acompanhar as sessões.</p> },
      { id: "participants", label: "Participantes", panel: participantsPanel ?? <p className={styles.muted}>Selecione uma campanha para ver os participantes.</p> },
    ]),
  ];

  return <div className={styles.workspace}>
    {refresh ? <div className={styles.refreshBar}>
      <span className={styles.roleTag} data-role={player ? "player" : "master"}>{player ? <><ChatCircleDots size={14} aria-hidden="true" /> Jogador</> : <><Eye size={14} aria-hidden="true" /> Mestre</>}</span>
      {refresh.live ? <span className={styles.liveTag}><span className={styles.liveDot} aria-hidden="true" />Ao vivo</span> : null}
      <span aria-live="polite" className={[styles.refreshLabel, refresh.notice ? styles.refreshNotice : ""].join(" ")}>{refresh.refreshing ? "Atualizando…" : refresh.notice ?? refresh.label ?? (refresh.live ? "Mudanças da mesa aparecem sozinhas." : "Toque em atualizar para buscar novidades da mesa.")}</span>
      <Button size="sm" variant="ghost" disabled={refresh.refreshing} onClick={refresh.onRefresh}><ArrowsClockwise size={16} aria-hidden="true" className={refresh.refreshing ? styles.spinning : undefined} /> Atualizar</Button>
    </div> : null}
    <Tabs label="Seções da jornada" tabs={tabs} activeId={activeTab} onChange={openTab} />
  </div>;
}
