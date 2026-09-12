import { JournalEditor, JournalEntryList } from "./JournalEditor";
import type { JournalEditorProps, JournalEntryListProps } from "./types";
import styles from "./journal.module.css";

export interface JournalWorkspaceProps extends JournalEditorProps, JournalEntryListProps {}

export function JournalWorkspace({ entries, selectedEntryId, onSelect, ...editorProps }: JournalWorkspaceProps) {
  return <div className={styles.workspace}><JournalEntryList entries={entries} selectedEntryId={selectedEntryId} onSelect={onSelect} /><JournalEditor {...editorProps} /></div>;
}

export const JourneyJournal = JournalWorkspace;
