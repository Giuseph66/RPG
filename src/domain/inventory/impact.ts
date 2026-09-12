import { type Character, type InventoryItem } from "@domain/contracts/character";
import { type Contribution, type Explanation } from "@domain/contracts/derived";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type DefinitionRef, type RulesetId } from "@domain/contracts/ids";
import { type EquipmentDefinition, type EquipmentProperty } from "@domain/contracts/definitions/equipment";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { asCentimeters, asGrams, type Centimeters, type Grams } from "@domain/contracts/primitives";
import { type EncumbranceSummary, type EquippedEquipment, type EquipmentProficiency, type InventoryExplanation, type InventoryRules } from "./model";
import { validateInventoryItem } from "./validation";

export interface EquipmentImpactOptions extends InventoryRules {
  readonly dexterityModifier?: number;
  readonly strengthScore?: number;
  readonly proficiencyRefs?: readonly DefinitionRef[];
}

export interface EquipmentImpact {
  readonly equipped: readonly EquippedEquipment[];
  readonly armor?: EquippedEquipment;
  readonly shield?: EquippedEquipment;
  readonly armorClass: Explanation<number>;
  readonly properties: readonly EquipmentProperty[];
  readonly stealthDisadvantage: boolean;
  readonly strengthRequirement?: number;
  readonly strengthRequirementMet: boolean;
  readonly speedPenaltyCm: Centimeters;
  readonly weightGrams: Grams;
  readonly encumbrance?: EncumbranceSummary;
  readonly explanations: readonly InventoryExplanation[];
}

function proficiencyFor(definition: EquipmentDefinition, refs: readonly DefinitionRef[]): EquipmentProficiency {
  const category = definition.armor?.armorCategory;
  const wanted = category
    ? [String(definition.id), category, `armor-${category}`, `${category}-armor`]
    : definition.weapon
      ? [String(definition.id), definition.weapon.proficiencyCategory, `weapon-${definition.weapon.proficiencyCategory}`]
      : [String(definition.id)];
  const found = refs.find((ref) => wanted.includes(String(ref.entityId)));
  return found
    ? { proficient: true, proficiencyRef: found, description: "Proficiência concedida pela ficha." }
    : { proficient: false, description: "Sem proficiência registrada para esta definição." };
}

function equipmentFor(item: InventoryItem, pack: RulePack): Result<EquipmentDefinition, AppError> {
  if (item.equipmentRef.rulesetId !== pack.manifest.id) {
    return err(appError.missingRuleset({ id: item.equipmentRef.rulesetId, version: pack.manifest.version }, "Referência estrangeira em inventory.equipmentRef."));
  }
  const definition = pack.equipment.get(item.equipmentRef.entityId);
  return definition ? ok(definition) : err(appError.notFound("equipment", String(item.equipmentRef.entityId)));
}

function armorClassExplanation(
  armor: EquipmentDefinition | undefined,
  shield: EquipmentDefinition | undefined,
  dexterityModifier: number,
  rulesetId: RulesetId,
): Explanation<number> {
  const contributions: Contribution[] = [];
  let value = 10 + dexterityModifier;
  if (armor?.armor) {
    const details = armor.armor;
    const dex = details.dexModifierCap === undefined ? dexterityModifier : Math.min(dexterityModifier, details.dexModifierCap);
    value = details.baseArmorClass + dex;
    contributions.push(
      { sourceRef: { rulesetId, entityId: armor.id }, amount: details.baseArmorClass, description: "fórmula da armadura equipada" },
      { sourceRef: { rulesetId, entityId: armor.id }, amount: dex, description: "modificador de Destreza permitido pela armadura" },
    );
  } else {
    contributions.push({ sourceRef: { sourceId: rulesetId, chapter: "Capítulo 5 — Equipamento" }, amount: 10, description: "CA sem armadura" });
    contributions.push({ sourceRef: { sourceId: rulesetId, chapter: "Capítulo 1 — Personagens" }, amount: dexterityModifier, description: "modificador de Destreza" });
  }
  if (shield?.armor) {
    value += shield.armor.baseArmorClass;
    contributions.push({ sourceRef: { rulesetId, entityId: shield.id }, amount: shield.armor.baseArmorClass, description: "escudo empunhado" });
  }
  return { value, contributions };
}

function itemWeight(item: InventoryItem, definition: EquipmentDefinition): number {
  return definition.weightGrams * item.quantity;
}

function encumbrance(
  totalWeight: number,
  currencyWeight: number,
  strengthScore: number,
  policy: NonNullable<InventoryRules["encumbrance"]>,
  explanations: readonly InventoryExplanation[],
): Result<EncumbranceSummary, AppError> {
  if (!policy.enabled) return err(appError.unresolvedRule("A regra opcional de carga foi fornecida desligada."));
  const gramsPerStrengthPoint = policy.gramsPerStrengthPoint ?? 7500;
  const multiplier = policy.pushDragLiftMultiplier ?? 2;
  if (!Number.isInteger(gramsPerStrengthPoint) || gramsPerStrengthPoint < 1) return err(appError.validation("encumbrance.gramsPerStrengthPoint", "Capacidade por ponto de Força deve ser inteiro positivo."));
  if (!Number.isFinite(multiplier) || multiplier < 1) return err(appError.validation("encumbrance.pushDragLiftMultiplier", "Multiplicador de empurrar/arrastar/levantar deve ser positivo."));
  if (!Number.isInteger(strengthScore) || strengthScore < 1) return err(appError.validation("strengthScore", "Força deve ser um inteiro positivo para calcular carga."));
  const capacity = strengthScore * gramsPerStrengthPoint;
  const push = Math.round(capacity * multiplier);
  return ok({
    enabled: true,
    totalWeightGrams: asGrams(totalWeight + currencyWeight),
    capacityGrams: asGrams(capacity),
    pushDragLiftGrams: asGrams(push),
    overCapacity: totalWeight + currencyWeight > capacity,
    overPushDragLift: totalWeight + currencyWeight > push,
    currencyWeightGrams: asGrams(currencyWeight),
    explanations,
  });
}

/** Resolve equipamento ativo e seus efeitos sem alterar Character nem definitions. */
export function deriveEquipmentImpact(character: Character, pack: RulePack, options: EquipmentImpactOptions = {}): Result<EquipmentImpact, AppError> {
  const equipped: EquippedEquipment[] = [];
  const allExplanations: InventoryExplanation[] = [];
  let weight = 0;
  for (const item of character.inventory) {
    const valid = validateInventoryItem(item);
    if (!valid.ok) return valid;
    const definitionResult = equipmentFor(item, pack);
    if (!definitionResult.ok) return definitionResult;
    const definition = definitionResult.value;
    weight += itemWeight(item, definition);
    allExplanations.push({ sourceRef: item.equipmentRef, itemId: item.id, amount: itemWeight(item, definition), description: `Peso de ${item.quantity} unidade(s) de ${definition.name}.` });
    if (item.equippedState !== "equipped") continue;
    equipped.push({ item, equipmentRef: item.equipmentRef, category: definition.category, properties: definition.properties, proficiency: proficiencyFor(definition, options.proficiencyRefs ?? []) });
  }
  const armors = equipped.filter((entry) => entry.category === "armor" && pack.equipment.get(entry.equipmentRef.entityId)?.armor?.armorCategory !== "shield");
  const shields = equipped.filter((entry) => pack.equipment.get(entry.equipmentRef.entityId)?.armor?.armorCategory === "shield");
  if (armors.length > 1) return err(appError.unresolvedRule("Mais de uma armadura está equipada; a fonte não define uma precedência."));
  if (shields.length > 1) return err(appError.unresolvedRule("Mais de um escudo está empunhado; a fonte não define uma precedência."));
  const armor = armors[0];
  const shield = shields[0];
  const armorDefinition = armor ? pack.equipment.get(armor.equipmentRef.entityId) : undefined;
  const shieldDefinition = shield ? pack.equipment.get(shield.equipmentRef.entityId) : undefined;
  const dexterityModifier = options.dexterityModifier ?? 0;
  const strengthScore = options.strengthScore ?? 10;
  const requirement = armorDefinition?.armor?.strengthRequirement;
  const currencyWeight = options.encumbrance?.enabled && options.encumbrance.currencyWeightGramsPerCoin !== undefined
    ? Object.values(character.currency).reduce((sum, amount) => sum + amount, 0) * options.encumbrance.currencyWeightGramsPerCoin
    : 0;
  if (!Number.isInteger(currencyWeight) || currencyWeight < 0) return err(appError.validation("encumbrance.currencyWeightGramsPerCoin", "Peso de moedas deve resultar em gramas inteiras não negativas."));
  const weightExplanations = currencyWeight > 0 ? [...allExplanations, { amount: currencyWeight, description: "Peso de moedas segundo a política opcional habilitada." }] : allExplanations;
  const encumbranceResult = options.encumbrance?.enabled
    ? encumbrance(weight, currencyWeight, strengthScore, options.encumbrance, weightExplanations)
    : undefined;
  if (encumbranceResult && !encumbranceResult.ok) return encumbranceResult;
  const properties = [...new Set(equipped.flatMap((entry) => entry.properties))];
  const armorClass = armorClassExplanation(armorDefinition, shieldDefinition, dexterityModifier, pack.manifest.id);
  return ok({
    equipped,
    ...(armor ? { armor } : {}),
    ...(shield ? { shield } : {}),
    armorClass,
    properties,
    stealthDisadvantage: Boolean(armorDefinition?.armor?.stealthDisadvantage),
    ...(requirement === undefined ? {} : { strengthRequirement: requirement }),
    strengthRequirementMet: requirement === undefined || strengthScore >= requirement,
    speedPenaltyCm: asCentimeters(requirement !== undefined && strengthScore < requirement ? 300 : 0),
    weightGrams: asGrams(weight),
    ...(encumbranceResult?.ok ? { encumbrance: encumbranceResult.value } : {}),
    explanations: [
      ...allExplanations,
      ...(armor ? [{ sourceRef: armor.equipmentRef, itemId: armor.item.id, description: `Armadura ativa: ${String(armor.equipmentRef.entityId)}.` }] : []),
      ...(shield ? [{ sourceRef: shield.equipmentRef, itemId: shield.item.id, description: "Escudo ativo soma à CA." }] : []),
      ...(armor && !armor.proficiency.proficient ? [{ sourceRef: armor.equipmentRef, itemId: armor.item.id, description: "Armadura ativa sem proficiência registrada." }] : []),
    ],
  });
}

export const calculateEquipmentImpact = deriveEquipmentImpact;
export const deriveInventoryImpact = deriveEquipmentImpact;

export function getEquippedEquipment(character: Character, pack: RulePack, options: EquipmentImpactOptions = {}): Result<readonly EquippedEquipment[], AppError> {
  const result = deriveEquipmentImpact(character, pack, options);
  return result.ok ? ok(result.value.equipped) : result;
}

export function calculateArmorClass(character: Character, pack: RulePack, options: EquipmentImpactOptions = {}): Result<Explanation<number>, AppError> {
  const result = deriveEquipmentImpact(character, pack, options);
  return result.ok ? ok(result.value.armorClass) : result;
}

export function calculateInventoryWeight(character: Character, pack: RulePack): Result<Grams, AppError> {
  const result = deriveEquipmentImpact(character, pack);
  return result.ok ? ok(result.value.weightGrams) : result;
}
