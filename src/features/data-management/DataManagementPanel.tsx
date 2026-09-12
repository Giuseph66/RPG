import { useState } from "react";
import { Button, InlineStatus } from "@components/ui";
import type { DataManagementIntent, DataManagementProps } from "./types";
import styles from "./data-management.module.css";

export function DataManagementPanel({ characterId, campaignId, status = "idle", error, preview, pendingEnvelope, recovery = [], onIntent, className }: DataManagementProps) {
  const [mode, setMode] = useState<"copy" | "replace">("copy");
  const [resetScope, setResetScope] = useState<"characters" | "campaigns" | "assets" | "dice-history" | "all">("all");
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const send = (intent: DataManagementIntent) => onIntent?.(intent);
  return <section className={[styles.panel, className ?? ""].filter(Boolean).join(" ")} aria-labelledby="data-management-title">
    <div className={styles.heading}><div><p className={styles.eyebrow}>Dados locais</p><h1 id="data-management-title">Backup e recuperação</h1></div></div>
    {status === "loading" ? <InlineStatus tone="info">Processando dados locais…</InlineStatus> : null}
    {status === "error" ? <InlineStatus tone="error" assertive>{error ?? "Não foi possível concluir a operação."}</InlineStatus> : null}
    <div className={styles.actions}><h2>Backup manual</h2><div><Button disabled={!onIntent || !characterId} onClick={() => characterId && send({ kind: "export-character", characterId })}>Exportar personagem</Button><Button variant="secondary" disabled={!onIntent || !campaignId} onClick={() => campaignId && send({ kind: "export-campaign", campaignId })}>Exportar campanha</Button></div><label className={styles.file}>Importar JSON<input type="file" accept="application/json,.json" disabled={!onIntent} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; void file.text().then((json) => send({ kind: "import-json", json })); }} /></label></div>
    {preview ? <div className={styles.preview} aria-live="polite"><h2>Prévia da importação</h2><p>{preview.rootName} · {preview.kind} · {preview.estimatedBytes} bytes</p><p>{preview.conflicts.length ? `${preview.conflicts.length} conflito(s) encontrado(s).` : "Nenhum conflito encontrado."}</p><label>Política<select value={mode} onChange={(event) => setMode(event.currentTarget.value as typeof mode)}><option value="copy">Criar cópia</option><option value="replace">Substituir</option></select></label><Button disabled={!onIntent || !pendingEnvelope || preview.conflicts.length > 0 || status === "saving"} onClick={() => pendingEnvelope && send({ kind: "commit-import", envelope: pendingEnvelope, mode })}>Confirmar importação</Button></div> : null}
    <div className={styles.recovery}><h2>Registros para recuperação</h2>{recovery.length === 0 ? <p>Nenhum registro corrompido preservado.</p> : recovery.map((record) => <article key={record.id}><span>{record.sourceStore} · {record.id}</span><div><Button size="sm" onClick={() => send({ kind: "restore-recovery", id: record.id })}>Restaurar</Button><Button size="sm" variant="secondary" onClick={() => send({ kind: "discard-recovery", id: record.id })}>Descartar</Button></div></article>)}</div>
    <div className={styles.reset}><h2>Reset seletivo</h2><label>Alcance<select value={resetScope} onChange={(event) => setResetScope(event.currentTarget.value as typeof resetScope)}><option value="all">Todos os dados</option><option value="characters">Personagens</option><option value="campaigns">Campanhas</option><option value="assets">Anexos</option><option value="dice-history">Histórico de rolagens</option></select></label><label className={styles.checkbox}><input type="checkbox" checked={resetConfirmed} onChange={(event) => setResetConfirmed(event.currentTarget.checked)} /> Confirmo o reset</label><Button variant="danger" disabled={!onIntent || !resetConfirmed || status === "saving"} onClick={() => { send({ kind: "reset", request: { scope: resetScope, confirmation: "explicit" } }); setResetConfirmed(false); }}>Resetar</Button></div>
  </section>;
}

export const DataManagement = DataManagementPanel;
