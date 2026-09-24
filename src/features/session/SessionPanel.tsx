import { useEffect, useMemo, useState } from "react";
import { asAccountId } from "@domain/contracts/ids";
import type { CampaignSession, EncounterCombatant, EncounterState, SessionAttendance } from "@domain/session";
import { Button, InlineStatus, Input, SectionCard } from "@components/ui";
import { ArrowsClockwise, Crown, Minus, Plus, SkipForward } from "@phosphor-icons/react";
import type { SessionPanelProps } from "./types";
import styles from "./session.module.css";

const statusLabel: Record<CampaignSession["status"], string> = { planned: "Planejada", active: "Em andamento", ended: "Encerrada" };

function encounterKey(combatant: EncounterCombatant): string {
  return combatant.entityType + ":" + combatant.entityId;
}

function EncounterBoard({ item, characters, npcs, busy, onSave }: {
  readonly item: CampaignSession;
  readonly characters: readonly import("./types").SessionCharacterOption[];
  readonly npcs: NonNullable<SessionPanelProps["npcs"]>;
  readonly busy: boolean;
  readonly onSave: (encounter: EncounterState | undefined) => void;
}) {
  const [selected, setSelected] = useState("");
  const [initiative, setInitiative] = useState("");
  const encounter = item.encounter ?? { round: 1, combatants: [] };
  const options = useMemo(() => [
    ...characters.map((character) => ({ key: "character:" + character.id, entityType: "character" as const, entityId: character.id, name: character.name, label: "Personagem", initiative: character.initiative })),
    ...npcs.map((npc) => ({ key: "npc:" + npc.id, entityType: "npc" as const, entityId: npc.id, name: npc.name, label: npc.kind === "enemy" ? "Ameaça" : "NPC", initiative: undefined })),
  ], [characters, npcs]);
  const ordered = useMemo(() => [...encounter.combatants].sort((left, right) => right.initiative - left.initiative || encounterKey(left).localeCompare(encounterKey(right))), [encounter.combatants]);
  const next = () => {
    if (ordered.length === 0) return;
    const activeIndex = ordered.findIndex((combatant) => encounterKey(combatant) === encounter.activeCombatantKey);
    const wraps = activeIndex < 0 || activeIndex === ordered.length - 1;
    const selectedCombatant = ordered[activeIndex < 0 ? 0 : (activeIndex + 1) % ordered.length];
    onSave({ ...encounter, round: encounter.round + (wraps && activeIndex >= 0 ? 1 : 0), activeCombatantKey: encounterKey(selectedCombatant) });
  };
  const add = () => {
    const [entityType, entityId] = selected.split(":");
    const score = Number(initiative);
    if ((entityType !== "character" && entityType !== "npc") || !entityId || !Number.isInteger(score)) return;
    const candidate: EncounterCombatant = { entityType, entityId: entityId as EncounterCombatant["entityId"], initiative: score };
    if (ordered.some((combatant) => encounterKey(combatant) === encounterKey(candidate))) return;
    onSave({ ...encounter, combatants: [...encounter.combatants, candidate] });
    setSelected(""); setInitiative("");
  };

  return <section className={styles.encounter} aria-labelledby={"encounter-title-" + item.id}>
    <header className={styles.encounterHeading}><div><p className={styles.eyebrow}>INICIATIVA · SESSÃO ATIVA</p><h3 id={"encounter-title-" + item.id}>Ordem do encontro</h3><p>A ordem registra turnos. PV e atributos vêm das fichas; ameaças narrativas não recebem valores inventados.</p></div><span className={styles.roundBadge}>Rodada <strong>{encounter.round}</strong></span></header>
    {options.length ? <div className={styles.encounterAdd}>
      <label><span>Adicionar ao encontro</span><select value={selected} onChange={(event) => { setSelected(event.currentTarget.value); const option = options.find((candidate) => candidate.key === event.currentTarget.value); setInitiative(option?.initiative === undefined ? "" : String(option.initiative)); }}><option value="">Escolha personagem ou NPC</option>{options.map((option) => <option key={option.key} value={option.key}>{option.name} · {option.label}</option>)}</select></label>
      <Input label="Iniciativa" type="number" step={1} value={initiative} onChange={(event) => setInitiative(event.currentTarget.value)} placeholder="Ex.: 14" />
      <Button size="sm" disabled={busy || !selected || !Number.isInteger(Number(initiative)) || ordered.some((entry) => encounterKey(entry) === selected)} onClick={add}><Plus size={16} aria-hidden="true" /> Adicionar</Button>
    </div> : <p className={styles.empty}>Vincule personagens ou registre NPCs e ameaças na Jornada para colocá-los no encontro.</p>}
    {ordered.length ? <ol className={styles.turnOrder}>{ordered.map((combatant, index) => {
      const key = encounterKey(combatant);
      const option = options.find((candidate) => candidate.key === key);
      const character = combatant.entityType === "character" ? characters.find((candidate) => candidate.id === combatant.entityId) : undefined;
      const active = encounter.activeCombatantKey === key;
      return <li key={key} data-active={active || undefined}><span className={styles.turnNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.turnCopy}><strong>{option?.name ?? "Participante removido"}</strong><small>{option?.label ?? "Registro"}{character?.hitPoints ? " · PV " + character.hitPoints.current + (character.hitPoints.maximum === undefined ? "" : "/" + character.hitPoints.maximum) : ""}</small></span><span className={styles.initiativeValue}>{combatant.initiative}</span>{active ? <span className={styles.activeTurn}><Crown size={14} aria-hidden="true" /> Em turno</span> : null}<Button size="sm" variant="ghost" aria-label={"Remover " + (option?.name ?? "participante")} disabled={busy} onClick={() => onSave({ ...encounter, combatants: encounter.combatants.filter((entry) => encounterKey(entry) !== key), activeCombatantKey: active ? undefined : encounter.activeCombatantKey })}><Minus size={16} aria-hidden="true" /></Button></li>;
    })}</ol> : <p className={styles.empty}>Adicione quem participa e informe a iniciativa para montar a ordem.</p>}
    <div className={styles.encounterActions}><Button size="sm" disabled={busy || ordered.length === 0} onClick={next}><SkipForward size={17} aria-hidden="true" /> Próximo turno</Button><Button size="sm" variant="secondary" disabled={busy || ordered.length === 0} onClick={() => onSave({ ...encounter, round: encounter.round + 1, activeCombatantKey: undefined })}><ArrowsClockwise size={16} aria-hidden="true" /> Nova rodada</Button>{encounter.combatants.length ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSave(undefined)}>Encerrar encontro</Button> : null}</div>
  </section>;
}

export function SessionPanel({ session, authSession, campaignId, characters = [], npcs = [], syncState = "local" }: SessionPanelProps) {
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

  async function saveEncounter(id: CampaignSession["id"], encounter: EncounterState | undefined) {
    if (!session || !accountId) return;
    setBusy(true); setMessage(undefined);
    const result = await session.setEncounter(id, accountId, encounter);
    setBusy(false);
    if (!result.ok) setMessage(result.error.message);
    else { setMessage("Ordem do encontro salva na sessão."); await load(); }
  }

  if (!session || !accountId || !campaignId) return <section className={styles.panel} aria-labelledby="session-title"><p className={styles.eyebrow}>REGISTRO DA MESA</p><h1 id="session-title" className={styles.title} tabIndex={-1}>Sessões</h1><InlineStatus tone="info">Crie uma identidade local. Entre em uma conta para registrar sessões offline.</InlineStatus></section>;
  return <section className={styles.panel} aria-labelledby="session-title">
    <header><p className={styles.eyebrow}>REGISTRO DA MESA</p><h1 id="session-title" className={styles.title} tabIndex={-1}>Sessões</h1><p className={styles.intro}>Crie, acompanhe e encerre sessões sem depender da rede. {authSession ? "A sessão usa sua conta autenticada." : "A sessão usa sua identidade local neste dispositivo; ela não será enviada sem uma conta autenticada."} {syncState === "offline" ? "As mudanças serão enviadas quando voltar online." : "O registro local é preservado enquanto a sincronização estiver pendente."}</p></header>
    <InlineStatus tone={syncState === "offline" ? "warning" : syncState === "pending" ? "info" : "success"}>{syncState === "offline" ? "Offline" : syncState === "pending" ? "Sincronização pendente" : syncState === "local" ? "Somente neste dispositivo" : "Sincronizado"}</InlineStatus>
    <SectionCard heading="Nova sessão" headingLevel={2}><div className={styles.createForm}><Input label="Número" type="number" min={1} value={number} onChange={(event) => setNumber(event.target.value)} required /><Input label="Título (opcional)" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /><Button busy={busy} disabled={busy} onClick={() => void create()}>Criar sessão</Button></div></SectionCard>
    <div className={styles.sessionList}>{sessions.length === 0 ? <SectionCard heading="Histórico" headingLevel={2}><p className={styles.empty}>Nenhuma sessão registrada ainda.</p></SectionCard> : sessions.map((item) => <SectionCard key={String(item.id)} heading={`Sessão ${item.number} · ${item.title}`} headingLevel={2} actions={<span className={styles.badge}>{statusLabel[item.status]}</span>}><div className={styles.sessionCard}><label className={styles.textareaLabel} htmlFor={`session-notes-${item.id}`}>Notas e resumo</label><textarea id={`session-notes-${item.id}`} className={styles.textarea} value={notes[String(item.id)] ?? item.notes} onChange={(event) => setNotes((current) => ({ ...current, [String(item.id)]: event.target.value }))} rows={4} /><div className={styles.actions}>{item.status === "planned" ? <Button size="sm" disabled={busy} onClick={() => void update(item.id, "start")}>Iniciar</Button> : null}{item.status === "active" ? <Button size="sm" disabled={busy} onClick={() => void update(item.id, "end")}>Encerrar</Button> : null}<Button size="sm" variant="secondary" disabled={busy} onClick={() => void update(item.id, "notes")}>Salvar notas</Button></div>{characters.length > 0 ? <fieldset className={styles.attendance}><legend>Presença</legend>{characters.map((character) => <label key={String(character.id)} className={styles.checkRow}><input type="checkbox" checked={attendance[String(item.id)]?.[String(character.id)] ?? item.attendance.some((entry) => String(entry.characterId) === String(character.id) && entry.present)} onChange={(event) => setAttendance((current) => ({ ...current, [String(item.id)]: { ...(current[String(item.id)] ?? {}), [String(character.id)]: event.target.checked } }))} />{character.name}</label>)}<Button size="sm" variant="secondary" disabled={busy} onClick={() => void update(item.id, "attendance")}>Salvar presença</Button></fieldset> : null}{item.status === "active" ? <EncounterBoard item={item} characters={characters} npcs={npcs} busy={busy} onSave={(encounter) => void saveEncounter(item.id, encounter)} /> : null}</div></SectionCard>)}</div>
    {message ? <InlineStatus tone={message.includes("salva") || message.includes("criada") ? "success" : "error"}>{message}</InlineStatus> : null}
  </section>;
}

function itemAttendance(session: CampaignSession, characterId: CampaignSession["id"]): boolean {
  return session.attendance.some((entry) => String(entry.characterId) === String(characterId) && entry.present);
}
