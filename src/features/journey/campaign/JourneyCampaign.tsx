import { CampaignPanel } from "./CampaignPanel";
import { CampaignRecords } from "./CampaignRecords";
import type { JourneyCampaignProps } from "./types";
import styles from "./campaign.module.css";

export function JourneyCampaign({ campaign, quests, npcs, onRecordIntent, ...panelProps }: JourneyCampaignProps) {
  return <div className={styles.workspace}><nav className={styles.tabs} aria-label="Seções da jornada"><a href="#journey-overview">Visão geral</a><a href="#journey-map">Mapa</a><a href="#journey-journal">Diário</a><a href="#journey-npcs">NPCs</a></nav><div id="journey-overview"><CampaignPanel {...panelProps} /></div><CampaignRecords quests={quests ?? campaign?.quests} npcs={npcs ?? campaign?.npcs} objectives={campaign?.objectives} onIntent={onRecordIntent} /></div>;
}
