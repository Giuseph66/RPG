import { useState } from "react";

import { JournalEditor, JournalEntryList } from "./JournalEditor";
import type { JournalEditorProps, JournalEntryListProps } from "./types";
import styles from "./journal.module.css";

export interface JournalWorkspaceProps extends JournalEditorProps, JournalEntryListProps {}

export function JournalWorkspace({ entries, selectedEntryId, onSelect, ...editorProps }: JournalWorkspaceProps) {
  const [mobileView, setMobileView] = useState<"list" | "editor">(selectedEntryId ? "editor" : "list");
  const selectEntry = (id: string) => { onSelect?.(id); setMobileView("editor"); };
  const createEntry = () => { editorProps.onCreateEntry?.(); setMobileView("editor"); };
  return <div id="journey-journal" className={[styles.workspace, mobileView === "editor" ? styles.editorView : styles.listView].join(" ")}><JournalEntryList entries={entries} selectedEntryId={selectedEntryId} onSelect={selectEntry} /><JournalEditor {...editorProps} onCreateEntry={editorProps.onCreateEntry ? createEntry : undefined} onBackToList={() => setMobileView("list")} /></div>;
}

export const JourneyJournal = JournalWorkspace;
