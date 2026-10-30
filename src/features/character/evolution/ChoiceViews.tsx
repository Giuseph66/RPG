import { useMemo, useState } from "react";
import { Info } from "@phosphor-icons/react";

import { IconButton } from "@components/ui";
import type { ChoiceOptionView, SpellOptionView } from "@domain/character/evolution";

import { SpellInfoDetails, spellBrief, spellMeta } from "../spell-info";
import type { SpellInfoLookup } from "../spell-info";
import styles from "./level-up.module.css";

/** Lista de opções com limite: radio quando só uma, caixas de seleção quando várias. */
export function OptionList({ options, selected, max, onChange, onInfo }: {
  readonly options: readonly ChoiceOptionView[];
  readonly selected: readonly string[];
  readonly max: number;
  readonly onChange: (ids: readonly string[]) => void;
  readonly onInfo?: (id: string) => void;
}) {
  const single = max === 1;
  const toggle = (id: string) => {
    if (selected.includes(id)) return onChange(selected.filter((entry) => entry !== id));
    onChange(single ? [id] : selected.length >= max ? selected : [...selected, id]);
  };
  return (
    <div className={styles.options} role={single ? "radiogroup" : "group"}>
      {options.map((option) => {
        const checked = selected.includes(option.id);
        const blocked = Boolean(option.disabledReason) && !checked;
        const full = !single && !checked && selected.length >= max;
        return (
          <div key={option.id} className={[styles.option, checked ? styles.optionOn : "", blocked ? styles.optionBlocked : ""].filter(Boolean).join(" ")}>
            <label className={styles.optionMain}>
              <input type={single ? "radio" : "checkbox"} name={single ? `opt-${options[0]?.id}` : undefined} checked={checked} disabled={blocked || full} onChange={() => toggle(option.id)} />
              <span className={styles.optionText}>
                <span className={styles.optionName}>{option.label}</span>
                {option.disabledReason ? <small className={styles.optionReason}>{option.disabledReason}</small> : null}
              </span>
            </label>
            {onInfo ? <IconButton variant="ghost" className={styles.infoButton} label={`Descrição de ${option.label}`} icon={<Info size={20} />} onClick={() => onInfo(option.id)} /> : null}
          </div>
        );
      })}
      <p className={styles.count} aria-live="polite">{selected.length} de {max} escolhida(s)</p>
    </div>
  );
}

/** Seleção de magias com busca, resumo, evolução e descrição completa ao abrir o ⓘ. */
export function SpellPicker({ options, selected, max, onChange, spellInfo }: {
  readonly options: readonly SpellOptionView[];
  readonly selected: readonly string[];
  readonly max: number;
  readonly onChange: (ids: readonly string[]) => void;
  readonly spellInfo?: SpellInfoLookup;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string>();
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byLevel = new Map<number, SpellOptionView[]>();
    for (const option of options) {
      if (needle && !option.name.toLowerCase().includes(needle)) continue;
      byLevel.set(option.level, [...(byLevel.get(option.level) ?? []), option]);
    }
    return [...byLevel.entries()].sort(([a], [b]) => a - b);
  }, [options, query]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : selected.length >= max ? selected : [...selected, id]);
  return (
    <div className={styles.spellPicker}>
      <label className={styles.search}><span>Buscar magia</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nome da magia" /></label>
      <p className={styles.count} aria-live="polite">{selected.length} de {max} escolhida(s)</p>
      {groups.length === 0 ? <p className={styles.muted}>Nenhuma magia disponível para esta escolha.</p> : groups.map(([level, group]) => (
        <fieldset key={level} className={styles.spellGroup}>
          <legend>{level === 0 ? "Truques" : `${level}º círculo`}</legend>
          {group.map((option) => {
            const info = spellInfo?.(option.id);
            const checked = selected.includes(option.id);
            const blocked = Boolean(option.disabledReason) && !checked;
            const open = expanded === option.id;
            return (
              <div key={option.id} className={[styles.option, checked ? styles.optionOn : "", blocked ? styles.optionBlocked : ""].filter(Boolean).join(" ")}>
                <label className={styles.optionMain}>
                  <input type="checkbox" checked={checked} disabled={blocked || (!checked && selected.length >= max)} onChange={() => toggle(option.id)} />
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{option.name}</span>
                    {info ? <small className={styles.spellMeta}>{spellMeta(info)}</small> : null}
                    {option.disabledReason ? <small className={styles.optionReason}>{option.disabledReason}</small> : null}
                    {info && !open ? <span className={styles.spellBrief}>{spellBrief(info.description.join(" "))}</span> : null}
                  </span>
                </label>
                {info ? <IconButton variant="ghost" className={styles.infoButton} label={open ? `Ocultar descrição de ${option.name}` : `Descrição de ${option.name}`} icon={<Info size={20} weight={open ? "fill" : "regular"} />} aria-expanded={open} onClick={() => setExpanded(open ? undefined : option.id)} /> : null}
                {info && open ? <div className={styles.optionDetail}><SpellInfoDetails info={info} showMeta={false} /></div> : null}
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
