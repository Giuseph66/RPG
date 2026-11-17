import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppModal } from "@components/ui";
import { useRuleDetails } from "@features/compendium";
import type { RuleQuery } from "@features/compendium";
import type { ChatAction, ChatSource as OracleSource, ChatSourceKind as OracleSourceKind, ChatToolKind as OracleToolKind, ChatToolTrace as OracleToolCall, ChatTrace as OracleTrace } from "@application/ports/chat-agent";
import { BookOpenText, CaretDown, DiceFive, Eye, IdentificationCard, Scroll, WarningCircle } from "@phosphor-icons/react";
import styles from "./OracleAnswer.module.css";

export type { OracleSource, OracleSourceKind, OracleToolKind, OracleToolCall, OracleTrace };

const SOURCE_LABEL: Record<OracleSourceKind, string> = { rule: "Regra", sheet: "Ficha", journal: "Diário", campaign: "Campanha", session: "Sessão", memory: "Memória", attachment: "Arquivo", suggestion: "Sugestão" };
const TOOL_ICON: Record<OracleToolKind, ReactNode> = {
  rules: <BookOpenText size={15} weight="duotone" />,
  sheet: <IdentificationCard size={15} weight="duotone" />,
  journal: <Scroll size={15} weight="duotone" />,
  dice: <DiceFive size={15} weight="duotone" />,
  campaign: <Scroll size={15} weight="duotone" />,
  session: <Scroll size={15} weight="duotone" />,
  memory: <BookOpenText size={15} weight="duotone" />,
  action: <IdentificationCard size={15} weight="duotone" />,
};

const seconds = (ms: number) => `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Answer first; reasoning, tools and sources stay folded behind one quiet line. */
export function OracleAnswer({ content, time, trace, actions = [], busy = false, onAction, streaming = false, spokenRange }: { readonly content: string; readonly time: string; readonly trace?: OracleTrace; readonly actions?: readonly ChatAction[]; readonly busy?: boolean; readonly onAction?: (id: string, decision: "confirm" | "reject" | "undo") => void; readonly streaming?: boolean; readonly spokenRange?: { readonly start: number; readonly end: number } }) {
  const prefix = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState<number>();
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(new Set());
  const [sourceDetail, setSourceDetail] = useState<OracleSource>();
  const openRuleDetails = useRuleDetails();
  const sources = trace?.sources ?? [];
  const tools = trace?.tools ?? [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const summary = [tools.length ? plural(tools.length, "ferramenta", "ferramentas") : "", sources.length ? plural(sources.length, "fonte", "fontes") : ""].filter(Boolean).join(" · ");
  const hasTrace = Boolean(tools.length || sources.length || trace?.model);

  useEffect(() => {
    if (highlighted === undefined) return;
    const timer = window.setTimeout(() => setHighlighted(undefined), 1800);
    return () => window.clearTimeout(timer);
  }, [highlighted]);

  useEffect(() => {
    if (!spokenRange) return;
    const mark = bodyRef.current?.querySelector("mark[data-speaking]");
    const transcript = bodyRef.current?.closest<HTMLElement>('[role="log"]');
    const current = mark?.getClientRects()[0];
    if (!transcript || !current) return;
    const bounds = transcript.getBoundingClientRect();
    if (current.top < bounds.top || current.bottom > bounds.bottom) transcript.scrollTop += current.top - bounds.top - transcript.clientHeight * .35;
  }, [spokenRange]);

  const showSource = (id: number) => {
    if (detailsRef.current) detailsRef.current.open = true;
    setHighlighted(id);
    window.requestAnimationFrame(() => document.getElementById(`${prefix}-src-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  const openSource = (source: OracleSource) => {
    const match = source.kind === "rule" ? /^\/compendium\/([^/]+)\/([^/?#]+)$/.exec(source.href ?? "") : null;
    if (match) {
      try {
        if (openRuleDetails({ category: match[1] as RuleQuery["category"], title: source.title, entityId: decodeURIComponent(match[2]) })) return;
      } catch { /* Fontes antigas podem ter um endereço inválido; o trecho continua disponível. */ }
    }
    setSourceDetail(source);
  };

  const highlightSpeech = (text: string, offset: number, key: number): ReactNode => {
    if (!spokenRange) return text;
    const start = Math.max(0, spokenRange.start - offset), end = Math.min(text.length, spokenRange.end - offset);
    if (start >= end) return text;
    return <span key={key}>{text.slice(0, start)}<mark data-speaking className={styles.spoken}>{text.slice(start, end)}</mark>{text.slice(end)}</span>;
  };

  const renderInline = (text: string, offset: number): ReactNode[] => {
    let cursor = offset;
    return text.split(/(\[\d+\]|\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
      const start = cursor;
      cursor += part.length;
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{highlightSpeech(part.slice(2, -2), start + 2, index)}</strong>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{highlightSpeech(part.slice(1, -1), start + 1, index)}</code>;
      const match = /^\[(\d+)\]$/.exec(part);
      const id = match ? Number(match[1]) : undefined;
      if (id === undefined || !sourceIds.has(id)) return highlightSpeech(part, start, index);
      const source = sources.find((item) => item.id === id)!;
      return <button key={index} type="button" className={styles.cite} onClick={() => showSource(id)} aria-label={`Fonte ${id}: ${source.title}`}>{id}</button>;
    });
  };

  let cursor = 0;
  const paragraphs = content.split(/\n{2,}/).map((text) => {
    const start = content.indexOf(text, cursor);
    cursor = start + text.length;
    return { text, start };
  }).filter((paragraph) => paragraph.text.trim());

  return (
    <article className={styles.answer}>
      <header className={styles.meta}>
        <span className={styles.seal} aria-hidden="true"><Eye size={15} weight="duotone" /></span>
        <strong>Oráculo</strong>
        <time>{time}</time>
        {streaming ? <span role="status">Respondendo…</span> : null}
      </header>

      <div className={styles.thread}>
        <div ref={bodyRef} className={styles.body} aria-live={spokenRange ? "off" : undefined}>
          {paragraphs.map(({ text: paragraph, start }) => {
            const heading = /^#{1,4}\s+/.exec(paragraph);
            if (heading) return <h3 key={start}>{renderInline(paragraph.slice(heading[0].length), start + heading[0].length)}</h3>;
            const lines = paragraph.split("\n");
            if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
              let lineStart = start;
              return <ul key={start}>{lines.map((line, i) => {
                const prefix = /^\s*[-*]\s+/.exec(line)![0].length;
                const offset = lineStart + prefix;
                lineStart += line.length + 1;
                return <li key={i}>{renderInline(line.slice(prefix), offset)}</li>;
              })}</ul>;
            }
            const suggestion = /^sugest[aã]o:\s*/i.exec(paragraph);
            return suggestion
              ? <p key={start} className={styles.suggestion}>{renderInline(paragraph.slice(suggestion[0].length), start + suggestion[0].length)}</p>
              : <p key={start}>{renderInline(paragraph, start)}</p>;
          })}
        </div>

        {trace?.notices?.map((notice) => <p key={notice} className={styles.notice}>{notice}</p>)}
        {actions.length ? <section className={styles.actions} aria-label="Ações propostas">
          {actions.map((action) => <div key={action.id} className={styles.action}>
            <strong>{action.label}</strong>
            <span>{({ pending: "Aguardando sua confirmação", executing: "Em execução — confira o estado antes de repetir", done: "Concluída", rejected: "Recusada ou desfeita", failed: "Falhou — confira o estado no app" } as const)[action.status]}</span>
            {action.review ? <p>{action.review}</p> : null}
            <details><summary>Revisar proposta</summary><dl>{Object.entries(action.input).filter(([key]) => !/Id$/.test(key) && !key.startsWith("_") && key !== "kind").map(([key, value]) => <div key={key}><dt>{({ operation: "Operação", title: "Título", body: "Conteúdo", quantity: "Quantidade", amount: "Quantidade", value: "Valor", targetArmorClass: "CA do alvo", formula: "Dados", check: "Teste", mode: "Modo", key: "Atributo ou perícia", reason: "Origem", visibility: "Visibilidade", hitDice: "Dados de Vida", ateAndDrank: "Comeu e bebeu", severity: "Severidade", sessionNumber: "Sessão", encounter: "Iniciativa", spellTargetContext: "Alvos", spellComponentContext: "Componentes", spellIds: "Magias", preparationTimeConfirmed: "Tempo de preparação confirmado", attendance: "Presença" } as Record<string, string>)[key] ?? key}</dt><dd>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</dd></div>)}</dl></details>
            {action.result ? <p>{action.result}</p> : null}
            {action.status === "pending" && onAction ? <><label><input type="checkbox" checked={reviewed.has(action.id)} disabled={busy} onChange={(event) => { const checked = event.currentTarget.checked; setReviewed((previous) => { const next = new Set(previous); if (checked) next.add(action.id); else next.delete(action.id); return next; }); }} /> Revisei a proposta e autorizo esta ação.</label><div className={styles.actionButtons}><button type="button" disabled={busy || !reviewed.has(action.id)} onClick={() => onAction(action.id, "confirm")}>Confirmar ação</button><button type="button" disabled={busy} onClick={() => onAction(action.id, "reject")}>Recusar</button></div></> : null}
            {action.status === "done" && action.undo && onAction ? <button type="button" disabled={busy} onClick={() => onAction(action.id, "undo")}>Desfazer alteração</button> : null}
          </div>)}
        </section> : null}

        {hasTrace ? (
          <details ref={detailsRef} className={styles.trace}>
            <summary>
              <span>Como respondeu</span>
              {summary ? <span className={styles.traceCount}>{summary}</span> : null}
              <CaretDown className={styles.caret} size={12} weight="bold" aria-hidden="true" />
            </summary>

            <div className={styles.traceBody}>
              {tools.length ? (
                <section>
                  <h3>Ferramentas</h3>
                  <ul className={styles.rows}>
                    {tools.map((tool) => (
                      <li key={tool.id} data-status={tool.status}>
                        <span className={styles.rowIcon} aria-hidden="true">{tool.status === "error" ? <WarningCircle size={15} weight="fill" /> : TOOL_ICON[tool.kind]}</span>
                        <span className={styles.rowText}><strong>{tool.label}</strong> <span>{tool.input}</span> → {tool.output}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {sources.length ? (
                <section>
                  <h3>Fontes</h3>
                  <ol className={styles.rows}>
                    {sources.map((source) => (
                      <li key={source.id} id={`${prefix}-src-${source.id}`} className={styles.source} data-highlighted={highlighted === source.id || undefined}>
                        <span className={styles.sourceNumber} aria-hidden="true">{source.id}</span>
                        <span className={styles.rowText}>
                          <strong>{source.title}</strong> <span>{SOURCE_LABEL[source.kind]} · {source.locator}</span>
                          <q>{source.excerpt}</q>
                          {source.updatedAt ? <span>Atualizado: {new Date(source.updatedAt).toLocaleString("pt-BR")}</span> : null}
                          <button type="button" className={styles.sourceDetails} onClick={() => openSource(source)}>Ver detalhes da fonte</button>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {trace?.model || trace?.durationMs || trace?.tokens ? (
                <p className={styles.stats}>{[trace.model, trace.durationMs ? seconds(trace.durationMs) : undefined, trace.tokens ? `${trace.tokens.toLocaleString("pt-BR")} tokens` : undefined].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
      {sourceDetail ? <AppModal open title={sourceDetail.title} onClose={() => setSourceDetail(undefined)}>
        <div className={styles.sourceContent}>
          <p>{SOURCE_LABEL[sourceDetail.kind]} · {sourceDetail.locator}</p>
          <h3>Trecho consultado</h3>
          <p>{sourceDetail.excerpt}</p>
          {sourceDetail.updatedAt ? <p>Atualizado: {new Date(sourceDetail.updatedAt).toLocaleString("pt-BR")}</p> : null}
        </div>
      </AppModal> : null}
    </article>
  );
}
