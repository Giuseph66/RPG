import styles from "./spell-info.module.css";

/** Texto do livro para explicar uma magia; fornecido pela composição a partir do catálogo. */
export interface SpellInfo {
  readonly name: string;
  readonly level: number;
  readonly school: string;
  readonly castingTime: string;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly ritual: boolean;
  /** Parágrafos da descrição completa. */
  readonly description: readonly string[];
  /** Como a magia evolui: espaço de nível superior ou nível do personagem (truques). */
  readonly higherLevels?: string;
  readonly source: string;
}

export type SpellInfoLookup = (spellId: string) => SpellInfo | undefined;

export function spellMeta(info: SpellInfo): string {
  const school = info.school.charAt(0).toUpperCase() + info.school.slice(1);
  return [info.level === 0 ? `Truque de ${school.toLowerCase()}` : `${info.level}º nível · ${school}`, info.castingTime, info.range, info.ritual ? "ritual" : ""].filter(Boolean).join(" · ");
}

/** Primeiras frases até ter conteúdo útil, encurtadas: o texto completo fica no detalhe. */
export function spellBrief(text: string, size = 170): string {
  let summary = "";
  for (const sentence of text.split(/(?<=[.!?:])\s+/)) {
    summary = summary ? `${summary} ${sentence}` : sentence;
    if (summary.length >= 80) break;
  }
  return summary.length <= size ? summary : `${summary.slice(0, size).replace(/\s+\S*$/, "")}…`;
}

/** Ficha técnica, descrição completa e evolução; usada no modal da criação e inline na ficha. */
export function SpellInfoDetails({ info, showMeta = true }: { readonly info: SpellInfo; readonly showMeta?: boolean }) {
  return <div className={styles.detail}>
    {showMeta ? <p className={styles.meta}>{spellMeta(info)}</p> : null}
    <dl className={styles.facts}>
      <div><dt>Tempo de conjuração</dt><dd>{info.castingTime}</dd></div>
      <div><dt>Alcance</dt><dd>{info.range}</dd></div>
      <div><dt>Componentes</dt><dd>{info.components}</dd></div>
      <div><dt>Duração</dt><dd>{info.duration}</dd></div>
    </dl>
    {info.description.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {info.higherLevels ? <section className={styles.higher}><h3>{info.level === 0 ? "Evolução com o nível" : "Em níveis superiores"}</h3><p>{info.higherLevels}</p></section> : null}
    <p className={styles.source}>{info.source}</p>
  </div>;
}
