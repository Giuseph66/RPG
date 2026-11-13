import { useState } from "react";
import type { CreatureProposal, CreatureRecord } from "@domain/campaign/creatures";
import type { CreatureStatBlock } from "@domain/creatures";
import type { AppError, Result } from "@domain/contracts/errors";
import { Button, InlineStatus } from "@components/ui";
import { StatBlock } from "@components/creatures/StatBlock";
import { StatBlockEditor } from "@components/creatures/StatBlockEditor";
import type { StatBlockEditorProps } from "@components/creatures/StatBlockEditor";
import styles from "./creature-proposals.module.css";

type Decision = "approve" | "reject";

export interface CreatureProposalBoardProps {
  readonly mode: "player" | "master";
  readonly proposals: readonly CreatureProposal[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onSubmit?: (statBlock: CreatureStatBlock, suggestionReasons: readonly string[]) => Promise<Result<CreatureProposal, AppError>>;
  readonly onSuggestStatBlock?: StatBlockEditorProps["onSuggest"];
  readonly onReview?: (proposalId: CreatureProposal["id"], decision: Decision, reviewNote?: string, reviewedStatBlock?: CreatureStatBlock) => Promise<Result<{ readonly proposal: CreatureProposal; readonly creature?: CreatureRecord }, AppError>>;
}

const STATUS_LABELS = { pending: "Aguardando o mestre", approved: "Aprovada", rejected: "Não aprovada" } as const;

export function CreatureProposalBoard({ mode, proposals, loading, error, onSubmit, onReview, onSuggestStatBlock }: CreatureProposalBoardProps) {
  const [local, setLocal] = useState<readonly CreatureProposal[]>([]);
  const [draft, setDraft] = useState<CreatureStatBlock>();
  const [reason, setReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Readonly<Record<string, string>>>({});
  const [reviewBlocks, setReviewBlocks] = useState<Readonly<Record<string, CreatureStatBlock | undefined>>>({});
  const [reviewValidity, setReviewValidity] = useState<Readonly<Record<string, boolean>>>({});
  const [valid, setValid] = useState(true);
  const [generatedReasons, setGeneratedReasons] = useState<readonly string[]>([]);
  const [busyId, setBusyId] = useState<string>();
  const [message, setMessage] = useState<{ readonly tone: "success" | "error"; readonly text: string }>();

  // A resposta persistida é a fonte de verdade, mas a lista atualiza antes do reload da campanha.
  const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  for (const proposal of local) byId.set(proposal.id, proposal);
  const merged = [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const pending = merged.filter((proposal) => proposal.status === "pending");
  const submit = async () => {
    if (!onSubmit || !draft || !reason.trim() || !valid) return;
    if (mode === "player" && draft.creatureType !== "beast") { setMessage({ tone: "error", text: "Sugestões de jogador precisam ser bestas." }); return; }
    setBusyId("new"); setMessage(undefined);
    const result = await onSubmit(draft, [...generatedReasons, reason.trim()]);
    setBusyId(undefined);
    if (!result.ok) { setMessage({ tone: "error", text: result.error.message }); return; }
    setLocal((current) => [result.value, ...current.filter((item) => item.id !== result.value.id)]);
    setDraft(undefined); setReason("");
    setMessage({ tone: "success", text: "Sugestão enviada ao mestre. Ela ainda não foi aprovada nem registrada como avistamento." });
  };
  const review = async (proposal: CreatureProposal, decision: Decision) => {
    if (!onReview || busyId) return;
    const id = String(proposal.id);
    const reviewedStatBlock = decision === "approve"
      ? (Object.prototype.hasOwnProperty.call(reviewBlocks, id) ? reviewBlocks[id] : proposal.reviewedStatBlock ?? proposal.statBlock)
      : undefined;
    if (decision === "approve" && (!reviewedStatBlock || reviewedStatBlock.challengeRating === null || reviewValidity[id] === false)) {
      setMessage({ tone: "error", text: "Informe um ND válido no bloco revisado antes de aprovar." });
      return;
    }
    setBusyId(id); setMessage(undefined);
    const result = await onReview(proposal.id, decision, reviewNotes[id]?.trim() || undefined, reviewedStatBlock);
    setBusyId(undefined);
    if (!result.ok) { setMessage({ tone: "error", text: result.error.message }); return; }
    setLocal((current) => [result.value.proposal, ...current.filter((item) => item.id !== result.value.proposal.id)]);
    setMessage({ tone: "success", text: decision === "approve" ? "Sugestão aprovada e adicionada ao catálogo do mestre." : "Sugestão recusada." });
  };

  return <section className={styles.panel} aria-labelledby={`creature-proposals-${mode}-title`}>
    <header><div><p className={styles.eyebrow}>Jornada · Animais</p><h3 id={`creature-proposals-${mode}-title`}>{mode === "master" ? "Sugestões dos jogadores" : "Sugerir um animal"}</h3><p>{mode === "master" ? "Revise o bloco completo antes de aprovar. Aprovação não registra avistamento." : "O mestre revisa o bloco antes de compartilhá-lo. Enviar uma sugestão não marca o animal como visto."}</p></div><span className={styles.count}>{pending.length} pendente(s)</span></header>
    {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
    {message ? <InlineStatus tone={message.tone} assertive={message.tone === "error"}>{message.text}</InlineStatus> : null}
    {mode === "player" && onSubmit ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <StatBlockEditor value={draft} name={draft?.name ?? "Novo animal"} onChange={(next) => { setDraft(next); if (!next) setGeneratedReasons([]); }} onValidityChange={setValid} creatureTypeMode="beast-only" onSuggest={onSuggestStatBlock ? (input) => {
        const result = onSuggestStatBlock({ ...input, role: "player-beast" });
        if (result.ok) setGeneratedReasons(result.value.reasons);
        return result;
      } : undefined} />
      <label className={styles.reason}><span>Por que você sugere este animal?</span><textarea required rows={2} maxLength={600} value={reason} onChange={(event) => setReason(event.currentTarget.value)} placeholder="Descreva a fonte, a cena ou a característica que chamou sua atenção." /></label>
      <div className={styles.actions}><Button type="submit" disabled={!draft || !reason.trim() || !valid || Boolean(busyId)} busy={busyId === "new"}>Enviar para revisão</Button></div>
    </form> : null}
    {loading && merged.length === 0 ? <p className={styles.empty} role="status">Carregando sugestões…</p> : merged.length === 0 ? <p className={styles.empty}>{mode === "master" ? "Nenhuma sugestão para revisar." : "Você ainda não enviou sugestões."}</p> : <ul className={styles.list}>{merged.map((proposal) => <li key={String(proposal.id)}>
      <div className={styles.proposalHeading}><div><strong>{(proposal.status === "approved" ? proposal.reviewedStatBlock ?? proposal.statBlock : proposal.statBlock).name}</strong><span data-status={proposal.status}>{STATUS_LABELS[proposal.status]}</span></div>{proposal.suggestionReasons.length ? <p>{proposal.suggestionReasons.join(" · ")}</p> : null}</div>
      {proposal.reviewNote ? <p className={styles.reviewNote}>Nota do mestre: {proposal.reviewNote}</p> : null}
      <details><summary>{proposal.status === "approved" ? "Ver bloco aprovado" : "Ver bloco estatístico enviado"}</summary><StatBlock creature={proposal.status === "approved" ? proposal.reviewedStatBlock ?? proposal.statBlock : proposal.statBlock} /></details>
      {mode === "master" && proposal.status === "pending" && onReview ? <div className={styles.review}>
        <strong>Revisão do bloco</strong>
        <p className={styles.reviewNote}>A proposta enviada permanece preservada. O bloco abaixo será o publicado após a aprovação.</p>
        <StatBlockEditor
          key={`review-${String(proposal.id)}`}
          value={Object.prototype.hasOwnProperty.call(reviewBlocks, String(proposal.id)) ? reviewBlocks[String(proposal.id)] : proposal.reviewedStatBlock ?? proposal.statBlock}
          name={proposal.statBlock.name}
          onChange={(next) => setReviewBlocks((current) => ({ ...current, [String(proposal.id)]: next }))}
          onValidityChange={(next) => setReviewValidity((current) => ({ ...current, [String(proposal.id)]: next }))}
          creatureTypeMode="beast-only"
        />
        {((Object.prototype.hasOwnProperty.call(reviewBlocks, String(proposal.id)) ? reviewBlocks[String(proposal.id)] : proposal.reviewedStatBlock ?? proposal.statBlock)?.challengeRating === null) ? <p className={styles.reviewNote} role="status">O ND da sugestão não foi informado. Defina o ND final do bloco para poder aprovar.</p> : null}
        <label className={styles.reason}><span>Nota de revisão (opcional)</span><textarea rows={2} maxLength={600} value={reviewNotes[String(proposal.id)] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [String(proposal.id)]: event.currentTarget.value }))} /></label>
        <div className={styles.actions}><Button size="sm" disabled={Boolean(busyId) || reviewValidity[String(proposal.id)] === false || (Object.prototype.hasOwnProperty.call(reviewBlocks, String(proposal.id)) ? reviewBlocks[String(proposal.id)] : proposal.reviewedStatBlock ?? proposal.statBlock)?.challengeRating === null} busy={busyId === String(proposal.id)} onClick={() => void review(proposal, "approve")}>Aprovar no catálogo</Button><Button size="sm" variant="secondary" disabled={Boolean(busyId)} onClick={() => void review(proposal, "reject")}>Recusar</Button></div>
      </div> : null}
    </li>)}</ul>}
  </section>;
}
