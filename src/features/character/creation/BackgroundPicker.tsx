import { useState } from "react";

import type { BackgroundOverview, SummarySource } from "@domain/character/creation";

import { formatWeight } from "./mapping";
import styles from "./background-picker.module.css";

const KIND_LABELS: Readonly<Record<SummarySource["kind"], string>> = { race: "Raça", subrace: "Sub-raça", class: "Classe", subclass: "Subclasse", background: "Antecedente", choice: "Escolha" };
const fromText = (sources: readonly SummarySource[]): string => [...new Set(sources.map((entry) => `${KIND_LABELS[entry.kind]} ${entry.name}`))].join(" e ");

/** Escolha do antecedente em cartões: o que ele traz e o que já vem de classe, raça ou outras escolhas. */
export function BackgroundPicker({ overviews, value, onChange }: {
  readonly overviews: readonly BackgroundOverview[];
  readonly value: string | undefined;
  readonly onChange: (id: string | undefined) => void;
}) {
  const [open, setOpen] = useState<string>();
  const owned = overviews[0]?.ownedTools ?? [];
  return (
    <fieldset className={styles.group}>
      <legend>Antecedente <span className={styles.optional}>opcional</span></legend>
      <p className={styles.hint}>O antecedente dá perícias, ferramentas, idiomas, equipamento e uma característica. Itens em destaque já vêm de outra fonte da sua ficha: escolher mesmo assim não soma.</p>
      {owned.length > 0 ? <p className={styles.warn}>Você já tem proficiência em {owned.map((tool) => tool.name).join(", ")} (por {fromText(owned.flatMap((tool) => tool.alreadyFrom))}). Ao escolher ferramentas de um antecedente, escolha outras.</p> : null}
      <div className={styles.list} role="radiogroup" aria-label="Antecedente">
        <label className={[styles.card, value === undefined ? styles.cardOn : ""].filter(Boolean).join(" ")}>
          <input type="radio" name="background" checked={value === undefined} onChange={() => onChange(undefined)} />
          <span className={styles.body}><strong>Nenhum</strong><small>A ficha fica sem as perícias, ferramentas, idiomas e equipamento de um antecedente.</small></span>
        </label>
        {overviews.map((overview) => {
          const expanded = open === overview.id;
          const checked = value === overview.id;
          return (
            <div key={overview.id} className={[styles.card, checked ? styles.cardOn : ""].filter(Boolean).join(" ")}>
              <label className={styles.main}>
                <input type="radio" name="background" checked={checked} onChange={() => onChange(overview.id)} />
                <span className={styles.body}>
                  <strong>{overview.name}{overview.overlapCount > 0 ? <span className={styles.badge}>{overview.overlapCount} já {overview.overlapCount === 1 ? "existe" : "existem"} na ficha</span> : null}</strong>
                  <span className={styles.line}><span className={styles.label}>Perícias</span>{overview.skills.map((skill) => <span key={skill.id} className={[styles.chip, skill.alreadyFrom.length ? styles.chipWarn : ""].filter(Boolean).join(" ")} title={skill.alreadyFrom.length ? `Já vem de ${fromText(skill.alreadyFrom)}` : undefined}>{skill.name}{skill.alreadyFrom.length ? ` · já vem de ${fromText(skill.alreadyFrom)}` : ""}</span>)}</span>
                  <small className={styles.meta}>
                    {overview.toolChoices ? `${overview.toolChoices} ferramenta(s) à escolha` : "Sem ferramentas"} · {overview.languageChoices ? `${overview.languageChoices} idioma(s) à escolha` : "Sem idiomas"} · Característica: {overview.feature.name}
                  </small>
                </span>
              </label>
              <button type="button" className={styles.more} aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : overview.id)}>{expanded ? "Ocultar detalhes" : `Ver tudo que ${overview.name} traz`}</button>
              {expanded ? (
                <div className={styles.detail}>
                  <h4>Equipamento</h4>
                  <ul>{overview.equipment.map((item) => <li key={item.id} className={item.alreadyFrom.length ? styles.warn : undefined}>{item.quantity}× {item.name} · {formatWeight(item.weightGrams * item.quantity)}{item.alreadyFrom.length ? ` (você já recebe de ${fromText(item.alreadyFrom)})` : ""}</li>)}</ul>
                  <h4>{overview.feature.name}</h4>
                  <p>{overview.feature.description}</p>
                  {overview.variants.length ? <><h4>Variantes</h4><ul>{overview.variants.map((variant) => <li key={variant.id}><strong>{variant.name}.</strong> {variant.description}</li>)}</ul></> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
