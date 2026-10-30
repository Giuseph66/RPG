import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Info } from "@phosphor-icons/react";

import { AppModal, Button, IconButton, InlineStatus, ProgressBar, SectionCard, Select } from "@components/ui";
import type { Ability, ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { ProgressionHitPointGain } from "@domain/contracts/character";
import { asEntityId, asIsoTimestamp, type DefinitionRef, type Uuid } from "@domain/contracts/ids";
import { buildLevelUpPreview, type LevelUpRequest } from "@domain/character/progression";
import { choiceFlavor, choiceTitle, evolveCharacter, explicitOptionsFor, featOptionsFor, spellOptionsForChoice, type ChoiceOptionView, type EvolutionViewContext } from "@domain/character/evolution";

import { ABILITY_LABELS, formatRef, LANGUAGE_LABELS, PROFICIENCY_LABELS, SKILL_LABELS, TOOL_PROFICIENCY_OPTIONS } from "../creation/mapping";
import { OptionList, SpellPicker } from "./ChoiceViews";
import type { LevelUpWizardProps } from "./types";
import styles from "./level-up.module.css";

type StepId = "class" | "level" | "ability" | "choices" | "spells" | "review";
const STEP_LABELS: Readonly<Record<StepId, string>> = { class: "Classe", level: "Nível", ability: "Atributos ou talento", choices: "Escolhas da classe", spells: "Magias", review: "Revisão" };
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const satisfies readonly Ability[];

type HpMode = "average" | "rolled" | "manual";

export function LevelUpWizard({ character, derived, pack, spellInfo, featureInfo, racialTraits = [], newId, onConfirm, onCancel }: LevelUpWizardProps) {
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const [classId, setClassId] = useState<string>(String(character.classes[0]?.classId ?? ""));
  const [subclassId, setSubclassId] = useState<string>();
  const [hpMode, setHpMode] = useState<HpMode>("average");
  const [hpAmount, setHpAmount] = useState<number>();
  const [rollId, setRollId] = useState<Uuid>();
  const [selections, setSelections] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [step, setStep] = useState<StepId>("class");
  const [infoId, setInfoId] = useState<string>();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string>();

  const definition = classId ? pack.classes.get(asEntityId(classId)) : undefined;
  const existing = character.classes.find((entry) => String(entry.classId) === classId);
  const currentLevel = existing?.level ?? 0;
  const targetLevel = currentLevel + 1;
  const hitDie = definition?.hitDie ?? 8;
  const averageGain = Math.floor(hitDie / 2) + 1;
  const hpGain = hpMode === "average" ? averageGain : Math.min(hitDie, Math.max(1, hpAmount ?? averageGain));
  const hitPointGain: ProgressionHitPointGain = hpMode === "rolled" && rollId ? { kind: "rolled", amount: hpGain, rollId } : hpMode === "manual" ? { kind: "fixed-average", amount: hpGain } : { kind: "fixed-average", amount: averageGain };
  const scores = useMemo(() => Object.fromEntries((derived?.abilityScores ?? []).map((entry) => [entry.ability, entry.score.value])) as Partial<Record<Ability, number>>, [derived]);
  const conModifier = derived?.abilityScores.find((entry) => entry.ability === "con")?.modifier.value ?? 0;

  const owner: DefinitionRef = { rulesetId: pack.manifest.id, entityId: asEntityId(classId || "unknown") };
  const choiceArray: readonly ChoiceSelection[] = useMemo(() => Object.entries(selections).filter(([, ids]) => ids.length > 0).map(([choiceId, ids]) => ({
    choiceId, selectedIds: ids.map((id) => ({ rulesetId: pack.manifest.id, entityId: asEntityId(id) })), grantedAtLevel: targetLevel, grantingRef: owner,
  })), [selections, pack.manifest.id, targetLevel, classId]); // eslint-disable-line react-hooks/exhaustive-deps

  const request: LevelUpRequest = useMemo(() => ({
    classId: asEntityId(classId || "unknown"), targetClassLevel: targetLevel, ...(subclassId ? { subclassId: asEntityId(subclassId) } : {}),
    hitPointGain, choices: choiceArray, mode: "milestone", abilityScores: scores,
  }), [classId, targetLevel, subclassId, hitPointGain.kind, hitPointGain.amount, rollId, choiceArray, scores]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => (definition ? buildLevelUpPreview(character, request, pack) : undefined), [character, request, pack, definition]);

  const view: EvolutionViewContext = { character, pack, classId, targetLevel, ...(subclassId ? { subclassId } : {}), selections: choiceArray, abilityScores: scores };
  const choices: readonly ChoiceDefinition[] = preview?.ok ? preview.value.choices : [];
  const abilityChoices = choices.filter((entry) => ["asi", "feat"].includes(choiceFlavor(entry)));
  const spellChoices = choices.filter((entry) => ["spells", "swap"].includes(choiceFlavor(entry)));
  const otherChoices = choices.filter((entry) => !["asi", "feat", "spells", "swap"].includes(choiceFlavor(entry)));
  const steps: readonly StepId[] = ["class", "level", ...(abilityChoices.length ? ["ability" as const] : []), ...(otherChoices.length ? ["choices" as const] : []), ...(spellChoices.length ? ["spells" as const] : []), "review"];
  const stepIndex = Math.max(0, steps.indexOf(step));
  const issues = preview ? (preview.ok ? preview.value.pending : preview.error) : [];
  const blocking = issues.filter((entry) => entry.blocking);
  const needsSubclass = Boolean(definition) && !existing?.subclassId && targetLevel >= (definition?.subclassSelectionLevel ?? 99);

  const labelFor = (id: string): string => (SKILL_LABELS as Record<string, string>)[id] ?? (ABILITY_LABELS as Record<string, string>)[id] ?? LANGUAGE_LABELS[id] ?? PROFICIENCY_LABELS[id] ?? pack.features.get(asEntityId(id))?.name ?? formatRef(id);
  const nameOf = (id: string): string => pack.features.get(asEntityId(id))?.name ?? labelFor(id);
  const setChoice = (choiceId: string, ids: readonly string[]) => setSelections((current) => ({ ...current, [choiceId]: ids }));
  const chooseClass = (id: string) => { setClassId(id); setSubclassId(undefined); setSelections({}); setHpMode("average"); setMessage(undefined); };

  const skillOptions = (choice: ChoiceDefinition): readonly ChoiceOptionView[] => {
    const derivedSkills = new Map((derived?.skills ?? []).map((entry) => [entry.skill, entry]));
    return (Object.keys(SKILL_LABELS) as (keyof typeof SKILL_LABELS)[]).flatMap((skill) => {
      const entry = derivedSkills.get(skill);
      if (choice.kind === "expertise") return entry?.proficient && !entry.expertise ? [{ id: skill, label: SKILL_LABELS[skill] }] : [];
      return [{ id: skill, label: SKILL_LABELS[skill], ...(entry?.proficient ? { disabledReason: "Você já é proficiente." } : {}) }];
    });
  };

  const renderChoice = (choice: ChoiceDefinition) => {
    const flavor = choiceFlavor(choice);
    const selected = selections[choice.id] ?? [];
    const max = choice.count.max;
    const title = choiceTitle(choice.id);
    const heading = <h3>{title}</h3>;
    if (flavor === "asi") {
      const options = ABILITIES.map((ability) => ({ id: ability, label: `${ABILITY_LABELS[ability]} (${scores[ability] ?? "?"})`, ...((scores[ability] ?? 0) >= 20 ? { disabledReason: "Já está em 20." } : {}) }));
      return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.hint}>Um atributo recebe +2; dois atributos recebem +1 cada. Ou escolha um talento abaixo, no lugar do aumento.</p><OptionList options={options} selected={selected} max={2} onChange={(ids) => setChoice(choice.id, ids)} /></div>;
    }
    if (flavor === "feat") return <div key={choice.id} className={styles.choice}>{heading}<OptionList options={featOptionsFor(view)} selected={selected} max={1} onChange={(ids) => setChoice(choice.id, ids)} /></div>;
    if (flavor === "spells") {
      const options = spellOptionsForChoice(choice, view);
      return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.hint}>Opcional · até {max} {max === 1 ? "magia" : "magias"}.</p><SpellPicker options={options} selected={selected} max={max} onChange={(ids) => setChoice(choice.id, ids)} {...(spellInfo ? { spellInfo } : {})} /></div>;
    }
    if (flavor === "swap") {
      const forget = spellOptionsForChoice(choice, view, "forget");
      const learn = spellOptionsForChoice(choice, view).filter((option) => !option.disabledReason);
      const [out = "", incoming = ""] = selected;
      const update = (nextOut: string, nextIn: string) => setChoice(choice.id, nextOut && nextIn ? [nextOut, nextIn] : [nextOut, nextIn].filter(Boolean));
      return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.hint}>Opcional · troque uma magia conhecida por outra da mesma lista.</p>
        <div className={styles.swap}>
          <Select label="Esquecer" value={out} onChange={(event) => update(event.currentTarget.value, incoming)}><option value="">Nenhuma</option>{forget.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select>
          <Select label="Aprender" value={incoming} onChange={(event) => update(out, event.currentTarget.value)}><option value="">Nenhuma</option>{learn.map((option) => <option key={option.id} value={option.id}>{option.level === 0 ? "Truque" : `${option.level}º`} · {option.name}</option>)}</Select>
        </div></div>;
    }
    let options: readonly ChoiceOptionView[] = [];
    if (choice.optionSet.kind === "explicit") {
      options = /invocation-swap/.test(choice.id) ? [] : explicitOptionsFor(choice, view, labelFor);
      if (/invocation-swap/.test(choice.id)) {
        const owned = new Set(character.choices.filter((entry) => /\.invocations\.\d+$/.test(entry.choiceId)).flatMap((entry) => entry.selectedIds.map((ref) => String(ref.entityId))));
        const forget = explicitOptionsFor(choice, view, labelFor).filter((option) => owned.has(option.id));
        const learn = explicitOptionsFor(choice, view, labelFor).filter((option) => !option.disabledReason && !owned.has(option.id));
        const [out = "", incoming = ""] = selected;
        const update = (nextOut: string, nextIn: string) => setChoice(choice.id, nextOut && nextIn ? [nextOut, nextIn] : [nextOut, nextIn].filter(Boolean));
        return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.hint}>Opcional · troque uma invocação conhecida por outra que você possa aprender.</p>
          <div className={styles.swap}>
            <Select label="Esquecer" value={out} onChange={(event) => update(event.currentTarget.value, incoming)}><option value="">Nenhuma</option>{forget.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select>
            <Select label="Aprender" value={incoming} onChange={(event) => update(out, event.currentTarget.value)}><option value="">Nenhuma</option>{learn.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select>
          </div></div>;
      }
    } else if (flavor === "skills" || flavor === "expertise") options = skillOptions(choice);
    else if (flavor === "languages") options = Object.entries(LANGUAGE_LABELS).map(([id, label]) => ({ id, label }));
    else if (flavor === "tools") options = TOOL_PROFICIENCY_OPTIONS.map((id) => ({ id, label: PROFICIENCY_LABELS[id] ?? formatRef(id) }));
    if (options.length === 0) return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.muted}>Nenhuma opção disponível agora.</p></div>;
    return <div key={choice.id} className={styles.choice}>{heading}<p className={styles.hint}>Opcional · até {max} {max === 1 ? "opção" : "opções"}.</p><OptionList options={options} selected={selected} max={max} onChange={(ids) => setChoice(choice.id, ids)} {...(featureInfo ? { onInfo: (id: string) => { if (featureInfo(id)) setInfoId(id); } } : {})} /></div>;
  };

  const confirm = async () => {
    if (!preview?.ok || status === "saving") return;
    const result = evolveCharacter(character, request, pack, { idGenerator: () => newId(), now: asIsoTimestamp(new Date().toISOString()) });
    if (!result.ok) { setStatus("error"); setMessage(result.error.map((entry) => entry.message).join(" ")); return; }
    setStatus("saving");
    const saved = await onConfirm(result.value);
    if (!saved.ok) { setStatus("error"); setMessage(saved.message ?? "Não foi possível salvar a evolução."); }
  };

  const featureRefs = preview?.ok ? preview.value.featureRefs : [];
  const resources = preview?.ok ? preview.value.resources : [];
  const unlocks = racialTraits.filter((trait) => trait.level === totalLevel + 1);
  const info = infoId ? featureInfo?.(infoId) : undefined;
  const subclassOptions = definition ? definition.subclassIds.map((id) => pack.subclasses.get(id)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) : [];
  const newClassOptions = [...pack.classes.values()].filter((entry) => !character.classes.some((owned) => owned.classId === entry.id));

  const body = (): ReactNode => {
    if (step === "class") return (
      <SectionCard heading="Qual classe sobe de nível?" headingLevel={2}>
        <div className={styles.classGrid}>
          {character.classes.map((entry) => {
            const def = pack.classes.get(entry.classId);
            const active = String(entry.classId) === classId;
            return <button key={String(entry.classId)} type="button" aria-pressed={active} className={[styles.classCard, active ? styles.classCardOn : ""].filter(Boolean).join(" ")} onClick={() => chooseClass(String(entry.classId))}><strong>{def?.name ?? formatRef(String(entry.classId))}</strong><span>Nível {entry.level} → {entry.level + 1}</span></button>;
          })}
        </div>
        <Select label="Ou aprender uma nova classe (multiclasse)" hint="A nova classe tem requisitos de atributo." value={existing ? "" : classId} onChange={(event) => event.currentTarget.value && chooseClass(event.currentTarget.value)}>
          <option value="">Nenhuma</option>
          {newClassOptions.map((entry) => <option key={String(entry.id)} value={String(entry.id)}>{entry.name}</option>)}
        </Select>
        {totalLevel >= 20 ? <InlineStatus tone="warning">O personagem já está no nível 20.</InlineStatus> : null}
        {!existing && classId && preview && !preview.ok ? <ul className={styles.issues}>{preview.error.filter((entry) => entry.code === "multiclass-prerequisite").map((entry, index) => <li key={index}>{entry.message}</li>)}</ul> : null}
      </SectionCard>
    );
    if (step === "level") return (
      <SectionCard heading={`${definition?.name ?? "Classe"} ${currentLevel} → ${targetLevel}`} headingLevel={2}>
        <p className={styles.summary}>Nível total {totalLevel} → {totalLevel + 1}{preview?.ok ? ` · Bônus de proficiência +${preview.value.proficiencyBonus}` : ""}</p>
        <fieldset className={styles.hp}>
          <legend>Pontos de vida (d{hitDie} + CON {conModifier >= 0 ? `+${conModifier}` : conModifier})</legend>
          <label><input type="radio" name="hp" checked={hpMode === "average"} onChange={() => setHpMode("average")} /> Valor fixo ({averageGain})</label>
          <label><input type="radio" name="hp" checked={hpMode === "rolled"} onChange={() => { setHpMode("rolled"); setRollId(newId()); setHpAmount(Math.floor(Math.random() * hitDie) + 1); }} /> Rolar d{hitDie}</label>
          <label><input type="radio" name="hp" checked={hpMode === "manual"} onChange={() => setHpMode("manual")} /> Informar o resultado</label>
          {hpMode !== "average" ? <input className={styles.number} type="number" min={1} max={hitDie} aria-label="Resultado do dado de vida" value={hpAmount ?? averageGain} onChange={(event) => { setHpAmount(Number(event.currentTarget.value)); if (hpMode === "rolled") setRollId(newId()); }} /> : null}
          <p className={styles.hint}>Você ganha {hpGain + conModifier} PV neste nível (mínimo 1 pelas regras).</p>
        </fieldset>
        {needsSubclass ? (
          <Select label={`Subclasse (${definition?.name ?? ""})`} hint="A classe pede subclasse neste nível; dá para escolher depois." value={subclassId ?? ""} onChange={(event) => { setSubclassId(event.currentTarget.value || undefined); setSelections({}); }}>
            <option value="">Escolher depois</option>
            {subclassOptions.map((entry) => <option key={String(entry.id)} value={String(entry.id)}>{entry.name}</option>)}
          </Select>
        ) : null}
        <h3>O que você ganha</h3>
        {featureRefs.length === 0 && resources.length === 0 && unlocks.length === 0 ? <p className={styles.muted}>Este nível não traz características novas além das escolhas.</p> : (
          <ul className={styles.gains}>
            {featureRefs.map((ref) => {
              const id = String(ref.entityId);
              return <li key={id}><span>{nameOf(id)}</span>{featureInfo?.(id) ? <IconButton variant="ghost" className={styles.infoButton} label={`Descrição de ${nameOf(id)}`} icon={<Info size={20} />} onClick={() => setInfoId(id)} /> : null}</li>;
            })}
            {resources.map((resource) => <li key={String(resource.definitionRef.entityId)}><span>{resource.definition?.name ?? formatRef(String(resource.definitionRef.entityId))} (recurso)</span></li>)}
            {unlocks.map((trait) => <li key={trait.name}><span>{trait.name} (raça)</span><small>{trait.description}</small></li>)}
          </ul>
        )}
      </SectionCard>
    );
    if (step === "ability") return <SectionCard heading="Aumento de atributo ou talento" headingLevel={2}>{abilityChoices.map(renderChoice)}</SectionCard>;
    if (step === "choices") return <SectionCard heading="Escolhas da classe" headingLevel={2}>{otherChoices.map(renderChoice)}</SectionCard>;
    if (step === "spells") return <SectionCard heading="Magias" headingLevel={2}>{spellChoices.map(renderChoice)}</SectionCard>;
    const spellNameOr = (id: string): string => pack.spells.get(asEntityId(id))?.name ?? nameOf(id);
    const summaryLines = choiceArray.map((entry) => ({ title: choiceTitle(entry.choiceId), names: entry.selectedIds.map((ref) => spellNameOr(String(ref.entityId))) }));
    return (
      <SectionCard heading="Revise antes de confirmar" headingLevel={2}>
        <p className={styles.summary}><strong>{definition?.name}</strong> nível {targetLevel} · nível total {totalLevel + 1} · +{hpGain + conModifier} PV</p>
        {subclassId ? <p className={styles.summary}>Subclasse: {pack.subclasses.get(asEntityId(subclassId))?.name}</p> : null}
        {summaryLines.length ? <ul className={styles.gains}>{summaryLines.map((line) => <li key={line.title}><span>{line.title}</span><small>{line.names.join(", ")}</small></li>)}</ul> : <p className={styles.muted}>Nenhuma escolha feita. Dá para voltar e escolher.</p>}
        {issues.length ? <ul className={styles.issues} role={blocking.length ? "alert" : undefined}>{issues.map((entry, index) => <li key={`${entry.field}-${index}`} className={entry.blocking ? undefined : styles.warning}>{entry.message}</li>)}</ul> : <InlineStatus tone="success">Tudo pronto para subir de nível.</InlineStatus>}
      </SectionCard>
    );
  };

  const next = steps[stepIndex + 1];
  const previous = steps[stepIndex - 1];
  return (
    <section className={styles.wizard} aria-labelledby="levelup-title">
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>EVOLUÇÃO</p><h1 id="levelup-title">Subir de nível</h1><p className={styles.subtitle}>{character.name} · Etapa {stepIndex + 1} de {steps.length}: {STEP_LABELS[step]}</p></div>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
      </header>
      <ProgressBar value={stepIndex + 1} max={steps.length} label={`Etapa ${stepIndex + 1} de ${steps.length}`} />
      {message ? <InlineStatus tone="error" assertive>{message}</InlineStatus> : null}
      <div className={styles.content}>{body()}</div>
      <footer className={styles.footer}>
        {previous ? <Button variant="ghost" onClick={() => setStep(previous)}>Voltar</Button> : <span />}
        {next ? <Button disabled={!definition || totalLevel >= 20 || (step === "class" && !preview?.ok)} onClick={() => setStep(next)}>Continuar</Button> : <Button busy={status === "saving"} disabled={!preview?.ok || blocking.length > 0 || status === "saving"} disabledReason={blocking[0]?.message} onClick={() => void confirm()}>Confirmar nível</Button>}
      </footer>
      {info ? <AppModal open title={info.name} onClose={() => setInfoId(undefined)} dismissOnBackdrop footer={<Button onClick={() => setInfoId(undefined)}>Fechar</Button>}><div className={styles.info}>{info.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{info.source ? <p className={styles.muted}>{info.source}</p> : null}</div></AppModal> : null}
    </section>
  );
}
