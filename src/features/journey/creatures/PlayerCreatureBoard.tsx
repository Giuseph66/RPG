import { useMemo, useState } from "react";
import { AppModal, Button, InlineStatus } from "@components/ui";
import { ChatCircleDots, Check, Equals, Eye, Scales, X } from "@phosphor-icons/react";
import {
  CREATURE_FIELD_LABELS,
  CREATURE_FIELDS,
  CREATURE_GUESS_FIELDS,
  CREATURE_KINDS,
  compareGuess,
  type ComparisonVerdict,
  guessCount,
  playerView,
  type CreatureGuessField,
  type CreatureGuess,
  type CreatureKind,
  type CreatureSighting,
} from "@domain/campaign/creatures";

import { CreatureKindIcon, CreatureToolbar, countByKind, kindLabel, matchesQuery } from "./shared";
import type { CreatureFilter, GuessDraft, PlayerCreatureBoardProps } from "./types";
import styles from "./creatures.module.css";

function GuessForm({ sighting, guess, onSave }: { readonly sighting: CreatureSighting; readonly guess?: CreatureGuess; readonly onSave: PlayerCreatureBoardProps["onSaveGuess"] }) {
  const [draft, setDraft] = useState<GuessDraft>({ kind: guess?.kind, name: guess?.name ?? "", note: guess?.note ?? "", fields: guess?.fields ?? {} });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ readonly tone: "success" | "error"; readonly text: string }>();
  if (!onSave) return null;
  // Só se supõe o que ainda não foi revelado; o que o mestre mostrou é fato.
  const openFields = CREATURE_GUESS_FIELDS.filter((field) => !sighting.revealed[field]);
  const setField = (field: CreatureGuessField, value: string) => setDraft((current) => ({ ...current, fields: { ...current.fields, [field]: value } }));
  const submit = async () => {
    setBusy(true); setStatus(undefined);
    const result = await onSave(sighting.creatureId, draft);
    setBusy(false);
    setStatus(result.ok ? { tone: "success", text: "Palpite guardado. O mestre vai ver." } : { tone: "error", text: result.error.message });
  };
  const wide = (field: CreatureGuessField) => field === "appearance" || field === "abilities";
  return <form className={styles.guessForm} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <h3><ChatCircleDots size={18} aria-hidden="true" /> Seu palpite</h3>
    <p className={styles.hint}>Supõe o que ainda não sabe. Só você e o mestre veem; deixe em branco o que não quiser arriscar.</p>
    {sighting.kind !== undefined ? null : <fieldset className={[styles.field, styles.kindPicker].join(" ")}><legend>Parece ser</legend><div>
      <button type="button" aria-pressed={draft.kind === undefined} onClick={() => setDraft((current) => ({ ...current, kind: undefined }))}>Não sei</button>
      {CREATURE_KINDS.filter((kind) => kind !== "unknown").map((kind) => <button key={kind} type="button" aria-pressed={draft.kind === kind} onClick={() => setDraft((current) => ({ ...current, kind }))}><CreatureKindIcon kind={kind} size={16} />{kindLabel(kind)}</button>)}
    </div></fieldset>}
    <div className={styles.formGrid}>
      {sighting.revealed.name !== undefined ? null : <label className={[styles.field, styles.wide].join(" ")}><span>Como você a chama</span><input maxLength={80} value={draft.name} placeholder="Ex.: o vulto do pântano" onChange={(event) => setDraft((current) => ({ ...current, name: event.currentTarget.value }))} /></label>}
      {openFields.map((field) => <label key={field} className={[styles.field, wide(field) ? styles.wide : ""].join(" ")}>
        <span>{GUESS_LABELS[field]}</span>
        {wide(field)
          ? <textarea rows={2} maxLength={field === "abilities" ? 1200 : 600} placeholder={GUESS_PLACEHOLDERS[field]} value={draft.fields?.[field] ?? ""} onChange={(event) => setField(field, event.currentTarget.value)} />
          : <input maxLength={field === "race" ? 80 : 40} placeholder={GUESS_PLACEHOLDERS[field]} value={draft.fields?.[field] ?? ""} onChange={(event) => setField(field, event.currentTarget.value)} />}
      </label>)}
      <label className={[styles.field, styles.wide].join(" ")}><span>O que você acha</span><textarea rows={3} maxLength={800} value={draft.note} placeholder="Intenções, pistas, o que você notou…" onChange={(event) => setDraft((current) => ({ ...current, note: event.currentTarget.value }))} /></label>
    </div>
    {status ? <InlineStatus tone={status.tone}>{status.text}</InlineStatus> : null}
    <div className={styles.formActions}><Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : guess ? "Atualizar palpite" : "Guardar palpite"}</Button></div>
  </form>;
}

const VERDICT_LABELS: Readonly<Record<ComparisonVerdict, string>> = { match: "Acertou", close: "Chegou perto", differs: "Era diferente" };

const GUESS_LABELS: Readonly<Record<CreatureGuessField, string>> = {
  appearance: "Aparência que você imagina",
  race: "Raça ou espécie que parece",
  hitPoints: "Pontos de vida estimados",
  armorClass: "Classe de armadura estimada",
  abilities: "Habilidades e magias que suspeita",
};

const GUESS_PLACEHOLDERS: Readonly<Record<CreatureGuessField, string>> = {
  appearance: "Como ela parece para você",
  race: "Ex.: lobo, orc, algo morto-vivo",
  hitPoints: "Ex.: uns 30",
  armorClass: "Ex.: 15, couro grosso",
  abilities: "Ataques, magias, resistências que notou",
};

export function PlayerCreatureBoard({ sightings, guesses = [], loading, error, onSaveGuess }: PlayerCreatureBoardProps) {
  const [filter, setFilter] = useState<CreatureFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>();
  const guessBy = useMemo(() => new Map(guesses.map((guess) => [guess.creatureId as string, guess])), [guesses]);
  const views = useMemo(() => sightings.map((sighting) => ({ sighting, view: playerView(sighting, guessBy.get(sighting.creatureId)) })), [guessBy, sightings]);
  const counts = useMemo(() => countByKind(views, (item) => item.view.kind as CreatureKind), [views]);
  const visible = views.filter((item) => (filter === "all" || item.view.kind === filter) && matchesQuery(query, item.view.title, item.sighting.revealed.race, item.sighting.revealed.appearance));
  const open = views.find((item) => item.sighting.creatureId === openId);
  const revealedFields = open ? CREATURE_FIELDS.filter((field) => field !== "name" && field !== "kind" && open.sighting.revealed[field]) : [];
  const openGuess = open ? guessBy.get(open.sighting.creatureId) : undefined;
  const comparisons = open ? compareGuess(open.sighting, openGuess) : [];
  const hits = comparisons.filter((item) => item.verdict === "match").length;

  return <section className={styles.board} aria-labelledby="player-creatures-title">
    <header className={styles.boardHeading}>
      <div><p className={styles.eyebrow}>Jornada · Elenco</p><h2 id="player-creatures-title">Quem você encontrou</h2><p>Só aparece aqui o que o mestre revelou para você.</p></div>
    </header>
    <CreatureToolbar counts={counts} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
    {error ? <InlineStatus tone="error">{error}</InlineStatus> : null}
    {loading && views.length === 0 ? <p className={styles.empty} role="status">Consultando suas anotações…</p>
      : visible.length === 0 ? <div className={styles.empty}><strong>{views.length === 0 ? "Ninguém cruzou seu caminho ainda" : "Nada neste filtro"}</strong><span>{views.length === 0 ? "Quando o mestre revelar NPCs, ameaças ou criaturas, eles aparecem aqui. Use Atualizar depois da cena." : "Troque o filtro ou a busca."}</span></div>
      : <ul className={styles.grid}>{visible.map(({ sighting, view }) => {
        const guess = guessBy.get(sighting.creatureId);
        return <li key={sighting.id}><button type="button" className={styles.card} data-kind={view.kind} data-unknown={view.kind === "unknown"} onClick={() => setOpenId(sighting.creatureId)}>
          <span className={styles.cardTop}><span className={styles.cardIcon}><CreatureKindIcon kind={view.kind} /></span><span className={styles.cardKind}>{kindLabel(view.kind)}{view.kindIsGuess ? " ?" : ""}</span></span>
          <strong className={styles.cardName}>{view.title}{view.titleIsGuess ? <small> (seu palpite)</small> : null}</strong>
          <span className={styles.cardText}>{sighting.revealed.appearance || sighting.revealed.description || (guess?.fields?.appearance ? `Você imagina: ${guess.fields.appearance}` : "Você ainda sabe muito pouco.")}</span>
          <span className={styles.cardMeta}><span data-active="true"><Eye size={14} aria-hidden="true" />{Object.keys(sighting.revealed).length + (sighting.kind ? 1 : 0)} pistas</span>{guessCount(guess) > 0 ? <span><ChatCircleDots size={14} aria-hidden="true" />{guessCount(guess)} {guessCount(guess) === 1 ? "suposição" : "suposições"}</span> : null}</span>
        </button></li>;
      })}</ul>}

    <AppModal open={open !== undefined} title={open?.view.title ?? "Criatura"} onClose={() => setOpenId(undefined)} className={styles.dialog}>
      {open ? <div className={styles.detail}>
        <div className={styles.detailKind} data-kind={open.view.kind}><CreatureKindIcon kind={open.view.kind} size={18} />{kindLabel(open.view.kind)}{open.view.kindIsGuess ? <small> · seu palpite</small> : open.sighting.kind === undefined ? <small> · categoria desconhecida</small> : null}</div>
        {revealedFields.length === 0 ? <p className={styles.hint}>O mestre ainda não revelou detalhes. Você só sabe que algo apareceu.</p>
          : <ul className={styles.fieldList}>{revealedFields.map((field) => <li key={field} data-revealed="all"><div><span className={styles.fieldLabel}>{CREATURE_FIELD_LABELS[field]}</span><p>{open.sighting.revealed[field as Exclude<typeof field, "kind">]}</p></div></li>)}</ul>}
        {comparisons.length > 0 ? <section className={styles.compare} aria-labelledby="creature-compare-title">
          <h3 id="creature-compare-title"><Scales size={18} aria-hidden="true" /> Seu palpite <small>{hits} de {comparisons.length} {hits === 1 ? "certo" : "certos"}</small></h3>
          <ul>{comparisons.map((item) => <li key={item.field} data-verdict={item.verdict}>
            <span className={styles.verdictIcon} aria-hidden="true">{item.verdict === "match" ? <Check size={16} weight="bold" /> : item.verdict === "close" ? <Equals size={16} weight="bold" /> : <X size={16} weight="bold" />}</span>
            <div>
              <span className={styles.fieldLabel}>{item.label}<span className={styles.visuallyHidden}> — {VERDICT_LABELS[item.verdict]}</span></span>
              <p>{item.revealed}</p>
              {item.verdict === "match" ? null : <small>Você achou: {item.guessed}</small>}
            </div>
          </li>)}</ul>
        </section> : null}
        <GuessForm key={open.sighting.id} sighting={open.sighting} guess={guessBy.get(open.sighting.creatureId)} onSave={onSaveGuess} />
      </div> : null}
    </AppModal>
  </section>;
}
