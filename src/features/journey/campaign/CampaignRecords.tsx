import { Button } from "@components/ui";
import { CheckCircle, Flag, Scroll } from "@phosphor-icons/react";

import type { CampaignRecordsProps } from "./types";
import styles from "./campaign.module.css";

/** Objetivos e missões da campanha. O elenco vive em `features/journey/creatures`. */
export function CampaignRecords({ quests = [], objectives = [], onIntent, sections = ["objectives", "quests"] }: CampaignRecordsProps) {
  const showObjectives = sections.includes("objectives");
  const showQuests = sections.includes("quests");
  const layout = sections.length === 1 ? "single" : sections.length === 2 ? "summary" : "full";

  return <div className={styles.records} data-layout={layout}>
    {showObjectives ? <section aria-labelledby="campaign-objectives-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Flag size={20} weight="duotone" /></span><h2 id="campaign-objectives-title">Objetivos</h2><span>{objectives.length}</span></div>{objectives.length === 0 ? <p className={styles.muted}>Nenhum objetivo registrado.</p> : <ul className={styles.objectiveList}>{objectives.map((objective, index) => <li key={String(objective) + "-" + index}>{objective}</li>)}</ul>}</section> : null}
    {showQuests ? <section aria-labelledby="campaign-quests-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Scroll size={20} weight="duotone" /></span><h2 id="campaign-quests-title">Missões</h2><span>{quests.length}</span></div>{quests.length === 0 ? <p className={styles.muted}>Nenhuma missão registrada.</p> : <ul className={styles.recordList}>{quests.map((quest) => <li key={String(quest.id)}><div><strong>{quest.title}</strong><p>{quest.description}</p><span className={styles.recordMeta}>{quest.status === "completed" ? "Concluída" : quest.status === "failed" ? "Falhou" : quest.status === "abandoned" ? "Abandonada" : "Ativa"}</span></div>{quest.status === "active" && onIntent ? <Button size="sm" variant="secondary" onClick={() => onIntent?.({ kind: "complete-quest", questId: String(quest.id) })}><CheckCircle size={17} aria-hidden="true" /> Concluir</Button> : null}</li>)}</ul>}</section> : null}
  </div>;
}
