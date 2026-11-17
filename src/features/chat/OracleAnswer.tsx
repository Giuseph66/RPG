import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookOpenText, CaretDown, DiceFive, Eye, IdentificationCard, Scroll, WarningCircle } from "@phosphor-icons/react";
import styles from "./OracleAnswer.module.css";

/** Visual-only trace shape. Nothing in the chat backend produces it yet. */
export type OracleSourceKind = "rule" | "sheet" | "journal" | "suggestion";
export type OracleToolKind = "rules" | "sheet" | "journal" | "dice";

export interface OracleToolCall {
  readonly id: string;
  readonly kind: OracleToolKind;
  readonly label: string;
  readonly input: string;
  readonly output: string;
  readonly status: "ok" | "empty" | "error";
  readonly durationMs?: number;
}

export interface OracleSource {
  readonly id: number;
  readonly kind: OracleSourceKind;
  readonly title: string;
  readonly locator: string;
  readonly excerpt: string;
}

export interface OracleTrace {
  readonly model?: string;
  readonly durationMs?: number;
  readonly tokens?: number;
  readonly reasoning?: { readonly durationMs: number; readonly steps: readonly string[] };
  readonly tools?: readonly OracleToolCall[];
  readonly sources?: readonly OracleSource[];
}

const SOURCE_LABEL: Record<OracleSourceKind, string> = { rule: "Regra", sheet: "Ficha", journal: "Diário", suggestion: "Sugestão" };
const TOOL_ICON: Record<OracleToolKind, ReactNode> = {
  rules: <BookOpenText size={15} weight="duotone" />,
  sheet: <IdentificationCard size={15} weight="duotone" />,
  journal: <Scroll size={15} weight="duotone" />,
  dice: <DiceFive size={15} weight="duotone" />,
};

const seconds = (ms: number) => `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Answer first; reasoning, tools and sources stay folded behind one quiet line. */
export function OracleAnswer({ content, time, trace, example = false }: { readonly content: string; readonly time: string; readonly trace?: OracleTrace; readonly example?: boolean }) {
  const prefix = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [highlighted, setHighlighted] = useState<number>();
  const sources = trace?.sources ?? [];
  const tools = trace?.tools ?? [];
  const steps = trace?.reasoning?.steps ?? [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const summary = [tools.length ? plural(tools.length, "ferramenta", "ferramentas") : "", sources.length ? plural(sources.length, "fonte", "fontes") : ""].filter(Boolean).join(" · ");
  const hasTrace = Boolean(steps.length || tools.length || sources.length);

  useEffect(() => {
    if (highlighted === undefined) return;
    const timer = window.setTimeout(() => setHighlighted(undefined), 1800);
    return () => window.clearTimeout(timer);
  }, [highlighted]);

  const showSource = (id: number) => {
    if (detailsRef.current) detailsRef.current.open = true;
    setHighlighted(id);
    window.requestAnimationFrame(() => document.getElementById(`${prefix}-src-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  const renderInline = (text: string) => text.split(/(\[\d+\])/g).map((part, index) => {
    const match = /^\[(\d+)\]$/.exec(part);
    const id = match ? Number(match[1]) : undefined;
    if (id === undefined || !sourceIds.has(id)) return part;
    const source = sources.find((item) => item.id === id)!;
    return <button key={index} type="button" className={styles.cite} onClick={() => showSource(id)} aria-label={`Fonte ${id}: ${source.title}`}>{id}</button>;
  });

  const paragraphs = content.split(/\n{2,}/).filter((paragraph) => paragraph.trim());

  return (
    <article className={styles.answer}>
      <header className={styles.meta}>
        <span className={styles.seal} aria-hidden="true"><Eye size={15} weight="duotone" /></span>
        <strong>Oráculo</strong>
        <time>{time}</time>
        {example ? <span className={styles.exampleBadge} title="Dados fictícios para mostrar o formato da resposta.">Exemplo</span> : null}
      </header>

      <div className={styles.thread}>
        <div className={styles.body}>
          {paragraphs.map((paragraph) => {
            const suggestion = /^sugest[aã]o:\s*/i.exec(paragraph);
            return suggestion
              ? <p key={paragraph} className={styles.suggestion}>{renderInline(paragraph.slice(suggestion[0].length))}</p>
              : <p key={paragraph}>{renderInline(paragraph)}</p>;
          })}
        </div>

        {hasTrace ? (
          <details ref={detailsRef} className={styles.trace}>
            <summary>
              <span>Como respondeu</span>
              {summary ? <span className={styles.traceCount}>{summary}</span> : null}
              <CaretDown className={styles.caret} size={12} weight="bold" aria-hidden="true" />
            </summary>

            <div className={styles.traceBody}>
              {steps.length ? (
                <section>
                  <h3>Raciocínio{trace?.reasoning ? <span> · {seconds(trace.reasoning.durationMs)}</span> : null}</h3>
                  <ol className={styles.steps}>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
                </section>
              ) : null}

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
    </article>
  );
}

export const EXAMPLE_QUESTION = "Lyra levou 14 de dano mantendo Imobilizar Pessoa. Ela perde a magia?";

export const EXAMPLE_ANSWER = `Não necessariamente: ela precisa passar num teste de resistência de Constituição para manter a concentração [1]. A CD é 10 ou metade do dano sofrido, o que for maior; com 14 de dano, metade é 7, então a CD fica em 10 [1].

O bônus de Lyra nesse teste é +4 (Constituição +2 e proficiência +2) [2]. Ela mantém Imobilizar Pessoa com 6 ou mais no d20, cerca de 75% de chance. A magia prende o líder dos cultistas desde o segundo turno do combate na ponte [3].

Sugestão: se falhar, descreva o cultista sentindo os músculos voltarem a obedecer no instante em que a lâmina atinge Lyra.`;

export const EXAMPLE_TRACE: OracleTrace = {
  model: "llama3.1:8b",
  durationMs: 6400,
  tokens: 412,
  reasoning: {
    durationMs: 3800,
    steps: [
      "A pergunta é sobre manter concentração depois de sofrer dano: regra de conjuração, não de combate.",
      "Para dar uma resposta concreta preciso da CD (regra) e do bônus de Lyra (ficha).",
      "14 de dano → metade é 7; o mínimo de 10 prevalece.",
      "Separar o que é regra do que é sugestão narrativa.",
    ],
  },
  tools: [
    { id: "t1", kind: "rules", label: "Compêndio de regras", input: "concentração · sofrer dano", output: "1 regra: Concentração (Conjurando magias)", status: "ok", durationMs: 120 },
    { id: "t2", kind: "sheet", label: "Ficha de Lyra", input: "resistência de Constituição", output: "+4 (CON +2, proficiência +2)", status: "ok", durationMs: 40 },
    { id: "t3", kind: "journal", label: "Diário da campanha", input: "magias ativas na cena atual", output: "Imobilizar Pessoa ativa desde o 2º turno", status: "ok", durationMs: 210 },
    { id: "t4", kind: "dice", label: "Calculadora de chances", input: "d20 + 4 ≥ 10", output: "75%", status: "ok", durationMs: 5 },
  ],
  sources: [
    { id: 1, kind: "rule", title: "Concentração", locator: "Livro do Jogador · Conjurando magias", excerpt: "Sempre que sofrer dano enquanto estiver concentrado em uma magia, você deve realizar um teste de resistência de Constituição para manter a concentração. A CD é 10 ou metade do dano sofrido, o que for maior." },
    { id: 2, kind: "sheet", title: "Lyra · Resistências", locator: "Ficha da personagem · Feiticeira 3", excerpt: "Constituição 14 (+2) · proficiente (Feiticeiro) · total +4" },
    { id: 3, kind: "journal", title: "Combate na ponte de Vau de Sal", locator: "Diário · Sessão 7", excerpt: "Lyra conjura Imobilizar Pessoa no líder dos cultistas, que fica paralisado no meio da ponte." },
  ],
};
