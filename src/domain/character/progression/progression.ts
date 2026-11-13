import type { Character, ClassLevel, ProgressionHitPointGain } from "@domain/contracts/character";
import { asEntityId, asUuid, isUuid, type EntityId } from "@domain/contracts/ids";
import type { ChoiceDefinition, ChoiceSelection, Prerequisite } from "@domain/contracts/primitives";
import type { ClassDefinition, SubclassDefinition } from "@domain/contracts/definitions/class";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import { err, ok } from "@domain/contracts/errors";
import { generatedChoices } from "@domain/character/evolution/choices";
import { validateEvolutionChoices } from "@domain/character/evolution/validate";
import { asProgressionCatalog, type LevelUpPreview, type LevelUpRequest, type ProgressionApplyOptions, type ProgressionCatalogInput, type ProgressionIssue, type ProgressionResourcePreview, type ProgressionResult, type ProgressionStatus } from "./model";
import { composeCharacterRuleContent } from "@domain/character/creation/optional-rules";

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

function choicesFor(character: Character, pack: RulePack, classDefinition: ClassDefinition, targetLevel: number, subclass: SubclassDefinition | undefined, submittedChoices: readonly ChoiceSelection[] = []): { readonly choices: readonly ChoiceDefinition[]; readonly featureRefs: readonly import("@domain/contracts/ids").DefinitionRef[]; readonly issues: readonly ProgressionIssue[] } {
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
  // A supplemental style can conditionally grant a feature with its own choices
  // (for example, Druidic Warrior's two druid cantrips). Resolve those only for
  // a feature selected in this level-up request.
  const knownChoiceIds = new Set(choices.map((entry) => entry.id));
  for (const selection of submittedChoices) {
    for (const selectedRef of selection.selectedIds) {
      const feature = pack.features.get(selectedRef.entityId);
      for (const choice of feature?.choices ?? []) {
        if (knownChoiceIds.has(choice.id)) continue;
        knownChoiceIds.add(choice.id);
        choices.push(choice);
      }
    }
  }
  if (subclass) choices.push(...subclass.choices);
  // Guerreiro Druídico permite trocar um único truque ao ganhar nível de Guardião.
  // A escolha mantém exatamente um truque já conhecido e seleciona um novo da lista druídica.
  const druidicWarrior = pack.features.get(asEntityId("ranger.druidic-warrior"));
  const hasDruidicWarrior = character.choices.some((selection) =>
    selection.choiceId === "ranger.fighting-style.2" && selection.selectedIds.some((ref) => ref.entityId === druidicWarrior?.id),
  );
  if (classDefinition.id === "ranger" && targetLevel > 2 && hasDruidicWarrior) {
    const baseChoice = druidicWarrior?.choices.find((choice) => choice.id === "ranger.cantrips.2");
    if (baseChoice) choices.push({ ...baseChoice, id: `ranger.druidic-warrior-cantrip-swap.${targetLevel}`, count: { min: 2, max: 2 } });
  }
  // Escolhas de magia e de troca saem das tabelas do livro; as do 1º nível já vêm do pack.
  const published = new Set(choices.map((entry) => entry.id));
  choices.push(...generatedChoices(character, pack, String(classDefinition.id), targetLevel, subclass ? String(subclass.id) : undefined).filter((entry) => !published.has(entry.id)));
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

const ABILITY_LABEL: Readonly<Record<string, string>> = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };

/** Só avalia requisitos de atributo; os demais tipos não bloqueiam a multiclasse aqui. */
function abilityPrerequisiteMet(prerequisite: Prerequisite, scores: Character["abilityGeneration"]["baseScores"]): boolean {
  if (prerequisite.kind === "min-ability-score") return scores[prerequisite.ability] >= prerequisite.score;
  if (prerequisite.kind === "any-of") return prerequisite.options.some((option) => abilityPrerequisiteMet(option, scores));
  return true;
}

function describePrerequisite(prerequisite: Prerequisite): string {
  if (prerequisite.kind === "min-ability-score") return `${ABILITY_LABEL[prerequisite.ability] ?? prerequisite.ability} ${prerequisite.score}`;
  if (prerequisite.kind === "any-of") return prerequisite.options.map(describePrerequisite).join(" ou ");
  return "";
}

function validateMulticlass(character: Character, classDefinition: ClassDefinition, isNewClass: boolean): ProgressionIssue[] {
  if (!isNewClass) return [];
  const errors: ProgressionIssue[] = [];
  const scores = character.abilityGeneration.baseScores;
  for (const prerequisite of classDefinition.multiclassPrerequisites) {
    if (abilityPrerequisiteMet(prerequisite, scores)) continue;
    const options = prerequisite.kind === "any-of" ? prerequisite.options : [prerequisite];
    const owned = options.flatMap((option) => (option.kind === "min-ability-score" ? [`${ABILITY_LABEL[option.ability] ?? option.ability} ${scores[option.ability]}`] : []));
    errors.push(issue("multiclass-prerequisite", `classes.${String(classDefinition.id)}`, `Multiclasse exige ${describePrerequisite(prerequisite)}; personagem possui ${owned.join(" e ")}.`, classDefinition.sourceRefs));
  }
  return errors;
}

export function buildLevelUpPreview(character: Character, input: LevelUpRequest, catalogInput: ProgressionCatalogInput): ProgressionResult<LevelUpPreview> {
  const rawPack = asProgressionCatalog(catalogInput).rulePack;
  const composition = composeCharacterRuleContent(rawPack, character);
  if (!composition.ok) return err([issue("unresolved-source", "field" in composition.error ? composition.error.field : "optionalRuleSelections", composition.error.message)]);
  const pack = composition.value;
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
  if (targetClassLevel >= classDefinition.subclassSelectionLevel && !subclass) errors.push({ ...issue("required-choice", "subclassId", `A classe pede subclasse a partir do nível ${classDefinition.subclassSelectionLevel}; você pode escolhê-la depois.`, classDefinition.sourceRefs), blocking: false });
  const gathered = choicesFor(character, pack, classDefinition, targetClassLevel, subclass, input.choices);
  errors.push(...gathered.issues);
  // Talento escolhido no lugar do aumento: o +1 de atributo dos talentos "meio-talento" (Atleta, Observador…) é uma escolha própria.
  const pickedFeats = (input.choices.find((selection) => selection.choiceId === `${String(input.classId)}.feat.${targetClassLevel}`)?.selectedIds ?? []).map((ref) => pack.feats.get(ref.entityId));
  const featChoices = pickedFeats.flatMap((feat) => (feat?.choices ?? []).filter((entry) => entry.kind === "ability-score-increase").map((entry): ChoiceDefinition => ({ ...entry, count: { min: 0, max: entry.count.max } })));
  const allChoices = [...gathered.choices, ...featChoices.filter((entry) => !gathered.choices.some((existing) => existing.id === entry.id))];
  errors.push(...validateHitPointGain(input.hitPointGain, classDefinition, targetClassLevel));
  for (const choice of allChoices) errors.push(...validChoiceSelection(pack, choice, input.choices.find((selection) => selection.choiceId === choice.id)));
  for (const selection of input.choices.filter((entry) => entry.choiceId === `ranger.druidic-warrior-cantrip-swap.${targetClassLevel}`)) {
    const current = character.choices.find((entry) => entry.choiceId === "ranger.cantrips.2")?.selectedIds.map((ref) => ref.entityId) ?? [];
    const selected = selection.selectedIds.map((ref) => ref.entityId);
    if (current.length !== 2 || selected.filter((id) => current.includes(id)).length !== 1 || selected.filter((id) => !current.includes(id)).length !== 1) {
      errors.push(issue("invalid-choice", `choices.${selection.choiceId}`, "A troca de Guerreiro Druídico deve manter um dos dois truques conhecidos e escolher um truque druídico novo.", allChoices.find((choice) => choice.id === selection.choiceId)?.sourceRefs));
    }
  }
  const evolutionChoices = input.choices.filter((selection) => {
    const grantingFeature = selection.grantingRef ? pack.features.get(selection.grantingRef.entityId) : undefined;
    // A allowlist explícita da escolha da característica valida esses truques; a lista da classe
    // Guardião não deve ser usada para rejeitar uma magia concedida pela característica Druídica.
    return !grantingFeature?.spellcastingSource?.spellListClassId;
  });
  errors.push(...validateEvolutionChoices({ character, pack, classId: String(input.classId), targetLevel: targetClassLevel, ...(subclass ? { subclassId: String(subclass.id) } : {}), choices: evolutionChoices, definitions: allChoices, ...(input.abilityScores ? { abilityScores: input.abilityScores } : {}) }));
  const knownChoiceIds = new Set(allChoices.map((choice) => choice.id));
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
  for (const featureRef of gathered.featureRefs) {
    const feature = pack.features.get(featureRef.entityId);
    for (const effect of feature?.effects ?? []) {
      if (effect.kind !== "grants-resource" || resources.some((resource) => sameResourceRef(resource.definitionRef, effect.resourceRef))) continue;
      const definition = pack.resources.get(effect.resourceRef.entityId);
      if (!definition) {
        errors.push(issue("unresolved-source", `resources.${String(effect.resourceRef.entityId)}`, `Recurso "${String(effect.resourceRef.entityId)}" da característica não está publicado.`, feature?.sourceRefs));
        continue;
      }
      resources.push({ definitionRef: effect.resourceRef, definition, capacityRule: definition.capacityRule, preservedSpent: character.resources.find((resource) => sameResourceRef(resource.definitionRef, effect.resourceRef))?.spent ?? 0 });
    }
  }
  const xpRequired = pack.progression.table[currentTotal]?.xpThreshold ?? Number.POSITIVE_INFINITY;
  return ok({ classId: input.classId, targetClassLevel, totalLevel: currentTotal + 1, proficiencyBonus: pack.progression.table[currentTotal]?.proficiencyBonus ?? 0, xpRequired, hitPointGain: input.hitPointGain, featureRefs: gathered.featureRefs, resources, choices: allChoices, pending: errors, valid: errors.every((entry) => !entry.blocking) });
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
  const cantripSwap = input.choices.find((selection) => selection.choiceId === `ranger.druidic-warrior-cantrip-swap.${preview.value.targetClassLevel}`);
  const appliedChoices = input.choices
    .filter((selection) => !selection.choiceId.startsWith("ranger.druidic-warrior-cantrip-swap."))
    .map((selection) => selection);
  const nextChoices = [...character.choices, ...appliedChoices];
  if (cantripSwap) {
    const currentIndex = nextChoices.findIndex((selection) => selection.choiceId === "ranger.cantrips.2");
    if (currentIndex >= 0) nextChoices[currentIndex] = { ...nextChoices[currentIndex], selectedIds: cantripSwap.selectedIds };
    else nextChoices.push({ ...cantripSwap, choiceId: "ranger.cantrips.2", grantedAtLevel: 2, grantingRef: { rulesetId: cantripSwap.grantingRef!.rulesetId, entityId: asEntityId("ranger.druidic-warrior") } });
  }
  return ok({ ...character, classes, choices: nextChoices, progressionHistory: [...character.progressionHistory, progressEntry], resources, updatedAt: options.now ?? character.updatedAt });
}

export const previewLevelUp = buildLevelUpPreview;
export const calculateProgression = getProgressionStatus;
export const previewLevelAdvancement = buildLevelUpPreview;
export const applyLevelAdvancement = applyLevelUp;
export const addExperience = grantExperience;
