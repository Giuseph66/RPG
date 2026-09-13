import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { Button, InlineStatus, Input, ProgressBar, Select, SectionCard } from "@components/ui";
import type { CharacterDraft, CharacterDraftStep } from "@domain/contracts/character";
import type { ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { DefinitionRef } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import {
  applyCreationDecision,
  materializeCharacter,
  validateCharacterCreation,
} from "@domain/character/creation";
import { asCreationCatalog, CREATION_STEPS } from "@domain/character/creation/model";
import type { CreationDecision, CreationCatalogInput, CreationIssue } from "@domain/character/creation";

import { ABILITY_LABELS, formatRef } from "./mapping";
import { artworkForClass } from "../../../assets/art/fantasy";
import type { CharacterCreationWizardProps } from "./types";
import styles from "./character-creation-wizard.module.css";

type PresentationStep = "identity" | CharacterDraftStep;

const STEPS: readonly PresentationStep[] = ["identity", ...CREATION_STEPS];
const STEP_LABELS: Readonly<Record<PresentationStep, string>> = {
  identity: "Identidade",
  race: "Raça",
  class: "Classe",
  background: "Antecedente",
  "ability-scores": "Atributos",
  equipment: "Equipamento",
  spells: "Magias",
  details: "Detalhes",
  review: "Revisão",
};
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

function classArtwork(classId: string) {
  const aliases: Readonly<Record<string, string>> = { guerreiro: "fighter", paladino: "paladin", ladino: "rogue", mago: "wizard", feiticeiro: "sorcerer", clerigo: "cleric", clérigo: "cleric", barbaro: "barbarian", bárbaro: "barbarian", patrulheiro: "ranger", bardo: "bard", bruxo: "warlock", druida: "druid" };
  const key = classId.toLowerCase();
  return artworkForClass(aliases[key] ?? key);
}

function refFor(draft: CharacterDraft, entityId: string): DefinitionRef {
  return { rulesetId: draft.rulesetRef.id, entityId: entityId as DefinitionRef["entityId"] };
}

function displayName(value: { readonly name?: string; readonly id: string }): string {
  return value.name ?? formatRef(value.id);
}

function issueForStep(issue: CreationIssue, step: PresentationStep): boolean {
  if (step === "identity") return issue.field === "name";
  if (step === "race") return /race|subrace|dragonborn|human\.language/i.test(issue.field);
  if (step === "class") return /class|classes|fighter\.skills|choices\.fighter\.skills/i.test(issue.field);
  if (step === "background") return /background|soldier\.tools|choices\.(?:acolyte|soldier|noble)/i.test(issue.field);
  if (step === "ability-scores") return /ability/i.test(issue.field);
  if (step === "equipment") return /equipment|pack/i.test(issue.field);
  if (step === "spells") return /spell|cantrip/i.test(issue.field);
  if (step === "details") return false;
  return true;
}

function choiceOwnerRef(draft: CharacterDraft, choice: ChoiceDefinition, owner: DefinitionRef): DefinitionRef {
  return { ...owner, entityId: owner.entityId || choice.id as DefinitionRef["entityId"] };
}

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value);
}

const TOOL_PROFICIENCY_OPTIONS = [
  "proficiency.alchemist-supplies",
  "proficiency.brewers-supplies",
  "proficiency.carpenters-tools",
  "proficiency.disguise-kit",
  "proficiency.herbalism-kit",
  "proficiency.leatherworkers-tools",
  "proficiency.masons-tools",
  "proficiency.navigator-tools",
  "proficiency.painters-supplies",
  "proficiency.potters-tools",
  "proficiency.smiths-tools",
  "proficiency.thieves-tools",
  "proficiency.vehicle-land",
  "proficiency.vehicle-water",
  "proficiency.weavers-tools",
  "proficiency.woodcarvers-tools",
  "proficiency.musical-instrument",
] as const;

function ChoiceEditor({
  draft,
  choice,
  owner,
  catalog,
  value,
  onChange,
}: {
  readonly draft: CharacterDraft;
  readonly choice: ChoiceDefinition;
  readonly owner: DefinitionRef;
  readonly catalog: CreationCatalogInput;
  readonly value?: ChoiceSelection;
  readonly onChange: (selection: ChoiceSelection) => void;
}) {
  const pack = asCreationCatalog(catalog).rulePack;
  const options = useMemo(() => {
    if (choice.optionSet.kind === "explicit") {
      return choice.optionSet.options.map((option) => ({ value: String(option.entityId), label: formatRef(String(option.entityId)) }));
    }
    const selector = choice.optionSet.selector;
    if (selector.kind === "any-skill") return ["athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival", "performance", "deception", "intimidation", "persuasion"].map((id) => ({ value: id, label: formatRef(id) }));
    if (selector.kind === "any-language") {
      const languageIds = new Set<string>();
      for (const race of pack.races.values()) for (const language of race.languages) languageIds.add(String(language));
      return [...languageIds].sort().map((id) => ({ value: id, label: formatRef(id) }));
    }
    if (selector.kind === "any-tool-proficiency") return TOOL_PROFICIENCY_OPTIONS.map((id) => ({ value: id, label: formatRef(id) }));
    if (selector.kind === "any-entity-of-type" && selector.entityType === "spell") {
      return Array.from(pack.spells.values()).filter((spell) => !selector.filterTag || spell.tags.includes(selector.filterTag)).map((spell) => ({ value: String(spell.id), label: displayName(spell) }));
    }
    if (selector.kind === "any-entity-of-type" && selector.entityType === "equipment") {
      return Array.from(pack.equipment.values()).map((item) => ({ value: String(item.id), label: displayName(item) }));
    }
    return [];
  }, [choice, pack]);
  const current = value?.selectedIds.map((entry) => String(entry.entityId)) ?? [];
  const multiple = choice.count.max > 1;
  const update = (ids: readonly string[]) => onChange({
    choiceId: choice.id,
    selectedIds: ids.map((id) => refFor(draft, id)),
    grantedAtLevel: 1,
    grantingRef: choiceOwnerRef(draft, choice, owner),
  });
  return (
    <div className={styles.choice}>
      <Select
        label={formatRef(choice.id)}
        hint={`Escolha ${choice.count.min === choice.count.max ? choice.count.min : `${choice.count.min} a ${choice.count.max}`} opção${choice.count.max === 1 ? "" : "ões"}.`}
        value={multiple ? current : current[0] ?? ""}
        multiple={multiple}
        onChange={(event) => update(multiple ? selectedValues(event) : event.currentTarget.value ? [event.currentTarget.value] : [])}
        required={choice.count.min > 0}
      >
        {!multiple ? <option value="">Selecione uma opção</option> : null}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </div>
  );
}

function StepNavigation({ current, onStep }: { readonly current: PresentationStep; readonly onStep: (step: PresentationStep) => void }) {
  return (
    <nav className={styles.stepNav} aria-label="Etapas da criação">
      <ol>
        {STEPS.map((step, index) => <li key={step}><button type="button" className={step === current ? styles.activeStep : undefined} aria-current={step === current ? "step" : undefined} onClick={() => onStep(step)}>{index + 1}. {STEP_LABELS[step]}</button></li>)}
      </ol>
    </nav>
  );
}

export function CharacterCreationWizard({ draft: initialDraft, catalog, service, onDraftChange, onDraftSaved, onCreated, onCancel }: CharacterCreationWizardProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState<PresentationStep>(initialDraft.partial.name?.trim() ? (initialDraft.currentStep === "review" ? "review" : initialDraft.currentStep) : "identity");
  const [status, setStatus] = useState<"idle" | "saving-draft" | "draft-saved" | "confirming" | "confirmed" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [reviewIssues, setReviewIssues] = useState<readonly CreationIssue[]>([]);
  const [savedDraft, setSavedDraft] = useState(false);
  const confirming = useRef(false);

  const pack = asCreationCatalog(catalog).rulePack;
  const report = useMemo(() => validateCharacterCreation(catalog, draft), [catalog, draft]);
  const index = STEPS.indexOf(step);
  const stepIssues = report.issues.filter((issue) => issueForStep(issue, step));
  const isStepValid = step === "review" ? report.valid : stepIssues.length === 0;

  const commitDraft = (decision: CreationDecision) => {
    const result = applyCreationDecision(draft, decision);
    if (!result.ok) {
      setMessage(result.error.message);
      setStatus("error");
      return;
    }
    setDraft(result.value);
    setMessage(undefined);
    setStatus("idle");
    onDraftChange?.(result.value);
  };

  const goTo = (next: PresentationStep) => {
    const nextIndex = STEPS.indexOf(next);
    if (nextIndex > index) {
      for (const candidate of STEPS.slice(index, nextIndex)) {
        const pending = report.issues.find((issue) => issueForStep(issue, candidate));
        if (pending) {
          setMessage(pending.message ?? "Resolva as pendências desta etapa para continuar.");
          return;
        }
      }
    }
    setMessage(undefined);
    setStep(next);
  };

  const saveDraft = async () => {
    if (!service || savedDraft) return;
    setStatus("saving-draft");
    const result = await service.saveDraft(draft);
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error.message);
      return;
    }
    setSavedDraft(true);
    setStatus("draft-saved");
    setMessage("Rascunho salvo. Você pode retomar esta criação depois.");
    onDraftSaved?.(result.value);
  };

  const confirm = async () => {
    if (!service || confirming.current || status === "confirmed") return;
    const currentReport = validateCharacterCreation(catalog, draft);
    setReviewIssues(currentReport.issues);
    if (!currentReport.valid) {
      setMessage("Ainda há pendências. Revise os campos destacados antes de confirmar.");
      return;
    }
    confirming.current = true;
    setStatus("confirming");
    const materialized = materializeCharacter(catalog, draft);
    if (!materialized.ok) {
      confirming.current = false;
      setStatus("error");
      setMessage(materialized.error.map((issue) => issue.message).join(" "));
      return;
    }
    const saved = await service.saveCharacter(materialized.value.character, asRevision(0));
    if (!saved.ok) {
      confirming.current = false;
      setStatus("error");
      setMessage(saved.error.message);
      return;
    }
    setStatus("confirmed");
    setMessage("Personagem criado.");
    onCreated?.(materialized.value.character, saved.value);
  };

  const race = draft.partial.raceRef ? pack.races.get(draft.partial.raceRef.entityId) : undefined;
  const selectedChoices = new Map((draft.partial.choices ?? []).map((choice) => [choice.choiceId, choice]));
  const classDefinition = draft.partial.classes?.[0] ? pack.classes.get(draft.partial.classes[0].classId) : undefined;
  const background = draft.partial.backgroundRef ? pack.backgrounds.get(draft.partial.backgroundRef.entityId) : undefined;
  const classChoices = classDefinition ? [...classDefinition.initialEquipmentChoices, classDefinition.skillChoices, ...(classDefinition.progression[0]?.choicesGranted ?? [])] : [];
  const raceChoices = [...(race?.choices ?? []), ...(draft.partial.subraceRef ? pack.subraces.get(draft.partial.subraceRef.entityId)?.choices ?? [] : [])];
  const backgroundChoices = [...(background?.toolChoices ?? []), ...(background?.languageChoices ?? [])];
  const choices = [...raceChoices.map((choice) => ({ choice, owner: draft.partial.raceRef })), ...classChoices.map((choice) => ({ choice, owner: draft.partial.classes?.[0] ? refFor(draft, draft.partial.classes[0].classId) : undefined })), ...backgroundChoices.map((choice) => ({ choice, owner: draft.partial.backgroundRef }))].filter((entry): entry is { choice: ChoiceDefinition; owner: DefinitionRef } => entry.owner !== undefined);
  const equipmentChoices = choices.filter(({ choice }) => !/spell|cantrip/i.test(choice.id));
  const spellChoices = choices.filter(({ choice }) => /spell|cantrip/i.test(choice.id));

  const renderStep = (): ReactNode => {
    switch (step) {
      case "identity": return <SectionCard heading="Quem está chegando?" headingLevel={2}><div className={styles.formGrid}><Input label="Nome do personagem" required value={draft.partial.name ?? ""} error={stepIssues.find((issue) => issue.field === "name")?.message} onChange={(event) => commitDraft({ kind: "identity", name: event.currentTarget.value })} /><Input label="Nome do jogador" value={draft.partial.playerName ?? ""} onChange={(event) => commitDraft({ kind: "identity", name: draft.partial.name ?? "", playerName: event.currentTarget.value })} /></div></SectionCard>;
      case "race": return <SectionCard heading="Escolha uma raça" headingLevel={2}><Select label="Raça" required value={String(draft.partial.raceRef?.entityId ?? "")} error={stepIssues.find((issue) => /raceRef/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "race", raceRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma raça</option>{Array.from(pack.races.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select>{race?.subraceIds.length ? <Select label="Sub-raça" required value={String(draft.partial.subraceRef?.entityId ?? "")} onChange={(event) => commitDraft({ kind: "race", raceRef: draft.partial.raceRef!, subraceRef: event.currentTarget.value ? refFor(draft, event.currentTarget.value) : undefined })}><option value="">Selecione uma sub-raça</option>{race.subraceIds.map((id) => { const entry = pack.subraces.get(id); return entry ? <option key={entry.id} value={entry.id}>{displayName(entry)}</option> : null; })}</Select> : null}{raceChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.raceRef!} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "class": return <SectionCard heading="Escolha uma classe" headingLevel={2}><Select label="Classe" required value={String(draft.partial.classes?.[0]?.classId ?? "")} error={stepIssues.find((issue) => /class|classes/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "class", classRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma classe</option>{Array.from(pack.classes.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select><div className={styles.classGrid} aria-label="Artes das classes">{Array.from(pack.classes.values()).map((entry) => { const artwork = classArtwork(String(entry.id)); const selectedClass = String(draft.partial.classes?.[0]?.classId ?? "") === String(entry.id); return <button type="button" className={[styles.classTile, selectedClass ? styles.classTileSelected : ""].filter(Boolean).join(" ")} aria-pressed={selectedClass} key={entry.id} onClick={() => commitDraft({ kind: "class", classRef: refFor(draft, String(entry.id)) })}><img src={artwork.src} alt="" /><span>{displayName(entry)}</span></button>; })}</div>{classDefinition?.skillChoices ? <ChoiceEditor draft={draft} choice={classDefinition.skillChoices} owner={refFor(draft, classDefinition.id)} catalog={catalog} value={selectedChoices.get(classDefinition.skillChoices.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} /> : null}</SectionCard>;
      case "background": return <SectionCard heading="Escolha um antecedente" headingLevel={2}><Select label="Antecedente" required value={String(draft.partial.backgroundRef?.entityId ?? "")} error={stepIssues.find((issue) => /background/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "background", backgroundRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione um antecedente</option>{Array.from(pack.backgrounds.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select>{backgroundChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.backgroundRef!} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "ability-scores": return <SectionCard heading="Defina os atributos" headingLevel={2}><Select label="Método" required value={draft.partial.abilityGeneration?.method ?? ""} onChange={(event) => { const method = event.currentTarget.value as NonNullable<typeof draft.partial.abilityGeneration>["method"]; const previous = draft.partial.abilityGeneration?.baseScores ?? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }; commitDraft({ kind: "ability-scores", method: { method, baseScores: previous } }); }}><option value="">Selecione um método</option><option value="standard-array">Matriz padrão</option><option value="point-buy">Compra de pontos</option><option value="rolled">Rolagem</option><option value="manual">Manual</option></Select><div className={styles.abilityInputs}>{ABILITIES.map((ability) => <Input key={ability} label={ABILITY_LABELS[ability]} type="number" min={1} max={30} value={draft.partial.abilityGeneration?.baseScores[ability] || ""} onChange={(event) => { const current = draft.partial.abilityGeneration; if (!current) return; commitDraft({ kind: "ability-scores", method: { ...current, baseScores: { ...current.baseScores, [ability]: Number(event.currentTarget.value) } } }); }} />)}</div>{stepIssues.filter((issue) => /ability/.test(issue.field)).map((issue) => <p className={styles.error} key={`${issue.field}-${issue.message}`}>{issue.message}</p>)}</SectionCard>;
      case "equipment": return <SectionCard heading="Escolha o equipamento" headingLevel={2}>{equipmentChoices.length ? equipmentChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "equipment", selections: [selection] })} />) : <p className={styles.muted}>O catálogo atual não publicou escolhas de equipamento para esta combinação.</p>}</SectionCard>;
      case "spells": return <SectionCard heading="Escolha as magias iniciais" headingLevel={2}>{spellChoices.length ? spellChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "spells", selections: [selection] })} />) : <p className={styles.muted}>Esta combinação não possui escolhas de magia publicadas no catálogo atual.</p>}</SectionCard>;
      case "details": return <SectionCard heading="Conte a história" headingLevel={2}><div className={styles.formGrid}>{(["appearance", "personalityTraits", "ideals", "bonds", "flaws", "history"] as const).map((field) => <label className={styles.textareaField} key={field}><span>{formatRef(field)}</span><textarea value={field === "appearance" || field === "history" ? draft.partial[field] ?? "" : (draft.partial[field] ?? []).join("\n")} onChange={(event) => { const value = field === "appearance" || field === "history" ? event.currentTarget.value : event.currentTarget.value.split("\n").filter(Boolean); commitDraft({ kind: "details", details: { [field]: value } as never }); }} /></label>)}</div></SectionCard>;
      case "review": return <SectionCard heading="Revise antes de confirmar" headingLevel={2}><div className={styles.summary}><p><strong>Nome:</strong> {draft.partial.name || "Pendente"}</p><p><strong>Raça:</strong> {race?.name ?? "Pendente"}</p><p><strong>Classe:</strong> {classDefinition?.name ?? "Pendente"}</p><p><strong>Antecedente:</strong> {background?.name ?? "Pendente"}</p><p><strong>Atributos:</strong> {draft.partial.abilityGeneration ? ABILITIES.map((ability) => `${ABILITY_LABELS[ability]} ${draft.partial.abilityGeneration?.baseScores[ability]}`).join(" · ") : "Pendente"}</p><p><strong>Escolhas resolvidas:</strong> {draft.partial.choices?.length ?? 0}</p></div>{(reviewIssues.length || !report.valid) ? <div className={styles.issues} role="alert"><strong>Pendências</strong><ul>{(reviewIssues.length ? reviewIssues : report.issues).map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message} <small>({issue.field})</small></li>)}</ul></div> : <InlineStatus tone="success">Tudo pronto para criar o personagem.</InlineStatus>}</SectionCard>;
    }
  };

  return <section className={styles.wizard} aria-labelledby="creation-title"><header className={styles.header}><div><p className={styles.eyebrow}>NOVA FICHA</p><h1 id="creation-title">Criação de personagem</h1><p className={styles.subtitle}>Etapa {index + 1} de {STEPS.length}: {STEP_LABELS[step]}</p></div><Button variant="ghost" onClick={onCancel}>Cancelar</Button></header><ProgressBar value={index + 1} max={STEPS.length} label={`Progresso: etapa ${index + 1} de ${STEPS.length}`} /><StepNavigation current={step} onStep={goTo} />{message ? <InlineStatus tone={status === "error" ? "error" : status === "confirmed" ? "success" : "info"} assertive={status === "error"}>{message}</InlineStatus> : null}<div className={styles.content}>{renderStep()}</div><footer className={styles.footer}><div className={styles.footerLeft}>{service ? <Button variant="ghost" busy={status === "saving-draft"} disabled={savedDraft || status === "confirming" || status === "confirmed"} onClick={() => void saveDraft()}>{savedDraft ? "Rascunho salvo" : "Salvar rascunho"}</Button> : null}</div><div className={styles.footerActions}>{index > 0 ? <Button variant="ghost" onClick={() => setStep(STEPS[index - 1])}>Voltar</Button> : null}{index < STEPS.length - 1 ? <Button disabled={!isStepValid} disabledReason={stepIssues[0]?.message} onClick={() => setStep(STEPS[index + 1])}>Continuar</Button> : <Button busy={status === "confirming"} disabled={!service || !report.valid || status === "confirmed"} disabledReason={!service ? "Serviço de persistência indisponível." : !report.valid ? "Resolva as pendências da revisão." : undefined} onClick={() => void confirm()}>{status === "confirmed" ? "Personagem criado" : "Confirmar personagem"}</Button>}</div></footer></section>;
}
