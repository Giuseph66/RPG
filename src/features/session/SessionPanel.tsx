import { useEffect, useState } from "react";
import { asAccountId } from "@domain/contracts/ids";
import type { CampaignSession, SessionAttendance } from "@domain/session";
import { Button, InlineStatus, Input, SectionCard } from "@components/ui";
import type { SessionPanelProps } from "./types";
import styles from "./session.module.css";

const statusLabel: Record<CampaignSession["status"], string> = { planned: "Planejada", active: "Em andamento", ended: "Encerrada" };

export function SessionPanel({ session, authSession, campaignId, characters = [], syncState = "local" }: SessionPanelProps) {
  const localActor = session?.localActor?.();
  const accountId = authSession ? asAccountId(authSession.uid) : localActor?.accountId;
  const [sessions, setSessions] = useState<readonly CampaignSession[]>([]);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Record<string, Record<string, boolean>>>({});

  async function load() {
    if (!session || !campaignId) { setSessions([]); return; }
    const result = await session.list(campaignId);
    if (result.ok) setSessions(result.value);
    else setMessage(result.error.message);
  }
  useEffect(() => { void load(); }, [session, campaignId]);

  async function create() {
    if (!session || !campaignId || !accountId) return;
    const parsed = Number(number);
    if (!Number.isInteger(parsed) || parsed < 1) { setMessage("Informe um número de sessão válido."); return; }
    setBusy(true); setMessage(undefined);
    const result = await session.create({ campaignId, accountId, number: parsed, title: title.trim() || undefined });
    setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setNumber(""); setTitle(""); setMessage("Sessão criada localmente e aguardando sincronização."); await load(); }
  }

  async function update(id: CampaignSession["id"], action: "start" | "end" | "notes" | "attendance") {
    if (!session || !accountId) return;
    setBusy(true); setMessage(undefined);
    const current = sessions.find((item) => String(item.id) === String(id));
    const result = action === "start" ? await session.start(id, accountId) : action === "end" ? await session.end(id, accountId, notes[String(id)] ?? "") : action === "notes" ? await session.updateNotes(id, accountId, notes[String(id)] ?? "") : await session.setAttendance(id, accountId, characters.map((character) => ({ characterId: character.id, playerId: character.playerId, present: attendance[String(id)]?.[String(character.id)] ?? (current ? itemAttendance(current, character.id) : false) })));
    setBusy(false);
    if (!result.ok) setMessage(result.error.message); else { setMessage("Alteração salva localmente e aguardando sincronização."); await load(); }
  }

  if (!session || !accountId || !campaignId) return <section className={styles.panel} aria-labelledby="session-title"><p className={styles.eyebrow}>REGISTRO DA MESA</p><h1 id="session-title" className={styles.title} tabIndex={-1}>Sessões</h1><InlineStatus tone="info">Crie uma identidade local. Entre em uma conta para registrar sessões offline.</InlineStatus></section>;
  return <section className={styles.panel} aria-labelledby="session-title">
    <header><p className={styles.eyebrow}>REGISTRO DA MESA</p><h1 id="session-title" className={styles.title} tabIndex={-1}>Sessões</h1><p className={styles.intro}>Crie, acompanhe e encerre sessões sem depender da rede. {authSession ? "A sessão usa sua conta autenticada." : "A sessão usa sua identidade local neste dispositivo; ela não será enviada sem uma conta autenticada."} {syncState === "offline" ? "As mudanças serão enviadas quando voltar online." : "O registro local é preservado enquanto a sincronização estiver pendente."}</p></header>
    <InlineStatus tone={syncState === "offline" ? "warning" : syncState === "pending" ? "info" : "success"}>{syncState === "offline" ? "Offline" : syncState === "pending" ? "Sincronização pendente" : syncState === "local" ? "Somente neste dispositivo" : "Sincronizado"}</InlineStatus>
    <SectionCard heading="Nova sessão" headingLevel={2}><div className={styles.createForm}><Input label="Número" type="number" min={1} value={number} onChange={(event) => setNumber(event.target.value)} required /><Input label="Título (opcional)" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /><Button busy={busy} disabled={busy} onClick={() => void create()}>Criar sessão</Button></div></SectionCard>
    <div className={styles.sessionList}>{sessions.length === 0 ? <SectionCard heading="Histórico" headingLevel={2}><p className={styles.empty}>Nenhuma sessão registrada ainda.</p></SectionCard> : sessions.map((item) => <SectionCard key={String(item.id)} heading={`Sessão ${item.number} · ${item.title}`} headingLevel={2} actions={<span className={styles.badge}>{statusLabel[item.status]}</span>}><div className={styles.sessionCard}><label className={styles.textareaLabel} htmlFor={`session-notes-${item.id}`}>Notas e resumo</label><textarea id={`session-notes-${item.id}`} className={styles.textarea} value={notes[String(item.id)] ?? item.notes} onChange={(event) => setNotes((current) => ({ ...current, [String(item.id)]: event.target.value }))} rows={4} /><div className={styles.actions}>{item.status === "planned" ? <Button size="sm" disabled={busy} onClick={() => void update(item.id, "start")}>Iniciar</Button> : null}{item.status === "active" ? <Button size="sm" disabled={busy} onClick={() => void update(item.id, "end")}>Encerrar</Button> : null}<Button size="sm" variant="secondary" disabled={busy} onClick={() => void update(item.id, "notes")}>Salvar notas</Button></div>{characters.length > 0 ? <fieldset className={styles.attendance}><legend>Presença</legend>{characters.map((character) => <label key={String(character.id)} className={styles.checkRow}><input type="checkbox" checked={attendance[String(item.id)]?.[String(character.id)] ?? item.attendance.some((entry) => String(entry.characterId) === String(character.id) && entry.present)} onChange={(event) => setAttendance((current) => ({ ...current, [String(item.id)]: { ...(current[String(item.id)] ?? {}), [String(character.id)]: event.target.checked } }))} />{character.name}</label>)}<Button size="sm" variant="secondary" disabled={busy} onClick={() => void update(item.id, "attendance")}>Salvar presença</Button></fieldset> : null}</div></SectionCard>)}</div>
    {message ? <InlineStatus tone={message.includes("salva") || message.includes("criada") ? "success" : "error"}>{message}</InlineStatus> : null}
  </section>;
}

function itemAttendance(session: CampaignSession, characterId: CampaignSession["id"]): boolean {
  return session.attendance.some((entry) => String(entry.characterId) === String(characterId) && entry.present);
}
