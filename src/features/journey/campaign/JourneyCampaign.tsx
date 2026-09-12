import { CampaignPanel } from "./CampaignPanel";
import { CampaignRecords } from "./CampaignRecords";
import type { JourneyCampaignProps } from "./types";
import styles from "./campaign.module.css";

export function JourneyCampaign({ campaign, quests, npcs, onRecordIntent, ...panelProps }: JourneyCampaignProps) {
  return <div className={styles.workspace}><CampaignPanel {...panelProps} /><CampaignRecords quests={quests ?? campaign?.quests} npcs={npcs ?? campaign?.npcs} objectives={campaign?.objectives} onIntent={onRecordIntent} /></div>;
}
