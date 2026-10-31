import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppModal, Button, IconButton, InlineStatus, Input, ProgressBar, Select, SectionCard } from "@components/ui";
import { Info } from "@phosphor-icons/react";
import type { Character, CharacterDraft, CharacterDraftStep } from "@domain/contracts/character";
import type { ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { DefinitionRef } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import {
  applyCreationDecision,
  creationChoiceLimit,
  backgroundOverview,
  buildCreationSummary,
  materializeCharacter,
  validateCharacterCreation,
} from "@domain/character/creation";
import { asCreationCatalog, CREATION_STEPS } from "@domain/character/creation/model";
import { bonusCantripListOf, expandedSpellIds, level1BonusCantripChoice } from "@domain/character/evolution/spell-rules";
import type { CreationDecision, CreationCatalogInput, CreationIssue } from "@domain/character/creation";

import { ABILITY_LABELS, formatRef, LANGUAGE_LABELS, PROFICIENCY_GROUP_LABELS, PROFICIENCY_LABELS, SKILL_LABELS, TOOL_PROFICIENCY_OPTIONS } from "./mapping";
import { BackgroundPicker } from "./BackgroundPicker";
import { CreationSummaryPanel } from "./CreationSummaryPanel";
import { AbilityScoresStep } from "./AbilityScoresStep";
import { SpellInfoDetails, spellBrief as brief, spellMeta } from "../spell-info";
import { artworkForClass } from "../../../assets/art/fantasy";
import type { CharacterCreationWizardProps, CreationSpellInfo, CreationWizardService } from "./types";
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

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
}

/**
 * Ficha criada a partir do mesmo draft pode ser reencontrada após uma tentativa que
 * persistiu antes de a UI receber a resposta. Revisão/data são metadados de persistência;
 * ownerUid é preenchido pela sincronização. Todo o restante precisa ser igual para que a
 * retomada seja tratada como retry, evitando substituir uma edição concorrente.
 */
function creationFingerprint(character: Character): string {
  const { revision: _revision, updatedAt: _updatedAt, ownerUid: _ownerUid, ...creation } = character;
  return JSON.stringify(stableValue(creation));
}

const OWNER_LABELS: Readonly<Record<string, string>> = { human: "Humano", elf: "Elfo", dwarf: "Anão", bard: "Bardo", fighter: "Guerreiro", rogue: "Ladino", wizard: "Mago", cleric: "Clérigo", druid: "Druida", sorcerer: "Feiticeiro", warlock: "Bruxo", "high-elf": "Alto elfo", entertainer: "Artista", soldier: "Soldado", acolyte: "Acólito", noble: "Nobre" };
const CHOICE_KIND_LABELS: Readonly<Record<string, string>> = { skills: "Perícias", equipment: "Equipamento inicial", tools: "Ferramentas", language: "Idioma adicional", languages: "Idiomas", cantrip: "Truque", cantrips: "Truques", spells: "Magias" };
const EQUIPMENT_BUNDLE_LABELS: Readonly<Record<string, string>> = {
  "entertainer-pack": "Pacote de artista", "burglar-pack": "Pacote de assaltante", "dungeoneer-pack": "Pacote de aventureiro",
  "diplomat-pack": "Pacote de diplomata", "scholar-pack": "Pacote de estudioso", "explorer-pack": "Pacote de explorador", "priest-pack": "Pacote de sacerdote",
};
const DETAIL_LABELS: Readonly<Record<string, string>> = { appearance: "Aparência", personalityTraits: "Traços de personalidade", ideals: "Ideais", bonds: "Vínculos", flaws: "Defeitos", history: "História" };

function choiceLabel(choiceId: string, pack?: ReturnType<typeof asCreationCatalog>["rulePack"]): string {
  const [owner, kind] = choiceId.split(".");
  const ownerName = owner ? OWNER_LABELS[owner] ?? (pack ? (pack.backgrounds.get(owner as DefinitionRef["entityId"]) ?? pack.classes.get(owner as DefinitionRef["entityId"]) ?? pack.races.get(owner as DefinitionRef["entityId"]) ?? pack.subclasses.get(owner as DefinitionRef["entityId"]))?.name : undefined) ?? formatRef(owner) : undefined;
  return `${CHOICE_KIND_LABELS[kind ?? ""] ?? formatRef(kind ?? choiceId)}${ownerName ? ` · ${ownerName}` : ""}`;
}

function optionLabel(value: string, pack: ReturnType<typeof asCreationCatalog>["rulePack"]): string {
  if (ABILITY_LABELS[value as keyof typeof ABILITY_LABELS]) return ABILITY_LABELS[value as keyof typeof ABILITY_LABELS];
  if (SKILL_LABELS[value as keyof typeof SKILL_LABELS]) return SKILL_LABELS[value as keyof typeof SKILL_LABELS];
  if (LANGUAGE_LABELS[value]) return LANGUAGE_LABELS[value];
  if (PROFICIENCY_LABELS[value]) return PROFICIENCY_LABELS[value];
  const equipment = pack.equipment.get(value as DefinitionRef["entityId"]);
  if (equipment) return equipment.name;
  const spell = pack.spells.get(value as DefinitionRef["entityId"]);
  if (spell) return spell.name;
  const feature = pack.features.get(value as DefinitionRef["entityId"]);
  if (feature) return feature.name;
  return formatRef(value);
}

function scopedEquipmentOptions(pack: ReturnType<typeof asCreationCatalog>["rulePack"], owner: DefinitionRef, catalog: CreationCatalogInput, selectedIds: readonly string[]): { readonly value: string; readonly label: string }[] {
  const classDefinition = pack.classes.get(owner.entityId);
  const proficiencies = new Set(classDefinition?.initialProficiencies.map((ref) => String(ref.entityId)) ?? []);
  const equipment = Array.from(pack.equipment.values()).filter((item) => {
    if (item.category === "weapon") return Boolean(item.weapon && (proficiencies.has(`proficiency.${item.id}`) || proficiencies.has(`proficiency.${item.weapon.proficiencyCategory}-weapons`)));
    if (item.category === "armor") return Boolean(item.armor && (proficiencies.has("proficiency.all-armor") || proficiencies.has(`proficiency.${item.armor.armorCategory}-armor`)));
    if (item.category === "tool" && item.tool) {
      if (proficiencies.has(`proficiency.${item.id}`)) return true;
      if (item.tool.toolCategory === "musical-instrument") return proficiencies.has("proficiency.instrument") || proficiencies.has("proficiency.musical-instrument");
      if (item.tool.toolCategory === "gaming-set") return proficiencies.has("proficiency.gaming-set");
      if (item.tool.toolCategory === "artisan") return proficiencies.has("proficiency.artisan-tools");
    }
    return false;
  }).map((item) => ({ value: String(item.id), label: item.name }));
  const bundles = (asCreationCatalog(catalog).equipmentBundles ?? []).map((bundle) => ({ value: String(bundle.id), label: EQUIPMENT_BUNDLE_LABELS[String(bundle.id)] ?? formatRef(String(bundle.id)) }));
  const options = new Map([...bundles, ...equipment].map((option) => [option.value, option]));
  for (const selectedId of selectedIds) {
    const selected = pack.equipment.get(selectedId as DefinitionRef["entityId"]);
    if (selected) options.set(selectedId, { value: selectedId, label: selected.name });
  }
  return [...options.values()];
}

function issueForStep(issue: CreationIssue, step: PresentationStep): boolean {
  if (step === "identity") return issue.field === "name";
  if (step === "race") return /race|subrace|dragonborn|human\.language/i.test(issue.field);
  if (step === "class") return /class|classes|choices\.[^.]+\.skills/i.test(issue.field);
  if (step === "background") return /background|choices\.[^.]+\.(?:tools|languages?)/i.test(issue.field);
  if (step === "ability-scores") return /ability/i.test(issue.field);
  if (step === "equipment") return /equipment|pack|choices\.[^.]+\.equipment/i.test(issue.field);
  if (step === "spells") return /spell|cantrip/i.test(issue.field);
  if (step === "details") return false;
  return true;
}

function choiceOwnerRef(draft: CharacterDraft, choice: ChoiceDefinition, owner: DefinitionRef): DefinitionRef {
  return { ...owner, entityId: owner.entityId || choice.id as DefinitionRef["entityId"] };
}


function ChoiceEditor({
  draft,
  choice,
  owner,
  catalog,
  value,
  spellInfo,
  onChange,
}: {
  readonly draft: CharacterDraft;
  readonly choice: ChoiceDefinition;
  readonly owner: DefinitionRef;
  readonly catalog: CreationCatalogInput;
  readonly value?: ChoiceSelection;
  readonly spellInfo?: (spellId: string) => CreationSpellInfo | undefined;
  readonly onChange: (selection: ChoiceSelection) => void;
}) {
  const pack = asCreationCatalog(catalog).rulePack;
  const [detail, setDetail] = useState<CreationSpellInfo>();
  const current = value?.selectedIds.map((entry) => String(entry.entityId)) ?? [];
  const options = useMemo(() => {
    if (choice.optionSet.kind === "explicit") {
      return choice.optionSet.options.map((option) => ({ value: String(option.entityId), label: optionLabel(String(option.entityId), pack) }));
    }
    const selector = choice.optionSet.selector;
    if (selector.kind === "any-skill") return Object.entries(SKILL_LABELS).map(([value, label]) => ({ value, label }));
    if (selector.kind === "any-language") {
      const languageIds = new Set<string>();
      for (const race of pack.races.values()) for (const language of race.languages) languageIds.add(String(language));
      return [...languageIds].sort().map((id) => ({ value: id, label: optionLabel(id, pack) }));
    }
    if (selector.kind === "any-tool-proficiency") return TOOL_PROFICIENCY_OPTIONS.map((id) => ({ value: id, label: optionLabel(id, pack) }));
    if (selector.kind === "any-entity-of-type" && selector.entityType === "spell") {
      const classId = draft.partial.classes?.[0]?.classId;
      // Só escolhas da própria classe usam a lista dela; as raciais usam o filtro da raça.
      const classScoped = classId !== undefined && choice.id.startsWith(`${String(classId)}.`);
      // A lista expandida do patrono do bruxo entra na lista da classe.
      const subclassId = draft.partial.classes?.[0]?.subclassId;
      const expanded = expandedSpellIds(pack, subclassId ? String(subclassId) : undefined, draft.partial.classes?.[0]?.level ?? 1);
      const spellLevel = choice.kind === "cantrip" ? 0 : choice.kind === "spell" ? 1 : undefined;
      return Array.from(pack.spells.values()).filter((spell) => {
        if (selector.filterTag && !spell.tags.includes(selector.filterTag)) return false;
        if (spellLevel !== undefined && spell.level !== spellLevel) return false;
        const bonusList = bonusCantripListOf(choice.id);
        if (bonusList) return spell.classes.some((entry) => String(entry) === bonusList);
        return !classScoped || expanded.has(String(spell.id)) || spell.classes.some((entry) => String(entry) === String(classId));
      }).map((spell) => ({ value: String(spell.id), label: displayName(spell) }));
    }
    if (selector.kind === "any-entity-of-type" && selector.entityType === "equipment") {
      return scopedEquipmentOptions(pack, owner, catalog, current);
    }
    return [];
  }, [catalog, choice, owner, pack, value, draft.partial.classes]);
  const isSpell = choice.kind === "spell" || choice.kind === "cantrip";
  const limit = creationChoiceLimit(pack, draft.partial, choice);
  const multiple = limit.max > 1 || isSpell;
  const update = (ids: readonly string[]) => onChange({
    choiceId: choice.id,
    selectedIds: ids.map((id) => refFor(draft, id)),
    grantedAtLevel: 1,
    grantingRef: choiceOwnerRef(draft, choice, owner),
  });
  const hint = `Opcional · até ${limit.max} ${limit.max === 1 ? "opção" : "opções"}${limit.basis ? ` (${limit.basis})` : ""}.`;
  // Conjuradores que preparam (Clérigo, Druida): o limite é de preparadas, não de magias conhecidas.
  const preparedNote = limit.basis ? "Estas são as magias preparadas agora. Você prepara da lista inteira da classe e pode trocar a lista ao fim de cada descanso longo (em Gerenciar magias, na ficha). Os espaços de magia, que dizem quantas vezes você conjura, são separados." : undefined;
  if (multiple) return <fieldset className={[styles.choice, styles.choiceFieldset].join(" ")} aria-label={choiceLabel(choice.id, pack)}><legend>{choiceLabel(choice.id, pack)}</legend><p className={styles.choiceHint}>{hint}</p>{preparedNote ? <p className={styles.choiceHint}>{preparedNote}</p> : null}<div className={styles.choiceOptions}>{options.map((option) => {
    const checked = current.includes(option.value);
    const info = isSpell ? spellInfo?.(option.value) : undefined;
    const input = <input type="checkbox" value={option.value} checked={checked} disabled={!checked && current.length >= limit.max} onChange={(event) => update(event.currentTarget.checked ? [...current, option.value] : current.filter((id) => id !== option.value))} />;
    const className = [styles.choiceOption, checked ? styles.choiceOptionSelected : ""].filter(Boolean).join(" ");
    if (!info) return <label className={className} key={option.value}>{input}<span>{option.label}</span></label>;
    return <div className={[className, styles.spellOption].join(" ")} key={option.value}><label className={styles.spellOptionLabel}>{input}<span className={styles.spellOptionText}><span className={styles.spellOptionName}>{option.label}</span><small className={styles.spellMeta}>{spellMeta(info)}</small><span className={styles.spellBrief}>{brief(info.description.join(" "))}</span>{info.higherLevels ? <small className={styles.spellScaling}>Evolui: {brief(info.higherLevels)}</small> : null}</span></label><IconButton className={styles.spellInfoButton} variant="ghost" label={`Descrição de ${option.label}`} icon={<Info size={20} />} onClick={() => setDetail(info)} /></div>;
  })}</div><p className={styles.choiceCount} aria-live="polite">{current.length} de {limit.max} selecionada(s)</p>{detail ? <SpellDetailModal info={detail} onClose={() => setDetail(undefined)} /> : null}</fieldset>;
  return <div className={styles.choice}><Select label={choiceLabel(choice.id, pack)} hint={hint} value={current[0] ?? ""} onChange={(event) => update(event.currentTarget.value ? [event.currentTarget.value] : [])}><option value="">Nenhuma</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>;
}

function SpellDetailModal({ info, onClose }: { readonly info: CreationSpellInfo; readonly onClose: () => void }) {
  return <AppModal open title={info.name} onClose={onClose} dismissOnBackdrop footer={<Button onClick={onClose}>Fechar</Button>}><SpellInfoDetails info={info} /></AppModal>;
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

export function CharacterCreationWizard({ draft: initialDraft, catalog, service, spellInfo, onDraftChange, onDraftSaved, onCreated, onCancel }: CharacterCreationWizardProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState<PresentationStep>(initialDraft.partial.name?.trim() && initialDraft.completedSteps.length > 0 ? (initialDraft.currentStep === "review" ? "review" : initialDraft.currentStep) : "identity");
  const [status, setStatus] = useState<"idle" | "saving-draft" | "draft-saved" | "confirming" | "confirmed" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [reviewIssues, setReviewIssues] = useState<readonly CreationIssue[]>([]);
  const [savedDraft, setSavedDraft] = useState(false);
  const confirming = useRef(false);
  const draftSaveQueue = useRef<Promise<Awaited<ReturnType<CreationWizardService["saveDraft"]>>>>(Promise.resolve({ ok: true, value: initialDraft }));

  const pack = asCreationCatalog(catalog).rulePack;
  const report = useMemo(() => validateCharacterCreation(catalog, draft), [catalog, draft]);
  const summaryLabels = useMemo(() => ({
    skill: (id: string) => (SKILL_LABELS as Record<string, string>)[id] ?? formatRef(id),
    language: (id: string) => LANGUAGE_LABELS[id] ?? formatRef(id),
    proficiency: (id: string) => PROFICIENCY_LABELS[id] ?? PROFICIENCY_GROUP_LABELS[id],
  }), []);
  const summary = useMemo(() => buildCreationSummary(catalog, draft, summaryLabels), [catalog, draft, summaryLabels]);
  const backgroundOverviews = useMemo(() => (step === "background" ? [...pack.backgrounds.keys()].flatMap((id) => backgroundOverview(catalog, draft, String(id), summaryLabels) ?? []) : []), [step, pack, catalog, draft, summaryLabels]);
  const index = STEPS.indexOf(step);
  const stepIssues = report.issues.filter((issue) => issueForStep(issue, step));

  const queueDraftSave = (nextDraft: CharacterDraft) => {
    if (!service) return undefined;
    const pending = draftSaveQueue.current.then(() => service.saveDraft(nextDraft));
    draftSaveQueue.current = pending;
    return pending;
  };

  const commitDraft = (decision: CreationDecision) => {
    const result = applyCreationDecision(draft, decision);
    if (!result.ok) {
      setMessage(result.error.message);
      setStatus("error");
      return;
    }
    setDraft(result.value);
    setSavedDraft(false);
    setMessage(undefined);
    setStatus("idle");
    onDraftChange?.(result.value);
    const saved = queueDraftSave(result.value);
    if (saved) {
      void saved.then((persisted) => {
        if (!persisted.ok) {
          setStatus("error");
          setMessage(persisted.error.message);
          return;
        }
        onDraftSaved?.(persisted.value);
      });
    }
  };

  // Navegação livre: pendências aparecem nas etapas e só bloqueiam a confirmação final.
  const goTo = (next: PresentationStep) => {
    setMessage(undefined);
    setStep(next);
  };

  const saveDraft = async () => {
    if (!service || savedDraft || status === "saving-draft") return;
    setStatus("saving-draft");
    const result = await queueDraftSave(draft);
    if (!result) return;
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
    const latestDraftSave = await draftSaveQueue.current;
    if (!latestDraftSave.ok) {
      confirming.current = false;
      setStatus("error");
      setMessage(latestDraftSave.error.message);
      return;
    }
    const materialized = materializeCharacter(catalog, draft);
    if (!materialized.ok) {
      confirming.current = false;
      setStatus("error");
      setMessage(materialized.error.map((issue) => issue.message).join(" "));
      return;
    }
    const intended = materialized.value.character;
    if (service.loadCharacter) {
      const existing = await service.loadCharacter(intended.id);
      if (!existing.ok && existing.error.code !== "not-found") {
        confirming.current = false;
        setStatus("error");
        setMessage(existing.error.message);
        return;
      }
      if (existing.ok) {
        if (!service.canReuseCharacter?.(existing.value)) {
          confirming.current = false;
          setStatus("error");
          setMessage("Este personagem pertence a outra conta e não pode ser substituído.");
          return;
        }
        if (creationFingerprint(existing.value) !== creationFingerprint(intended)) {
          confirming.current = false;
          setStatus("error");
          setMessage("Este personagem já foi alterado. Recarregue a ficha antes de confirmar.");
          return;
        }
        const deleted = await service.deleteDraft(draft.id);
        setStatus("confirmed");
        setMessage(deleted.ok ? "Personagem criado." : "Personagem criado. Não foi possível remover o rascunho salvo.");
        onCreated?.(existing.value, existing.value.revision);
        return;
      }
    }
    const saved = await service.saveCharacter(intended, asRevision(0));
    if (!saved.ok) {
      confirming.current = false;
      setStatus("error");
      setMessage(saved.error.message);
      return;
    }
    const deleted = await service.deleteDraft(draft.id);
    setStatus("confirmed");
    setMessage(deleted.ok ? "Personagem criado." : "Personagem criado. Não foi possível remover o rascunho salvo.");
    onCreated?.(intended, saved.value);
  };

  const race = draft.partial.raceRef ? pack.races.get(draft.partial.raceRef.entityId) : undefined;
  const selectedChoices = new Map((draft.partial.choices ?? []).map((choice) => [choice.choiceId, choice]));
  const classDefinition = draft.partial.classes?.[0] ? pack.classes.get(draft.partial.classes[0].classId) : undefined;
  const background = draft.partial.backgroundRef ? pack.backgrounds.get(draft.partial.backgroundRef.entityId) : undefined;
  const classChoices = classDefinition ? [...classDefinition.initialEquipmentChoices, classDefinition.skillChoices, ...(classDefinition.progression[0]?.choicesGranted ?? [])] : [];
  const raceChoices = [...(race?.choices ?? []), ...(draft.partial.subraceRef ? pack.subraces.get(draft.partial.subraceRef.entityId)?.choices ?? [] : [])];
  const backgroundChoices = [...(background?.toolChoices ?? []), ...(background?.languageChoices ?? [])];
  const choices = [...raceChoices.map((choice) => ({ choice, owner: draft.partial.raceRef })), ...classChoices.map((choice) => ({ choice, owner: draft.partial.classes?.[0] ? refFor(draft, draft.partial.classes[0].classId) : undefined })), ...backgroundChoices.map((choice) => ({ choice, owner: draft.partial.backgroundRef }))].filter((entry): entry is { choice: ChoiceDefinition; owner: DefinitionRef } => entry.owner !== undefined);
  const equipmentChoices = choices.filter(({ choice }) => choice.kind === "equipment-pack");
  const level1Subclass = draft.partial.classes?.[0]?.subclassId ? pack.subclasses.get(draft.partial.classes[0].subclassId) : undefined;
  const bonusCantrip = level1BonusCantripChoice(level1Subclass);
  const spellChoices = [...choices, ...(bonusCantrip && level1Subclass ? [{ choice: bonusCantrip, owner: refFor(draft, level1Subclass.id) }] : [])].filter(({ choice }) => choice.kind === "spell" || choice.kind === "cantrip");
  const subclassChoices = (level1Subclass?.featureGrants.filter((grant) => grant.level <= 1) ?? []).flatMap((grant) => pack.features.get(grant.featureRef.entityId)?.choices ?? []);
  // Escolhas da classe no 1º nível que não são perícias, equipamento nem magias (Estilo de Luta, Especialização, Inimigo Favorito…).
  const classOptionChoices = [...(classDefinition?.progression[0]?.choicesGranted ?? []), ...subclassChoices].filter((choice) => !["equipment-pack", "spell", "cantrip", "ability-score-increase", "feat"].includes(choice.kind));
  const heroArtwork = classArtwork(String(classDefinition?.id ?? ""));
  const characterName = draft.partial.name?.trim() || "Aventureiro sem nome";

  const renderStep = (): ReactNode => {
    switch (step) {
      case "identity": return <SectionCard heading="Quem está chegando?" headingLevel={2}><div className={styles.formGrid}><Input label="Nome do personagem" hint="Opcional · sem nome, vira “Aventureiro sem nome”." value={draft.partial.name ?? ""} error={stepIssues.find((issue) => issue.field === "name")?.message} onChange={(event) => commitDraft({ kind: "identity", name: event.currentTarget.value })} /><Input label="Nome do jogador" value={draft.partial.playerName ?? ""} onChange={(event) => commitDraft({ kind: "identity", name: draft.partial.name ?? "", playerName: event.currentTarget.value })} /></div></SectionCard>;
      case "race": return <SectionCard heading="Escolha uma raça" headingLevel={2}><Select label="Raça" required value={String(draft.partial.raceRef?.entityId ?? "")} error={stepIssues.find((issue) => /raceRef/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "race", raceRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma raça</option>{Array.from(pack.races.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select>{race?.subraceIds.length ? <Select label="Sub-raça" value={String(draft.partial.subraceRef?.entityId ?? "")} onChange={(event) => commitDraft({ kind: "race", raceRef: draft.partial.raceRef!, subraceRef: event.currentTarget.value ? refFor(draft, event.currentTarget.value) : undefined })}><option value="">Nenhuma</option>{race.subraceIds.map((id) => { const entry = pack.subraces.get(id); return entry ? <option key={entry.id} value={entry.id}>{displayName(entry)}</option> : null; })}</Select> : null}{raceChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.raceRef!} catalog={catalog} value={selectedChoices.get(choice.id)} spellInfo={spellInfo} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "class": return <SectionCard heading="Escolha uma classe" headingLevel={2}><Select label="Classe" required value={String(draft.partial.classes?.[0]?.classId ?? "")} error={stepIssues.find((issue) => /class|classes/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "class", classRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma classe</option>{Array.from(pack.classes.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select><div className={styles.classGrid} aria-label="Artes das classes">{Array.from(pack.classes.values()).map((entry) => { const artwork = classArtwork(String(entry.id)); const selectedClass = String(draft.partial.classes?.[0]?.classId ?? "") === String(entry.id); return <button type="button" className={[styles.classTile, selectedClass ? styles.classTileSelected : ""].filter(Boolean).join(" ")} aria-pressed={selectedClass} key={entry.id} onClick={() => commitDraft({ kind: "class", classRef: refFor(draft, String(entry.id)) })}><img src={artwork.src} alt="" /><span>{displayName(entry)}</span></button>; })}</div>{classDefinition && classDefinition.subclassSelectionLevel <= 1 ? <Select label="Subclasse" hint={`${displayName(classDefinition)} escolhe a subclasse no 1º nível. Opcional: dá para escolher depois, ao subir de nível.`} value={String(draft.partial.classes?.[0]?.subclassId ?? "")} onChange={(event) => commitDraft({ kind: "class", classRef: refFor(draft, String(classDefinition.id)), ...(event.currentTarget.value ? { subclassRef: refFor(draft, event.currentTarget.value) } : {}) })}><option value="">Escolher depois</option>{classDefinition.subclassIds.map((id) => { const entry = pack.subclasses.get(id); return entry ? <option key={entry.id} value={entry.id}>{displayName(entry)}</option> : null; })}</Select> : null}{classDefinition?.skillChoices ? <ChoiceEditor draft={draft} choice={classDefinition.skillChoices} owner={refFor(draft, classDefinition.id)} catalog={catalog} value={selectedChoices.get(classDefinition.skillChoices.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} /> : null}{classOptionChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={refFor(draft, String(classDefinition?.id ?? ""))} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "background": return <SectionCard heading="Escolha um antecedente" headingLevel={2}><BackgroundPicker overviews={backgroundOverviews} value={draft.partial.backgroundRef ? String(draft.partial.backgroundRef.entityId) : undefined} onChange={(id) => commitDraft({ kind: "background", ...(id ? { backgroundRef: refFor(draft, id) } : {}) })} />{backgroundChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.backgroundRef!} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "ability-scores": return <AbilityScoresStep draft={draft} pack={pack} classDefinition={classDefinition} issues={stepIssues} onChange={(method) => commitDraft({ kind: "ability-scores", method })} />;
      case "equipment": return <SectionCard heading="Escolha o equipamento" headingLevel={2}>{equipmentChoices.length ? equipmentChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "equipment", selections: [selection] })} />) : <p className={styles.muted}>O catálogo atual não publicou escolhas de equipamento para esta combinação.</p>}</SectionCard>;
      case "spells": return <SectionCard heading="Escolha as magias iniciais" headingLevel={2}>{spellChoices.length ? spellChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} spellInfo={spellInfo} onChange={(selection) => commitDraft({ kind: "spells", selections: [selection] })} />) : <p className={styles.muted}>Esta combinação não possui escolhas de magia publicadas no catálogo atual.</p>}</SectionCard>;
      case "details": return <SectionCard heading="Conte a história" headingLevel={2}><div className={styles.formGrid}>{(["appearance", "personalityTraits", "ideals", "bonds", "flaws", "history"] as const).map((field) => <label className={styles.textareaField} key={field}><span>{DETAIL_LABELS[field]}</span><textarea value={field === "appearance" || field === "history" ? draft.partial[field] ?? "" : (draft.partial[field] ?? []).join("\n")} onChange={(event) => { const value = field === "appearance" || field === "history" ? event.currentTarget.value : event.currentTarget.value.split("\n").filter(Boolean); commitDraft({ kind: "details", details: { [field]: value } as never }); }} /></label>)}</div></SectionCard>;
      case "review": return <SectionCard heading="Revise antes de confirmar" headingLevel={2}><div className={styles.summary}><p><strong>Nome:</strong> {draft.partial.name?.trim() || "Aventureiro sem nome"}</p><p><strong>Raça:</strong> {race?.name ?? "Pendente"}</p><p><strong>Classe:</strong> {classDefinition?.name ?? "Pendente"}</p><p><strong>Antecedente:</strong> {background?.name ?? "Nenhum"}</p><p><strong>Atributos:</strong> {ABILITIES.map((ability) => `${ABILITY_LABELS[ability]} ${draft.partial.abilityGeneration?.baseScores[ability] || (draft.partial.abilityGeneration?.method === "point-buy" ? 8 : 10)}`).join(" · ")}</p><p><strong>Escolhas resolvidas:</strong> {draft.partial.choices?.length ?? 0}</p></div>{summary.conflicts.length ? <div className={styles.issues} role="alert"><strong>Conflitos entre fontes</strong><ul>{summary.conflicts.map((entry) => <li key={entry.id}>{entry.message} <Button variant="ghost" onClick={() => setStep(entry.step)}>Corrigir</Button></li>)}</ul></div> : null}{(reviewIssues.length || !report.valid) ? <div className={styles.issues} role="alert"><strong>Pendências</strong><ul>{(reviewIssues.length ? reviewIssues : report.issues).map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message} <small>({issue.field})</small></li>)}</ul></div> : <InlineStatus tone="success">Tudo pronto para criar o personagem.</InlineStatus>}</SectionCard>;
    }
  };

  return <section className={styles.wizard} aria-labelledby="creation-title"><header className={styles.header}><div><p className={styles.eyebrow}>NOVA FICHA</p><h1 id="creation-title">Criação de personagem</h1><p className={styles.subtitle}>Etapa {index + 1} de {STEPS.length}: {STEP_LABELS[step]}</p></div><Button variant="ghost" onClick={onCancel}>Cancelar</Button></header><aside className={styles.dossier} aria-label="Resumo da ficha em criação"><div className={styles.portrait}><img src={heroArtwork.src} alt={heroArtwork.alt} /></div><div className={styles.dossierCopy}><p>Crônica em construção</p><h2>{characterName}</h2><span>{race?.name ?? "Origem pendente"} · {classDefinition?.name ?? "Vocação pendente"}</span></div><dl className={styles.dossierStats}><div><dt>Etapa</dt><dd>{index + 1}/{STEPS.length}</dd></div><div><dt>Origem</dt><dd>{race?.name ?? "—"}</dd></div><div><dt>Vocação</dt><dd>{classDefinition?.name ?? "—"}</dd></div></dl></aside><div className={styles.progress}><ProgressBar value={index + 1} max={STEPS.length} label={`Progresso: etapa ${index + 1} de ${STEPS.length}`} /></div><StepNavigation current={step} onStep={goTo} />{message ? <InlineStatus tone={status === "error" ? "error" : status === "confirmed" ? "success" : "info"} assertive={status === "error"}>{message}</InlineStatus> : null}{summary.conflicts.some((entry) => entry.severity === "warning") && step !== "review" ? <InlineStatus tone="warning">{summary.conflicts.filter((entry) => entry.severity === "warning").length} conflito(s) entre as fontes da ficha. Veja o resumo e use "Ir para" para corrigir.</InlineStatus> : null}<div className={styles.workspace}><div className={styles.content}>{renderStep()}</div><aside className={styles.summaryAside} aria-label="Resumo da ficha"><CreationSummaryPanel summary={summary} showConflicts={step !== "review"} onFix={(target) => { setMessage(undefined); setStep(target); }} /></aside></div><footer className={styles.footer}><div className={styles.footerLeft}>{service ? <Button variant="ghost" busy={status === "saving-draft"} disabled={savedDraft || status === "confirming" || status === "confirmed"} onClick={() => void saveDraft()}>{savedDraft ? "Rascunho salvo" : "Salvar rascunho"}</Button> : null}</div><div className={styles.footerActions}>{index > 0 ? <Button variant="ghost" onClick={() => setStep(STEPS[index - 1])}>Voltar</Button> : null}{index < STEPS.length - 1 ? <Button onClick={() => goTo(STEPS[index + 1])}>Continuar</Button> : <Button busy={status === "confirming"} disabled={!service || !report.valid || status === "confirmed"} disabledReason={!service ? "Serviço de persistência indisponível." : !report.valid ? "Resolva as pendências da revisão." : undefined} onClick={() => void confirm()}>{status === "confirmed" ? "Personagem criado" : "Confirmar personagem"}</Button>}</div></footer></section>;
}
