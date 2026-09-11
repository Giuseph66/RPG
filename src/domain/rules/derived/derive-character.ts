import { type Character, type ClassLevel, type ProgressionHistoryEntry } from "@domain/contracts/character";
import { type Explanation, type CharacterDerived, type Contribution, type SkillDerived, type AbilityScoreDerived, type SavingThrowDerived, type AttackOption, type SpellcastingSourceDerived, type ResourceCapacityDerived } from "@domain/contracts/derived";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type DefinitionRef } from "@domain/contracts/ids";
import { asCentimeters, type Ability, type Centimeters, type Skill, type SourceRef } from "@domain/contracts/primitives";
import { type RuleContext } from "@domain/contracts/rules";
import {
  ABILITIES,
  SKILL_ABILITY,
  SKILLS,
  abilityModifier,
  applyNumericModifiers,
  collectRules,
  matchingModifiers,
  proficiencyBonusForLevel,
  type AppliedModifier,
} from "../core/modifiers";

const skillDefaultAbility = (skill: Skill): Ability => SKILL_ABILITY[skill];

function contribution(sourceRef: SourceRef | DefinitionRef, amount: number | undefined, description: string): Contribution {
  return { sourceRef, amount, description };
}

function explanation<T>(value: T, contributions: readonly Contribution[]): Explanation<T> {
  return { value, contributions };
}

function sourceRef(pack: RulePack): SourceRef {
  return pack.manifest.sourceRefs[0] ?? {
    sourceId: pack.manifest.id,
    chapter: "Rules Engine",
    section: "valor derivado",
  };
}

function totalLevel(character: Character): Result<number, AppError> {
  let total = 0;
  for (const entry of character.classes) {
    if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 20) {
      return err(appError.validation("classes.level", `Nível de classe fora do domínio 1–20: ${entry.level}.`));
    }
    total += entry.level;
  }
  if (total < 1 || total > 20) return err(appError.validation("classes", `Nível total fora do domínio 1–20: ${total}.`));
  return ok(total);
}

function validateRuleset(character: Character, pack: RulePack): Result<true, AppError> {
  if (!pack?.manifest || !pack.progression || !pack.races || !pack.classes || !pack.backgrounds || !pack.equipment) {
    return err(appError.validation("rulePack", "Rule pack incompleto para derivação."));
  }
  if (character.rulesetRef.id !== pack.manifest.id || character.rulesetRef.version !== pack.manifest.version) {
    return err(appError.missingRuleset(character.rulesetRef, "O personagem e o rule pack não apontam para a mesma versão."));
  }
  if (!character.abilityGeneration || !character.abilityGeneration.baseScores) {
    return err(appError.validation("abilityGeneration.baseScores", "Valores-base de habilidade ausentes."));
  }
  for (const ability of ABILITIES) {
    const score = character.abilityGeneration.baseScores[ability];
    if (!Number.isFinite(score) || !Number.isInteger(score) || score < 1 || score > 30) {
      return err(appError.validation(`abilityGeneration.baseScores.${ability}`, `Valor de habilidade inválido: ${score}.`));
    }
  }
  return ok(true);
}

function equippedArmor(character: Character, pack: RulePack): Result<{
  readonly armor?: EquipmentDefinition;
  readonly shield?: EquipmentDefinition;
  readonly categories: ReadonlySet<string>;
}, AppError> {
  const armor: EquipmentDefinition[] = [];
  const shields: EquipmentDefinition[] = [];
  for (const item of character.inventory) {
    if (item.equippedState !== "equipped") continue;
    if (item.equipmentRef.rulesetId !== pack.manifest.id) {
      return err(appError.missingRuleset({ id: item.equipmentRef.rulesetId, version: pack.manifest.version }, "Referência estrangeira em inventory.equipmentRef."));
    }
    const definition = pack.equipment.get(item.equipmentRef.entityId);
    if (!definition) return err(appError.notFound("equipment", String(item.equipmentRef.entityId)));
    if (definition.category !== "armor" || !definition.armor) continue;
    if (definition.armor.armorCategory === "shield") shields.push(definition);
    else armor.push(definition);
  }
  if (armor.length > 1) return err(appError.unresolvedRule("Mais de uma armadura está equipada; a fonte não define uma precedência."));
  if (shields.length > 1) return err(appError.unresolvedRule("Mais de um escudo está empunhado; a fonte não define uma precedência."));
  const categories = new Set<string>();
  if (armor[0]?.armor) categories.add(armor[0].armor.armorCategory);
  if (shields[0]?.armor) categories.add(shields[0].armor.armorCategory);
  return ok({ armor: armor[0], shield: shields[0], categories });
}

function numeric(
  initial: number,
  modifiers: readonly AppliedModifier[],
  base: readonly Contribution[],
): Result<Explanation<number>, AppError> {
  const result = applyNumericModifiers(initial, modifiers, base);
  return result.ok ? ok(explanation(result.value.value, result.value.contributions)) : result;
}

function scoreDerived(
  character: Character,
  pack: RulePack,
  modifiers: readonly AppliedModifier[],
): Result<readonly AbilityScoreDerived[], AppError> {
  const baseSource = sourceRef(pack);
  const values: AbilityScoreDerived[] = [];
  for (const ability of ABILITIES) {
    const base = character.abilityGeneration.baseScores[ability];
    const scoreMods = matchingModifiers(modifiers, { kind: "ability-score", ability });
    const scoreResult = numeric(base, scoreMods, [
      contribution(baseSource, base, `valor-base de ${ability}`),
    ]);
    if (!scoreResult.ok) return scoreResult;
    const modMods = matchingModifiers(modifiers, { kind: "ability-modifier", ability });
    const modifierResult = numeric(abilityModifier(scoreResult.value.value), modMods, [
      ...scoreResult.value.contributions,
      contribution(baseSource, abilityModifier(scoreResult.value.value), `floor((${scoreResult.value.value}−10)/2)`),
    ]);
    if (!modifierResult.ok) return modifierResult;
    values.push({ ability, score: scoreResult.value, modifier: modifierResult.value });
  }
  return ok(values);
}

function modifierByAbility(scores: readonly AbilityScoreDerived[], ability: Ability): Explanation<number> {
  const found = scores.find((entry) => entry.ability === ability);
  // scoreDerived always emits all six abilities; keeping this guard avoids a silent default if it changes.
  if (!found) throw new Error(`Habilidade derivada ausente: ${ability}`);
  return found.modifier;
}

function deriveSkills(
  scores: readonly AbilityScoreDerived[],
  rules: DerivedRules,
): Result<readonly SkillDerived[], AppError> {
  const result: SkillDerived[] = [];
  for (const skill of SKILLS) {
    const abilityMod = modifierByAbility(scores, skillDefaultAbility(skill));
    const proficient = rules.skillProficiencies.has(skill) || rules.expertise.has(skill);
    const expertise = rules.expertise.has(skill);
    const skillMods = matchingModifiers(rules.modifiers, { kind: "skill", skill });
    const pb = rules.proficiencyBonus;
    const value = numeric(
      abilityMod.value + (proficient ? pb : 0) + (expertise ? pb : 0),
      skillMods,
      [
        ...abilityMod.contributions,
        contribution(rules.proficiencySource, proficient ? pb : 0, proficient ? (expertise ? "proficiência aplicada duas vezes (expertise)" : "bônus de proficiência") : "sem proficiência"),
      ],
    );
    if (!value.ok) return value;
    const passiveMods = matchingModifiers(rules.modifiers, { kind: "passive-score", skill });
    const passive = numeric(
      10 + value.value.value,
      passiveMods,
      [contribution(rules.passiveSource, 10, "base da Percepção passiva"), ...value.value.contributions],
    );
    if (!passive.ok) return passive;
    const advantage = [...skillMods, ...passiveMods].some(({ modifier }) => modifier.operator === "grant-advantage");
    const disadvantage = [...skillMods, ...passiveMods].some(({ modifier }) => modifier.operator === "grant-disadvantage");
    const passiveValue = advantage === disadvantage ? passive.value : {
      ...passive.value,
      value: passive.value.value + (advantage ? 5 : -5),
      contributions: [...passive.value.contributions, contribution(rules.passiveSource, advantage ? 5 : -5, advantage ? "vantagem na Percepção passiva" : "desvantagem na Percepção passiva")],
    };
    result.push({ skill, modifier: value.value, proficient, expertise, passiveScore: passiveValue });
  }
  return ok(result);
}

type DerivedRules = ReturnType<typeof collectRules> extends Result<infer T, AppError> ? T & {
  readonly proficiencyBonus: number;
  readonly proficiencySource: SourceRef;
  readonly passiveSource: SourceRef;
} : never;

function deriveSaves(
  scores: readonly AbilityScoreDerived[],
  rules: DerivedRules,
): Result<readonly SavingThrowDerived[], AppError> {
  const result: SavingThrowDerived[] = [];
  for (const ability of ABILITIES) {
    const base = modifierByAbility(scores, ability);
    const proficient = rules.savingThrowProficiencies.has(ability);
    const save = numeric(
      base.value + (proficient ? rules.proficiencyBonus : 0),
      matchingModifiers(rules.modifiers, { kind: "saving-throw", ability }),
      [...base.contributions, contribution(rules.proficiencySource, proficient ? rules.proficiencyBonus : 0, proficient ? "proficiência em resistência" : "sem proficiência")],
    );
    if (!save.ok) return save;
    result.push({ ability, modifier: save.value, proficient });
  }
  return ok(result);
}

function deriveArmorClass(
  character: Character,
  pack: RulePack,
  dexterity: Explanation<number>,
  armor: { readonly armor?: EquipmentDefinition; readonly shield?: EquipmentDefinition },
  modifiers: readonly AppliedModifier[],
): Result<Explanation<number>, AppError> {
  const baseSource = sourceRef(pack);
  let base = 10 + dexterity.value;
  const contributions: Contribution[] = [contribution(baseSource, 10, "CA sem armadura"), ...dexterity.contributions];
  if (armor.armor?.armor) {
    const details = armor.armor.armor;
    const dexContribution = details.dexModifierCap === undefined ? dexterity.value : Math.min(dexterity.value, details.dexModifierCap);
    base = details.baseArmorClass + dexContribution;
    contributions.splice(0, contributions.length,
      contribution({ rulesetId: pack.manifest.id, entityId: armor.armor.id }, details.baseArmorClass, "fórmula da armadura equipada"),
      contribution({ rulesetId: pack.manifest.id, entityId: armor.armor.id }, dexContribution, "modificador de Destreza permitido pela armadura"),
    );
  }
  if (armor.shield?.armor) {
    base += armor.shield.armor.baseArmorClass;
    contributions.push(contribution({ rulesetId: pack.manifest.id, entityId: armor.shield.id }, armor.shield.armor.baseArmorClass, "escudo empunhado"));
  }
  return numeric(base, matchingModifiers(modifiers, { kind: "armor-class" }), contributions);
}

function deriveHp(
  character: Character,
  scores: readonly AbilityScoreDerived[],
  pack: RulePack,
  total: number,
  modifiers: readonly AppliedModifier[],
): Result<Explanation<number>, AppError> {
  const expected = new Set<string>();
  for (const classLevel of character.classes) for (let level = 1; level <= classLevel.level; level += 1) expected.add(`${classLevel.classId}:${level}`);
  const gains = new Map<string, ProgressionHistoryEntry>();
  for (const entry of character.progressionHistory) {
    const key = `${entry.classId}:${entry.level}`;
    if (gains.has(key)) return err(appError.validation("progressionHistory", `Ganho de PV duplicado para ${key}.`));
    gains.set(key, entry);
  }
  for (const key of expected) if (!gains.has(key)) return err(appError.unresolvedRule(`Ganho de PV ausente para ${key}.`));
  const contributions: Contribution[] = [];
  let base = 0;
  for (const [key, entry] of gains) {
    if (!expected.has(key)) return err(appError.validation("progressionHistory", `Ganho de PV fora dos níveis declarados: ${key}.`));
    if (!Number.isInteger(entry.hitPointGain.amount) || entry.hitPointGain.amount < 1) return err(appError.validation("progressionHistory.hitPointGain.amount", `Ganho de PV inválido: ${entry.hitPointGain.amount}.`));
    base += entry.hitPointGain.amount;
    contributions.push(contribution({ rulesetId: pack.manifest.id, entityId: entry.classId }, entry.hitPointGain.amount, `ganho de PV registrado no nível ${entry.level}`));
  }
  const con = modifierByAbility(scores, "con");
  base += con.value * total;
  contributions.push(contribution(sourceRef(pack), con.value * total, `CON por nível × ${total}`));
  const perLevel = matchingModifiers(modifiers, { kind: "hit-points-per-level" });
  const expanded: AppliedModifier[] = [];
  for (const entry of perLevel) {
    if (entry.modifier.value.kind !== "number") {
      expanded.push(entry);
      continue;
    }
    expanded.push({
      ...entry,
      modifier: { ...entry.modifier, value: { kind: "number", amount: entry.modifier.value.amount * total } },
    });
  }
  return numeric(base, [...expanded, ...matchingModifiers(modifiers, { kind: "hit-points-max" })], contributions);
}

function deriveSpeed(
  character: Character,
  pack: RulePack,
  modifiers: readonly AppliedModifier[],
): Result<readonly { readonly kind: "walk"; readonly value: Explanation<Centimeters> }[], AppError> {
  const race = pack.races.get(character.raceRef.entityId);
  if (!race) return err(appError.notFound("race", String(character.raceRef.entityId)));
  const speed = numeric(Number(race.speedCm), matchingModifiers(modifiers, { kind: "speed", speedKind: "walk" }), [
    contribution({ rulesetId: pack.manifest.id, entityId: race.id }, Number(race.speedCm), "deslocamento da raça"),
  ]);
  if (!speed.ok) return speed;
  return ok([{ kind: "walk", value: { ...speed.value, value: asCentimeters(speed.value.value) } }]);
}

function deriveAttacks(
  character: Character,
  pack: RulePack,
  scores: readonly AbilityScoreDerived[],
  rules: DerivedRules,
): Result<readonly AttackOption[], AppError> {
  const result: AttackOption[] = [];
  for (const item of character.inventory) {
    if (item.equippedState !== "equipped") continue;
    const definition = pack.equipment.get(item.equipmentRef.entityId);
    if (!definition?.weapon) continue;
    const weapon = definition.weapon;
    let ability: Ability;
    if (weapon.abilityPolicy.kind === "fixed") ability = weapon.abilityPolicy.ability;
    else if (weapon.abilityPolicy.kind === "spellcasting-ability") return err(appError.unresolvedRule(`Arma "${definition.id}" requer uma fonte de conjuração explícita.`));
    else {
      const first = modifierByAbility(scores, weapon.abilityPolicy.abilities[0]);
      const second = modifierByAbility(scores, weapon.abilityPolicy.abilities[1]);
      ability = first.value >= second.value ? weapon.abilityPolicy.abilities[0] : weapon.abilityPolicy.abilities[1];
    }
    const abilityValue = modifierByAbility(scores, ability);
    const categoryProficient = [...rules.proficiencyRefs].some((ref) => {
      const value = String(ref.entityId);
      return value === String(definition.id) || value.includes(weapon.proficiencyCategory);
    });
    const attack = numeric(
      abilityValue.value + (categoryProficient ? rules.proficiencyBonus : 0),
      matchingModifiers(rules.modifiers, { kind: "attack-roll" }),
      [...abilityValue.contributions, contribution(rules.proficiencySource, categoryProficient ? rules.proficiencyBonus : 0, categoryProficient ? "proficiência com a arma" : "sem proficiência com a arma")],
    );
    if (!attack.ok) return attack;
    result.push({
      sourceRef: item.equipmentRef,
      attackModifier: attack.value,
      damageParts: weapon.damageParts.map((part) => ({
        expression: part.expression,
        damageType: part.damageType,
        modifierBonus: explanation(abilityValue.value, abilityValue.contributions),
      })),
    });
  }
  return ok(result);
}

function deriveResources(
  character: Character,
  pack: RulePack,
  scores: readonly AbilityScoreDerived[],
  total: number,
  modifiers: readonly AppliedModifier[],
): Result<readonly ResourceCapacityDerived[], AppError> {
  const result: ResourceCapacityDerived[] = [];
  for (const state of character.resources) {
    if (state.definitionRef.rulesetId !== pack.manifest.id) return err(appError.missingRuleset({ id: state.definitionRef.rulesetId, version: pack.manifest.version }, "Referência estrangeira em resources.definitionRef."));
    const definition = pack.resources.get(state.definitionRef.entityId);
    if (!definition) return err(appError.notFound("resource", String(state.definitionRef.entityId)));
    const capacityRule = definition.capacityRule;
    let base: number;
    let baseContribution: Contribution;
    switch (capacityRule.kind) {
      case "fixed":
        base = capacityRule.amount;
        baseContribution = contribution(state.definitionRef, base, "capacidade fixa do recurso");
        break;
      case "by-class-level": {
        const classLevel = character.classes.find((entry) => entry.classId === capacityRule.classRef.entityId);
        if (!classLevel) return err(appError.unresolvedRule(`Recurso "${definition.id}" depende de uma classe ausente no personagem.`));
        const entries = capacityRule.amountsByLevel.filter((entry) => entry.level <= classLevel.level).sort((a, b) => b.level - a.level);
        if (!entries[0]) return err(appError.unresolvedRule(`Capacidade do recurso "${definition.id}" ausente para o nível de classe ${classLevel.level}.`));
        base = entries[0].count;
        baseContribution = contribution(state.definitionRef, base, `capacidade do recurso no nível de classe ${classLevel.level}`);
        break;
      }
      case "ability-modifier": {
        const ability = scores.find((entry) => entry.ability === capacityRule.ability);
        if (!ability) return err(appError.unresolvedRule(`Habilidade da capacidade "${definition.id}" ausente.`));
        base = Math.max(capacityRule.minimum ?? Number.NEGATIVE_INFINITY, ability.modifier.value);
        baseContribution = contribution(state.definitionRef, base, "capacidade baseada em modificador de habilidade");
        break;
      }
      case "by-total-level-formula":
        return err(appError.unresolvedRule(`Fórmula de capacidade do recurso "${definition.id}" não tem operador executável.`));
      default: {
        const exhaustive: never = capacityRule;
        void exhaustive;
        return err(appError.unresolvedRule(`Regra de capacidade do recurso "${definition.id}" não suportada.`));
      }
    }
    const capacity = numeric(base, matchingModifiers(modifiers, { kind: "resource-capacity", resourceRef: state.definitionRef }), [baseContribution]);
    if (!capacity.ok) return capacity;
    result.push({ definitionRef: state.definitionRef, capacity: capacity.value });
  }
  void total;
  return ok(result);
}

function deriveSpells(
  character: Character,
  pack: RulePack,
  scores: readonly AbilityScoreDerived[],
  rules: DerivedRules,
): Result<readonly SpellcastingSourceDerived[], AppError> {
  const result: SpellcastingSourceDerived[] = [];
  for (const state of character.castingSources) {
    if (state.grantingRef.rulesetId !== pack.manifest.id) {
      return err(appError.missingRuleset({ id: state.grantingRef.rulesetId, version: pack.manifest.version }, "Referência estrangeira em castingSources.grantingRef."));
    }
    const source = pack.classes.get(state.grantingRef.entityId)?.spellcasting;
    if (!source) return err(appError.unresolvedRule(`Origem de conjuração "${state.grantingRef.entityId}" sem descritor de conjuração suportado.`));
    const ability = modifierByAbility(scores, state.ability);
    const target = { kind: "spell-save-dc" as const, castingSourceRef: state.grantingRef };
    const save = numeric(8 + rules.proficiencyBonus + ability.value, matchingModifiers(rules.modifiers, target), [
      contribution(rules.passiveSource, 8, "base da CD de resistência de magia"),
      contribution(rules.proficiencySource, rules.proficiencyBonus, "bônus de proficiência"),
      ...ability.contributions,
    ]);
    if (!save.ok) return save;
    const attack = numeric(rules.proficiencyBonus + ability.value, matchingModifiers(rules.modifiers, { kind: "spell-attack-modifier", castingSourceRef: state.grantingRef }), [
      contribution(rules.proficiencySource, rules.proficiencyBonus, "bônus de proficiência"),
      ...ability.contributions,
    ]);
    if (!attack.ok) return attack;
    result.push({ castingSourceId: state.id, spellSaveDc: save.value, spellAttackModifier: attack.value });
  }
  return ok(result);
}

function directRuleSources(pack: RulePack): { readonly proficiencySource: SourceRef; readonly passiveSource: SourceRef } {
  const source = sourceRef(pack);
  return { proficiencySource: source, passiveSource: source };
}

export function deriveCharacter(
  character: Character,
  rulePack: RulePack,
  context: RuleContext,
): Result<CharacterDerived, AppError> {
  if (!context?.gameTime || !Array.isArray(context.availableActions) || !Array.isArray(context.tablePolicies)) {
    return err(appError.validation("context", "Contexto de derivação incompleto."));
  }
  const valid = validateRuleset(character, rulePack);
  if (!valid.ok) return valid;
  const totalResult = totalLevel(character);
  if (!totalResult.ok) return totalResult;
  const total = totalResult.value;
  const armorResult = equippedArmor(character, rulePack);
  if (!armorResult.ok) return armorResult;
  const rulesResult = collectRules(character, rulePack, context, total, armorResult.value.categories);
  if (!rulesResult.ok) return rulesResult;
  const proficiencyResult = proficiencyBonusForLevel(total, rulePack.progression.table);
  if (!proficiencyResult.ok) return proficiencyResult;
  const proficiencyValue = proficiencyResult.value;
  const sources = directRuleSources(rulePack);
  const rules = { ...rulesResult.value, proficiencyBonus: proficiencyValue, ...sources };
  const pbResult = numeric(proficiencyValue, matchingModifiers(rules.modifiers, { kind: "proficiency-bonus" }), [
    contribution(sources.proficiencySource, proficiencyValue, `bônus de proficiência do nível total ${total}`),
  ]);
  if (!pbResult.ok) return pbResult;
  const effectiveRules = { ...rules, proficiencyBonus: pbResult.value.value };
  const abilitiesResult = scoreDerived(character, rulePack, effectiveRules.modifiers);
  if (!abilitiesResult.ok) return abilitiesResult;
  const skillsResult = deriveSkills(abilitiesResult.value, effectiveRules);
  if (!skillsResult.ok) return skillsResult;
  const savesResult = deriveSaves(abilitiesResult.value, effectiveRules);
  if (!savesResult.ok) return savesResult;
  const initiative = numeric(modifierByAbility(abilitiesResult.value, "dex").value, matchingModifiers(effectiveRules.modifiers, { kind: "initiative" }), modifierByAbility(abilitiesResult.value, "dex").contributions);
  if (!initiative.ok) return initiative;
  const armorClass = deriveArmorClass(character, rulePack, modifierByAbility(abilitiesResult.value, "dex"), armorResult.value, effectiveRules.modifiers);
  if (!armorClass.ok) return armorClass;
  const hitPoints = deriveHp(character, abilitiesResult.value, rulePack, total, effectiveRules.modifiers);
  if (!hitPoints.ok) return hitPoints;
  const speeds = deriveSpeed(character, rulePack, effectiveRules.modifiers);
  if (!speeds.ok) return speeds;
  const spellcasting = deriveSpells(character, rulePack, abilitiesResult.value, effectiveRules);
  if (!spellcasting.ok) return spellcasting;
  const resources = deriveResources(character, rulePack, abilitiesResult.value, total, effectiveRules.modifiers);
  if (!resources.ok) return resources;
  const attacks = deriveAttacks(character, rulePack, abilitiesResult.value, effectiveRules);
  if (!attacks.ok) return attacks;
  const perception = skillsResult.value.find((skill) => skill.skill === "perception");
  if (!perception) return err(appError.unresolvedRule("Perícia Percepção não foi derivada."));
  const abilityScores = abilitiesResult.value;
  return ok({
    characterId: character.id,
    characterRevision: character.revision,
    rulesetRef: character.rulesetRef,
    abilityScores,
    skills: skillsResult.value,
    savingThrows: savesResult.value,
    armorClass: armorClass.value,
    initiative: initiative.value,
    speedsCm: speeds.value,
    proficiencyBonus: pbResult.value,
    hitPointsMax: hitPoints.value,
    resourceCapacities: resources.value,
    attacks: attacks.value,
    spellcastingSources: spellcasting.value,
    resistanceProfile: {
      resistances: effectiveRules.resistances,
      immunities: effectiveRules.immunities,
      vulnerabilities: effectiveRules.vulnerabilities,
      conditionImmunities: effectiveRules.conditionImmunities,
    },
    passivePerception: perception.passiveScore,
  });
}
