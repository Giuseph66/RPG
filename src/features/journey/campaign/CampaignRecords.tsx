import { Button } from "@components/ui";

import type { CampaignRecordsProps } from "./types";
import styles from "./campaign.module.css";

export function CampaignRecords({ quests = [], npcs = [], objectives = [], onIntent }: CampaignRecordsProps) {
  return <div className={styles.records}>
    <section aria-labelledby="campaign-objectives-title"><div className={styles.sectionHeading}><h2 id="campaign-objectives-title">Objetivos</h2><span>{objectives.length}</span></div>{objectives.length === 0 ? <p className={styles.muted}>Nenhum objetivo registrado.</p> : <ul className={styles.objectiveList}>{objectives.map((objective, index) => <li key={`${objective}-${index}`}>{objective}</li>)}</ul>}</section>
    <section aria-labelledby="campaign-quests-title"><div className={styles.sectionHeading}><h2 id="campaign-quests-title">Missões</h2><span>{quests.length}</span></div>{quests.length === 0 ? <p className={styles.muted}>Nenhuma missão registrada.</p> : <ul className={styles.recordList}>{quests.map((quest) => <li key={String(quest.id)}><div><strong>{quest.title}</strong><p>{quest.description}</p><span className={styles.recordMeta}>Estado: {quest.status === "completed" ? "Concluída" : quest.status === "failed" ? "Falhou" : quest.status === "abandoned" ? "Abandonada" : "Ativa"}</span></div>{quest.status === "active" ? <Button size="sm" variant="secondary" onClick={() => onIntent?.({ kind: "complete-quest", questId: String(quest.id) })}>Concluir</Button> : null}</li>)}</ul>}</section>
    <section aria-labelledby="campaign-npcs-title"><div className={styles.sectionHeading}><h2 id="campaign-npcs-title">NPCs</h2><span>{npcs.length}</span></div>{npcs.length === 0 ? <p className={styles.muted}>Nenhum NPC registrado.</p> : <ul className={styles.recordList}>{npcs.map((npc) => <li key={String(npc.id)}><div><strong>{npc.name}</strong><p>{npc.description}</p><span className={styles.recordMeta}>{npc.linkedEntityIds.length} vínculo(s)</span></div></li>)}</ul>}</section>
  </div>;
}
