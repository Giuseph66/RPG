import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, CheckIcon, TrashIcon } from "@phosphor-icons/react";
import type { DictationState } from "./dictation";
import styles from "./DictationPanel.module.css";

const clock = (ms: number) => { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; };

/** Takes the place of the composer while the microphone is open: the user, not a silence, ends it. */
export function DictationPanel({ state, canSend, onDiscard, onReview, onSend }: { readonly state: DictationState; readonly canSend: boolean; readonly onDiscard: () => void; readonly onReview: () => void; readonly onSend: () => void }) {
  const [now, setNow] = useState(Date.now);
  const transcript = useRef<HTMLDivElement>(null), primary = useRef<HTMLButtonElement>(null);
  useEffect(() => { primary.current?.focus(); const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [state.text, state.interim]);
  const finishing = state.phase === "finishing", empty = !state.text && !state.interim;

  return <div className={styles.panel} role="group" aria-label="Ditado por voz" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onReview(); } }}>
    <div className={styles.status}>
      <span className={styles.wave} data-active={!finishing && Boolean(state.interim) || undefined} aria-hidden="true"><span /><span /><span /><span /><span /></span>
      <strong role="status">{finishing ? "Finalizando…" : "Ouvindo"}</strong>
      <span className={styles.time}>{clock(now - state.startedAt)}</span>
    </div>
    <div ref={transcript} className={styles.transcript} tabIndex={0} aria-label="Texto reconhecido">
      {empty ? <p className={styles.placeholder}>Pode falar. Pausas não encerram: toque em Enviar quando terminar.</p> : <p>{state.text}{state.text && state.interim ? " " : ""}<span className={styles.interim}>{state.interim}</span></p>}
    </div>
    <div className={styles.actions}>
      <button type="button" className={styles.discard} title="Descartar gravação" disabled={finishing} onClick={onDiscard}><TrashIcon size={18} aria-hidden="true" /><span>Descartar</span></button>
      <button type="button" className={styles.review} disabled={finishing} onClick={onReview}><CheckIcon size={18} weight="bold" aria-hidden="true" />Revisar</button>
      <button ref={primary} type="button" className={styles.send} disabled={finishing || !canSend} onClick={onSend}><ArrowUpIcon size={18} weight="bold" aria-hidden="true" />Enviar</button>
    </div>
  </div>;
}
