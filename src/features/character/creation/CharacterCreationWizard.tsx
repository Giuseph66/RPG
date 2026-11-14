import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppModal, Button, IconButton, InlineStatus, Input, ProgressBar, Select, SectionCard } from "@components/ui";
import { Info } from "@phosphor-icons/react";
import type { Character, CharacterDraft, CharacterDraftStep, OptionalRuleSelection } from "@domain/contracts/character";
import type { ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { DefinitionRef, EntityId } from "@domain/contracts/ids";
import type { OptionalClassFeatureReplacement, OptionalRuleContentPack, RulePack } from "@domain/contracts/definitions/rulepack";
import { asRevision } from "@domain/contracts/versioning";
import {
  applyCreationDecision,
  creationChoiceLimit,
  backgroundOverview,
  buildCreationSummary,
  composeOptionalRuleContent,
  materializeCharacter,
  validateCharacterCreation,
} from "@domain/character/creation";
import { asCreationCatalog, CREATION_STEPS } from "@domain/character/creation/model";
import { bonusCantripListOf, expandedSpellIds, level1BonusCantripChoice } from "@domain/character/evolution/spell-rules";
import type { CreationDecision, CreationCatalogInput, CreationIssue } from "@domain/character/creation";

import { ABILITY_LABELS, formatRef, LANGUAGE_LABELS, LANGUAGE_OPTIONS, PROFICIENCY_GROUP_LABELS, PROFICIENCY_LABELS, SKILL_LABELS, TOOL_PROFICIENCY_OPTIONS } from "./mapping";
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

const OWNER_LABELS: Readonly<Record<string, string>> = { human: "Humano", elf: "Elfo", dwarf: "Anão", fairy: "Fada", bard: "Bardo", fighter: "Guerreiro", rogue: "Ladino", wizard: "Mago", cleric: "Clérigo", druid: "Druida", sorcerer: "Feiticeiro", warlock: "Bruxo", "high-elf": "Alto elfo", entertainer: "Artista", soldier: "Soldado", acolyte: "Acólito", noble: "Nobre" };
const CHOICE_KIND_LABELS: Readonly<Record<string, string>> = { skills: "Perícias", equipment: "Equipamento inicial", tools: "Ferramentas", language: "Idioma adicional", languages: "Idiomas", cantrip: "Truque", cantrips: "Truques", spells: "Magias", "spellcasting-ability": "Atributo de conjuração" };
const EQUIPMENT_BUNDLE_LABELS: Readonly<Record<string, string>> = {
  "entertainer-pack": "Pacote de artista", "burglar-pack": "Pacote de assaltante", "dungeoneer-pack": "Pacote de aventureiro",
  "diplomat-pack": "Pacote de diplomata", "scholar-pack": "Pacote de estudioso", "explorer-pack": "Pacote de explorador", "priest-pack": "Pacote de sacerdote",
};
const DETAIL_LABELS: Readonly<Record<string, string>> = { appearance: "Aparência", personalityTraits: "Traços de personalidade", ideals: "Ideais", bonds: "Vínculos", flaws: "Defeitos", history: "História" };

const CHOICE_ID_LABELS: Readonly<Record<string, string>> = {
  "ranger.canny.skill": "Astuto (Tasha) · perícia com bônus de proficiência dobrado",
  "ranger.canny.languages": "Astuto (Tasha) · idiomas adicionais",
  "variant-human.ability-increases": "Humano variante · +1 em dois atributos diferentes",
  "variant-human.skill": "Humano variante · proficiência em uma perícia",
  "variant-human.feat": "Humano variante · talento",
  "variant-human.language": "Humano variante · idioma adicional",
};

function choiceLabel(choiceId: string, pack?: ReturnType<typeof asCreationCatalog>["rulePack"]): string {
  if (CHOICE_ID_LABELS[choiceId]) return CHOICE_ID_LABELS[choiceId];
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
  const feat = pack.feats.get(value as DefinitionRef["entityId"]);
  if (feat) return feat.name;
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
      return LANGUAGE_OPTIONS.map((id) => ({ value: id, label: optionLabel(id, pack) }));
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
    // Talento (Humano variante): sem este ramo a lista vinha vazia e a escolha ficava impossível.
    if (selector.kind === "any-entity-of-type" && selector.entityType === "feat") {
      return Array.from(pack.feats.values())
        .map((feat) => ({ value: String(feat.id), label: feat.prerequisites.length ? `${feat.name} (tem pré-requisito)` : feat.name }))
        .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
    }
    return [];
  }, [catalog, choice, owner, pack, value, draft.partial.classes]);
  const isSpell = choice.kind === "spell" || choice.kind === "cantrip";
  const isLanguageChoice = choice.optionSet.kind === "selector" && choice.optionSet.selector.kind === "any-language";
  const limit = creationChoiceLimit(pack, draft.partial, choice);
  const multiple = limit.max > 1 || isSpell;
  const update = (ids: readonly string[]) => onChange({
    choiceId: choice.id,
    selectedIds: ids.map((id) => refFor(draft, id)),
    grantedAtLevel: 1,
    grantingRef: choiceOwnerRef(draft, choice, owner),
  });
  const requiredChoice = choice.count.min > 0;
  const hint = requiredChoice
    ? `Obrigatório · escolha ${choice.count.min} ${choice.count.min === 1 ? "opção" : "opções"}${limit.max > choice.count.min ? ` (até ${limit.max})` : ""}${limit.basis ? ` (${limit.basis})` : ""}.${isLanguageChoice ? " Idiomas exóticos exigem aprovação do Mestre." : ""}`
    : `Opcional · até ${limit.max} ${limit.max === 1 ? "opção" : "opções"}${limit.basis ? ` (${limit.basis})` : ""}.${isLanguageChoice ? " Idiomas exóticos exigem aprovação do Mestre." : ""}`;
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
  return <div className={styles.choice}><Select label={choiceLabel(choice.id, pack)} hint={hint} required={requiredChoice} value={current[0] ?? ""} onChange={(event) => update(event.currentTarget.value ? [event.currentTarget.value] : [])}><option value="">{requiredChoice ? "Selecione uma opção" : "Nenhuma"}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div>;
}

/**
 * Escolha do livro base que uma opção de suplemento pode substituir por inteiro (ex.: Inimigo Favorito ↔ Inimigo Eleito).
 * A opção do suplemento aparece na mesma lista; escolhê-la grava a substituição e descarta as escolhas que ela elimina.
 */
function ReplacedChoiceSelect({ draft, choice, pack, supplement, replacement, value, onCommit }: {
  readonly draft: CharacterDraft;
  readonly choice: ChoiceDefinition;
  readonly pack: RulePack;
  readonly supplement: OptionalRuleContentPack;
  readonly replacement: OptionalClassFeatureReplacement;
  readonly value?: ChoiceSelection;
  readonly onCommit: (decisions: readonly CreationDecision[]) => void;
}) {
  const sentinel = `optional:${String(replacement.id)}`;
  const selectedSupplementIds = draft.partial.selectedSupplementIds ?? [];
  const selections = draft.partial.optionalRuleSelections ?? [];
  const isOwn = (selection: OptionalRuleSelection) => selection.supplementId === supplement.id && selection.optionId === replacement.id;
  const active = selections.some(isOwn);
  const rest = selections.filter((selection) => !isOwn(selection));
  const replacementName = replacement.replacementFeatureIds.map((id) => supplement.features?.find((feature) => feature.id === id)?.name ?? formatRef(String(id))).join(" + ");
  const replacedNames = (replacement.replacesFeatureIds ?? [replacement.replacesFeatureId]).map((id) => pack.features.get(id)?.name ?? formatRef(String(id))).join(" e ");
  const options = choice.optionSet.kind === "explicit" ? choice.optionSet.options.map((option) => ({ value: String(option.entityId), label: optionLabel(String(option.entityId), pack) })) : [];
  const current = active ? sentinel : value?.selectedIds[0] ? String(value.selectedIds[0].entityId) : "";
  const hint = active
    ? `${replacementName} (${supplementLabel(supplement)}) substitui ${replacedNames}, inclusive os idiomas e escolhas que vinham deles.`
    : `Opcional · escolha um tipo ou ${replacementName} (${supplementLabel(supplement)}).`;
  const change = (next: string) => {
    if (next === sentinel) {
      onCommit([{
        kind: "supplements", selectedSupplementIds, dropChoiceIds: replacement.replacesChoiceIds ?? [],
        selections: [...rest, { supplementId: supplement.id, optionId: replacement.id, selectedFeatureRefs: replacement.replacementFeatureIds.map((entityId) => ({ rulesetId: draft.rulesetRef.id, entityId })) }],
      }]);
      return;
    }
    onCommit([
      ...(active ? [{ kind: "supplements" as const, selectedSupplementIds, selections: rest }] : []),
      { kind: "choices", selections: [{ choiceId: choice.id, selectedIds: next ? [refFor(draft, next)] : [], grantedAtLevel: 1, grantingRef: refFor(draft, String(replacement.classId)) }] },
    ]);
  };
  return <div className={styles.choice}><Select label={choiceLabel(choice.id, pack)} hint={hint} value={current} onChange={(event) => change(event.currentTarget.value)}><option value="">Nenhum</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}<option value={sentinel}>{`${replacementName} (${supplementLabel(supplement)})`}</option></Select></div>;
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

const FAIRY_SUPPLEMENT_IDS: ReadonlySet<string> = new Set(["fairy-supplement", "supplement.fairy.local"]);
const TASHA_SUPPLEMENT_IDS: ReadonlySet<string> = new Set(["tasha-ranger-options", "supplement.tashas-cauldron-of-everything"]);

function supplementLabel(pack: OptionalRuleContentPack): string {
  if (FAIRY_SUPPLEMENT_IDS.has(String(pack.id))) return "Fada";
  if (TASHA_SUPPLEMENT_IDS.has(String(pack.id))) return "Tasha";
  return pack.name;
}

function supplementSource(pack: OptionalRuleContentPack): string {
  return pack.sourceRefs.map((source) => `${source.chapter}${source.printedPage === undefined ? "" : `, p. ${source.printedPage}`}`).join(" · ");
}

function OptionalSupplementPicker({ packs, selectedIds, selections, onChange }: {
  readonly packs: readonly OptionalRuleContentPack[];
  readonly selectedIds: readonly EntityId[];
  readonly selections: readonly OptionalRuleSelection[];
  readonly onChange: (decision: Extract<CreationDecision, { kind: "supplements" }>) => void;
}) {
  return <section className={styles.supplementBlock} aria-labelledby="creation-supplements-title">
    <div><h3 id="creation-supplements-title">Complementos</h3><p>Fontes opcionais entram nesta ficha apenas se você escolher. O mestre decide quais suplementos a campanha permite.</p></div>
    {packs.length === 0 ? <p className={styles.muted}>Nenhum complemento opcional está disponível neste catálogo.</p> : <div className={styles.supplementList}>{packs.map((supplement) => {
      const selected = selectedIds.includes(supplement.id);
      const label = supplementLabel(supplement);
      const description = FAIRY_SUPPLEMENT_IDS.has(String(supplement.id))
        ? "Inclui a raça Fada para esta ficha. Ao selecionar, ela aparece logo abaixo."
        : TASHA_SUPPLEMENT_IDS.has(String(supplement.id))
          ? "Opções de Guardião do Tasha. Depois de escolher a classe, cada opção aparece na etapa Classe para você ligar ou não."
          : String(supplement.id) === "variant-human-option"
            ? "Regra opcional do Livro do Jogador: +1 em dois atributos, uma perícia e um talento no 1º nível. Ao selecionar, aparece logo abaixo."
            : "Conteúdo complementar deste material, disponível só quando escolhido para a ficha.";
      return <label key={supplement.id} className={styles.supplementCard}>
        <input type="checkbox" checked={selected} onChange={(event) => {
          const nextIds = event.currentTarget.checked ? [...selectedIds, supplement.id] : selectedIds.filter((id) => id !== supplement.id);
          // Escolhas criadas pelas características do suplemento removido deixam de existir junto com ele.
          const orphanChoiceIds = event.currentTarget.checked ? [] : (supplement.features ?? []).flatMap((feature) => feature.choices.map((choice) => choice.id));
          onChange({ kind: "supplements", selectedSupplementIds: nextIds, selections: selections.filter((selection) => nextIds.includes(selection.supplementId)), ...(orphanChoiceIds.length ? { dropChoiceIds: orphanChoiceIds } : {}) });
        }} />
        <span><strong>{label}</strong><span>{description}</span><small>Fonte · {supplementSource(supplement) || "referência do pacote"}</small></span>
      </label>;
    })}</div>}
  </section>;
}

/** Nível em que a característica opcional passa a valer (requisito de nível de classe), ou o nível da opção. */
function optionalFeatureLevel(feature: { readonly eligibility: readonly { readonly kind: string; readonly level?: number }[] } | undefined, fallback: number): number {
  const minLevel = feature?.eligibility.find((item) => item.kind === "min-class-level");
  return minLevel?.level ?? fallback;
}

type SupplementalClassItem = {
  readonly pack: OptionalRuleContentPack;
  readonly id: EntityId;
  readonly kind: "choice" | "extend";
  readonly level: number;
  readonly title: string;
  readonly featureIds: readonly EntityId[];
  readonly spellIds: readonly EntityId[];
  readonly sourceRefs: readonly { readonly chapter?: string; readonly printedPage?: number; readonly section?: string }[];
  readonly replacesFeatureId?: EntityId;
  readonly subclassId?: EntityId;
  readonly choiceId?: string;
};

function SupplementalClassChoices({ draft, basePack, packs, hiddenOptionIds, onChange }: {
  readonly draft: CharacterDraft;
  readonly basePack: RulePack;
  readonly packs: readonly OptionalRuleContentPack[];
  /** Opções já apresentadas em outro campo (ex.: Inimigo Eleito dentro de Inimigo Favorito). */
  readonly hiddenOptionIds: ReadonlySet<string>;
  readonly onChange: (decision: Extract<CreationDecision, { kind: "supplements" }>) => void;
}) {
  const classId = draft.partial.classes?.[0]?.classId;
  if (!classId || packs.length === 0) return null;
  const options: SupplementalClassItem[] = packs.flatMap((pack) => [
    ...(pack.classFeatureReplacements ?? []).filter((option) => option.classId === classId).map((option): SupplementalClassItem => ({ pack, id: option.id, kind: "choice", level: option.choiceLevel, title: option.sourceRefs[0]?.section ?? "Característica opcional", featureIds: option.replacementFeatureIds, spellIds: [], sourceRefs: option.sourceRefs, replacesFeatureId: option.replacesFeatureId, ...(option.subclassId ? { subclassId: option.subclassId } : {}) })),
    ...(pack.classOptions ?? []).filter((option) => option.classId === classId).map((option): SupplementalClassItem => ({ pack, id: option.id, kind: option.kind, level: option.choiceLevel, title: option.sourceRefs[0]?.section ?? "Opção de classe", featureIds: option.featureRefs, spellIds: option.spellRefs ?? [], sourceRefs: option.sourceRefs, ...(option.choiceId ? { choiceId: option.choiceId } : {}) })),
  ]).filter((item) => !hiddenOptionIds.has(String(item.id))).sort((left, right) => left.level - right.level);
  if (options.length === 0) return null;
  const selectedIds = draft.partial.selectedSupplementIds ?? [];
  const selections = draft.partial.optionalRuleSelections ?? [];
  const featureOf = (optionPack: OptionalRuleContentPack, id: EntityId) => optionPack.features?.find((item) => item.id === id) ?? basePack.features.get(id);
  const labelFeature = (optionPack: OptionalRuleContentPack, id: EntityId) => featureOf(optionPack, id)?.name ?? "Característica de classe";
  const labelSpell = (optionPack: OptionalRuleContentPack, id: EntityId) => optionPack.spells?.find((item) => item.id === id)?.name ?? basePack.spells.get(id)?.name ?? "Magia complementar";
  // Cada opção é um pacote: ligar grava exatamente o conjunto que a regra exige; desligar volta ao livro base.
  const toggle = (item: SupplementalClassItem, enabled: boolean) => {
    const rest = selections.filter((selection) => !(selection.supplementId === item.pack.id && selection.optionId === item.id));
    const next: OptionalRuleSelection = {
      supplementId: item.pack.id,
      optionId: item.id,
      selectedFeatureRefs: item.choiceId ? [] : item.featureIds.map((entityId) => ({ rulesetId: draft.rulesetRef.id, entityId })),
      ...(item.spellIds.length ? { selectedSpellRefs: item.spellIds.map((entityId) => ({ rulesetId: draft.rulesetRef.id, entityId })) } : {}),
    };
    // Desligar descarta as escolhas que só existiam por causa da opção (ex.: perícia e idiomas de Astuto).
    const orphanChoiceIds = enabled ? [] : item.featureIds.flatMap((id) => featureOf(item.pack, id)?.choices.map((choice) => choice.id) ?? []);
    onChange({ kind: "supplements", selectedSupplementIds: selectedIds, selections: enabled ? [...rest, next] : rest, ...(orphanChoiceIds.length ? { dropChoiceIds: orphanChoiceIds } : {}) });
  };
  const pickOne = (item: SupplementalClassItem, featureId: EntityId | undefined) => {
    const rest = selections.filter((selection) => !(selection.supplementId === item.pack.id && selection.optionId === item.id));
    const next: OptionalRuleSelection = { supplementId: item.pack.id, optionId: item.id, selectedFeatureRefs: featureId ? [{ rulesetId: draft.rulesetRef.id, entityId: featureId }] : [] };
    onChange({ kind: "supplements", selectedSupplementIds: selectedIds, selections: featureId ? [...rest, next] : rest });
  };

  return <section className={styles.supplementOptions} aria-labelledby="supplement-class-options-title">
    <h3 id="supplement-class-options-title">Opções complementares de classe</h3>
    <p>Cada opção é independente: use algumas, todas ou nenhuma. O que estiver desmarcado segue o livro base. Características marcadas chegam sozinhas no nível indicado, sem escolha extra.</p>
    {options.map((item) => {
      const current = selections.find((selection) => selection.supplementId === item.pack.id && selection.optionId === item.id);
      const enabled = Boolean(current);
      const oldFeatureName = item.replacesFeatureId ? basePack.features.get(item.replacesFeatureId)?.name ?? "a característica original" : undefined;
      const subclassName = item.subclassId ? basePack.subclasses.get(item.subclassId)?.name : undefined;
      const unlocks = item.choiceId ? [] : item.featureIds.map((id) => ({ id, name: labelFeature(item.pack, id), level: optionalFeatureLevel(featureOf(item.pack, id), item.level) }));
      const isPickOne = item.kind === "choice" && !item.replacesFeatureId && !item.choiceId && item.featureIds.length > 1;
      const toggleLabel = item.choiceId
        ? `Adicionar à lista de escolha (${item.level}º nível): ${item.featureIds.map((id) => labelFeature(item.pack, id)).join(", ")}`
        : item.spellIds.length && !item.featureIds.length
          ? "Adicionar estas magias à lista da classe"
          : oldFeatureName
            ? `Usar ${item.title} no lugar de ${oldFeatureName}`
            : `Usar ${item.title}`;
      return <fieldset className={styles.supplementOption} key={`${item.pack.id}-${item.id}`}>
        <legend>{supplementLabel(item.pack)} · {item.title} · {item.level}º nível</legend>
        {subclassName ? <p>Só vale para quem seguir {subclassName}.</p> : null}
        {isPickOne ? <div className={styles.supplementChoice} role="radiogroup" aria-label={`${item.title}: escolher característica`}>
          <label><input type="radio" name={`optional-class-${String(item.id)}`} checked={!enabled} onChange={() => pickOne(item, undefined)} /><span>Manter a regra atual</span></label>
          {item.featureIds.map((id) => <label key={id}><input type="radio" name={`optional-class-${String(item.id)}`} checked={Boolean(current?.selectedFeatureRefs.some((ref) => ref.entityId === id))} onChange={() => pickOne(item, id)} /><span>{labelFeature(item.pack, id)}</span></label>)}
        </div> : <label className={styles.supplementToggle}><input type="checkbox" checked={enabled} onChange={(event) => toggle(item, event.currentTarget.checked)} /><span>{toggleLabel}</span></label>}
        {!isPickOne && unlocks.length > 1 ? <p>Você ganha todas, conforme sobe de nível: {unlocks.map((entry) => `${entry.name} (${entry.level}º)`).join(" · ")}.</p> : null}
        {!isPickOne && unlocks.length === 1 && unlocks[0]!.level > 1 ? <p>Passa a valer no {unlocks[0]!.level}º nível.</p> : null}
        {item.spellIds.length ? <p>Magias que entram na lista para você escolher ao montar suas magias (não são aprendidas automaticamente): {item.spellIds.map((id) => labelSpell(item.pack, id)).join(", ")}.</p> : null}
        <small>{item.sourceRefs.map((source) => `${source.chapter}${source.printedPage === undefined ? "" : `, p. ${source.printedPage}`}`).join(" · ")}</small>
      </fieldset>;
    })}
  </section>;
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

  const creationCatalog = asCreationCatalog(catalog);
  const pack = creationCatalog.rulePack;
  const optionalPacks = creationCatalog.optionalRulePacks ?? [];
  const selectedSupplementIds = draft.partial.selectedSupplementIds ?? [];
  const selectedPacks = optionalPacks.filter((supplement) => selectedSupplementIds.includes(supplement.id));
  const composedPack = useMemo(() => {
    const composed = composeOptionalRuleContent(pack, draft.partial.selectedSupplementIds ?? [], draft.partial.optionalRuleSelections ?? []);
    return composed.ok ? composed.value : pack;
  }, [pack, draft.partial.selectedSupplementIds, draft.partial.optionalRuleSelections]);
  const report = useMemo(() => validateCharacterCreation(catalog, draft), [catalog, draft]);
  const summaryLabels = useMemo(() => ({
    skill: (id: string) => (SKILL_LABELS as Record<string, string>)[id] ?? formatRef(id),
    language: (id: string) => LANGUAGE_LABELS[id] ?? formatRef(id),
    proficiency: (id: string) => PROFICIENCY_LABELS[id] ?? PROFICIENCY_GROUP_LABELS[id],
  }), []);
  // Com o pack composto: raças de suplemento (Humano variante, Fada) só existem nele, e sem isso o resumo
  // não mostrava nada da raça escolhida.
  const summary = useMemo(() => buildCreationSummary({ ...asCreationCatalog(catalog), rulePack: composedPack }, draft, summaryLabels), [catalog, composedPack, draft, summaryLabels]);
  const backgroundOverviews = useMemo(() => (step === "background" ? [...pack.backgrounds.keys()].flatMap((id) => backgroundOverview(catalog, draft, String(id), summaryLabels) ?? []) : []), [step, pack, catalog, draft, summaryLabels]);
  const index = STEPS.indexOf(step);
  const stepIssues = report.issues.filter((issue) => issueForStep(issue, step));

  const queueDraftSave = (nextDraft: CharacterDraft) => {
    if (!service) return undefined;
    const pending = draftSaveQueue.current.then(() => service.saveDraft(nextDraft));
    draftSaveQueue.current = pending;
    return pending;
  };

  // Aceita várias decisões para aplicá-las juntas sobre o mesmo draft (evita que a segunda sobrescreva a primeira).
  const commitDraft = (input: CreationDecision | readonly CreationDecision[]) => {
    const decisions = (Array.isArray(input) ? input : [input]) as readonly CreationDecision[];
    let nextDraft = draft;
    for (const decision of decisions) {
      const applied = applyCreationDecision(nextDraft, decision);
      if (!applied.ok) {
        setMessage(applied.error.message);
        setStatus("error");
        return;
      }
      nextDraft = applied.value;
    }
    const result = { value: nextDraft };
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

  const selectedOptionalRaces = selectedPacks.flatMap((supplement) => supplement.races ?? []);
  const selectedOptionalSubraces = selectedPacks.flatMap((supplement) => supplement.subraces ?? []);
  const race = draft.partial.raceRef ? pack.races.get(draft.partial.raceRef.entityId) ?? selectedOptionalRaces.find((entry) => entry.id === draft.partial.raceRef?.entityId) : undefined;
  const raceOptions = [...pack.races.values(), ...selectedOptionalRaces];
  const subraceById = (id: EntityId) => pack.subraces.get(id) ?? selectedOptionalSubraces.find((entry) => entry.id === id);
  const selectedChoices = new Map((draft.partial.choices ?? []).map((choice) => [choice.choiceId, choice]));
  const classDefinition = draft.partial.classes?.[0] ? pack.classes.get(draft.partial.classes[0].classId) : undefined;
  const background = draft.partial.backgroundRef ? pack.backgrounds.get(draft.partial.backgroundRef.entityId) : undefined;
  const classChoices = classDefinition ? [...classDefinition.initialEquipmentChoices, classDefinition.skillChoices, ...(classDefinition.progression[0]?.choicesGranted ?? [])] : [];
  const raceChoices = [...(race?.choices ?? []), ...(draft.partial.subraceRef ? subraceById(draft.partial.subraceRef.entityId)?.choices ?? [] : [])];
  const backgroundChoices = [...(background?.toolChoices ?? []), ...(background?.languageChoices ?? [])];
  const choices = [...raceChoices.map((choice) => ({ choice, owner: draft.partial.raceRef })), ...classChoices.map((choice) => ({ choice, owner: draft.partial.classes?.[0] ? refFor(draft, draft.partial.classes[0].classId) : undefined })), ...backgroundChoices.map((choice) => ({ choice, owner: draft.partial.backgroundRef }))].filter((entry): entry is { choice: ChoiceDefinition; owner: DefinitionRef } => entry.owner !== undefined);
  const equipmentChoices = choices.filter(({ choice }) => choice.kind === "equipment-pack");
  const level1Subclass = draft.partial.classes?.[0]?.subclassId ? pack.subclasses.get(draft.partial.classes[0].subclassId) : undefined;
  const bonusCantrip = level1BonusCantripChoice(level1Subclass);
  const spellChoices = [...choices, ...(bonusCantrip && level1Subclass ? [{ choice: bonusCantrip, owner: refFor(draft, level1Subclass.id) }] : [])].filter(({ choice }) => choice.kind === "spell" || choice.kind === "cantrip");
  const subclassChoices = (level1Subclass?.featureGrants.filter((grant) => grant.level <= 1) ?? []).flatMap((grant) => pack.features.get(grant.featureRef.entityId)?.choices ?? []);
  // Escolhas da classe no 1º nível que não são perícias, equipamento nem magias (Estilo de Luta, Especialização, Inimigo Favorito…).
  // Opções complementares escolhidas alteram a classe (ex.: Astuto pede perícia e idiomas; Inimigo Eleito remove Inimigo Favorito).
  const composedClass = classDefinition ? composedPack.classes.get(classDefinition.id) ?? classDefinition : undefined;
  const baseLevel1Choices = classDefinition?.progression[0]?.choicesGranted ?? [];
  const composedLevel1Choices = composedClass?.progression[0]?.choicesGranted ?? [];
  const choiceReplacements = new Map(selectedPacks.flatMap((supplement) => (supplement.classFeatureReplacements ?? [])
    .filter((replacement) => classDefinition && replacement.classId === classDefinition.id && !replacement.subclassId && replacement.choiceLevel === 1 && replacement.replacesChoiceIds?.length)
    .map((replacement) => [replacement.replacesChoiceIds![0]!, { supplement, replacement }] as const)));
  const baseLevel1FeatureIds = new Set((classDefinition?.progression[0]?.featureRefs ?? []).map((ref) => String(ref.entityId)));
  const supplementFeatureChoices = (composedClass?.progression[0]?.featureRefs ?? [])
    .filter((ref) => !baseLevel1FeatureIds.has(String(ref.entityId)))
    .flatMap((ref) => composedPack.features.get(ref.entityId)?.choices ?? []);
  const level1ClassChoices = [
    ...baseLevel1Choices.filter((choice) => choiceReplacements.has(choice.id) || composedLevel1Choices.some((entry) => entry.id === choice.id)).map((choice) => composedLevel1Choices.find((entry) => entry.id === choice.id) ?? choice),
    ...composedLevel1Choices.filter((choice) => !baseLevel1Choices.some((entry) => entry.id === choice.id)),
    ...supplementFeatureChoices,
  ];
  const hiddenSupplementOptionIds = new Set([...choiceReplacements.values()].map(({ replacement }) => String(replacement.id)));
  const classOptionChoices = [...level1ClassChoices, ...subclassChoices].filter((choice) => !["equipment-pack", "spell", "cantrip", "ability-score-increase", "feat"].includes(choice.kind));
  const heroArtwork = classArtwork(String(classDefinition?.id ?? ""));
  const characterName = draft.partial.name?.trim() || "Aventureiro sem nome";

  const renderStep = (): ReactNode => {
    switch (step) {
      case "identity": return <SectionCard heading="Quem está chegando?" headingLevel={2}><div className={styles.formGrid}><Input label="Nome do personagem" hint="Opcional · sem nome, vira “Aventureiro sem nome”." value={draft.partial.name ?? ""} error={stepIssues.find((issue) => issue.field === "name")?.message} onChange={(event) => commitDraft({ kind: "identity", name: event.currentTarget.value })} /><Input label="Nome do jogador" value={draft.partial.playerName ?? ""} onChange={(event) => commitDraft({ kind: "identity", name: draft.partial.name ?? "", playerName: event.currentTarget.value })} /></div></SectionCard>;
      case "race": return <SectionCard heading="Escolha uma raça" headingLevel={2}><OptionalSupplementPicker packs={optionalPacks} selectedIds={selectedSupplementIds} selections={draft.partial.optionalRuleSelections ?? []} onChange={commitDraft} /><Select label="Raça" required value={String(draft.partial.raceRef?.entityId ?? "")} error={stepIssues.find((issue) => /raceRef/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "race", raceRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma raça</option>{raceOptions.map((entry) => { const sourcePack = selectedPacks.find((supplement) => supplement.races?.some((optionalRace) => optionalRace.id === entry.id)); return <option key={entry.id} value={entry.id}>{sourcePack ? `${supplementLabel(sourcePack)} · ${displayName(entry)}` : displayName(entry)}</option>; })}</Select>{race?.subraceIds.length ? <Select label="Sub-raça" value={String(draft.partial.subraceRef?.entityId ?? "")} onChange={(event) => commitDraft({ kind: "race", raceRef: draft.partial.raceRef!, subraceRef: event.currentTarget.value ? refFor(draft, event.currentTarget.value) : undefined })}><option value="">Nenhuma</option>{race.subraceIds.map((id) => { const entry = subraceById(id); return entry ? <option key={entry.id} value={entry.id}>{displayName(entry)}</option> : null; })}</Select> : null}{raceChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.raceRef!} catalog={catalog} value={selectedChoices.get(choice.id)} spellInfo={spellInfo} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "class": return <SectionCard heading="Escolha uma classe" headingLevel={2}><Select label="Classe" required value={String(draft.partial.classes?.[0]?.classId ?? "")} error={stepIssues.find((issue) => /class|classes/.test(issue.field))?.message} onChange={(event) => commitDraft({ kind: "class", classRef: refFor(draft, event.currentTarget.value) })}><option value="">Selecione uma classe</option>{Array.from(pack.classes.values()).map((entry) => <option key={entry.id} value={entry.id}>{displayName(entry)}</option>)}</Select><div className={styles.classGrid} aria-label="Artes das classes">{Array.from(pack.classes.values()).map((entry) => { const artwork = classArtwork(String(entry.id)); const selectedClass = String(draft.partial.classes?.[0]?.classId ?? "") === String(entry.id); return <button type="button" className={[styles.classTile, selectedClass ? styles.classTileSelected : ""].filter(Boolean).join(" ")} aria-pressed={selectedClass} key={entry.id} onClick={() => commitDraft({ kind: "class", classRef: refFor(draft, String(entry.id)) })}><img src={artwork.src} alt="" /><span>{displayName(entry)}</span></button>; })}</div>{classDefinition && classDefinition.subclassSelectionLevel <= 1 ? <Select label="Subclasse" hint={`${displayName(classDefinition)} escolhe a subclasse no 1º nível. Opcional: dá para escolher depois, ao subir de nível.`} value={String(draft.partial.classes?.[0]?.subclassId ?? "")} onChange={(event) => commitDraft({ kind: "class", classRef: refFor(draft, String(classDefinition.id)), ...(event.currentTarget.value ? { subclassRef: refFor(draft, event.currentTarget.value) } : {}) })}><option value="">Escolher depois</option>{classDefinition.subclassIds.map((id) => { const entry = pack.subclasses.get(id); return entry ? <option key={entry.id} value={entry.id}>{displayName(entry)}</option> : null; })}</Select> : null}{classDefinition?.skillChoices ? <ChoiceEditor draft={draft} choice={classDefinition.skillChoices} owner={refFor(draft, classDefinition.id)} catalog={catalog} value={selectedChoices.get(classDefinition.skillChoices.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} /> : null}{classOptionChoices.map((choice) => { const merged = choiceReplacements.get(choice.id); return merged ? <ReplacedChoiceSelect key={choice.id} draft={draft} choice={choice} pack={pack} supplement={merged.supplement} replacement={merged.replacement} value={selectedChoices.get(choice.id)} onCommit={commitDraft} /> : <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={refFor(draft, String(classDefinition?.id ?? ""))} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />; })}<SupplementalClassChoices draft={draft} basePack={pack} packs={selectedPacks} hiddenOptionIds={hiddenSupplementOptionIds} onChange={commitDraft} /></SectionCard>;
      case "background": return <SectionCard heading="Escolha um antecedente" headingLevel={2}><BackgroundPicker overviews={backgroundOverviews} value={draft.partial.backgroundRef ? String(draft.partial.backgroundRef.entityId) : undefined} onChange={(id) => commitDraft({ kind: "background", ...(id ? { backgroundRef: refFor(draft, id) } : {}) })} />{backgroundChoices.map((choice) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={draft.partial.backgroundRef!} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "choices", selections: [selection] })} />)}</SectionCard>;
      case "ability-scores": return <AbilityScoresStep draft={draft} pack={composedPack} classDefinition={classDefinition} issues={stepIssues} onChange={(method) => commitDraft({ kind: "ability-scores", method })} />;
      case "equipment": return <SectionCard heading="Escolha o equipamento" headingLevel={2}>{equipmentChoices.length ? equipmentChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} onChange={(selection) => commitDraft({ kind: "equipment", selections: [selection] })} />) : <p className={styles.muted}>O catálogo atual não publicou escolhas de equipamento para esta combinação.</p>}</SectionCard>;
      case "spells": return <SectionCard heading="Escolha as magias iniciais" headingLevel={2}>{spellChoices.length ? spellChoices.map(({ choice, owner }) => <ChoiceEditor key={choice.id} draft={draft} choice={choice} owner={owner} catalog={catalog} value={selectedChoices.get(choice.id)} spellInfo={spellInfo} onChange={(selection) => commitDraft({ kind: "spells", selections: [selection] })} />) : <p className={styles.muted}>Esta combinação não possui escolhas de magia publicadas no catálogo atual.</p>}</SectionCard>;
      case "details": return <SectionCard heading="Conte a história" headingLevel={2}><div className={styles.formGrid}>{(["appearance", "personalityTraits", "ideals", "bonds", "flaws", "history"] as const).map((field) => <label className={styles.textareaField} key={field}><span>{DETAIL_LABELS[field]}</span><textarea value={field === "appearance" || field === "history" ? draft.partial[field] ?? "" : (draft.partial[field] ?? []).join("\n")} onChange={(event) => { const value = field === "appearance" || field === "history" ? event.currentTarget.value : event.currentTarget.value.split("\n").filter(Boolean); commitDraft({ kind: "details", details: { [field]: value } as never }); }} /></label>)}</div></SectionCard>;
      case "review": return <SectionCard heading="Revise antes de confirmar" headingLevel={2}><div className={styles.summary}><p><strong>Nome:</strong> {draft.partial.name?.trim() || "Aventureiro sem nome"}</p><p><strong>Raça:</strong> {race?.name ?? "Pendente"}</p><p><strong>Classe:</strong> {classDefinition?.name ?? "Pendente"}</p><p><strong>Antecedente:</strong> {background?.name ?? "Nenhum"}</p><p><strong>Atributos:</strong> {ABILITIES.map((ability) => `${ABILITY_LABELS[ability]} ${draft.partial.abilityGeneration?.baseScores[ability] || (draft.partial.abilityGeneration?.method === "point-buy" ? 8 : 10)}`).join(" · ")}</p><p><strong>Escolhas resolvidas:</strong> {draft.partial.choices?.length ?? 0}</p>{selectedPacks.length ? <p><strong>Complementos:</strong> {selectedPacks.map(supplementLabel).join(", ")}</p> : null}{(draft.partial.optionalRuleSelections?.length ?? 0) > 0 ? <p><strong>Opções de classe escolhidas:</strong> {draft.partial.optionalRuleSelections?.length}</p> : null}</div>{summary.conflicts.length ? <div className={styles.issues} role="alert"><strong>Conflitos entre fontes</strong><ul>{summary.conflicts.map((entry) => <li key={entry.id}>{entry.message} <Button variant="ghost" onClick={() => setStep(entry.step)}>Corrigir</Button></li>)}</ul></div> : null}{(reviewIssues.length || !report.valid) ? <div className={styles.issues} role="alert"><strong>Pendências</strong><ul>{(reviewIssues.length ? reviewIssues : report.issues).map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message} <small>({issue.field})</small></li>)}</ul></div> : <InlineStatus tone="success">Tudo pronto para criar o personagem.</InlineStatus>}</SectionCard>;
    }
  };

  return <section className={styles.wizard} aria-labelledby="creation-title"><header className={styles.header}><div><p className={styles.eyebrow}>NOVA FICHA</p><h1 id="creation-title">Criação de personagem</h1><p className={styles.subtitle}>Etapa {index + 1} de {STEPS.length}: {STEP_LABELS[step]}</p></div><Button variant="ghost" onClick={onCancel}>Cancelar</Button></header><aside className={styles.dossier} aria-label="Resumo da ficha em criação"><div className={styles.portrait}><img src={heroArtwork.src} alt={heroArtwork.alt} /></div><div className={styles.dossierCopy}><p>Crônica em construção</p><h2>{characterName}</h2><span>{race?.name ?? "Origem pendente"} · {classDefinition?.name ?? "Vocação pendente"}</span></div><dl className={styles.dossierStats}><div><dt>Etapa</dt><dd>{index + 1}/{STEPS.length}</dd></div><div><dt>Origem</dt><dd>{race?.name ?? "—"}</dd></div><div><dt>Vocação</dt><dd>{classDefinition?.name ?? "—"}</dd></div></dl></aside><div className={styles.progress}><ProgressBar value={index + 1} max={STEPS.length} label={`Progresso: etapa ${index + 1} de ${STEPS.length}`} /></div><StepNavigation current={step} onStep={goTo} />{message ? <InlineStatus tone={status === "error" ? "error" : status === "confirmed" ? "success" : "info"} assertive={status === "error"}>{message}</InlineStatus> : null}{summary.conflicts.some((entry) => entry.severity === "warning") && step !== "review" ? <InlineStatus tone="warning">{summary.conflicts.filter((entry) => entry.severity === "warning").length} conflito(s) entre as fontes da ficha. Veja o resumo e use "Ir para" para corrigir.</InlineStatus> : null}<div className={styles.workspace}><div className={styles.content}>{renderStep()}</div><aside className={styles.summaryAside} aria-label="Resumo da ficha"><CreationSummaryPanel summary={summary} showConflicts={step !== "review"} onFix={(target) => { setMessage(undefined); setStep(target); }} /></aside></div><footer className={styles.footer}><div className={styles.footerLeft}>{service ? <Button variant="ghost" busy={status === "saving-draft"} disabled={savedDraft || status === "confirming" || status === "confirmed"} onClick={() => void saveDraft()}>{savedDraft ? "Rascunho salvo" : "Salvar rascunho"}</Button> : null}</div><div className={styles.footerActions}>{index > 0 ? <Button variant="ghost" onClick={() => setStep(STEPS[index - 1])}>Voltar</Button> : null}{index < STEPS.length - 1 ? <Button onClick={() => goTo(STEPS[index + 1])}>Continuar</Button> : <Button busy={status === "confirming"} disabled={!service || !report.valid || status === "confirmed"} disabledReason={!service ? "Serviço de persistência indisponível." : !report.valid ? "Resolva as pendências da revisão." : undefined} onClick={() => void confirm()}>{status === "confirmed" ? "Personagem criado" : "Confirmar personagem"}</Button>}</div></footer></section>;
}
