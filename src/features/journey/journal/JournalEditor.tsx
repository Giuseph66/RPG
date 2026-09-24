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
        <label className={styles.field}><span className={styles.fieldLabel}>Notas da sessão</span><textarea aria-label="Notas da sessão" placeholder="O que aconteceu? O que ficou pendente? Quem apareceu?" value={draft.body} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { body: event.currentTarget.value } })} onKeyDown={onKeyDown} rows={8} /></label>
        <div className={styles.twoColumns}>
          <Input label="Sessão" type="number" min={1} step={1} value={draft.sessionNumber ?? ""} disabled={!onIntent || status === "saving"} onChange={(event) => { const value = event.currentTarget.value; send(onIntent, { kind: "update-draft", patch: { sessionNumber: value === "" ? undefined : Number(value) } }); }} />
          <Input label="Tags" placeholder="Ex.: pistas, combate" value={draft.tags.join(", ")} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { tags: event.currentTarget.value.split(",").map((tag) => tag.trim()).filter(Boolean) } })} />
        </div>
        <div className={styles.links}>
          <h3><LinkSimple size={18} aria-hidden="true" /> Referências</h3>
          {links.length === 0 ? <p className={styles.muted}>Este registro ainda não tem referências a personagens ou lugares.</p> : <ul>{links.map((link) => <li key={String(link.id)}><span>{link.label ?? "Referência da campanha"}</span>{link.exists ? null : <span className={styles.orphan}>Vínculo ausente</span>}</li>)}</ul>}
        </div>
        <details className={styles.advancedLinks}><summary>Referências avançadas</summary><Input label="IDs de vínculos" hint="Para importar ou ligar registros por identificador interno." value={draft.linkedEntityIds.map(String).join(", ")} disabled={!onIntent || status === "saving"} onChange={(event) => send(onIntent, { kind: "update-draft", patch: { linkedEntityIds: event.currentTarget.value.split(",").map((id) => id.trim()).filter(Boolean) as never } })} /></details>
      </div>
      <div className={styles.editorActions}>
        <Button variant="primary" disabled={!onIntent || status === "saving"} onClick={() => send(onIntent, { kind: "save-draft" })}><FloppyDisk size={17} aria-hidden="true" /> Salvar</Button>
        <Button variant="ghost" disabled={!onIntent || status === "saving"} onClick={() => send(onIntent, { kind: "discard-draft" })}>Descartar alterações</Button>
      </div>
      <p className={styles.keyboardHint}>Dica: Ctrl+S salva o rascunho sem interpretar o texto como HTML.</p>
    </section>
  );
}

export function JournalEntryList({ entries, totalEntries = entries.length, selectedEntryId, searchQuery = "", onSearch, onSelect, onCreate }: JournalEntryListProps) {
  return <section className={styles.entryList} aria-labelledby="journal-entry-list-title">
    <div className={styles.panelHeading}><div className={styles.headingTitle}><span className={styles.headingIcon} aria-hidden="true"><BookOpen size={21} weight="duotone" /></span><div><p className={styles.eyebrow}>ARQUIVO</p><h2 id="journal-entry-list-title">Diário</h2></div></div>{onCreate ? <Button size="sm" variant="secondary" aria-label="Criar registro" onClick={onCreate}><Plus size={17} aria-hidden="true" /> Novo</Button> : null}</div>
    <Input label="Buscar no diário" value={searchQuery} onChange={(event) => onSearch?.(event.currentTarget.value)} placeholder="Título, nota ou tag" />
    <p className={styles.entryCount}>{searchQuery ? `${entries.length} de ${totalEntries} registros` : `${totalEntries} ${totalEntries === 1 ? "registro" : "registros"}`}</p>
    {entries.length === 0 ? <div className={styles.listEmpty}><strong>{searchQuery ? "Nada encontrado" : "Nenhum registro ainda. A primeira sessão pode começar por aqui."}</strong><span>{searchQuery ? "Tente outro termo ou tag." : "Guarde os acontecimentos, pistas e decisões importantes."}</span></div> : <ul>{entries.map((entry) => <li key={String(entry.id)}><button type="button" aria-current={selectedEntryId === String(entry.id) ? "true" : undefined} onClick={() => onSelect?.(String(entry.id))}><strong>{entry.title || "Registro sem título"}</strong><span>{entry.sessionNumber ? `Sessão ${entry.sessionNumber}` : "Anotação livre"}{entry.tags.length ? ` · ${entry.tags.slice(0, 2).join(" · ")}` : ""}</span>{entry.body ? <p>{entry.body.slice(0, 100)}{entry.body.length > 100 ? "…" : ""}</p> : null}</button></li>)}</ul>}
  </section>;
}
