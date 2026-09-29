import { useEffect, useMemo, useState } from "react";
import { AppModal, Button, InlineStatus } from "@components/ui";
import { ChatCircleDots, Eye, EyeSlash, LockSimple, PencilSimple, Plus, Trash, UsersThree } from "@phosphor-icons/react";
import {
  CREATURE_FIELD_LABELS,
  CREATURE_FIELDS,
  CREATURE_GUESS_FIELDS,
  CREATURE_KINDS,
  guessCount,
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

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

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

function CreatureForm({ draft, onChange }: { readonly draft: CreatureContent; readonly onChange: (patch: Partial<CreatureContent>) => void }) {
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
  </div>;
}

type SheetMode = "none" | "existing" | "generate";
interface SheetChoice { readonly mode: SheetMode; readonly race: string; readonly klass: string }
const NO_SHEET: SheetChoice = { mode: "none", race: "", klass: "" };

/** O que falta para o passo da ficha estar completo; vazio quando nada impede salvar. */
function sheetProblem(choice: SheetChoice, draft: CreatureContent): string | undefined {
  if (choice.mode !== "generate") return undefined;
  const lacking = [...(draft.name.trim() ? [] : ["o nome da criatura (campo Nome, no topo)"]), ...(choice.race ? [] : ["a raça"])];
  if (!lacking.length) return undefined;
  return `Para criar a ficha, informe ${lacking.length > 1 ? `${lacking.slice(0, -1).join(", ")} e ${lacking.at(-1)}` : lacking[0]}.`;
}

/**
 * Passo "Ficha do jogo": a criatura pode ser só um registro narrativo, apontar para uma ficha que já
 * existe, ou ganhar uma ficha nova de nível 1 montada pelas regras (raça + classe). A ficha nova é
 * criada ao salvar a criatura, no mesmo botão — não há etapa escondida.
 */
function SheetSection({ choice, onChoice, draft, onChange, tools, otherLinked, editing, onDeleteSheet }: {
  readonly onDeleteSheet?: () => void;
  readonly choice: SheetChoice;
  readonly onChoice: (next: SheetChoice) => void;
  readonly draft: CreatureContent;
  readonly onChange: (patch: Partial<CreatureContent>) => void;
  readonly tools: CreatureBoardProps;
  readonly otherLinked: ReadonlySet<string>;
  readonly editing?: CreatureRecord;
}) {
  const { availableCharacters = [], raceOptions = [], classOptions = [], onGenerateSheet, onCreateSheet } = tools;
  // Fichas já ligadas a outra criatura ficam fora da lista, senão duas criaturas dividiriam a mesma ficha.
  const choices = availableCharacters.filter((character) => !otherLinked.has(String(character.id)));
  const canGenerate = Boolean(onGenerateSheet) && raceOptions.length > 0 && classOptions.length > 0;
  const raceName = raceOptions.find((option) => String(option.id) === choice.race)?.name;
  const className = classOptions.find((option) => String(option.id) === choice.klass)?.name;
  const problem = sheetProblem(choice, draft);
  const modes: readonly { readonly id: SheetMode; readonly title: string; readonly hint: string; readonly disabled?: boolean }[] = [
    { id: "none", title: "Sem ficha", hint: "Só o registro narrativo. Dá para vincular uma ficha depois." },
    { id: "existing", title: "Ficha existente", hint: choices.length === 0 ? "Nenhuma ficha livre nesta campanha." : "Usar uma ficha que já foi criada.", disabled: choices.length === 0 && !draft.characterRef },
    ...(canGenerate ? [{ id: "generate" as const, title: "Criar pelas regras", hint: "A raça gera atributos, PV e equipamento de nível 1. A classe é opcional." }] : []),
  ];
  return <fieldset className={styles.sheetSection}>
    <legend>Ficha do jogo</legend>
    {editing?.characterRef ? <div className={styles.currentSheet}>
      <span><strong>Esta criatura tem uma ficha.</strong><small>Abra para editar atributos, PV e equipamento, ou exclua para começar de novo.</small></span>
      <div className={styles.inlineActions}>
        {tools.onOpenSheet ? <Button size="sm" variant="secondary" onClick={() => tools.onOpenSheet?.(editing.characterRef!)}>Editar ficha</Button> : null}
        {tools.onDeleteSheet ? <Button size="sm" variant="ghost" onClick={onDeleteSheet}>Excluir ficha</Button> : null}
      </div>
    </div> : null}
    <p className={styles.sheetLead}>A ficha completa (atributos, PV, perícias) é opcional. Para uma criatura simples, deixe em “Sem ficha”.</p>
    <div className={styles.sheetModes} role="radiogroup" aria-label="Ficha do jogo">
      {modes.map((item) => <button key={item.id} type="button" role="radio" aria-checked={choice.mode === item.id} disabled={item.disabled} onClick={() => { onChoice({ ...choice, mode: item.id }); if (item.id === "none") onChange({ characterRef: undefined }); }}>
        <strong>{item.title}</strong><small>{item.hint}</small>
      </button>)}
    </div>
    {choice.mode === "existing" ? <label className={styles.field}><span>Qual ficha</span>
      <select value={draft.characterRef ? String(draft.characterRef) : ""} onChange={(event) => onChange({ characterRef: (event.currentTarget.value || undefined) as Uuid | undefined })}>
        <option value="">Escolher uma ficha…</option>
        {choices.map((character) => <option key={String(character.id)} value={String(character.id)}>{character.name}{character.detail ? ` · ${character.detail}` : ""}</option>)}
        {editing?.characterRef && !availableCharacters.some((character) => character.id === editing.characterRef) ? <option value={String(editing.characterRef)}>Ficha já vinculada</option> : null}
      </select>
    </label> : null}
    {choice.mode === "existing" && !draft.characterRef ? <p className={styles.generatorHint} role="status">Escolha a ficha ou volte para “Sem ficha”.</p> : null}
    {choice.mode === "generate" ? <div className={styles.sheetGenerate}>
      <div className={styles.formGrid}>
        <label className={styles.field}><span>Raça</span><select aria-label="Raça da criatura" value={choice.race} onChange={(event) => onChoice({ ...choice, race: event.currentTarget.value })}><option value="">Escolher raça</option>{raceOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label>
        <label className={styles.field}><span>Classe</span><select aria-label="Classe da criatura" value={choice.klass} onChange={(event) => onChoice({ ...choice, klass: event.currentTarget.value })}><option value="">Sem classe (opcional)</option>{classOptions.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}</select></label>
      </div>
      {raceName ? <p className={styles.sheetPreview}>Vai criar: <strong>{draft.name.trim() || "criatura"}</strong> · {raceName}{className ? ` ${className}` : ""} de nível 1{className ? "" : ". Sem classe, a ficha usa a base neutra do Guerreiro; ajuste depois na própria ficha."}</p> : null}
      {problem ? <p className={styles.generatorHint} role="status">{problem}</p> : null}
    </div> : null}
    {onCreateSheet && choice.mode !== "generate" ? <button type="button" className={styles.textAction} onClick={onCreateSheet}>Criar ficha manualmente (passo a passo)</button> : null}
  </fieldset>;
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

/** No desktop os palpites ganham um card próprio ao lado da ficha (vazio também); no celular ficam abaixo dela. */
function GuessList({ guesses, players, showHeading = true, hideWhenEmpty = false }: { readonly guesses: readonly CreatureGuess[]; readonly players: readonly JourneyPlayer[]; readonly showHeading?: boolean; readonly hideWhenEmpty?: boolean }) {
  if (hideWhenEmpty && guesses.length === 0) return null;
  return <section className={styles.guesses} aria-label={showHeading ? undefined : "Palpites dos jogadores"} aria-labelledby={showHeading ? "creature-guesses-title" : undefined}>
    {showHeading ? <h3 id="creature-guesses-title"><ChatCircleDots size={18} aria-hidden="true" /> Palpites dos jogadores{guesses.length > 0 ? <small>{guesses.length}</small> : null}</h3> : null}
    {guesses.length === 0 ? <p className={styles.guessesEmpty}>Nenhum palpite ainda. Quando um jogador supor algo sobre esta criatura, aparece aqui, ao vivo.</p> : null}
    <ul>{guesses.map((guess) => {
      const rows = [
        ...(guess.kind ? [["Categoria", kindLabel(guess.kind)] as const] : []),
        ...(guess.name ? [["Nome", guess.name] as const] : []),
        ...CREATURE_GUESS_FIELDS.flatMap((field) => guess.fields?.[field] ? [[CREATURE_FIELD_LABELS[field], guess.fields[field]!] as const] : []),
      ];
      const name = players.find((player) => player.accountId === guess.accountId)?.name ?? "Jogador";
      return <li key={guess.id}>
        <details>
          <summary><span>{name}</span><small>{guessCount(guess)} {guessCount(guess) === 1 ? "suposição" : "suposições"}</small></summary>
          {rows.length ? <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          {guess.note ? <p>“{guess.note}”</p> : null}
        </details>
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
  const [sheet, setSheet] = useState<SheetChoice>(NO_SHEET);
  const [confirmSheetDelete, setConfirmSheetDelete] = useState(false);
  const sideBySide = useMediaQuery("(min-width: 1400px)");

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
  const close = () => { if (busy) return; setOpenId(undefined); setMode("view"); setMessage(undefined); setConfirmDelete(false); setConfirmSheetDelete(false); };
  const beginCreate = () => { setDraft(EMPTY_CONTENT); setSheet(NO_SHEET); setMode("create"); setOpenId(undefined); setMessage(undefined); };
  const persist = async (next: CreatureRecord) => {
    if (!onSave) return;
    setBusy(true); setMessage(undefined);
    const result = await onSave(next);
    setBusy(false);
    if (result.ok) remember(result.value); else setMessage(result.error.message);
  };
  const submit = async () => {
    setBusy(true); setMessage(undefined);
    let content = draft;
    if (sheet.mode === "generate") {
      const raceId = props.raceOptions?.find((option) => String(option.id) === sheet.race)?.id;
      const classId = props.classOptions?.find((option) => String(option.id) === sheet.klass)?.id;
      if (!props.onGenerateSheet || !raceId || !draft.name.trim()) { setBusy(false); setMessage(sheetProblem(sheet, draft) ?? "Escolha a raça para criar a ficha."); return; }
      try {
        const generated = await props.onGenerateSheet({ name: draft.name.trim(), raceId, ...(classId ? { classId } : {}) });
        if (!generated.ok) { setBusy(false); setMessage(`Não foi possível criar a ficha: ${generated.error.message}`); return; }
        content = { ...draft, characterRef: generated.value };
        // A ficha já existe; se salvar a criatura falhar, o vínculo é reaproveitado na próxima tentativa.
        setDraft(content); setSheet({ ...NO_SHEET, mode: "existing" });
      } catch { setBusy(false); setMessage("Não foi possível criar a ficha. Tente novamente."); return; }
    }
    if (mode === "create" && onCreate) {
      const result = await onCreate(content);
      setBusy(false);
      if (!result.ok) { setMessage(result.error.message); return; }
      remember(result.value); setOpenId(result.value.id); setMode("view");
      return;
    }
    if (open && onSave) {
      const { characterRef: _previous, ...rest } = open;
      const result = await onSave({ ...rest, ...content });
      setBusy(false);
      if (!result.ok) { setMessage(result.error.message); return; }
      remember(result.value); setMode("view");
      return;
    }
    setBusy(false);
  };
  const removeSheet = async () => {
    if (!open || !props.onDeleteSheet) return;
    setBusy(true); setMessage(undefined);
    const result = await props.onDeleteSheet(open);
    setBusy(false);
    if (!result.ok) { setMessage(`Não foi possível excluir a ficha: ${result.error.message}`); return; }
    remember(result.value); setConfirmSheetDelete(false); setSheet(NO_SHEET);
    setDraft((current) => { const { characterRef: _gone, ...rest } = current; return rest; });
  };
  const remove = async () => {
    if (!open || !onDelete) return;
    setBusy(true);
    const result = await onDelete(open);
    setBusy(false);
    if (!result.ok) { setMessage(result.error.message); return; }
    setOpenId(undefined); setConfirmDelete(false);
  };

  const otherLinked = useMemo(() => new Set(list.filter((creature) => creature.characterRef && creature.id !== open?.id).map((creature) => String(creature.characterRef))), [list, open?.id]);
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
        const guessTotal = guessesFor(creature.id).length;
        return <li key={creature.id}><button type="button" className={styles.card} data-kind={creature.kind} onClick={() => { setOpenId(creature.id); setMode("view"); setMessage(undefined); }}>
          <span className={styles.cardTop}><span className={styles.cardIcon}><CreatureKindIcon kind={creature.kind} /></span><span className={styles.cardKind}>{kindLabel(creature.kind)}</span></span>
          <strong className={styles.cardName}>{creature.name}</strong>
          <span className={styles.cardText}>{creature.appearance || creature.description || creature.race || "Sem descrição ainda."}</span>
          <span className={styles.cardMeta}>
            <span data-active={known > 0}>{known > 0 ? <Eye size={14} aria-hidden="true" /> : <EyeSlash size={14} aria-hidden="true" />}{players.length === 0 ? "Oculto" : known === 0 ? "Oculto" : `${known}/${players.length} sabem`}</span>
            {guessTotal > 0 ? <span data-active="true"><ChatCircleDots size={14} aria-hidden="true" />{guessTotal} {guessTotal === 1 ? "palpite" : "palpites"}</span> : null}
            {creature.characterRef ? <span>Ficha</span> : null}
          </span>
        </button></li>;
      })}</ul>}

    <AppModal open={formOpen || open !== undefined} title={dialogTitle} onClose={close} className={styles.dialog} aside={mode === "view" && open && sideBySide ? { title: "Palpites dos jogadores", children: <GuessList guesses={guessesFor(open.id)} players={players} showHeading={false} /> } : undefined} headerActions={mode === "view" && open ? <>{onSave ? <Button size="sm" variant="ghost" aria-label={`Editar ${open.name}`} onClick={() => { setDraft(contentOf(open)); setSheet({ ...NO_SHEET, mode: open.characterRef ? "existing" : "none" }); setMode("edit"); }}><PencilSimple size={17} aria-hidden="true" /></Button> : null}{onDelete ? <Button size="sm" variant="ghost" aria-label={`Remover ${open.name}`} onClick={() => setConfirmDelete(true)}><Trash size={17} aria-hidden="true" /></Button> : null}</> : undefined}>
      {message ? <InlineStatus tone="error" assertive>{message}</InlineStatus> : null}
      {formOpen ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <CreatureForm draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
        <SheetSection choice={sheet} onChoice={(next) => { setSheet(next); if (next.mode === "generate" && next.race && !draft.race.trim()) { const name = props.raceOptions?.find((option) => String(option.id) === next.race)?.name; if (name) setDraft((current) => ({ ...current, race: current.race.trim() ? current.race : name })); } }} draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} tools={props} otherLinked={otherLinked} editing={mode === "edit" ? open : undefined} onDeleteSheet={() => { setMode("view"); setConfirmSheetDelete(true); }} />
        <p className={styles.hint}>Tudo começa oculto. Depois de salvar, use o olho de cada informação para revelá-la.</p>
        <div className={styles.formActions}><Button type="button" variant="ghost" disabled={busy} onClick={() => mode === "create" ? close() : setMode("view")}>Cancelar</Button><Button type="submit" disabled={busy || !draft.name.trim() || Boolean(sheetProblem(sheet, draft)) || (sheet.mode === "existing" && !draft.characterRef)}>{busy ? (sheet.mode === "generate" ? "Criando ficha…" : "Salvando…") : sheet.mode === "generate" ? (mode === "create" ? "Criar ficha e adicionar ao elenco" : "Criar ficha e salvar") : mode === "create" ? "Adicionar ao elenco" : "Salvar alterações"}</Button></div>
      </form> : open ? <div className={styles.detail}>
        <div className={styles.detailKind} data-kind={open.kind}><CreatureKindIcon kind={open.kind} size={18} />{kindLabel(open.kind)}{open.characterRef && onOpenSheet ? <button type="button" className={styles.textAction} onClick={() => onOpenSheet(open.characterRef!)}>Editar ficha</button> : null}{open.characterRef && props.onDeleteSheet ? <button type="button" className={[styles.textAction, styles.dangerAction].join(" ")} onClick={() => setConfirmSheetDelete(true)}>Excluir ficha</button> : null}</div>
        {confirmSheetDelete ? <div className={styles.confirm}><span>Excluir a ficha de {open.name}? Atributos, PV e equipamento serão apagados. A criatura continua no elenco, sem ficha.</span><div className={styles.inlineActions}><Button size="sm" variant="danger" disabled={busy} onClick={() => void removeSheet()}>Excluir ficha</Button><Button size="sm" variant="ghost" onClick={() => setConfirmSheetDelete(false)}>Manter</Button></div></div> : null}
        {confirmDelete ? <div className={styles.confirm}><span>Remover {open.name}? Os jogadores deixam de vê-la e os palpites somem.{open.characterRef ? " A ficha dela também será excluída." : ""}</span><div className={styles.inlineActions}><Button size="sm" variant="danger" disabled={busy} onClick={() => void remove()}>Remover</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Manter</Button></div></div> : null}
        <RevealPanel creature={open} players={players} busy={busy || !onSave} onChange={(next) => void persist(next)} />
        {sideBySide ? null : <GuessList guesses={guessesFor(open.id)} players={players} hideWhenEmpty />}
      </div> : null}
    </AppModal>
  </section>;
}

