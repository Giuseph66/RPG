import { useState } from "react";
import type { FormEvent } from "react";
import { Button, ConfirmModal, Input } from "@components/ui";
import { CheckCircle, Flag, Scroll } from "@phosphor-icons/react";

import type { CampaignRecordsProps } from "./types";
import styles from "./campaign.module.css";

/** Objetivos e missões da campanha. O elenco vive em `features/journey/creatures`. */
export function CampaignRecords({ quests = [], objectives = [], onIntent, sections = ["objectives", "quests"] }: CampaignRecordsProps) {
  const showObjectives = sections.includes("objectives");
  const showQuests = sections.includes("quests");
  const layout = sections.length === 1 ? "single" : sections.length === 2 ? "summary" : "full";
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [editingObjective, setEditingObjective] = useState<number>();
  const [questDraft, setQuestDraft] = useState({ title: "", description: "" });
  const [editingQuest, setEditingQuest] = useState<string>();
  const [questEditDraft, setQuestEditDraft] = useState({ title: "", description: "" });
  const [pendingDelete, setPendingDelete] = useState<{ readonly kind: "objective"; readonly index: number } | { readonly kind: "quest"; readonly questId: string }>();
  const editable = onIntent !== undefined;
  const submitObjective = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = objectiveDraft.trim();
    if (!text) return;
    onIntent?.(editingObjective === undefined ? { kind: "create-objective", text } : { kind: "update-objective", index: editingObjective, text });
    setObjectiveDraft("");
    setEditingObjective(undefined);
  };
  const submitQuest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!questDraft.title.trim()) return;
    onIntent?.({ kind: "create-quest", title: questDraft.title, description: questDraft.description });
    setQuestDraft({ title: "", description: "" });
  };
  const submitQuestEdit = (event: FormEvent<HTMLFormElement>, questId: string) => {
    event.preventDefault();
    if (!questEditDraft.title.trim()) return;
    onIntent?.({ kind: "update-quest", questId, patch: { title: questEditDraft.title, description: questEditDraft.description } });
    setEditingQuest(undefined);
  };

  return <div className={styles.records} data-layout={layout}>
    {showObjectives ? <section aria-labelledby="campaign-objectives-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Flag size={20} weight="duotone" /></span><h2 id="campaign-objectives-title">Objetivos</h2><span>{objectives.length}</span></div>{editable ? <form className={styles.npcForm} onSubmit={submitObjective}><Input label={editingObjective === undefined ? "Novo objetivo" : "Editar objetivo"} value={objectiveDraft} onChange={(event) => setObjectiveDraft(event.currentTarget.value)} maxLength={240} required /><div className={styles.npcFormActions}><Button size="sm" type="submit">{editingObjective === undefined ? "Adicionar objetivo" : "Salvar objetivo"}</Button>{editingObjective !== undefined ? <Button size="sm" variant="ghost" type="button" onClick={() => { setEditingObjective(undefined); setObjectiveDraft(""); }}>Cancelar</Button> : null}</div></form> : null}{objectives.length === 0 ? <p className={styles.muted}>Nenhum objetivo registrado.</p> : <ul className={styles.objectiveList}>{objectives.map((objective, index) => <li key={String(objective) + "-" + index}><span>{objective}</span>{editable ? <span className={styles.npcRowActions}><Button size="sm" variant="ghost" onClick={() => { setEditingObjective(index); setObjectiveDraft(objective); }}>Editar</Button><Button size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: "objective", index })}>Excluir</Button></span> : null}</li>)}</ul>}</section> : null}
    {showQuests ? <section aria-labelledby="campaign-quests-title"><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true"><Scroll size={20} weight="duotone" /></span><h2 id="campaign-quests-title">Missões</h2><span>{quests.length}</span></div>{editable ? <form className={styles.npcForm} onSubmit={submitQuest}><Input label="Título da missão" value={questDraft.title} onChange={(event) => { const value = event.currentTarget.value; setQuestDraft((current) => ({ ...current, title: value })); }} maxLength={120} required /><label className={styles.field}><span>Descrição</span><textarea value={questDraft.description} onChange={(event) => { const value = event.currentTarget.value; setQuestDraft((current) => ({ ...current, description: value })); }} maxLength={1000} rows={2} /></label><div className={styles.npcFormActions}><Button size="sm" type="submit">Adicionar missão</Button></div></form> : null}{quests.length === 0 ? <p className={styles.muted}>Nenhuma missão registrada.</p> : <ul className={styles.recordList}>{quests.map((quest) => <li key={String(quest.id)}>{editingQuest === String(quest.id) ? <form className={styles.npcForm} onSubmit={(event) => submitQuestEdit(event, String(quest.id))}><Input label="Título da missão" value={questEditDraft.title} onChange={(event) => { const value = event.currentTarget.value; setQuestEditDraft((current) => ({ ...current, title: value })); }} maxLength={120} required /><label className={styles.field}><span>Descrição</span><textarea value={questEditDraft.description} onChange={(event) => { const value = event.currentTarget.value; setQuestEditDraft((current) => ({ ...current, description: value })); }} maxLength={1000} rows={2} /></label><div className={styles.npcFormActions}><Button size="sm" type="submit">Salvar missão</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditingQuest(undefined)}>Cancelar</Button></div></form> : <><div><strong>{quest.title}</strong><p>{quest.description}</p><span className={styles.recordMeta}>{quest.status === "completed" ? "Concluída" : quest.status === "failed" ? "Falhou" : quest.status === "abandoned" ? "Abandonada" : "Ativa"}</span></div>{editable ? <span className={styles.npcRowActions}><Button size="sm" variant="ghost" onClick={() => { setEditingQuest(String(quest.id)); setQuestEditDraft({ title: quest.title, description: quest.description }); }}>Editar</Button>{quest.status === "active" ? <Button size="sm" variant="secondary" onClick={() => onIntent?.({ kind: "complete-quest", questId: String(quest.id) })}><CheckCircle size={17} aria-hidden="true" /> Concluir</Button> : null}<Button size="sm" variant="ghost" onClick={() => setPendingDelete({ kind: "quest", questId: String(quest.id) })}>Excluir</Button></span> : null}</>}</li>)}</ul>}</section> : null}
    <ConfirmModal open={pendingDelete !== undefined} title={pendingDelete?.kind === "objective" ? "Excluir objetivo" : "Excluir missão"} targetName={pendingDelete?.kind === "objective" ? objectives[pendingDelete.index] ?? "Objetivo" : quests.find((quest) => String(quest.id) === pendingDelete?.questId)?.title ?? "Missão"} description="Esta ação remove o registro da campanha e será salva na próxima confirmação." confirmLabel={pendingDelete?.kind === "objective" ? "Excluir objetivo" : "Excluir missão"} destructive onClose={() => setPendingDelete(undefined)} onConfirm={() => { const target = pendingDelete; if (target?.kind === "objective") onIntent?.({ kind: "delete-objective", index: target.index }); if (target?.kind === "quest") onIntent?.({ kind: "delete-quest", questId: target.questId }); setPendingDelete(undefined); }} />
  </div>;
}
