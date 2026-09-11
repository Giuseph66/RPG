import { type Character, type ClassLevel, type ManualAdjustment } from "@domain/contracts/character";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type DefinitionRef } from "@domain/contracts/ids";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import {
  type Ability,
  type ChoiceSelection,
  type RuleModifier,
  type RuleModifierPredicate,
  type RuleModifierTarget,
  type RuleModifierValue,
  type RuleModifierOperator,
  type Skill,
  type DamageType,
  type SourceRef,
} from "@domain/contracts/primitives";
import { type RuleContext, type TablePolicy } from "@domain/contracts/rules";

export interface ProgressionEntryLike {
  readonly totalLevel: number;
  readonly proficiencyBonus: number;
}

export const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
export const SKILLS: readonly Skill[] = [
  "athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation",
  "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival",
  "performance", "deception", "intimidation", "persuasion",
];

export const SKILL_ABILITY: Readonly<Record<Skill, Ability>> = {
  athletics: "str", acrobatics: "dex", "sleight-of-hand": "dex", stealth: "dex",
  arcana: "int", history: "int", investigation: "int", nature: "int", religion: "int",
  "animal-handling": "wis", insight: "wis", medicine: "wis", perception: "wis", survival: "wis",
  performance: "cha", deception: "cha", intimidation: "cha", persuasion: "cha",
};

export interface AppliedModifier {
  readonly modifier: RuleModifier;
  readonly scope: string;
}

export interface CollectedRules {
  readonly modifiers: readonly AppliedModifier[];
  readonly proficiencyRefs: readonly DefinitionRef[];
  readonly skillProficiencies: ReadonlySet<Skill>;
  readonly expertise: ReadonlySet<Skill>;
  readonly savingThrowProficiencies: ReadonlySet<Ability>;
  readonly conditionImmunities: readonly DefinitionRef[];
  readonly resistances: readonly DamageType[];
  readonly immunities: readonly DamageType[];
  readonly vulnerabilities: readonly DamageType[];
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonusForLevel(
  totalLevel: number,
  table: readonly ProgressionEntryLike[],
): Result<number, AppError> {
  if (!Number.isInteger(totalLevel) || totalLevel < 1 || totalLevel > 20) {
    return err(appError.validation("totalLevel", `Nível total fora do domínio 1–20: ${totalLevel}.`));
  }
  const entry = table.find((candidate) => candidate.totalLevel === totalLevel);
  if (!entry) return err(appError.unresolvedRule(`Bônus de proficiência ausente para o nível total ${totalLevel}.`));
  if (!Number.isInteger(entry.proficiencyBonus) || entry.proficiencyBonus < 0) {
    return err(appError.validation("progression.proficiencyBonus", `Bônus de proficiência inválido no nível ${totalLevel}.`));
  }
  return ok(entry.proficiencyBonus);
}

export function sameRef(a: DefinitionRef, b: DefinitionRef): boolean {
  return a.rulesetId === b.rulesetId && a.entityId === b.entityId;
}

function isSkill(value: string): value is Skill {
  return (SKILLS as readonly string[]).includes(value);
}

function isAbility(value: string): value is Ability {
  return (ABILITIES as readonly string[]).includes(value);
}

function sourceForAdjustment(adjustment: ManualAdjustment, fallback: SourceRef): SourceRef {
  return adjustment.sourceRef ?? fallback;
}

function choiceSelections(character: Character, classes: readonly ClassLevel[]): readonly ChoiceSelection[] {
  return [...character.choices, ...classes.flatMap((entry) => entry.choices)];
}

function refId(ref: DefinitionRef): string {
  return String(ref.entityId);
}

function ensureLocalRef(ref: DefinitionRef, pack: RulePack, field: string): Result<true, AppError> {
  if (ref.rulesetId !== pack.manifest.id) {
    return err(appError.missingRuleset({ id: ref.rulesetId, version: pack.manifest.version }, `Referência estrangeira em ${field}.`));
  }
  return ok(true);
}

function isSkillProficiencyRef(ref: DefinitionRef): boolean {
  return isSkill(refId(ref));
}

function isSkillExpertiseRef(ref: DefinitionRef): boolean {
  return refId(ref).startsWith("expertise.") || refId(ref).startsWith("expertise-");
}

function appliesTableDecision(predicate: Extract<RuleModifierPredicate, { kind: "table-decision" }>, policies: readonly TablePolicy[]): boolean {
  return policies.some((policy) =>
    (policy.kind === "table-decision" && policy.decision === predicate.description) ||
    (policy.kind === "allow-optional-rule" && policy.ruleId === predicate.sourceRef.section),
  );
}

export function predicateApplies(
  predicate: RuleModifierPredicate,
  character: Character,
  pack: RulePack,
  context: RuleContext,
  totalLevel: number,
  equippedArmorCategories: ReadonlySet<string>,
): boolean {
  switch (predicate.kind) {
    case "always": return true;
    case "while-condition-active":
      return character.conditions.some((instance) => sameRef(instance.definitionRef, predicate.conditionRef));
    case "while-wearing-armor-category": return equippedArmorCategories.has(predicate.armorCategory);
    case "while-not-wearing-armor": return !["light", "medium", "heavy"].some((kind) => equippedArmorCategories.has(kind));
    case "while-wielding-shield": return equippedArmorCategories.has("shield");
    case "while-concentrating": return character.concentration !== undefined;
    case "min-total-level": return totalLevel >= predicate.level;
    case "min-class-level":
      return character.classes.some((entry) => entry.classId === predicate.classRef.entityId && entry.level >= predicate.level);
    case "table-decision": return appliesTableDecision(predicate, context.tablePolicies);
    default: {
      const exhaustive: never = predicate;
      void exhaustive;
      return false;
    }
  }
}

function collectClassFeatures(character: Character, pack: RulePack): Result<FeatureDefinition[], AppError> {
  const features: FeatureDefinition[] = [];
  for (const classLevel of character.classes) {
    const classDefinition = pack.classes.get(classLevel.classId);
    if (!classDefinition) return err(appError.notFound("class", String(classLevel.classId)));
    for (let level = 1; level <= classLevel.level; level += 1) {
      const progression = classDefinition.progression[level - 1];
      if (!progression || progression.level !== level) {
        return err(appError.unresolvedRule(`Progressão da classe "${classLevel.classId}" ausente no nível ${level}.`));
      }
      for (const featureRef of progression.featureRefs) {
        const featureRefCheck = ensureLocalRef(featureRef, pack, "progression.featureRefs");
        if (!featureRefCheck.ok) return featureRefCheck;
        const feature = pack.features.get(featureRef.entityId);
        if (!feature) return err(appError.notFound("feature", refId(featureRef)));
        features.push(feature);
      }
    }
    if (classLevel.subclassId) {
      const subclass = pack.subclasses.get(classLevel.subclassId);
      if (!subclass) return err(appError.notFound("subclass", String(classLevel.subclassId)));
      if (subclass.classId !== classLevel.classId) {
        return err(appError.validation("classes.subclassId", `Subclasse "${classLevel.subclassId}" não pertence à classe "${classLevel.classId}".`));
      }
      for (const grant of subclass.featureGrants) {
        if (grant.level > classLevel.level) continue;
        const featureRefCheck = ensureLocalRef(grant.featureRef, pack, "subclass.featureGrants");
        if (!featureRefCheck.ok) return featureRefCheck;
        const feature = pack.features.get(grant.featureRef.entityId);
        if (!feature) return err(appError.notFound("feature", refId(grant.featureRef)));
        features.push(feature);
      }
    }
  }
  return ok(features);
}

function modifierFromManualAdjustment(adjustment: ManualAdjustment, fallback: SourceRef): Result<RuleModifier, AppError> {
  const value = adjustment.value;
  if (value.kind !== "number") return err(appError.unresolvedRule(`Ajuste manual "${adjustment.id}" usa um valor sem fórmula numérica suportada.`));
  return ok({
    id: `manual.${adjustment.id}`,
    sourceRef: sourceForAdjustment(adjustment, fallback),
    target: adjustment.target,
    operator: "add",
    value,
    predicate: { kind: "always" },
  });
}

function collectChoiceProficiencies(
  selections: readonly ChoiceSelection[],
  skillProficiencies: Set<Skill>,
  expertise: Set<Skill>,
): void {
  for (const selection of selections) {
    for (const selected of selection.selectedIds) {
      const value = refId(selected);
      if (isSkill(value)) {
        if (selection.choiceId.toLowerCase().includes("expertise")) expertise.add(value);
        else skillProficiencies.add(value);
      } else if (isSkillExpertiseRef(selected)) {
        const skill = value.replace(/^expertise[.-]/, "");
        if (isSkill(skill)) expertise.add(skill);
      }
    }
  }
}

function collectAbilityIncreaseChoices(
  selections: readonly ChoiceSelection[],
  abilityIncreases: ReadonlyMap<Ability, number>,
  excluded: ReadonlySet<Ability> = new Set(),
): ReadonlyMap<Ability, number> {
  const result = new Map(abilityIncreases);
  for (const selection of selections) {
    if (!selection.choiceId.toLowerCase().includes("ability") && !selection.choiceId.toLowerCase().includes("score")) continue;
    for (const selected of selection.selectedIds) {
      const value = refId(selected);
      if (isAbility(value) && !excluded.has(value)) result.set(value, (result.get(value) ?? 0) + 1);
    }
  }
  return result;
}

export function collectRules(
  character: Character,
  pack: RulePack,
  context: RuleContext,
  totalLevel: number,
  equippedArmorCategories: ReadonlySet<string>,
): Result<CollectedRules, AppError> {
  const modifiers: AppliedModifier[] = [];
  const proficiencyRefs: DefinitionRef[] = [];
  const skills = new Set<Skill>();
  const expertise = new Set<Skill>();
  const savingThrows = new Set<Ability>();
  const conditionImmunities: DefinitionRef[] = [];
  const resistances = new Set<DamageType>();
  const immunities = new Set<DamageType>();
  const vulnerabilities = new Set<DamageType>();
  const add = (modifier: RuleModifier, scope: string) => {
    if (predicateApplies(modifier.predicate, character, pack, context, totalLevel, equippedArmorCategories)) {
      modifiers.push({ modifier, scope });
    }
  };

  const raceRefCheck = ensureLocalRef(character.raceRef, pack, "raceRef");
  if (!raceRefCheck.ok) return raceRefCheck;
  const race = pack.races.get(character.raceRef.entityId);
  if (!race) return err(appError.notFound("race", refId(character.raceRef)));
  const abilityIncreases = new Map<Ability, number>();
  const selectedAbilityIds = choiceSelections(character, character.classes)
    .flatMap((selection) => selection.selectedIds.map(refId).filter(isAbility));
  let selectedAbilityIndex = 0;
  for (const increase of race.abilityIncreases) {
    if (increase.ability !== "any") {
      abilityIncreases.set(increase.ability, (abilityIncreases.get(increase.ability) ?? 0) + increase.amount);
      continue;
    }
    const ability = selectedAbilityIds[selectedAbilityIndex];
    selectedAbilityIndex += 1;
    if (!ability) {
      return err(appError.unresolvedRule(`Aumento livre de habilidade da raça "${race.id}" requer uma escolha explícita.`));
    }
    abilityIncreases.set(ability, (abilityIncreases.get(ability) ?? 0) + increase.amount);
  }
  const raceSource = race.sourceRefs[0] ?? pack.manifest.sourceRefs[0];
  if (!raceSource) return err(appError.unresolvedRule(`Raça "${race.id}" sem fonte para o aumento de habilidade.`));
  for (const [ability, amount] of abilityIncreases) {
    add({
      id: `race.${race.id}.ability.${ability}`,
      sourceRef: raceSource,
      target: { kind: "ability-score", ability },
      operator: "add",
      value: { kind: "number", amount },
      predicate: { kind: "always" },
    }, `raça ${race.id}: aumento de ${ability}`);
  }
  for (const trait of race.traits) for (const modifier of trait.modifiers) add(modifier, `raça ${race.id} / ${trait.id}`);

  if (character.subraceRef) {
    const subraceRefCheck = ensureLocalRef(character.subraceRef, pack, "subraceRef");
    if (!subraceRefCheck.ok) return subraceRefCheck;
    const subrace = pack.subraces.get(character.subraceRef.entityId);
    if (!subrace) return err(appError.notFound("subrace", refId(character.subraceRef)));
    if (subrace.raceId !== race.id) return err(appError.validation("subraceRef", "A sub-raça não pertence à raça escolhida."));
    for (const modifier of subrace.additionalModifiers) add(modifier, `sub-raça ${subrace.id}`);
    for (const trait of subrace.traits) for (const modifier of trait.modifiers) add(modifier, `sub-raça ${subrace.id} / ${trait.id}`);
  }

  const backgroundRefCheck = ensureLocalRef(character.backgroundRef, pack, "backgroundRef");
  if (!backgroundRefCheck.ok) return backgroundRefCheck;
  const background = pack.backgrounds.get(character.backgroundRef.entityId);
  if (!background) return err(appError.notFound("background", refId(character.backgroundRef)));
  for (const skill of background.skillProficiencies) skills.add(skill);

  for (let index = 0; index < character.classes.length; index += 1) {
    const classLevel = character.classes[index];
    const classDefinition = pack.classes.get(classLevel.classId);
    if (!classDefinition) return err(appError.notFound("class", String(classLevel.classId)));
    const proficiencies = index === 0 ? classDefinition.initialProficiencies : classDefinition.multiclassProficiencies;
    proficiencyRefs.push(...proficiencies);
    for (const proficiency of proficiencies) {
      const proficiencyRefCheck = ensureLocalRef(proficiency, pack, "proficiency");
      if (!proficiencyRefCheck.ok) return proficiencyRefCheck;
      const proficiencyId = refId(proficiency);
      if (isSkillProficiencyRef(proficiency) && isSkill(proficiencyId)) skills.add(proficiencyId);
      const ability = refId(proficiency).replace(/^saving-throw[.-]/, "");
      if (isAbility(ability) && (refId(proficiency).includes("saving") || refId(proficiency).includes("save"))) savingThrows.add(ability);
    }
    for (const ability of classDefinition.savingThrowProficiencies) savingThrows.add(ability);
  }

  const featuresResult = collectClassFeatures(character, pack);
  if (!featuresResult.ok) return featuresResult;
  for (const feature of featuresResult.value) {
    for (const effect of feature.effects) {
      if (effect.kind === "modifier") add(effect.modifier, `feature ${feature.id}`);
      if (effect.kind === "grants-condition-immunity") conditionImmunities.push(effect.conditionRef);
    }
  }

  for (const selection of choiceSelections(character, character.classes)) {
    collectChoiceProficiencies([selection], skills, expertise);
    for (const selected of selection.selectedIds) {
      const feat = pack.feats.get(selected.entityId);
      if (feat) for (const modifier of feat.grants) add(modifier, `talento ${feat.id}`);
    }
  }
  const chosenAbilityIncreases = collectAbilityIncreaseChoices(
    choiceSelections(character, character.classes),
    new Map<Ability, number>(),
    new Set(selectedAbilityIds.slice(0, selectedAbilityIndex)),
  );
  for (const [ability, amount] of chosenAbilityIncreases) {
    add({
      id: `choice.ability.${ability}`,
      sourceRef: raceSource,
      target: { kind: "ability-score", ability },
      operator: "add",
      value: { kind: "number", amount },
      predicate: { kind: "always" },
    }, `escolha de aumento de ${ability}`);
  }

  const latestNoStack = new Set<string>();
  for (let index = character.conditions.length - 1; index >= 0; index -= 1) {
    const instance = character.conditions[index];
    const condition = pack.conditions.get(instance.definitionRef.entityId);
    if (condition?.stackingPolicy === "no-stack" && !latestNoStack.has(String(instance.definitionRef.entityId))) {
      latestNoStack.add(String(instance.definitionRef.entityId));
      latestNoStack.add(`instance:${instance.id}`);
    }
  }
  for (const instance of character.conditions) {
    const conditionRefCheck = ensureLocalRef(instance.definitionRef, pack, "conditions.definitionRef");
    if (!conditionRefCheck.ok) return conditionRefCheck;
    const condition = pack.conditions.get(instance.definitionRef.entityId);
    if (!condition) return err(appError.notFound("condition", refId(instance.definitionRef)));
    if (condition.stackingPolicy === "no-stack") {
      if (!latestNoStack.has(`instance:${instance.id}`)) continue;
    }
    for (const modifier of condition.mechanicalEffects) add(modifier, `condição ${condition.id} (${instance.id})`);
  }

  const fallbackSource = pack.manifest.sourceRefs[0];
  if (!fallbackSource) return err(appError.unresolvedRule("Rule pack sem sourceRef para explicar ajustes e valores-base."));
  for (const adjustment of character.manualAdjustments) {
    const modifier = modifierFromManualAdjustment(adjustment, fallbackSource);
    if (!modifier.ok) return modifier;
    add(modifier.value, `ajuste manual ${adjustment.id}: ${adjustment.reason}`);
  }

  for (const applied of modifiers) {
    const { modifier } = applied;
    if (modifier.target.kind === "custom") return err(appError.unresolvedRule(`Modificador customizado "${modifier.id}" não tem operador executável.`));
    if (modifier.operator === "grant-proficiency" && modifier.target.kind === "skill") skills.add(modifier.target.skill);
    if (modifier.operator === "grant-expertise" && modifier.target.kind === "skill") {
      skills.add(modifier.target.skill);
      expertise.add(modifier.target.skill);
    }
    if (modifier.target.kind === "saving-throw" && modifier.operator === "grant-proficiency") savingThrows.add(modifier.target.ability);
    if (modifier.target.kind !== "damage-roll") continue;
    if (modifier.value.kind !== "damage-type") continue;
    if (modifier.operator === "grant-resistance") resistances.add(modifier.value.damageType);
    if (modifier.operator === "grant-immunity") immunities.add(modifier.value.damageType);
    if (modifier.operator === "grant-vulnerability") vulnerabilities.add(modifier.value.damageType);
  }

  return ok({
    modifiers,
    proficiencyRefs,
    skillProficiencies: skills,
    expertise,
    savingThrowProficiencies: savingThrows,
    conditionImmunities,
    resistances: [...resistances],
    immunities: [...immunities],
    vulnerabilities: [...vulnerabilities],
  });
}

export function matchingModifiers(
  modifiers: readonly AppliedModifier[],
  target: RuleModifierTarget,
): readonly AppliedModifier[] {
  return modifiers.filter((candidate) => {
    const actual = candidate.modifier.target;
    if (actual.kind !== target.kind) return false;
    switch (target.kind) {
      case "ability-score": case "ability-modifier": return actual.kind === target.kind && actual.ability === target.ability;
      case "skill": case "passive-score": return actual.kind === target.kind && actual.skill === target.skill;
      case "saving-throw": return actual.kind === target.kind && actual.ability === target.ability;
      case "speed": return actual.kind === target.kind && actual.speedKind === target.speedKind;
      case "resource-capacity": return actual.kind === target.kind && sameRef(actual.resourceRef, target.resourceRef);
      case "spell-save-dc": case "spell-attack-modifier": return actual.kind === target.kind && sameRef(actual.castingSourceRef, target.castingSourceRef);
      default: return true;
    }
  });
}

export function numericValue(value: RuleModifierValue): number | undefined {
  return value.kind === "number" ? value.amount : undefined;
}

export function isNumericOperator(operator: RuleModifierOperator): boolean {
  return operator === "set-base" || operator === "add" || operator === "multiply" || operator === "set-minimum" || operator === "set-maximum";
}

export function applyNumericModifiers(
  initial: number,
  modifiers: readonly AppliedModifier[],
  baseContributions: readonly { readonly sourceRef: SourceRef | DefinitionRef; readonly amount?: number; readonly description: string }[],
): Result<{ readonly value: number; readonly contributions: readonly { readonly sourceRef: SourceRef | DefinitionRef; readonly amount?: number; readonly description: string }[] }, AppError> {
  let value = initial;
  const contributions = [...baseContributions];
  const setBases = modifiers.filter(({ modifier }) => modifier.operator === "set-base");
  const distinctBases = [...new Set(setBases.map(({ modifier }) => numericValue(modifier.value)))];
  if (distinctBases.some((base) => base === undefined)) return err(appError.unresolvedRule("Modificador set-base sem valor numérico suportado."));
  if (distinctBases.length > 1) return err(appError.unresolvedRule("Há fórmulas concorrentes sem precedência explícita para o mesmo valor."));
  if (distinctBases.length === 1) {
    value = distinctBases[0] as number;
    for (const applied of setBases) contributions.push({ sourceRef: applied.modifier.sourceRef, amount: value, description: `${applied.scope}: define a base antes dos bônus` });
  }
  for (const applied of modifiers) {
    const amount = numericValue(applied.modifier.value);
    if (amount === undefined) {
      if (isNumericOperator(applied.modifier.operator)) return err(appError.unresolvedRule(`Modificador "${applied.modifier.id}" exige valor numérico.`));
      continue;
    }
    switch (applied.modifier.operator) {
      case "set-base": break;
      case "add": value += amount; contributions.push({ sourceRef: applied.modifier.sourceRef, amount, description: `${applied.scope}: soma` }); break;
      case "multiply": value *= amount; contributions.push({ sourceRef: applied.modifier.sourceRef, amount, description: `${applied.scope}: multiplica` }); break;
      case "set-minimum": value = Math.max(value, amount); contributions.push({ sourceRef: applied.modifier.sourceRef, amount, description: `${applied.scope}: mínimo` }); break;
      case "set-maximum": value = Math.min(value, amount); contributions.push({ sourceRef: applied.modifier.sourceRef, amount, description: `${applied.scope}: máximo` }); break;
      default: break;
    }
  }
  return ok({ value, contributions });
}
