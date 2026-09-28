import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@components/ui";

import { JournalEditor, JournalEntryList } from "./JournalEditor";
import type { JournalEditorProps, JournalEntryListProps } from "./types";
import styles from "./journal.module.css";

export interface JournalWorkspaceProps extends JournalEditorProps, JournalEntryListProps {
  /** Mestre: autores dos diários da campanha. O primeiro é quem está lendo. */
  readonly authors?: readonly { readonly id: string; readonly name: string }[];
  /** Autor pré-selecionado (ex.: "Ler diário" de um jogador). */
  readonly authorFilter?: string;
}

export function JournalWorkspace({ entries, selectedEntryId, onSelect, authors, authorFilter, ...editorProps }: JournalWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [author, setAuthor] = useState(authorFilter ?? "all");
  useEffect(() => setAuthor(authorFilter ?? "all"), [authorFilter]);
  const viewerId = authors?.[0]?.id;
  // Registros sem autor são anteriores aos diários individuais e pertencem ao mestre.
  const authorOf = (entry: (typeof entries)[number]) => entry.authorId ?? viewerId;
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return [...entries].filter((entry) => (author === "all" || authorOf(entry) === author) && (!query || [entry.title, entry.body, ...entry.tags].join(" ").toLocaleLowerCase().includes(query)));
  }, [author, entries, searchQuery, viewerId]);
  const authorName = authors && authors.length > 1 ? (entry: (typeof entries)[number]) => authors.find((item) => item.id === authorOf(entry))?.name : undefined;
  // O mestre lê o diário dos jogadores, mas só o autor edita (as regras do Firestore também exigem isso).
  const readOnly = (id: string | undefined) => {
    const entry = id ? entries.find((item) => String(item.id) === id) : undefined;
    return Boolean(entry && viewerId && authorOf(entry) !== viewerId);
  };
  const selectEntry = (id: string) => { onSelect?.(id); setEditorOpen(true); };
  const createEntry = () => { editorProps.onCreateEntry?.(); setEditorOpen(true); };
  return <div id="journey-journal" className={styles.workspace}>
    {authors && authors.length > 1 ? <div className={styles.authorFilter} role="group" aria-label="Diário de quem">
      <button type="button" aria-pressed={author === "all"} onClick={() => setAuthor("all")}>Todos</button>
      {authors.map((item, index) => <button key={item.id} type="button" aria-pressed={author === item.id} onClick={() => setAuthor(item.id)}>{index === 0 ? "Meu diário" : item.name}<small>{entries.filter((entry) => authorOf(entry) === item.id).length}</small></button>)}
    </div> : null}
    <JournalEntryList entries={filteredEntries} totalEntries={entries.length} selectedEntryId={selectedEntryId} searchQuery={searchQuery} onSearch={setSearchQuery} onSelect={selectEntry} onCreate={editorProps.onCreateEntry ? createEntry : undefined} authorName={authorName} />
    <AppModal open={editorOpen} title={editorProps.draft.entryId ? "Registro do diário" : "Novo registro"} onClose={() => setEditorOpen(false)} className={styles.journalDialog}><JournalEditor {...editorProps} onIntent={readOnly(editorProps.draft.entryId ? String(editorProps.draft.entryId) : undefined) ? undefined : editorProps.onIntent} onCreateEntry={editorProps.onCreateEntry ? createEntry : undefined} onBackToList={() => setEditorOpen(false)} /></AppModal>
  </div>;
}

export const JourneyJournal = JournalWorkspace;
