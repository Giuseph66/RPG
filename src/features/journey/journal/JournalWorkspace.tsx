import { useMemo, useState } from "react";
import { AppModal } from "@components/ui";

import { JournalEditor, JournalEntryList } from "./JournalEditor";
import type { JournalEditorProps, JournalEntryListProps } from "./types";
import styles from "./journal.module.css";

export interface JournalWorkspaceProps extends JournalEditorProps, JournalEntryListProps {}

export function JournalWorkspace({ entries, selectedEntryId, onSelect, ...editorProps }: JournalWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return [...entries].filter((entry) => !query || [entry.title, entry.body, ...entry.tags].join(" ").toLocaleLowerCase().includes(query));
  }, [entries, searchQuery]);
  const selectEntry = (id: string) => { onSelect?.(id); setEditorOpen(true); };
  const createEntry = () => { editorProps.onCreateEntry?.(); setEditorOpen(true); };
  return <div id="journey-journal" className={styles.workspace}>
    <JournalEntryList entries={filteredEntries} totalEntries={entries.length} selectedEntryId={selectedEntryId} searchQuery={searchQuery} onSearch={setSearchQuery} onSelect={selectEntry} onCreate={editorProps.onCreateEntry ? createEntry : undefined} />
    <AppModal open={editorOpen} title={editorProps.draft.entryId ? "Registro do diário" : "Novo registro"} onClose={() => setEditorOpen(false)} className={styles.journalDialog}><JournalEditor {...editorProps} onCreateEntry={editorProps.onCreateEntry ? createEntry : undefined} onBackToList={() => setEditorOpen(false)} /></AppModal>
  </div>;
}

export const JourneyJournal = JournalWorkspace;
