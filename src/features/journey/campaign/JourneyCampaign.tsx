import { useEffect, useState } from "react";
import { Tabs } from "@components/ui";
import { CampaignPanel } from "./CampaignPanel";
import { CampaignRecords } from "./CampaignRecords";
import type { JourneyCampaignProps } from "./types";
import styles from "./campaign.module.css";

export function JourneyCampaign({ campaign, quests, npcs, onRecordIntent, availableCharacters, onCreateSheet, onOpenSheet, raceOptions, classOptions, onGenerateSheet, mapPanel, journalPanel, sessionsPanel, participantsPanel, requestedTabId, onTabChange, ...panelProps }: JourneyCampaignProps) {
  const [activeTab, setActiveTab] = useState(requestedTabId ?? "overview");
  useEffect(() => setActiveTab(requestedTabId ?? "overview"), [requestedTabId]);
  const records = { quests: quests ?? campaign?.quests, npcs: npcs ?? campaign?.npcs, objectives: campaign?.objectives, onIntent: onRecordIntent, availableCharacters, onCreateSheet, onOpenSheet, raceOptions, classOptions, onGenerateSheet };
  const overviewStats = { objectives: records.objectives?.length ?? 0, activeQuests: records.quests?.filter((quest) => quest.status === "active").length ?? 0, npcs: records.npcs?.filter((npc) => !npc.kind || npc.kind === "npc").length ?? 0, enemies: records.npcs?.filter((npc) => npc.kind === "enemy").length ?? 0 };
  const tabs = [
    { id: "overview", label: "Visão geral", panel: <div className={styles.overview}><CampaignPanel {...panelProps} overviewStats={overviewStats} onOpenSection={(id) => { setActiveTab(id); onTabChange?.(id); }} /><CampaignRecords {...records} sections={["objectives", "quests"]} /></div> },
    { id: "map", label: "Mapa", panel: mapPanel ?? <p className={styles.muted}>O mapa da campanha ainda não está disponível.</p> },
    { id: "journal", label: "Diário", panel: journalPanel ?? <p className={styles.muted}>O diário da campanha ainda não está disponível.</p> },
    { id: "npcs", label: "NPCs", panel: <CampaignRecords {...records} sections={["npcs"]} /> },
    { id: "sessions", label: "Sessões", panel: sessionsPanel ?? <p className={styles.muted}>Selecione uma campanha para acompanhar as sessões.</p> },
    { id: "participants", label: "Participantes", panel: participantsPanel ?? <p className={styles.muted}>Selecione uma campanha para ver os participantes.</p> },
  ];

  return <div className={styles.workspace}><Tabs label="Seções da jornada" tabs={tabs} activeId={activeTab} onChange={(id) => { setActiveTab(id); onTabChange?.(id); }} /></div>;
}
