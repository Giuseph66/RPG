import { useMemo, useState } from "react";
import { AppModal, Button, InlineStatus } from "@components/ui";
import { ChatCircleDots, Eye, EyeSlash, LockSimple, PencilSimple, Plus, Trash, UsersThree } from "@phosphor-icons/react";
import {
  CREATURE_FIELD_LABELS,
  CREATURE_FIELDS,
  CREATURE_GUESS_FIELDS,
  CREATURE_KINDS,
  revealFor,
  setRevealField,
  setRevealPresence,
  type CreatureContent,
  type CreatureField,
  type CreatureGuess,
  type CreatureKind,
  type CreatureRecord,
} from "@domain/campaign/creatures";
import type { AccountId, Uuid } from "@domain/contracts/ids";

import { CreatureKindIcon, CreatureToolbar, countByKind, kindLabel, matchesQuery } from "./shared";
import type { CreatureBoardProps, CreatureFilter, JourneyPlayer } from "./types";
import styles from "./creatures.module.css";

const ALL = "*";
type Focus = AccountId | typeof ALL;

const EMPTY_CONTENT: CreatureContent = { kind: "unknown", name: "", appearance: "", race: "", description: "", hitPoints: "", armorClass: "", abilities: "", notes: "" };

function contentOf(creature: CreatureRecord): CreatureContent {
  return { kind: creature.kind, name: creature.name, appearance: creature.appearance, race: creature.race, description: creature.description, hitPoints: creature.hitPoints, armorClass: creature.armorClass, abilities: creature.abilities, notes: creature.notes, ...(creature.characterRef ? { characterRef: creature.characterRef } : {}) };
}

function fieldValue(creature: CreatureRecord, field: CreatureField): string {
  return field === "kind" ? kindLabel(creature.kind) : creature[field];
}

/** Quantas contas do foco enxergam o campo (ou a presença, quando `field` é omitido). */
function coverage(creature: CreatureRecord, accounts: readonly AccountId[], field?: CreatureField): number {
  return accounts.filter((accountId) => {
    const reveal = revealFor(creature, accountId);
    return reveal !== undefined && (field === undefined || reveal.fields.includes(field));
  }).length;
}

function CreatureForm({ draft, onChange, tools, editing }: { readonly draft: CreatureContent; readonly onChange: (patch: Partial<CreatureContent>) => void; readonly tools: CreatureBoardProps; readonly editing?: CreatureRecord }) {
  const { availableCharacters = [] } = tools;
  const text = (field: keyof CreatureContent, label: string, options: { readonly multiline?: boolean; readonly max: number; readonly placeholder?: string; readonly wide?: boolean }) => <label className={[styles.field, options.wide ? styles.wide : ""].join(" ")}>
    <span>{label}</span>
    {options.multiline
      ? <textarea rows={3} maxLength={options.max} placeholder={options.placeholder} value={String(draft[field] ?? "")} onChange={(event) => onChange({ [field]: event.currentTarget.value })} />
      : <input maxLength={options.max} placeholder={options.placeholder} value={String(draft[field] ?? "")} onChange={(event) => onChange({ [field]: event.currentTarget.value })} />}
  </label>;
  return <div className={styles.formGrid}>
    <label className={[styles.field, styles.wide].join(" ")}><span>Nome</span><input autoFocus required maxLength={80} value={draft.name} onChange={(event) => onChange({ name: event.currentTarget.value })} placeholder="Como o mestre chama esta criatura" /></label>
    <fieldset className={[styles.field, styles.wide, styles.kindPicker].join(" ")}><legend>Categoria</legend><div>{CREATURE_KINDS.map((kind) => <button key={kind} type="button" aria-pressed={draft.kind === kind} onClick={() => onChange({ kind })}><CreatureKindIcon kind={kind} size={17} />{kindLabel(kind)}</button>)}</div></fieldset>
    {text("appearance", "Aparência", { multiline: true, max: 600, placeholder: "O que os olhos percebem primeiro", wide: true })}
    {text("race", "Raça ou espécie", { max: 80, placeholder: "Ex.: lobo atroz" })}
    {text("hitPoints", "Pontos de vida", { max: 40, placeholder: "Ex.: 37 (5d10+10)" })}
    {text("armorClass", "Classe de armadura", { max: 40, placeholder: "Ex.: 14" })}
    {text("abilities", "Habilidades e magias", { multiline: true, max: 1200, placeholder: "Ataques, magias, resistências…", wide: true })}
    {text("description", "O que se sabe", { multiline: true, max: 1200, placeholder: "História, motivação, rumores", wide: true })}
    {text("notes", "Notas do mestre (nunca reveladas)", { multiline: true, max: 2000, placeholder: "Segredos, planos, ganchos", wide: true })}
    <label className={[styles.field, styles.wide].join(" ")}><span>Ficha completa (opcional)</span><select value={draft.characterRef ? String(draft.characterRef) : ""} onChange={(event) => onChange({ characterRef: (event.currentTarget.value || undefined) as Uuid | undefined })}><option value="">Somente registro narrativo</option>{availableCharacters.map((character) => <option key={String(character.id)} value={String(character.id)}>{character.name}</option>)}{editing?.characterRef && !availableCharacters.some((character) => character.id === editing.characterRef) ? <option value={String(editing.characterRef)}>Ficha vinculada</option> : null}</select></label>
  </div>;
}

function SheetGenerator({ draft, tools, onGenerated }: { readonly draft: CreatureContent; readonly tools: CreatureBoardProps; readonly onGenerated: (id: Uuid) => void }) {
  const { raceOptions = [], classOptions = [], onGenerateSheet, onCreateSheet } = tools;
  const [race, setRace] = useState("");
  const [klass, setKlass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!onGenerateSheet) return null;
  const generate = async () => {
    const raceId = raceOptions.find((option) => String(option.id) === race)?.id;
    const classId = classOptions.find((option) => String(option.id) === klass)?.id;
    if (!draft.name.trim() || !raceId || !classId) return;
    setBusy(true); setError("");
    try {
      const result = await onGenerateSheet({ name: draft.name.trim(), raceId, classId });
      if (result.ok) onGenerated(result.value); else setError(result.error.message);
    } catch { setError("Não foi possível gerar a ficha. Tente novamente."); } finally { setBusy(false); }
  };
  return <details className={styles.generator}><summary>Gerar ficha pelas regras</summary>
    <p>Escolha raça e classe para criar atributos, PV e equipamento de nível 1 automaticamente.</p>
    <div className={styles.formGrid}>
      <label className={styles.field}><span>Raça</span><select aria-label="Raça da criatura" value={race} onChange={(event) => setRace(event.currentTarget.value)}><option value="">Selecionar</option>{raceOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label>
      <label className={styles.field}><span>Classe</span><select aria-label="Classe da criatura" value={klass} onChange={(event) => setKlass(event.currentTarget.value)}><option value="">Selecionar</option>{classOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label>
    </div>
    <div className={styles.inlineActions}><Button size="sm" variant="secondary" disabled={!draft.name.trim() || !race || !klass || busy} onClick={() => void generate()}>{busy ? "Gerando ficha…" : "Gerar e vincular"}</Button>{onCreateSheet ? <button type="button" className={styles.textAction} onClick={onCreateSheet}>Criar ficha manualmente</button> : null}</div>
    {error ? <InlineStatus tone="error">{error}</InlineStatus> : null}
  </details>;
}

function RevealPanel({ creature, players, busy, onChange }: { readonly creature: CreatureRecord; readonly players: readonly JourneyPlayer[]; readonly busy: boolean; readonly onChange: (next: CreatureRecord) => void }) {
  const [focus, setFocus] = useState<Focus>(ALL);
  if (players.length === 0) return <section className={styles.reveal} aria-label="Ficha da criatura">
    <div className={styles.noPlayers}><UsersThree size={22} weight="duotone" aria-hidden="true" /><p><strong>Nenhum jogador ativo</strong><span>Quando jogadores entrarem na campanha, cada informação ganha um olho para você revelar.</span></p></div>
    <ul className={styles.fieldList}>{CREATURE_FIELDS.filter((field) => field !== "kind").map((field) => <li key={field} data-revealed="none"><div><span className={styles.fieldLabel}>{CREATURE_FIELD_LABELS[field]}</span><p className={creature[field].trim() ? undefined : styles.emptyValue}>{creature[field].trim() || "Não preenchido"}</p></div></li>)}
      <li data-revealed="locked"><div><span className={styles.fieldLabel}>Notas do mestre</span><p className={creature.notes.trim() ? undefined : styles.emptyValue}>{creature.notes.trim() || "Sem notas"}</p></div><span className={styles.lock} title="Nunca é revelado"><LockSimple size={18} aria-hidden="true" /></span></li></ul>
  </section>;
  const accounts = focus === ALL ? players.map((player) => player.accountId) : [focus];
  const focusName = focus === ALL ? "todos os jogadores" : players.find((player) => player.accountId === focus)?.name ?? "jogador";
  const present = coverage(creature, accounts);
  // Em "Todos", basta alguém ver para o toque significar "ocultar de todos": esconder é a ação segura.
  const presenceOn = focus === ALL ? present > 0 : present === accounts.length;
  const partialPresence = focus === ALL && present > 0 && present < accounts.length;
  return <section className={styles.reveal} aria-labelledby="creature-reveal-title">
    <div className={styles.revealHeading}><h3 id="creature-reveal-title">Quem descobre o quê</h3><span>{coverage(creature, players.map((player) => player.accountId))} de {players.length} já sabem que existe</span></div>
    <div className={styles.audience} role="radiogroup" aria-label="Jogador em foco">
      <button type="button" role="radio" aria-checked={focus === ALL} onClick={() => setFocus(ALL)}><UsersThree size={16} aria-hidden="true" /> Todos</button>
      {players.map((player) => {
        const sees = revealFor(creature, player.accountId) !== undefined;
        return <button key={player.accountId} type="button" role="radio" aria-checked={focus === player.accountId} onClick={() => setFocus(player.accountId)} title={player.detail}>
          <span className={sees ? styles.dotOn : styles.dotOff} aria-hidden="true" />{player.name}<span className={styles.visuallyHidden}>{sees ? " (já vê)" : " (não vê)"}</span>
        </button>;
      })}
    </div>
    <button type="button" className={styles.presence} aria-pressed={presenceOn} disabled={busy} onClick={() => onChange(setRevealPresence(creature, accounts, !presenceOn))}>
      {presenceOn ? <Eye size={20} weight="duotone" aria-hidden="true" /> : <EyeSlash size={20} aria-hidden="true" />}
      <span><strong>{presenceOn ? "Presença revelada" : "Presença oculta"}</strong><small>{partialPresence ? `${present} de ${accounts.length} jogadores veem. Toque para ocultar de todos.` : presenceOn ? `Aparece no elenco de ${focusName}. Toque para ocultar.` : `Revele para que ${focusName} ${focus === ALL ? "saibam" : "saiba"} que algo apareceu.`}</small></span>
    </button>
    <ul className={styles.fieldList}>
      {CREATURE_FIELDS.map((field) => {
        const value = fieldValue(creature, field);
        const seen = coverage(creature, accounts, field);
        const on = seen === accounts.length;
        const partial = seen > 0 && !on;
        const empty = field !== "kind" && !value.trim();
        return <li key={field} data-revealed={on ? "all" : partial ? "some" : "none"}>
          <div><span className={styles.fieldLabel}>{CREATURE_FIELD_LABELS[field]}</span><p className={empty ? styles.emptyValue : undefined}>{empty ? "Não preenchido" : value}</p></div>
          <button type="button" className={styles.eye} aria-pressed={on} disabled={busy || empty} aria-label={`${on ? "Ocultar" : "Revelar"} ${CREATURE_FIELD_LABELS[field].toLocaleLowerCase("pt-BR")} para ${focusName}`} onClick={() => onChange(setRevealField(creature, accounts, field, !on))}>
            {on ? <Eye size={19} weight="fill" aria-hidden="true" /> : <EyeSlash size={19} aria-hidden="true" />}{focus === ALL && accounts.length > 1 ? <small>{seen}/{accounts.length}</small> : null}
          </button>
        </li>;
      })}
      <li data-revealed="locked"><div><span className={styles.fieldLabel}>Notas do mestre</span><p className={creature.notes.trim() ? undefined : styles.emptyValue}>{creature.notes.trim() || "Sem notas"}</p></div><span className={styles.lock} title="Nunca é revelado"><LockSimple size={18} aria-hidden="true" /><span className={styles.visuallyHidden}>Só você vê</span></span></li>
    </ul>
  </section>;
}

function GuessList({ guesses, players }: { readonly guesses: readonly CreatureGuess[]; readonly players: readonly JourneyPlayer[] }) {
  if (guesses.length === 0) return null;
  return <section className={styles.guesses} aria-labelledby="creature-guesses-title">
    <h3 id="creature-guesses-title"><ChatCircleDots size={18} aria-hidden="true" /> Palpites dos jogadores</h3>
    <ul>{guesses.map((guess) => {
      const rows = [
        ...(guess.kind ? [["Categoria", kindLabel(guess.kind)] as const] : []),
        ...(guess.name ? [["Nome", guess.name] as const] : []),
        ...CREATURE_GUESS_FIELDS.flatMap((field) => guess.fields?.[field] ? [[CREATURE_FIELD_LABELS[field], guess.fields[field]!] as const] : []),
      ];
      return <li key={guess.id}>
        <strong>{players.find((player) => player.accountId === guess.accountId)?.name ?? "Jogador"} acha que…</strong>
        {rows.length ? <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
        {guess.note ? <p>“{guess.note}”</p> : null}
      </li>;
    })}</ul>
  </section>;
}

export function CreatureBoard(props: CreatureBoardProps) {
  const { creatures, guesses = [], players = [], loading, error, onCreate, onSave, onDelete, onOpenSheet } = props;
  const [filter, setFilter] = useState<CreatureFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>();
  const [mode, setMode] = useState<"view" | "edit" | "create">("view");
  const [draft, setDraft] = useState<CreatureContent>(EMPTY_CONTENT);
  const [saved, setSaved] = useState<Readonly<Record<string, CreatureRecord>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A gravação local responde antes do recarregamento da lista; a versão mais nova vence.
  const list = useMemo(() => creatures.map((creature) => {
    const latest = saved[creature.id];
    return latest && latest.revision >= creature.revision ? latest : creature;
  }), [creatures, saved]);
  const counts = useMemo(() => countByKind(list, (creature) => creature.kind), [list]);
  const visible = list.filter((creature) => (filter === "all" || creature.kind === filter) && matchesQuery(query, creature.name, creature.race, creature.appearance));
  const open = list.find((creature) => creature.id === openId);
  const guessesFor = (id: string) => guesses.filter((guess) => guess.creatureId === id);

  const remember = (creature: CreatureRecord) => setSaved((current) => ({ ...current, [creature.id]: creature }));
  const close = () => { if (busy) return; setOpenId(undefined); setMode("view"); setMessage(undefined); setConfirmDelete(false); };
  const beginCreate = () => { setDraft(EMPTY_CONTENT); setMode("create"); setOpenId(undefined); setMessage(undefined); };
  const persist = async (next: CreatureRecord) => {
    if (!onSave) return;
    setBusy(true); setMessage(undefined);
    const result = await onSave(next);
    setBusy(false);
    if (result.ok) remember(result.value); else setMessage(result.error.message);
  };
  const submit = async () => {
    setBusy(true); setMessage(undefined);
    if (mode === "create" && onCreate) {
      const result = await onCreate(draft);
      setBusy(false);
      if (!result.ok) { setMessage(result.error.message); return; }
      remember(result.value); setOpenId(result.value.id); setMode("view");
      return;
    }
    if (open && onSave) {
      const { characterRef: _previous, ...rest } = open;
      const result = await onSave({ ...rest, ...draft });
      setBusy(false);
      if (!result.ok) { setMessage(result.error.message); return; }
      remember(result.value); setMode("view");
      return;
    }
    setBusy(false);
  };
  const remove = async () => {
    if (!open || !onDelete) return;
    setBusy(true);
    const result = await onDelete(open);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setOpenId(undefined); setConfirmDelete(false);
  };

  const formOpen = mode === "create" || (mode === "edit" && open !== undefined);
  const dialogTitle = mode === "create" ? "Nova criatura" : mode === "edit" ? `Editar ${open?.name ?? "criatura"}` : open?.name ?? "Criatura";

  return <section className={styles.board} aria-labelledby="creature-board-title">
    <header className={styles.boardHeading}>
      <div><p className={styles.eyebrow}>Jornada · Elenco</p><h2 id="creature-board-title">NPCs, ameaças e criaturas</h2><p>Toque em uma carta para decidir o que cada jogador descobre.</p></div>
    </header>
    <CreatureToolbar counts={counts} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} actions={onCreate ? <Button size="sm" onClick={beginCreate}><Plus size={16} aria-hidden="true" /> Nova criatura</Button> : undefined} />
    {error ? <InlineStatus tone="error">{error}</InlineStatus> : null}
    {loading && list.length === 0 ? <p className={styles.empty} role="status">Carregando o elenco…</p>
      : visible.length === 0 ? <div className={styles.empty}><strong>{list.length === 0 ? "O elenco está vazio" : "Nada neste filtro"}</strong><span>{list.length === 0 ? "Registre NPCs, ameaças e animais. Nada é revelado aos jogadores até você decidir." : "Troque o filtro ou a busca."}</span>{list.length === 0 && onCreate ? <Button size="sm" variant="secondary" onClick={beginCreate}><Plus size={16} aria-hidden="true" /> Registrar a primeira</Button> : null}</div>
      : <ul className={styles.grid}>{visible.map((creature) => {
        const known = coverage(creature, players.map((player) => player.accountId));
        const guessCount = guessesFor(creature.id).length;
        return <li key={creature.id}><button type="button" className={styles.card} data-kind={creature.kind} onClick={() => { setOpenId(creature.id); setMode("view"); setMessage(undefined); }}>
          <span className={styles.cardTop}><span className={styles.cardIcon}><CreatureKindIcon kind={creature.kind} /></span><span className={styles.cardKind}>{kindLabel(creature.kind)}</span></span>
          <strong className={styles.cardName}>{creature.name}</strong>
          <span className={styles.cardText}>{creature.appearance || creature.description || creature.race || "Sem descrição ainda."}</span>
          <span className={styles.cardMeta}>
            <span data-active={known > 0}>{known > 0 ? <Eye size={14} aria-hidden="true" /> : <EyeSlash size={14} aria-hidden="true" />}{players.length === 0 ? "Oculto" : known === 0 ? "Oculto" : `${known}/${players.length} sabem`}</span>
            {guessCount > 0 ? <span data-active="true"><ChatCircleDots size={14} aria-hidden="true" />{guessCount} {guessCount === 1 ? "palpite" : "palpites"}</span> : null}
            {creature.characterRef ? <span>Ficha</span> : null}
          </span>
        </button></li>;
      })}</ul>}

    <AppModal open={formOpen || open !== undefined} title={dialogTitle} onClose={close} className={styles.dialog} headerActions={mode === "view" && open ? <>{onSave ? <Button size="sm" variant="ghost" aria-label={`Editar ${open.name}`} onClick={() => { setDraft(contentOf(open)); setMode("edit"); }}><PencilSimple size={17} aria-hidden="true" /></Button> : null}{onDelete ? <Button size="sm" variant="ghost" aria-label={`Remover ${open.name}`} onClick={() => setConfirmDelete(true)}><Trash size={17} aria-hidden="true" /></Button> : null}</> : undefined}>
      {message ? <InlineStatus tone="error" assertive>{message}</InlineStatus> : null}
      {formOpen ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <CreatureForm draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} tools={props} editing={mode === "edit" ? open : undefined} />
        <SheetGenerator draft={draft} tools={props} onGenerated={(id) => setDraft((current) => ({ ...current, characterRef: id }))} />
        <p className={styles.hint}>Tudo começa oculto. Depois de salvar, use o olho de cada informação para revelá-la.</p>
        <div className={styles.formActions}><Button type="button" variant="ghost" disabled={busy} onClick={() => mode === "create" ? close() : setMode("view")}>Cancelar</Button><Button type="submit" disabled={busy || !draft.name.trim()}>{busy ? "Salvando…" : mode === "create" ? "Adicionar ao elenco" : "Salvar alterações"}</Button></div>
      </form> : open ? <div className={styles.detail}>
        <div className={styles.detailKind} data-kind={open.kind}><CreatureKindIcon kind={open.kind} size={18} />{kindLabel(open.kind)}{open.characterRef && onOpenSheet ? <button type="button" className={styles.textAction} onClick={() => onOpenSheet(open.characterRef!)}>Abrir ficha</button> : null}</div>
        {confirmDelete ? <div className={styles.confirm}><span>Remover {open.name}? Os jogadores deixam de vê-la e os palpites somem.</span><div className={styles.inlineActions}><Button size="sm" variant="danger" disabled={busy} onClick={() => void remove()}>Remover</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Manter</Button></div></div> : null}
        <RevealPanel creature={open} players={players} busy={busy || !onSave} onChange={(next) => void persist(next)} />
        <GuessList guesses={guessesFor(open.id)} players={players} />
      </div> : null}
    </AppModal>
  </section>;
}

