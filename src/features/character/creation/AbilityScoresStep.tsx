import { useState } from "react";
import { Minus, Plus, DiceSix } from "@phosphor-icons/react";

import { Button, IconButton, SectionCard } from "@components/ui";
import type { AbilityGeneration, AbilityGenerationMethod, CharacterDraft } from "@domain/contracts/character";
import type { Ability } from "@domain/contracts/primitives";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { ClassDefinition } from "@domain/contracts/definitions/class";
import type { CreationIssue } from "@domain/character/creation";
import { creationAbilityScore, defaultBaseScore } from "@domain/character/creation";

import { ABILITY_LABELS } from "./mapping";
import styles from "./character-creation-wizard.module.css";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
const POINT_BUY_BUDGET = 27;
const POINT_BUY_COST: Readonly<Record<number, number>> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const EMPTY_SCORES: Readonly<Record<Ability, number>> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

const ABILITY_SHORT: Readonly<Record<Ability, string>> = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const ABILITY_USES: Readonly<Record<Ability, string>> = {
  str: "Ataques corpo a corpo, Atletismo e carga",
  dex: "CA, iniciativa, ataques à distância e Furtividade",
  con: "Pontos de vida e concentração",
  int: "Arcanismo, Investigação e magia do Mago",
  wis: "Percepção, Intuição e magia de Clérigo, Druida e Patrulheiro",
  cha: "Persuasão, Enganação e magia de Bardo, Bruxo, Feiticeiro e Paladino",
};

const METHODS: readonly { readonly id: AbilityGenerationMethod; readonly label: string; readonly hint: string }[] = [
  { id: "standard-array", label: "Matriz padrão", hint: "Distribua 15, 14, 13, 12, 10 e 8." },
  { id: "point-buy", label: "Compra de pontos", hint: "27 pontos; valores de 8 a 15." },
  { id: "rolled", label: "Rolagem", hint: "4d6 por atributo, descarta o menor." },
  { id: "manual", label: "Manual", hint: "Qualquer valor de 1 a 30." },
];

const signed = (value: number) => (value >= 0 ? `+${value}` : `−${Math.abs(value)}`);
const modifierOf = (score: number) => Math.floor((score - 10) / 2);

function rollFourDropLowest(): readonly number[] {
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => (value % 6) + 1);
}

function initialScores(method: AbilityGenerationMethod, previous: AbilityGeneration | undefined): Record<Ability, number> {
  if (method === "point-buy") return { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  // Manual aproveita o que já foi preenchido; os demais métodos recomeçam em branco.
  if (method === "manual" && previous) return { ...previous.baseScores };
  return { ...EMPTY_SCORES };
}

export function AbilityScoresStep({
  draft,
  pack,
  classDefinition,
  issues,
  onChange,
}: {
  readonly draft: CharacterDraft;
  readonly pack: RulePack;
  readonly classDefinition?: ClassDefinition;
  readonly issues: readonly CreationIssue[];
  readonly onChange: (generation: AbilityGeneration) => void;
}) {
  const generation = draft.partial.abilityGeneration;
  const method = generation?.method;
  const scores = generation?.baseScores ?? EMPTY_SCORES;
  const [rolls, setRolls] = useState<Partial<Record<Ability, readonly number[]>>>({});
  const primary = new Set<Ability>(classDefinition?.primaryAbilities ?? []);

  const setScore = (ability: Ability, value: number) => {
    const current = generation ?? { method: "manual" as const, baseScores: { ...EMPTY_SCORES } };
    onChange({ ...current, baseScores: { ...current.baseScores, [ability]: value } });
  };
  const chooseMethod = (next: AbilityGenerationMethod) => {
    setRolls({});
    onChange({ method: next, baseScores: initialScores(next, generation) });
  };
  const roll = (ability: Ability) => {
    const dice = rollFourDropLowest();
    setRolls((current) => ({ ...current, [ability]: dice }));
    const total = [...dice].sort((a, b) => b - a).slice(0, 3).reduce((sum, value) => sum + value, 0);
    return total;
  };
  const rollAll = () => {
    const next = { ...EMPTY_SCORES };
    for (const ability of ABILITIES) next[ability] = roll(ability);
    onChange({ method: "rolled", baseScores: next });
  };

  const spent = ABILITIES.reduce((sum, ability) => sum + (POINT_BUY_COST[scores[ability] || 8] ?? 0), 0);
  const used = ABILITIES.map((ability) => scores[ability]).filter((value) => value > 0);
  const remainingArray = [...STANDARD_ARRAY] as number[];
  for (const value of used) { const at = remainingArray.indexOf(value); if (at >= 0) remainingArray.splice(at, 1); }

  const control = (ability: Ability) => {
    const value = scores[ability];
    const label = `${ABILITY_LABELS[ability]} (valor base)`;
    if (method === "standard-array") {
      const options = [...new Set([...(value ? [value] : []), ...remainingArray])].sort((a, b) => b - a);
      return <select className={styles.abilitySelect} aria-label={label} value={value || ""} onChange={(event) => setScore(ability, Number(event.currentTarget.value) || 0)}><option value="">—</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    }
    if (method === "point-buy") {
      const base = value || 8;
      const nextCost = (POINT_BUY_COST[base + 1] ?? Infinity) - (POINT_BUY_COST[base] ?? 0);
      return <div className={styles.stepper} role="group" aria-label={label}>
        <IconButton variant="ghost" label={`Diminuir ${ABILITY_LABELS[ability]}`} icon={<Minus size={16} />} disabled={base <= 8} onClick={() => setScore(ability, base - 1)} />
        <output className={styles.stepperValue} aria-live="polite">{base}</output>
        <IconButton variant="ghost" label={`Aumentar ${ABILITY_LABELS[ability]}`} icon={<Plus size={16} />} disabled={base >= 15 || spent + nextCost > POINT_BUY_BUDGET} onClick={() => setScore(ability, base + 1)} />
      </div>;
    }
    const [min, max] = method === "rolled" ? [3, 18] : [1, 30];
    return <div className={styles.abilityEntry}>
      <input className={styles.abilityNumber} type="number" inputMode="numeric" min={min} max={max} aria-label={label} placeholder="—" value={value || ""} onChange={(event) => { setRolls((current) => ({ ...current, [ability]: undefined })); setScore(ability, Number(event.currentTarget.value) || 0); }} />
      {method === "rolled" ? <IconButton variant="ghost" label={`Rolar 4d6 para ${ABILITY_LABELS[ability]}`} icon={<DiceSix size={20} />} onClick={() => setScore(ability, roll(ability))} /> : null}
    </div>;
  };

  const abilityIssues = issues.filter((issue) => /ability/.test(issue.field));

  return <SectionCard heading="Defina os atributos" headingLevel={2}>
    <fieldset className={styles.methodGroup}>
      <legend>Método <span className={styles.optional}>opcional</span></legend>
      <div className={styles.methodOptions}>
        {METHODS.map((entry) => <label key={entry.id} className={[styles.methodOption, method === entry.id ? styles.methodOptionSelected : ""].filter(Boolean).join(" ")}>
          <input type="radio" name="ability-method" value={entry.id} checked={method === entry.id} onChange={() => chooseMethod(entry.id)} />
          <span><strong>{entry.label}</strong><small>{entry.hint}</small></span>
        </label>)}
      </div>
    </fieldset>

    <div className={styles.methodStatus} aria-live="polite">
      {method === undefined ? <p>Sem método, cada atributo começa em 10, mais o bônus da raça.</p> : null}
      {method === "standard-array" ? <p className={styles.arrayPool}><span>Valores restantes</span>{STANDARD_ARRAY.map((value) => { const free = remainingArray.includes(value); return <span key={value} className={[styles.poolChip, free ? "" : styles.poolChipUsed].filter(Boolean).join(" ")} aria-label={free ? `${value} disponível` : `${value} usado`}>{value}</span>; })}</p> : null}
      {method === "point-buy" ? <div className={styles.budget}><p><strong>{POINT_BUY_BUDGET - spent}</strong> de {POINT_BUY_BUDGET} pontos restantes</p><div className={styles.budgetTrack} aria-hidden="true"><span style={{ inlineSize: `${(spent / POINT_BUY_BUDGET) * 100}%` }} /></div><small>Custo por valor: 9 = 1 · 10 = 2 · 11 = 3 · 12 = 4 · 13 = 5 · 14 = 7 · 15 = 9</small></div> : null}
      {method === "rolled" ? <div className={styles.rollBar}><p>Role com os dados do app ou digite o resultado dos seus dados físicos.</p><Button variant="secondary" onClick={rollAll}>Rolar todos</Button></div> : null}
      {method === "manual" ? <p>Use para valores combinados com o mestre.</p> : null}
    </div>

    <ol className={styles.abilityList}>
      {ABILITIES.map((ability) => {
        const base = defaultBaseScore(generation, ability);
        const final = creationAbilityScore(pack, draft.partial, ability);
        const bonus = final - base;
        const dice = rolls[ability];
        const lowest = dice ? dice.indexOf(Math.min(...dice)) : -1;
        return <li key={ability} className={[styles.abilityRow, primary.has(ability) ? styles.abilityPrimary : ""].filter(Boolean).join(" ")}>
          <div className={styles.abilityName}>
            <span className={styles.abilityTitle}>{ABILITY_LABELS[ability]} <abbr title={ABILITY_LABELS[ability]}>{ABILITY_SHORT[ability]}</abbr>{primary.has(ability) ? <span className={styles.primaryTag}>Principal {classDefinition ? `· ${classDefinition.name}` : ""}</span> : null}</span>
            <small>{ABILITY_USES[ability]}</small>
            {dice ? <span className={styles.diceFaces} aria-label={`Dados: ${dice.join(", ")}; descartado ${dice[lowest]}`}>{dice.map((face, index) => <span key={index} className={index === lowest ? styles.diceDropped : undefined}>{face}</span>)}</span> : null}
          </div>
          <div className={styles.abilityControl}>{method ? control(ability) : <span className={styles.abilityDefault}>10</span>}</div>
          <div className={styles.abilityResult}>
            <span className={styles.abilityBonus}>{bonus ? `${signed(bonus)} raça` : " "}</span>
            <span className={[styles.abilityFinal, scores[ability] ? "" : styles.abilityFinalDefault].filter(Boolean).join(" ")} title={scores[ability] ? undefined : "Valor padrão enquanto não for definido"} aria-label={`${ABILITY_LABELS[ability]} final ${final}, modificador ${signed(modifierOf(final))}`}><strong>{final}</strong><span>{signed(modifierOf(final))}</span></span>
          </div>
        </li>;
      })}
    </ol>
    {abilityIssues.map((issue) => <p className={styles.error} key={`${issue.field}-${issue.message}`}>{issue.message}</p>)}
  </SectionCard>;
}
