import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type DefinitionRef, type EntityId } from "@domain/contracts/ids";
import type { Character, OptionalRuleSelection } from "@domain/contracts/character";
import type { ClassDefinition, ClassLevelProgressionEntry } from "@domain/contracts/definitions/class";
import type { OptionalRuleContentPack, RulePack } from "@domain/contracts/definitions/rulepack";
import type { FeatureDefinition } from "@domain/contracts/definitions/feature";

const refId = (ref: DefinitionRef): EntityId => ref.entityId;
const sameIds = (left: readonly EntityId[], right: readonly DefinitionRef[]): boolean =>
  left.length === right.length && left.every((id) => right.some((ref) => ref.entityId === id));
const compositionOrigins = new WeakMap<RulePack, RulePack>();

function duplicateIn<T>(items: readonly T[], idOf: (item: T) => string): string | undefined {
  const seen = new Set<string>();
  for (const item of items) {
    const id = idOf(item);
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return undefined;
}

function addFeatureAtEligibleLevel(
  progression: readonly ClassLevelProgressionEntry[],
  feature: FeatureDefinition,
  classId: EntityId,
  fallbackLevel: number,
  rulesetId: RulePack["manifest"]["id"],
  resources: ReadonlyMap<EntityId, RulePack["resources"] extends ReadonlyMap<EntityId, infer R> ? R : never>,
): ClassLevelProgressionEntry[] {
  const minClass = feature.eligibility.find((item) => item.kind === "min-class-level" && item.classRef.entityId === classId);
  const level = minClass?.kind === "min-class-level" ? minClass.level : fallbackLevel;
  return progression.map((entry) => {
    if (entry.level !== level) return entry;
    const featureRefs = entry.featureRefs.some((ref) => ref.entityId === feature.id)
      ? entry.featureRefs
      : [...entry.featureRefs, { rulesetId, entityId: feature.id }];
    const resourceChanges = [...entry.resourceChanges];
    for (const effect of feature.effects) {
      if (effect.kind !== "grants-resource" || resourceChanges.some((change) => change.resourceRef.entityId === effect.resourceRef.entityId)) continue;
      const definition = resources.get(effect.resourceRef.entityId);
      if (definition) resourceChanges.push({ resourceRef: effect.resourceRef, capacityRule: definition.capacityRule });
    }
    return { ...entry, featureRefs, resourceChanges };
  });
}

function updateClassForSelection(
  classDefinition: ClassDefinition,
  pack: OptionalRuleContentPack,
  selection: OptionalRuleSelection,
  basePack: RulePack,
  resources: ReadonlyMap<EntityId, RulePack["resources"] extends ReadonlyMap<EntityId, infer R> ? R : never>,
): ClassDefinition | undefined {
  const replacement = pack.classFeatureReplacements?.find((item) => item.id === selection.optionId);
  const option = pack.classOptions?.find((item) => item.id === selection.optionId);
  if (!replacement && !option) return undefined;
  let progression: ClassDefinition["progression"] = classDefinition.progression.map((entry) => ({ ...entry, featureRefs: [...entry.featureRefs] }));
  if (replacement && !replacement.subclassId && selection.selectedFeatureRefs.length > 0) {
    const replacedIds = replacement.replacesFeatureIds ?? [replacement.replacesFeatureId];
    const replacedChoiceIds = replacement.replacesChoiceIds ?? [];
    progression = progression.map((entry) => ({
      ...entry,
      featureRefs: entry.featureRefs.filter((ref) => !replacedIds.includes(ref.entityId)),
      choicesGranted: entry.choicesGranted.filter((choice) => !replacedChoiceIds.includes(choice.id)),
    }));
  }
  const fallbackLevel = replacement?.choiceLevel ?? option?.choiceLevel ?? 1;
  if (replacement?.subclassId) return { ...classDefinition, progression };
  if (option?.choiceId) {
    if (option.kind !== "choice") return undefined;
    let found = false;
    progression = progression.map((entry) => {
      if (entry.level !== option.choiceLevel) return entry;
      const choicesGranted = entry.choicesGranted.map((choice) => {
        if (choice.id !== option.choiceId || choice.optionSet.kind !== "explicit") return choice;
        found = true;
        const known = new Set(choice.optionSet.options.map((ref) => ref.entityId));
        return {
          ...choice,
          optionSet: {
            kind: "explicit" as const,
            options: [...choice.optionSet.options, ...option.featureRefs
              .filter((id) => !known.has(id))
              .map((entityId) => ({ rulesetId: basePack.manifest.id, entityId }))],
          },
        };
      });
      return { ...entry, choicesGranted };
    });
    return found ? { ...classDefinition, progression } : undefined;
  }
  for (const ref of selection.selectedFeatureRefs) {
    const feature = pack.features?.find((item) => item.id === ref.entityId) ?? basePack.features.get(ref.entityId);
    if (feature) progression = addFeatureAtEligibleLevel(progression, feature, classDefinition.id, fallbackLevel, basePack.manifest.id, resources);
  }
  return { ...classDefinition, progression };
}

function checkSelection(
  selection: OptionalRuleSelection,
  basePack: RulePack,
  selectedIds: ReadonlySet<EntityId>,
  available: ReadonlyMap<EntityId, OptionalRuleContentPack>,
): AppError | undefined {
  const rulesetId = basePack.manifest.id;
  if (!selectedIds.has(selection.supplementId)) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" pertence a um suplemento não selecionado.`);
  }
  const pack = available.get(selection.supplementId);
  if (!pack) return appError.validation("selectedSupplementIds", `Suplemento "${selection.supplementId}" não está disponível.`);
  const replacement = pack.classFeatureReplacements?.find((item) => item.id === selection.optionId);
  const option = pack.classOptions?.find((item) => item.id === selection.optionId);
  if (!replacement && !option) return appError.validation("optionalRuleSelections", `Opção "${selection.optionId}" não existe em "${pack.name}".`);
  const featureIds = selection.selectedFeatureRefs.map((ref) => ref.entityId);
  const spellIds = (selection.selectedSpellRefs ?? []).map((ref) => ref.entityId);
  if (selection.selectedFeatureRefs.some((ref) => ref.rulesetId !== rulesetId) || (selection.selectedSpellRefs ?? []).some((ref) => ref.rulesetId !== rulesetId)) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" contém referências de outro ruleset.`);
  }
  if (new Set(featureIds).size !== featureIds.length || new Set(spellIds).size !== spellIds.length) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" contém referências repetidas.`);
  }
  const allowedFeatures = replacement?.replacementFeatureIds ?? option?.featureRefs ?? [];
  if (featureIds.some((id) => !allowedFeatures.includes(id))) {
    return appError.validation("optionalRuleSelections", `A seleção de características de "${selection.optionId}" contém uma referência não permitida.`);
  }
  const allowedSpells = option?.spellRefs ?? [];
  if (spellIds.some((id) => !allowedSpells.includes(id))) {
    return appError.validation("optionalRuleSelections", `A seleção de magias de "${selection.optionId}" contém uma referência não permitida.`);
  }
  for (const id of featureIds) if (!pack.features?.some((feature) => feature.id === id) && !basePack.features.has(id)) {
    return appError.validation("optionalRuleSelections", `Característica "${id}" da opção "${selection.optionId}" não foi publicada.`);
  }
  for (const id of spellIds) if (!pack.spells?.some((spell) => spell.id === id) && !basePack.spells.has(id)) {
    return appError.validation("optionalRuleSelections", `Magia "${id}" da opção "${selection.optionId}" não foi publicada.`);
  }
  if (replacement && featureIds.length > 0 && !sameIds(replacement.replacementFeatureIds, selection.selectedFeatureRefs)) {
    return appError.validation("optionalRuleSelections", `A substituição "${selection.optionId}" exige o conjunto completo de características e melhorias.`);
  }
  if (option?.kind === "extend" && featureIds.length > 0 && !sameIds(option.featureRefs, selection.selectedFeatureRefs)) {
    return appError.validation("optionalRuleSelections", `A extensão "${selection.optionId}" exige o conjunto completo de características.`);
  }
  if (option?.kind === "choice" && featureIds.length > 0 && featureIds.length !== 1) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" permite escolher uma característica.`);
  }
  if (option?.choiceId && (option.kind !== "choice" || featureIds.length > 0 || spellIds.length > 0)) {
    return appError.validation("optionalRuleSelections", `A extensão de escolha "${selection.optionId}" não concede característica ou magia no personagem.`);
  }
  if (option?.spellRefs?.length && !sameIds(option.spellRefs, selection.selectedSpellRefs ?? [])) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" exige o conjunto completo de magias declarado.`);
  }
  if (!option?.spellRefs?.length && spellIds.length > 0) {
    return appError.validation("optionalRuleSelections", `A opção "${selection.optionId}" não declara magias selecionáveis.`);
  }
  return undefined;
}

/**
 * Compõe somente os suplementos selecionados em mapas novos. O catálogo disponível continua
 * associado ao pack, mas conteúdo opcional não vaza para personagens sem opt-in persistido.
 */
export function composeOptionalRuleContent(
  baseRulePack: RulePack,
  selectedSupplementIds: readonly EntityId[],
  selections: readonly OptionalRuleSelection[],
): Result<RulePack, AppError> {
  const originalPack = compositionOrigins.get(baseRulePack);
  if (originalPack) return composeOptionalRuleContent(originalPack, selectedSupplementIds, selections);
  const available = baseRulePack.optionalRulePacks ?? new Map<EntityId, OptionalRuleContentPack>();
  const duplicateSupplement = duplicateIn(selectedSupplementIds, String);
  if (duplicateSupplement) return err(appError.validation("selectedSupplementIds", `Suplemento "${duplicateSupplement}" foi selecionado mais de uma vez.`));
  const selected = new Set(selectedSupplementIds);
  for (const id of selectedSupplementIds) if (!available.has(id)) return err(appError.validation("selectedSupplementIds", `Suplemento "${id}" não está disponível neste pack.`));
  const duplicateOption = duplicateIn(selections, (item) => `${item.supplementId}:${item.optionId}`);
  if (duplicateOption) return err(appError.validation("optionalRuleSelections", `Opção "${duplicateOption}" foi registrada mais de uma vez.`));
  for (const selection of selections) {
    const error = checkSelection(selection, baseRulePack, selected, available);
    if (error) return err(error);
  }

  const packs = selectedSupplementIds.map((id) => available.get(id)!);
  const classes = new Map(baseRulePack.classes);
  const subclasses = new Map(baseRulePack.subclasses);
  const races = new Map(baseRulePack.races);
  const subraces = new Map(baseRulePack.subraces);
  const features = new Map(baseRulePack.features);
  const spells = new Map(baseRulePack.spells);
  const resources = new Map(baseRulePack.resources);
  const creatures = new Map(baseRulePack.creatures ?? []);
  const add = <T extends { readonly id: EntityId }>(target: Map<EntityId, T>, items: readonly T[] | undefined, label: string): Result<true, AppError> => {
    for (const item of items ?? []) {
      if (target.has(item.id)) {
        if (target.get(item.id) === item) continue;
        return err(appError.validation("optionalRulePacks", `ID duplicado "${item.id}" em ${label}.`));
      }
      target.set(item.id, item);
    }
    return ok(true);
  };
  for (const pack of packs) {
    for (const [target, items, label] of [
      [races, pack.races, "raças"], [subraces, pack.subraces, "sub-raças"], [features, pack.features, "características"],
      [subclasses, pack.subclasses, "subclasses"], [spells, pack.spells, "magias"], [resources, pack.resources, "recursos"], [creatures, pack.creatures, "criaturas"],
    ] as const) {
      const result = add(target as Map<EntityId, { readonly id: EntityId }>, items as readonly { readonly id: EntityId }[] | undefined, label);
      if (!result.ok) return result;
    }
    for (const subclass of pack.subclasses ?? []) {
      const parent = classes.get(subclass.classId);
      if (!parent) return err(appError.validation("optionalRulePacks", `Classe "${subclass.classId}" da subclasse "${subclass.id}" não existe.`));
      classes.set(parent.id, { ...parent, subclassIds: parent.subclassIds.includes(subclass.id) ? parent.subclassIds : [...parent.subclassIds, subclass.id] });
    }
  }

  // Opções automáticas valem sempre que o suplemento está ligado, mesmo sem seleção gravada.
  const automaticSelections: OptionalRuleSelection[] = packs.flatMap((pack) => (pack.classOptions ?? [])
    .filter((option) => option.automatic && !selections.some((selection) => selection.supplementId === pack.id && selection.optionId === option.id))
    .map((option) => ({
      supplementId: pack.id,
      optionId: option.id,
      selectedFeatureRefs: option.featureRefs.map((entityId) => ({ rulesetId: baseRulePack.manifest.id, entityId })),
      ...(option.spellRefs?.length ? { selectedSpellRefs: option.spellRefs.map((entityId) => ({ rulesetId: baseRulePack.manifest.id, entityId })) } : {}),
    })));
  for (const selection of [...selections, ...automaticSelections]) {
    const pack = available.get(selection.supplementId)!;
    const option = pack.classFeatureReplacements?.find((item) => item.id === selection.optionId)
      ?? pack.classOptions?.find((item) => item.id === selection.optionId);
    if (!option) continue;
    const current = classes.get(option.classId);
    if (!current) return err(appError.validation("optionalRuleSelections", `Classe "${option.classId}" da opção "${selection.optionId}" não existe.`));
    const next = updateClassForSelection(current, pack, selection, baseRulePack, resources);
    if ("choiceId" in option && option.choiceId && !next) {
      return err(appError.validation("optionalRuleSelections", `Escolha "${option.choiceId}" da extensão "${selection.optionId}" não existe no nível ${option.choiceLevel}.`));
    }
    if (next) classes.set(current.id, next);
    const replacement = pack.classFeatureReplacements?.find((item) => item.id === selection.optionId);
    if (replacement?.subclassId && selection.selectedFeatureRefs.length > 0) {
      const subclass = subclasses.get(replacement.subclassId);
      if (!subclass || subclass.classId !== replacement.classId) {
        return err(appError.validation("optionalRuleSelections", `Subclasse "${replacement.subclassId}" da substituição "${selection.optionId}" não existe ou pertence a outra classe.`));
      }
      const replacedIds = replacement.replacesFeatureIds ?? [replacement.replacesFeatureId];
      const featureGrants = subclass.featureGrants.filter((grant) => !replacedIds.includes(grant.featureRef.entityId));
      const replacementFeatureIds = new Set(selection.selectedFeatureRefs.map(refId));
      for (const featureId of replacementFeatureIds) {
        if (!pack.features?.some((feature) => feature.id === featureId) && !baseRulePack.features.has(featureId)) {
          return err(appError.validation("optionalRuleSelections", `Característica "${featureId}" da opção "${selection.optionId}" não foi publicada.`));
        }
        if (!featureGrants.some((grant) => grant.featureRef.entityId === featureId)) {
          featureGrants.push({ level: replacement.choiceLevel, featureRef: { rulesetId: baseRulePack.manifest.id, entityId: featureId } });
        }
      }
      subclasses.set(subclass.id, { ...subclass, featureGrants: featureGrants.sort((left, right) => left.level - right.level) });
    }
    const optionSpellIds = (selection.selectedSpellRefs ?? []).map(refId);
    for (const spellId of optionSpellIds) {
      const spell = spells.get(spellId);
      if (spell && !spell.classes.includes(option.classId)) spells.set(spell.id, { ...spell, classes: [...spell.classes, option.classId] });
    }
  }

  const composed: RulePack = { ...baseRulePack, races, subraces, classes, subclasses, features, spells, resources, creatures, optionalRulePacks: available };
  compositionOrigins.set(composed, baseRulePack);
  return ok(composed);
}

/** Recompõe o catálogo do personagem após reload usando apenas estado persistido. */
export function composeCharacterRuleContent(baseRulePack: RulePack, character: Pick<Character, "selectedSupplementIds" | "optionalRuleSelections">): Result<RulePack, AppError> {
  return composeOptionalRuleContent(baseRulePack, character.selectedSupplementIds ?? [], character.optionalRuleSelections ?? []);
}

/** Opção de suplemento que pode ser ligada ao subir de nível (Tasha p. 51: ao atender o requisito de nível). */
export interface LevelUpOptionalRuleOption {
  readonly supplementId: EntityId;
  readonly optionId: EntityId;
  /** Nome da seção do livro (ex.: "Consciência Primordial"). */
  readonly title: string;
  readonly choiceLevel: number;
  /** Características do livro base que deixam de valer. */
  readonly replacesFeatureIds: readonly EntityId[];
  /** Características que a opção concede (vazio quando só amplia uma escolha ou lista). */
  readonly featureIds: readonly EntityId[];
  /** Escolha da classe ampliada pela opção (ex.: estilos de luta do 2º nível). */
  readonly extendsChoiceId?: string;
  readonly extendsChoiceFeatureIds: readonly EntityId[];
  readonly subclassId?: EntityId;
  /** Seleção a gravar na ficha quando o jogador liga a opção. */
  readonly selection: OptionalRuleSelection;
}

/**
 * Opções dos suplementos ligados na ficha que o jogador pode ligar ao chegar a `targetLevel` em `classId`.
 * - Regra da mesa (2026-11-16): cada opção só é oferecida no nível exato dela; quem não pegou, não pega depois.
 * - Opções automáticas ficam de fora (valem sozinhas); as já escolhidas não se trocam.
 * - Opções de 1º nível só entram quando a classe começa agora (multiclasse); na criação elas ficam na própria criação.
 * - Opções de subclasse dependem da subclasse projetada (pode estar sendo escolhida neste mesmo nível).
 */
export function optionalRuleOptionsForLevel(
  pack: RulePack,
  character: Pick<Character, "selectedSupplementIds" | "optionalRuleSelections">,
  classId: EntityId,
  targetLevel: number,
  subclassId?: EntityId,
): readonly LevelUpOptionalRuleOption[] {
  const available = pack.optionalRulePacks ?? new Map<EntityId, OptionalRuleContentPack>();
  const taken = character.optionalRuleSelections ?? [];
  const rulesetId = pack.manifest.id;
  const reached = (level: number) => level === targetLevel;
  const result: LevelUpOptionalRuleOption[] = [];
  for (const supplementId of character.selectedSupplementIds ?? []) {
    const supplement = available.get(supplementId);
    if (!supplement) continue;
    const isTaken = (optionId: EntityId) => taken.some((selection) => selection.supplementId === supplementId && selection.optionId === optionId);
    for (const replacement of supplement.classFeatureReplacements ?? []) {
      if (replacement.classId !== classId || !reached(replacement.choiceLevel) || isTaken(replacement.id)) continue;
      if (replacement.subclassId && replacement.subclassId !== subclassId) continue;
      result.push({
        supplementId, optionId: replacement.id, title: replacement.sourceRefs[0]?.section ?? "Característica opcional", choiceLevel: replacement.choiceLevel,
        replacesFeatureIds: replacement.replacesFeatureIds ?? [replacement.replacesFeatureId], featureIds: replacement.replacementFeatureIds, extendsChoiceFeatureIds: [],
        ...(replacement.subclassId ? { subclassId: replacement.subclassId } : {}),
        selection: { supplementId, optionId: replacement.id, selectedFeatureRefs: replacement.replacementFeatureIds.map((entityId) => ({ rulesetId, entityId })) },
      });
    }
    for (const option of supplement.classOptions ?? []) {
      if (option.classId !== classId || option.automatic || !reached(option.choiceLevel) || isTaken(option.id)) continue;
      if (!option.choiceId && option.kind === "choice") continue;
      result.push({
        supplementId, optionId: option.id, title: option.sourceRefs[0]?.section ?? "Opção de classe", choiceLevel: option.choiceLevel,
        replacesFeatureIds: [], featureIds: option.choiceId ? [] : option.featureRefs,
        extendsChoiceFeatureIds: option.choiceId ? option.featureRefs : [], ...(option.choiceId ? { extendsChoiceId: option.choiceId } : {}),
        selection: {
          supplementId, optionId: option.id, selectedFeatureRefs: option.choiceId ? [] : option.featureRefs.map((entityId) => ({ rulesetId, entityId })),
          ...(option.spellRefs?.length ? { selectedSpellRefs: option.spellRefs.map((entityId) => ({ rulesetId, entityId })) } : {}),
        },
      });
    }
  }
  return result.sort((left, right) => left.choiceLevel - right.choiceLevel);
}
