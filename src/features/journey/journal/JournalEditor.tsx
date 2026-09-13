import type { KeyboardEvent } from "react";

import { Button, InlineStatus, Input } from "@components/ui";
import { ArrowLeft, BookOpen, FloppyDisk, LinkSimple, Plus } from "@phosphor-icons/react";
import { type JournalDraftState } from "@domain/campaign/journal";

import type { JournalEditorProps, JournalEntryListProps, JournalIntent } from "./types";
import styles from "./journal.module.css";

function send(onIntent: JournalEditorProps["onIntent"], intent: JournalIntent): void { onIntent?.(intent); }

function statusLabel(status: JournalDraftState["status"]): { readonly tone: "info" | "success" | "warning" | "error"; readonly text: string } {
  switch (status) {
    case "saving": return { tone: "info", text: "Salvando rascunho…" };
    case "saved": return { tone: "success", text: "Salvo localmente." };
    case "error": return { tone: "error", text: "Falha ao salvar; o rascunho foi mantido." };
    case "conflict": return { tone: "warning", text: "Este registro mudou em outra aba." };
    case "dirty": return { tone: "info", text: "Alterações pendentes." };
    default: return { tone: "info", text: "Sem alterações pendentes." };
  }
}

export function JournalEditor({ draft, status = "clean", error, links = [], onIntent, onCreateEntry, onBackToList, className }: JournalEditorProps) {
  const statusInfo = statusLabel(status);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); send(onIntent, { kind: "save-draft" }); }
  };
  return (
    <section className={[styles.editor, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="journal-editor-title">
      <div className={styles.editorHeading}><div className={styles.headingTitle}>{onBackToList ? <Button className={styles.backButton} size="sm" variant="ghost" aria-label="Voltar para registros" onClick={onBackToList}><ArrowLeft size={18} aria-hidden="true" /></Button> : null}<span className={styles.headingIcon} aria-hidden="true"><BookOpen size={21} weight="duotone" /></span><div><p className={styles.eyebrow}>Diário da campanha</p><h2 id="journal-editor-title">{draft.entryId ? "Editar registro" : "Novo registro"}</h2></div></div>{onCreateEntry ? <Button size="sm" variant="secondary" onClick={onCreateEntry}><Plus size={17} aria-hidden="true" /> Novo registro</Button> : null}</div>
      <InlineStatus tone={statusInfo.tone}>{error ?? statusInfo.text}</InlineStatus>
      <div className={styles.editorFields}>
        <Input label="Título" required value={draft.title} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { title: event.currentTarget.value } })} />
        <label className={styles.field}><span className={styles.fieldLabel}>Resumo e notas</span><textarea aria-label="Resumo e notas" value={draft.body} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { body: event.currentTarget.value } })} onKeyDown={onKeyDown} rows={9} /></label>
        <div className={styles.twoColumns}>
          <Input label="Sessão" type="number" min={1} step={1} value={draft.sessionNumber ?? ""} disabled={!onIntent || status === "saving"} onChange={(event) => { const value = event.currentTarget.value; send(onIntent, { kind: "update-draft", patch: { sessionNumber: value === "" ? undefined : Number(value) } }); }} />
          <Input label="Tags" hint="Separe tags por vírgulas" value={draft.tags.join(", ")} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { tags: event.currentTarget.value.split(",").map((tag) => tag.trim()).filter(Boolean) } })} />
        </div>
        <Input label="IDs de vínculos" hint="Separe IDs por vírgulas" value={draft.linkedEntityIds.map(String).join(", ")} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { linkedEntityIds: event.currentTarget.value.split(",").map((id) => id.trim()).filter(Boolean) as never } })} />
        <div className={styles.links}>
          <h3><LinkSimple size={18} aria-hidden="true" /> Vínculos</h3>
          {links.length === 0 ? <p className={styles.muted}>Nenhum vínculo neste registro.</p> : <ul>{links.map((link) => <li key={String(link.id)}><span>{link.label ?? String(link.id)}</span>{link.exists ? null : <span className={styles.orphan}>Vínculo ausente</span>}</li>)}</ul>}
        </div>
      </div>
      <div className={styles.editorActions}>
        <Button variant="primary" disabled={!onIntent || status === "saving"} onClick={() => send(onIntent, { kind: "save-draft" })}><FloppyDisk size={17} aria-hidden="true" /> Salvar</Button>
        <Button variant="secondary" disabled={!onIntent || status === "saving"} onClick={() => send(onIntent, { kind: "reload-draft" })}>Recarregar</Button>
        <Button variant="ghost" disabled={!onIntent || status === "saving"} onClick={() => send(onIntent, { kind: "discard-draft" })}>Descartar alterações</Button>
      </div>
      <p className={styles.keyboardHint}>Dica: Ctrl+S salva o rascunho sem interpretar o texto como HTML.</p>
    </section>
  );
}

export function JournalEntryList({ entries, selectedEntryId, onSelect }: JournalEntryListProps) {
  return <section className={styles.entryList} aria-labelledby="journal-entry-list-title"><div className={styles.panelHeading}><div className={styles.headingTitle}><span className={styles.headingIcon} aria-hidden="true"><BookOpen size={21} weight="duotone" /></span><h2 id="journal-entry-list-title">Registros</h2></div><span>{entries.length}</span></div>{entries.length === 0 ? <p className={styles.muted}>Nenhum registro de sessão ainda.</p> : <ul>{entries.map((entry) => <li key={String(entry.id)}><button type="button" aria-current={selectedEntryId === String(entry.id) ? "true" : undefined} onClick={() => onSelect?.(String(entry.id))}><strong>{entry.title}</strong><span>{entry.sessionNumber ? `Sessão ${entry.sessionNumber}` : "Registro livre"}</span></button></li>)}</ul>}</section>;
}
