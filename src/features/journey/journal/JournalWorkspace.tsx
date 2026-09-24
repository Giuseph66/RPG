import { useMemo, useState } from "react";
import { BookOpen, Plus } from "@phosphor-icons/react";
import { Button } from "@components/ui";

import { JournalEditor, JournalEntryList } from "./JournalEditor";
import type { JournalEditorProps, JournalEntryListProps } from "./types";
import styles from "./journal.module.css";

export interface JournalWorkspaceProps extends JournalEditorProps, JournalEntryListProps {}

export function JournalWorkspace({ entries, selectedEntryId, onSelect, ...editorProps }: JournalWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "editor">(selectedEntryId ? "editor" : "list");
  const [createOpen, setCreateOpen] = useState(false);
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return [...entries].filter((entry) => !query || [entry.title, entry.body, ...entry.tags].join(" ").toLocaleLowerCase().includes(query));
  }, [entries, searchQuery]);
  const selectEntry = (id: string) => { onSelect?.(id); setCreateOpen(false); setMobileView("editor"); };
  const createEntry = () => { editorProps.onCreateEntry?.(); setCreateOpen(true); setMobileView("editor"); };
  const showEditor = Boolean(selectedEntryId || createOpen || editorProps.draft.entryId);
  return <div id="journey-journal" className={[styles.workspace, mobileView === "editor" ? styles.editorView : styles.listView].join(" ")}><JournalEntryList entries={filteredEntries} totalEntries={entries.length} selectedEntryId={selectedEntryId} searchQuery={searchQuery} onSearch={setSearchQuery} onSelect={selectEntry} onCreate={editorProps.onCreateEntry ? createEntry : undefined} /><div className={styles.editorPane}>{showEditor ? <JournalEditor {...editorProps} onCreateEntry={editorProps.onCreateEntry ? createEntry : undefined} onBackToList={() => setMobileView("list")} /> : <section className={styles.editorWelcome}><BookOpen size={30} weight="duotone" aria-hidden="true" /><p className={styles.eyebrow}>ARQUIVO DA CAMPANHA</p><h2>As histórias da mesa, em ordem.</h2><p>Escolha um registro para reler ou abra uma página nova para guardar a próxima sessão.</p>{editorProps.onCreateEntry ? <Button onClick={createEntry}><Plus size={17} aria-hidden="true" /> Criar registro</Button> : null}</section>}</div></div>;
}

export const JourneyJournal = JournalWorkspace;
