import type { Character, ClassLevel, ProgressionHitPointGain } from "@domain/contracts/character";
import { asUuid, isUuid, type EntityId } from "@domain/contracts/ids";
import type { ChoiceDefinition, ChoiceSelection } from "@domain/contracts/primitives";
import type { ClassDefinition, SubclassDefinition } from "@domain/contracts/definitions/class";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import { err, ok } from "@domain/contracts/errors";
import { asProgressionCatalog, type LevelUpPreview, type LevelUpRequest, type ProgressionApplyOptions, type ProgressionCatalogInput, type ProgressionIssue, type ProgressionResourcePreview, type ProgressionResult, type ProgressionStatus } from "./model";

const SKILLS = new Set(["athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival", "performance", "deception", "intimidation", "persuasion"]);

const issue = (code: ProgressionIssue["code"], field: string, message: string, sourceRefs?: ProgressionIssue["sourceRefs"]): ProgressionIssue => ({ code, field, message, blocking: true, ...(sourceRefs?.length ? { sourceRefs } : {}) });

function levelFor(character: Character, classId: EntityId): number {
  return character.classes.find((entry) => entry.classId === classId)?.level ?? 0;
}

function totalLevel(character: Character): number {
  return character.classes.reduce((sum, entry) => sum + entry.level, 0);
}

/** Resource identity is the complete definition reference, never entityId alone. */
function sameResourceRef(left: { readonly rulesetId: unknown; readonly entityId: unknown }, right: { readonly rulesetId: unknown; readonly entityId: unknown }): boolean {
  return left.rulesetId === right.rulesetId && left.entityId === right.entityId;
}

function progressionTable(pack: RulePack): ProgressionStatus | ProgressionIssue[] {
  const table = pack.progression?.table;
  if (!table || table.length !== 20 || table.some((entry, index) => entry.totalLevel !== index + 1 || (index > 0 && entry.xpThreshold < table[index - 1].xpThreshold))) {
    return [issue("unresolved-source", "progression.table", "A tabela publicada de progressão não cobre níveis 1–20 em ordem.", pack.progression.sourceRefs)];
  }
  return { totalLevel: 0, proficiencyBonus: table[0].proficiencyBonus, currentThreshold: table[0].xpThreshold, progress: 0, eligibleLevels: [] };
}

export function getProgressionStatus(xp: number, currentTotalLevel: number, input: ProgressionCatalogInput): ProgressionResult<ProgressionStatus> {
  if (!Number.isInteger(xp) || xp < 0) return err([issue("invalid-xp", "xp", "XP deve ser um inteiro não negativo.")]);
  if (!Number.isInteger(currentTotalLevel) || currentTotalLevel < 1 || currentTotalLevel > 20) return err([issue("invalid-level", "classes", "Nível total deve estar entre 1 e 20.")]);
  const pack = asProgressionCatalog(input).rulePack;
  const tableCheck = progressionTable(pack);
  if (Array.isArray(tableCheck)) return err(tableCheck);
  const level = [...pack.progression.table].reverse().find((entry) => xp >= entry.xpThreshold)?.totalLevel ?? 1;
  const current = pack.progression.table[currentTotalLevel - 1];
  const next = pack.progression.table[currentTotalLevel];
  const effective = pack.progression.table[level - 1];
  const eligibleLevels = pack.progression.table.filter((entry) => entry.totalLevel > currentTotalLevel && xp >= entry.xpThreshold).map((entry) => entry.totalLevel);
  const progress = next === undefined ? 1 : Math.min(1, Math.max(0, (xp - current.xpThreshold) / Math.max(1, next.xpThreshold - current.xpThreshold)));
  return ok({ totalLevel: level, proficiencyBonus: effective.proficiencyBonus, currentThreshold: current.xpThreshold, ...(next ? { nextThreshold: next.xpThreshold } : {}), progress, eligibleLevels });
}

export function progressionForXp(xp: number, input: ProgressionCatalogInput, currentTotalLevel = 1): ProgressionResult<ProgressionStatus> {
  return getProgressionStatus(xp, currentTotalLevel, input);
}

export function setExperience(character: Character, xp: number): ProgressionResult<Character> {
  if (!Number.isInteger(xp) || xp < 0) return err([issue("invalid-xp", "xp", "XP deve ser um inteiro não negativo.")]);
  return ok({ ...character, xp });
}

export function grantExperience(character: Character, amount: number): ProgressionResult<Character> {
  if (!Number.isInteger(amount) || amount < 0) return err([issue("invalid-xp", "amount", "O ganho de XP deve ser um inteiro não negativo.")]);
  return setExperience(character, character.xp + amount);
}

function choicesFor(pack: RulePack, classDefinition: ClassDefinition, targetLevel: number, subclass: SubclassDefinition | undefined): { readonly choices: readonly ChoiceDefinition[]; readonly featureRefs: readonly import("@domain/contracts/ids").DefinitionRef[]; readonly issues: readonly ProgressionIssue[] } {
  const progression = classDefinition.progression[targetLevel - 1];
  if (!progression || progression.level !== targetLevel) return { choices: [], featureRefs: [], issues: [issue("unresolved-source", "class.progression", `A progressão publicada não possui o nível ${targetLevel}.`, classDefinition.sourceRefs)] };
  const featureRefs = [...progression.featureRefs, ...(subclass?.featureGrants.filter((grant) => grant.level === targetLevel).map((grant) => grant.featureRef) ?? [])];
  const issues: ProgressionIssue[] = [];
  const choices: ChoiceDefinition[] = [...progression.choicesGranted];
  for (const featureRef of featureRefs) {
    const feature = pack.features.get(featureRef.entityId);
    if (!feature) {
      issues.push(issue("unresolved-source", `features.${String(featureRef.entityId)}`, `Característica "${String(featureRef.entityId)}" não está publicada no catálogo.`, classDefinition.sourceRefs));
      continue;
    }
    choices.push(...feature.choices);
  }
  if (subclass) choices.push(...subclass.choices);
  return { choices, featureRefs, issues };
}

function validChoiceSelection(pack: RulePack, choice: ChoiceDefinition, selection: ChoiceSelection | undefined): ProgressionIssue[] {
  if (!selection) return choice.count.min > 0 ? [issue("required-choice", `choices.${choice.id}`, `A escolha obrigatória "${choice.id}" não foi resolvida.`, choice.sourceRefs)] : [];
  const selected = selection.selectedIds.map((ref) => String(ref.entityId));
  const errors: ProgressionIssue[] = [];
  if (selected.length < choice.count.min || selected.length > choice.count.max) errors.push(issue("invalid-choice", `choices.${choice.id}`, `"${choice.id}" exige entre ${choice.count.min} e ${choice.count.max} opções; recebeu ${selected.length}.`, choice.sourceRefs));
  if (new Set(selected).size !== selected.length) errors.push(issue("duplicate-choice", `choices.${choice.id}`, `A escolha "${choice.id}" contém opções repetidas.`, choice.sourceRefs));
  if (choice.optionSet.kind === "explicit") {
    const allowed = new Set(choice.optionSet.options.map((ref) => String(ref.entityId)));
    for (const selectedId of selected) if (!allowed.has(selectedId)) errors.push(issue("invalid-choice", `choices.${choice.id}`, `A opção "${selectedId}" não pertence ao catálogo de "${choice.id}".`, choice.sourceRefs));
  } else {
    const selector = choice.optionSet.selector;
    for (const selectedId of selected) {
      if (selector.kind === "any-skill" && !SKILLS.has(selectedId)) errors.push(issue("invalid-choice", `choices.${choice.id}`, `"${selectedId}" não é uma perícia publicada.`));
      if (selector.kind === "any-entity-of-type" && selector.entityType === "equipment" && !pack.equipment.has(selectedId as EntityId)) errors.push(issue("unresolved-source", `choices.${choice.id}`, `Equipamento "${selectedId}" não está publicado no catálogo.`));
      if (selector.kind === "any-entity-of-type" && selector.entityType === "spell" && !pack.spells.has(selectedId as EntityId)) errors.push(issue("unresolved-source", `choices.${choice.id}`, `Magia "${selectedId}" não está publicada no catálogo.`));
      if ((selector.kind === "any-language" || selector.kind === "any-tool-proficiency") && selectedId.length === 0) errors.push(issue("invalid-choice", `choices.${choice.id}`, "A opção não pode ser vazia."));
    }
  }
  return errors;
}

function validateHitPointGain(gain: ProgressionHitPointGain, classDefinition: ClassDefinition, targetLevel: number): ProgressionIssue[] {
  if (gain.kind === "first-level-max") return [issue("invalid-hit-points", "hitPointGain.kind", "O ganho máximo só é válido no primeiro nível, que não é aplicado por este fluxo.")];
  if (!Number.isInteger(gain.amount) || gain.amount < 1 || gain.amount > classDefinition.hitDie) return [issue("invalid-hit-points", "hitPointGain.amount", `Ganho-base deve ser um inteiro entre 1 e ${classDefinition.hitDie}.` )];
  if (gain.kind === "rolled" && (!gain.rollId || !isUuid(String(gain.rollId)))) return [issue("invalid-hit-points", "hitPointGain.rollId", `A rolagem do nível ${targetLevel} precisa preservar um rollId UUID válido.`)];
  return [];
}

function validateMulticlass(character: Character, classDefinition: ClassDefinition, isNewClass: boolean): ProgressionIssue[] {
  if (!isNewClass) return [];
  const errors: ProgressionIssue[] = [];
  for (const prerequisite of classDefinition.multiclassPrerequisites) {
    if (prerequisite.kind !== "min-ability-score") continue;
    const score = character.abilityGeneration.baseScores[prerequisite.ability];
    if (score < prerequisite.score) errors.push(issue("multiclass-prerequisite", `classes.${String(classDefinition.id)}`, `Multiclasse exige ${String(prerequisite.ability)} ${prerequisite.score}; personagem possui ${score}.`, classDefinition.sourceRefs));
  }
  return errors;
}

export function buildLevelUpPreview(character: Character, input: LevelUpRequest, catalogInput: ProgressionCatalogInput): ProgressionResult<LevelUpPreview> {
  const pack = asProgressionCatalog(catalogInput).rulePack;
  const errors: ProgressionIssue[] = [];
  if (!Number.isInteger(character.xp) || character.xp < 0) errors.push(issue("invalid-xp", "xp", "XP do personagem é inválido."));
  const classDefinition = pack.classes.get(input.classId);
  if (!classDefinition) errors.push(issue("invalid-class", "classId", `Classe "${String(input.classId)}" não está publicada.`));
  if (errors.length || !classDefinition) return err(errors);
  const currentClassLevel = levelFor(character, input.classId);
  const isNewClass = currentClassLevel === 0;
  const targetClassLevel = input.targetClassLevel ?? currentClassLevel + 1;
  const currentTotal = totalLevel(character);
  if (targetClassLevel <= currentClassLevel) errors.push(issue("already-applied", "targetClassLevel", `O nível ${targetClassLevel} de ${String(input.classId)} já foi aplicado.`));
  if (targetClassLevel !== currentClassLevel + 1) errors.push(issue("invalid-level", "targetClassLevel", `O próximo nível de ${String(input.classId)} é ${currentClassLevel + 1}; saltos não são permitidos.`));
  if (currentTotal >= 20) errors.push(issue("invalid-level", "classes", "Nível total 20 já foi atingido."));
  if (targetClassLevel > 20) errors.push(issue("invalid-level", "classId", "Nível de classe máximo é 20."));
  if (input.mode !== "milestone") {
    const status = getProgressionStatus(character.xp, currentTotal, pack);
    if (!status.ok) errors.push(...status.error);
    else if (!status.value.eligibleLevels.includes(currentTotal + 1)) errors.push(issue("invalid-level", "xp", `XP insuficiente para o próximo nível: exige ${pack.progression.table[currentTotal]?.xpThreshold ?? "uma pendência"}.`, pack.progression.sourceRefs));
  }
  errors.push(...validateMulticlass(character, classDefinition, isNewClass));
  const existingClass = character.classes.find((entry) => entry.classId === input.classId);
  const subclass = input.subclassId ? pack.subclasses.get(input.subclassId) : existingClass?.subclassId ? pack.subclasses.get(existingClass.subclassId) : undefined;
  if (input.subclassId && !subclass) errors.push(issue("invalid-subclass", "subclassId", `Subclasse "${String(input.subclassId)}" não está publicada.`));
  if (subclass && subclass.classId !== input.classId) errors.push(issue("invalid-subclass", "subclassId", "A subclasse não pertence à classe escolhida.", subclass.sourceRefs));
  if (targetClassLevel >= classDefinition.subclassSelectionLevel && !subclass) errors.push(issue("required-choice", "subclassId", `A classe exige subclasse a partir do nível ${classDefinition.subclassSelectionLevel}.`, classDefinition.sourceRefs));
  const gathered = choicesFor(pack, classDefinition, targetClassLevel, subclass);
  errors.push(...gathered.issues);
  errors.push(...validateHitPointGain(input.hitPointGain, classDefinition, targetClassLevel));
  const choices = character.choices;
  for (const choice of gathered.choices) errors.push(...validChoiceSelection(pack, choice, input.choices.find((selection) => selection.choiceId === choice.id)));
  const knownChoiceIds = new Set(gathered.choices.map((choice) => choice.id));
  const submittedChoiceIds = new Set<string>();
  for (const selection of input.choices) {
    if (submittedChoiceIds.has(selection.choiceId)) errors.push(issue("duplicate-choice", `choices.${selection.choiceId}`, `A escolha "${selection.choiceId}" foi enviada mais de uma vez.`));
    submittedChoiceIds.add(selection.choiceId);
    for (const selectedRef of selection.selectedIds) if (selectedRef.rulesetId !== pack.manifest.id) errors.push(issue("unresolved-source", `choices.${selection.choiceId}`, `A opção "${String(selectedRef.entityId)}" aponta para outro ruleset.`));
  }
  for (const selection of input.choices) if (!knownChoiceIds.has(selection.choiceId)) errors.push(issue("invalid-choice", `choices.${selection.choiceId}`, `Escolha "${selection.choiceId}" não é concedida no nível ${targetClassLevel}.`));
  const resources: ProgressionResourcePreview[] = [];
  const progression = classDefinition.progression[targetClassLevel - 1];
  for (const change of progression?.resourceChanges ?? []) {
    const definition = pack.resources.get(change.resourceRef.entityId);
    if (!definition) errors.push(issue("unresolved-source", `resources.${String(change.resourceRef.entityId)}`, `Recurso "${String(change.resourceRef.entityId)}" não está publicado.`, classDefinition.sourceRefs));
    resources.push({ definitionRef: change.resourceRef, ...(definition ? { definition } : {}), capacityRule: change.capacityRule, preservedSpent: character.resources.find((resource) => sameResourceRef(resource.definitionRef, change.resourceRef))?.spent ?? 0 });
  }
  if (subclass) for (const change of subclass.resourceChanges.filter((entry) => entry.resourceRef)) {
    const definition = pack.resources.get(change.resourceRef.entityId);
    if (!definition) errors.push(issue("unresolved-source", `resources.${String(change.resourceRef.entityId)}`, `Recurso "${String(change.resourceRef.entityId)}" não está publicado.`, subclass.sourceRefs));
    resources.push({ definitionRef: change.resourceRef, ...(definition ? { definition } : {}), capacityRule: change.capacityRule, preservedSpent: character.resources.find((resource) => sameResourceRef(resource.definitionRef, change.resourceRef))?.spent ?? 0 });
  }
  const xpRequired = pack.progression.table[currentTotal]?.xpThreshold ?? Number.POSITIVE_INFINITY;
  return ok({ classId: input.classId, targetClassLevel, totalLevel: currentTotal + 1, proficiencyBonus: pack.progression.table[currentTotal]?.proficiencyBonus ?? 0, xpRequired, hitPointGain: input.hitPointGain, featureRefs: gathered.featureRefs, resources, choices: gathered.choices, pending: errors, valid: errors.length === 0 });
}

function fallbackId(character: Character, purpose: string, index: number): ReturnType<typeof asUuid> {
  let hash = 0;
  for (const value of `${character.id}:${purpose}:${index}`) hash = (hash * 31 + value.charCodeAt(0)) >>> 0;
  return asUuid(`00000000-0000-4000-8000-${hash.toString(16).padStart(12, "0")}`);
}

export function applyLevelUp(character: Character, input: LevelUpRequest, catalogInput: ProgressionCatalogInput, options: ProgressionApplyOptions = {}): ProgressionResult<Character> {
  const preview = buildLevelUpPreview(character, input, catalogInput);
  if (!preview.ok) return preview;
  if (character.progressionHistory.some((entry) => entry.classId === input.classId && entry.level === preview.value.targetClassLevel)) return err([issue("already-applied", "progressionHistory", `O nível ${preview.value.targetClassLevel} de ${String(input.classId)} já está registrado.`)]);
  if (!preview.value.valid) return err(preview.value.pending);
  const classEntry = character.classes.find((entry) => entry.classId === input.classId);
  const nextClass: ClassLevel = classEntry
    ? { ...classEntry, level: preview.value.targetClassLevel, ...(input.subclassId ? { subclassId: input.subclassId } : {}) }
    : { classId: input.classId, level: 1, ...(input.subclassId ? { subclassId: input.subclassId } : {}), choices: [] };
  const classes = classEntry ? character.classes.map((entry) => entry.classId === input.classId ? nextClass : entry) : [...character.classes, nextClass];
  const progressEntry = { id: options.idGenerator?.("progression", character.progressionHistory.length) ?? fallbackId(character, `progression:${input.classId}:${preview.value.targetClassLevel}`, character.progressionHistory.length), classId: input.classId, level: preview.value.targetClassLevel, hitPointGain: input.hitPointGain, choices: input.choices, recordedAt: options.now ?? character.updatedAt };
  const resources = [...character.resources];
  for (const resource of preview.value.resources) {
    const existing = resources.findIndex((entry) => sameResourceRef(entry.definitionRef, resource.definitionRef));
    if (existing >= 0) continue;
    resources.push({ id: options.idGenerator?.("resource", resources.length) ?? fallbackId(character, `resource:${resource.definitionRef.entityId}`, resources.length), definitionRef: resource.definitionRef, ownerInstanceId: character.id, spent: 0 });
  }
  return ok({ ...character, classes, choices: [...character.choices, ...input.choices], progressionHistory: [...character.progressionHistory, progressEntry], resources, updatedAt: options.now ?? character.updatedAt });
}

export const previewLevelUp = buildLevelUpPreview;
export const calculateProgression = getProgressionStatus;
export const previewLevelAdvancement = buildLevelUpPreview;
export const applyLevelAdvancement = applyLevelUp;
export const addExperience = grantExperience;
