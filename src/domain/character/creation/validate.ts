import { type CharacterDraft, type CharacterDraftPartial } from "@domain/contracts/character";
import { type DefinitionRef } from "@domain/contracts/ids";
import { type ChoiceDefinition, type ChoiceSelection, type Ability } from "@domain/contracts/primitives";
import { type ClassDefinition } from "@domain/contracts/definitions/class";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { asCreationCatalog, type CreationCatalogInput, type CreationCatalog, type CreationIssue, type CreationValidationReport, ABILITIES } from "./model";

const standardArray = [8, 10, 12, 13, 14, 15];
const skills = new Set(["athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival", "performance", "deception", "intimidation", "persuasion"]);
const abilityIds = new Set(ABILITIES);

const issue = (code: CreationIssue["code"], field: string, message: string, sourceRefs?: CreationIssue["sourceRefs"]): CreationIssue => ({ code, field, message, ...(sourceRefs?.length ? { sourceRefs } : {}) });
const refKey = (ref: DefinitionRef): string => `${String(ref.rulesetId)}:${String(ref.entityId)}`;
const local = (ref: DefinitionRef, pack: RulePack): boolean => ref.rulesetId === pack.manifest.id;

function selectedFor(choice: ChoiceDefinition, selections: readonly ChoiceSelection[]): ChoiceSelection | undefined {
  return selections.find((selection) => selection.choiceId === choice.id);
}

function validateChoice(choice: ChoiceDefinition, selection: ChoiceSelection | undefined, pack: RulePack, bundles: CreationCatalog["equipmentBundles"], field: string): CreationIssue[] {
  if (!selection) return [issue("required-choice", field, `Escolha obrigatória "${choice.id}" não foi resolvida.`, choice.sourceRefs)];
  const issues: CreationIssue[] = [];
  if (selection.selectedIds.length < choice.count.min || selection.selectedIds.length > choice.count.max) {
    issues.push(issue("invalid-choice", field, `Escolha "${choice.id}" exige entre ${choice.count.min} e ${choice.count.max} opções; recebeu ${selection.selectedIds.length}.`, choice.sourceRefs));
  }
  const seen = new Set<string>();
  for (const selected of selection.selectedIds) {
    if (!local(selected, pack)) { issues.push(issue("invalid-reference", field, `A opção "${selected.entityId}" aponta para outro ruleset.`)); continue; }
    const key = String(selected.entityId);
    if (seen.has(key)) issues.push(issue("duplicate-choice", field, `A opção "${key}" foi escolhida mais de uma vez.`));
    seen.add(key);
    if (choice.optionSet.kind === "explicit" && !choice.optionSet.options.some((option) => refKey(option) === refKey(selected))) {
      issues.push(issue("invalid-choice", field, `A opção "${key}" não pertence à escolha "${choice.id}".`, choice.sourceRefs));
      continue;
    }
    if (choice.optionSet.kind !== "selector") continue;
    const selector = choice.optionSet.selector;
    if (selector.kind === "any-skill" && !skills.has(key)) issues.push(issue("invalid-choice", field, `"${key}" não é uma perícia válida.`));
    if (selector.kind === "any-entity-of-type" && selector.entityType === "equipment" && !pack.equipment.has(selected.entityId) && !(bundles ?? []).some((bundle) => bundle.id === selected.entityId)) {
      issues.push(issue("unresolved-source", field, `Equipamento/pacote "${key}" não está publicado no catálogo disponível.`));
    }
    if (selector.kind === "any-entity-of-type" && selector.entityType === "spell") {
      const spell = pack.spells.get(selected.entityId);
      if (!spell) issues.push(issue("unresolved-source", field, `Magia "${key}" não está coberta pelo catálogo parcial atual.`));
      else if (selector.filterTag && !spell.tags.includes(selector.filterTag)) issues.push(issue("invalid-choice", field, `Magia "${key}" não satisfaz o filtro "${selector.filterTag}".`));
    }
    if ((selector.kind === "any-language" || selector.kind === "any-tool-proficiency") && key.length === 0) issues.push(issue("invalid-choice", field, "A opção não pode ser vazia."));
  }
  return issues;
}

function abilityIssues(generation: CharacterDraftPartial["abilityGeneration"]): CreationIssue[] {
  if (!generation) return [issue("required-choice", "abilityGeneration", "Método e valores de atributos são obrigatórios.")];
  const values = ABILITIES.map((ability) => generation.baseScores[ability]);
  if (values.some((value) => !Number.isInteger(value))) return [issue("invalid-ability-scores", "abilityGeneration.baseScores", "Todos os atributos devem ser inteiros.")];
  if (generation.method === "standard-array" && [...values].sort((a, b) => a - b).join(",") !== standardArray.join(",")) return [issue("invalid-ability-scores", "abilityGeneration.baseScores", "A matriz padrão deve conter exatamente 15, 14, 13, 12, 10 e 8.")];
  if (generation.method === "rolled") {
    if ((generation.rollIds?.length ?? 0) !== 6) return [issue("invalid-ability-scores", "abilityGeneration.rollIds", "A rolagem de atributos deve referenciar seis resultados.")];
    if (values.some((value) => value < 3 || value > 18)) return [issue("invalid-ability-scores", "abilityGeneration.baseScores", "Resultados de 4d6 descartando o menor devem estar entre 3 e 18.")];
  }
  if (generation.method === "point-buy") {
    if (values.some((value) => value < 8 || value > 15)) return [issue("invalid-ability-scores", "abilityGeneration.baseScores", "Compra de pontos aceita valores entre 8 e 15 antes dos bônus raciais.")];
    const cost = values.reduce((sum, value) => sum + ([0, 1, 2, 3, 4, 5, 7, 9][value - 8] ?? Number.NaN), 0);
    if (cost !== 27) return [issue("invalid-ability-scores", "abilityGeneration.pointBuyAllocation", `Compra de pontos inválida: custo ${cost}; esperado 27.`)];
  }
  if (generation.method === "manual" && values.some((value) => value < 1 || value > 30)) return [issue("invalid-ability-scores", "abilityGeneration.baseScores", "Atributos manuais devem estar entre 1 e 30.")];
  return [];
}

export function validateCharacterCreation(input: CreationCatalogInput, draft: CharacterDraft): CreationValidationReport {
  const catalog = asCreationCatalog(input);
  const { rulePack: pack, equipmentBundles } = catalog;
  const partial = draft.partial;
  const issues: CreationIssue[] = [];
  for (const pending of draft.pendingValidations) issues.push(issue("unresolved-source", `${pending.step}.${pending.field}`, pending.message));
  if (draft.schemaVersion !== 1) issues.push(issue("invalid-reference", "schemaVersion", "Schema de draft incompatível."));
  if (draft.rulesetRef.id !== pack.manifest.id || draft.rulesetRef.version !== pack.manifest.version) issues.push(issue("invalid-reference", "rulesetRef", "O draft deve apontar para a versão exata do rule pack."));
  if (!partial.name?.trim()) issues.push(issue("invalid-identity", "name", "Nome é obrigatório para finalizar o personagem."));
  if (!partial.raceRef) issues.push(issue("required-choice", "raceRef", "Raça é obrigatória."));
  if (!partial.backgroundRef) issues.push(issue("required-choice", "backgroundRef", "Antecedente é obrigatório."));
  if (!partial.classes?.length) issues.push(issue("required-choice", "classes", "Uma classe inicial é obrigatória."));
  if (partial.classes && partial.classes.length !== 1) issues.push(issue("invalid-choice", "classes", "Criação inicial aceita exatamente uma classe."));
  issues.push(...abilityIssues(partial.abilityGeneration));

  const race = partial.raceRef && local(partial.raceRef, pack) ? pack.races.get(partial.raceRef.entityId) : undefined;
  if (partial.raceRef && !local(partial.raceRef, pack)) issues.push(issue("invalid-reference", "raceRef", "Raça aponta para outro ruleset."));
  if (partial.raceRef && !race) issues.push(issue("invalid-reference", "raceRef", `Raça "${partial.raceRef.entityId}" não foi encontrada.`));
  if (race) {
    if (race.subraceIds.length && !partial.subraceRef) issues.push(issue("required-choice", "subraceRef", `A raça "${race.id}" exige uma sub-raça.`));
    if (partial.subraceRef) {
      if (!local(partial.subraceRef, pack) || !pack.subraces.has(partial.subraceRef.entityId)) issues.push(issue("invalid-reference", "subraceRef", "Sub-raça não encontrada neste ruleset."));
      else if (pack.subraces.get(partial.subraceRef.entityId)?.raceId !== race.id) issues.push(issue("invalid-choice", "subraceRef", "A sub-raça não pertence à raça escolhida."));
    }
  }
  const classEntry = partial.classes?.[0];
  const classRef = (partial as CharacterDraftPartial & { readonly classRef?: DefinitionRef }).classRef;
  if (classRef && !local(classRef, pack)) issues.push(issue("invalid-reference", "classRef", "Classe aponta para outro ruleset."));
  const classDefinition: ClassDefinition | undefined = classEntry && pack.classes.get(classEntry.classId);
  if (classEntry && !classDefinition) issues.push(issue("invalid-reference", "classes[0].classId", `Classe "${classEntry.classId}" não foi encontrada.`));
  if (classEntry && (classEntry.level !== 1 || classEntry.choices.length)) issues.push(issue("invalid-choice", "classes[0]", "A criação inicial deve começar no nível 1 e guardar escolhas no campo choices do draft."));
  if (classDefinition) {
    if (classDefinition.subclassSelectionLevel <= 1 && !classEntry?.subclassId) issues.push(issue("required-choice", "classes[0].subclassId", `A classe "${classDefinition.id}" exige subclasse no nível 1.`));
    if (classEntry?.subclassId) {
      const subclass = pack.subclasses.get(classEntry.subclassId);
      if (!subclass) issues.push(issue("invalid-reference", "classes[0].subclassId", "Subclasse não encontrada neste ruleset."));
      else if (subclass.classId !== classDefinition.id) issues.push(issue("invalid-choice", "classes[0].subclassId", "A subclasse não pertence à classe escolhida."));
    }
  }
  if (partial.backgroundRef && (!local(partial.backgroundRef, pack) || !pack.backgrounds.has(partial.backgroundRef.entityId))) issues.push(issue("invalid-reference", "backgroundRef", "Antecedente não encontrado neste ruleset."));
  const background = partial.backgroundRef && pack.backgrounds.get(partial.backgroundRef.entityId);
  const variantId = (partial as CharacterDraftPartial & { readonly backgroundVariantId?: string }).backgroundVariantId;
  if (background && variantId && !background.variants.some((variant) => variant.id === variantId)) issues.push(issue("invalid-choice", "backgroundVariantId", "Variante de antecedente não existe."));

  const choices: ChoiceDefinition[] = [];
  if (race) choices.push(...race.choices);
  if (partial.subraceRef) choices.push(...(pack.subraces.get(partial.subraceRef.entityId)?.choices ?? []));
  if (classDefinition) choices.push(classDefinition.skillChoices, ...classDefinition.initialEquipmentChoices, ...(classDefinition.progression[0]?.choicesGranted ?? []));
  if (background) choices.push(...background.toolChoices, ...background.languageChoices);
  if (background) for (const grant of background.equipment) if (!pack.equipment.has(grant.equipmentRef.entityId)) issues.push(issue("unresolved-source", "background.equipment", `Equipamento inicial "${grant.equipmentRef.entityId}" não está publicado no catálogo.`));
  const selections = partial.choices ?? [];
  const selectionIds = new Set<string>();
  for (const selection of selections) {
    if (selectionIds.has(selection.choiceId)) issues.push(issue("duplicate-choice", `choices.${selection.choiceId}`, `A escolha "${selection.choiceId}" foi registrada mais de uma vez.`));
    selectionIds.add(selection.choiceId);
  }
  const knownIds = new Set<string>();
  for (const choice of choices) {
    knownIds.add(choice.id);
    issues.push(...validateChoice(choice, selectedFor(choice, selections), pack, equipmentBundles, `choices.${choice.id}`));
  }
  for (const selection of selections) if (!knownIds.has(selection.choiceId)) issues.push(issue("invalid-choice", `choices.${selection.choiceId}`, `Escolha "${selection.choiceId}" não é concedida por raça, classe, sub-raça ou antecedente.`));

  const proficiencies = new Set<string>();
  const addProficiency = (value: string, field: string) => { if (proficiencies.has(value)) issues.push(issue("duplicate-choice", field, `Proficiência "${value}" foi concedida mais de uma vez.`)); else proficiencies.add(value); };
  if (race) for (const proficiency of race.proficiencies) addProficiency(String(proficiency.entityId), "proficiencies");
  if (partial.subraceRef) for (const trait of pack.subraces.get(partial.subraceRef.entityId)?.traits ?? []) for (const modifier of trait.modifiers) if (modifier.operator === "grant-proficiency") addProficiency(modifier.id, "proficiencies");
  if (classDefinition) for (const proficiency of classDefinition.initialProficiencies) addProficiency(String(proficiency.entityId), "proficiencies");
  if (background) for (const skill of background.skillProficiencies) addProficiency(skill, "proficiencies");
  for (const selection of selections) for (const selected of selection.selectedIds) if (skills.has(String(selected.entityId)) || String(selected.entityId).startsWith("proficiency.")) addProficiency(String(selected.entityId), `choices.${selection.choiceId}`);
  return { valid: issues.length === 0, issues };
}
