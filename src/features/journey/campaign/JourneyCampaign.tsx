import { Tabs } from "@components/ui";
import { CampaignPanel } from "./CampaignPanel";
import { CampaignRecords } from "./CampaignRecords";
import type { JourneyCampaignProps } from "./types";
import styles from "./campaign.module.css";

export function JourneyCampaign({ campaign, quests, npcs, onRecordIntent, mapPanel, journalPanel, ...panelProps }: JourneyCampaignProps) {
  const records = { quests: quests ?? campaign?.quests, npcs: npcs ?? campaign?.npcs, objectives: campaign?.objectives, onIntent: onRecordIntent };
  const tabs = [
    { id: "overview", label: "Visão geral", panel: <div className={styles.overview}><CampaignPanel {...panelProps} /><CampaignRecords {...records} sections={["objectives", "quests"]} /></div> },
    { id: "map", label: "Mapa", panel: mapPanel ?? <p className={styles.muted}>O mapa da campanha ainda não está disponível.</p> },
    { id: "journal", label: "Diário", panel: journalPanel ?? <p className={styles.muted}>O diário da campanha ainda não está disponível.</p> },
    { id: "npcs", label: "NPCs", panel: <CampaignRecords {...records} sections={["npcs"]} /> },
  ];

  return <div className={styles.workspace}><Tabs label="Seções da jornada" tabs={tabs} defaultActiveId="overview" keepMounted /></div>;
}
