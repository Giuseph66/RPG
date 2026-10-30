import { useState } from "react";

import { spellBrief } from "../spell-info";
import type { SubclassInfoLookup } from "./types";
import styles from "./level-up.module.css";

/** Escolha de subclasse em cartões: introdução, o que ganha em cada nível e o texto completo sob demanda. */
export function SubclassPicker({ label, options, value, onChange, info, laterLabel = "Escolher depois" }: {
  readonly label: string;
  readonly options: readonly { readonly id: string; readonly name: string }[];
  readonly value: string | undefined;
  readonly onChange: (id: string | undefined) => void;
  readonly info?: SubclassInfoLookup;
  readonly laterLabel?: string;
}) {
  const [open, setOpen] = useState<string>();
  return (
    <fieldset className={styles.subclassGroup}>
      <legend>{label}</legend>
      <div className={styles.subclassList} role="radiogroup" aria-label={label}>
        <label className={[styles.subclassCard, value === undefined ? styles.subclassCardOn : ""].filter(Boolean).join(" ")}>
          <input type="radio" name={`subclass-${label}`} checked={value === undefined} onChange={() => onChange(undefined)} />
          <span className={styles.subclassBody}><strong>{laterLabel}</strong><small>Você pode escolher ao subir o próximo nível.</small></span>
        </label>
        {options.map((option) => {
          const detail = info?.(option.id);
          const expanded = open === option.id;
          const checked = value === option.id;
          return (
            <div key={option.id} className={[styles.subclassCard, checked ? styles.subclassCardOn : ""].filter(Boolean).join(" ")}>
              <label className={styles.subclassMain}>
                <input type="radio" name={`subclass-${label}`} checked={checked} onChange={() => onChange(option.id)} />
                <span className={styles.subclassBody}>
                  <strong>{option.name}</strong>
                  {detail?.intro[0] ? <span className={styles.subclassBrief}>{spellBrief(detail.intro[0], 220)}</span> : null}
                  {detail?.features.length ? <small className={styles.subclassGains}>Você ganha: {detail.features.map((feature) => `nível ${feature.level}: ${feature.name}`).join(" · ")}</small> : null}
                </span>
              </label>
              {detail ? <button type="button" className={styles.subclassMore} aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : option.id)}>{expanded ? "Ocultar detalhes" : `Ver o que ${option.name} faz`}</button> : null}
              {detail && expanded ? (
                <div className={styles.subclassDetail}>
                  {detail.intro.map((paragraph, index) => <p key={`i${index}`}>{paragraph}</p>)}
                  {detail.features.map((feature) => (
                    <section key={`${feature.level}-${feature.name}`}>
                      <h4>Nível {feature.level}: {feature.name}</h4>
                      {feature.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                    </section>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
