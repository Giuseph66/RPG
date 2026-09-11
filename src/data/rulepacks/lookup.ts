/**
 * Lookup de definitions dentro de um `RulePack` já carregado. Autoridade:
 * docs/criacao/dados/ids.md ("lookup tem categoria declarada pelo contrato, por exemplo
 * resolveSpell(ref)").
 *
 * Toda função checa `ref.rulesetId === pack.manifest.id` antes de consultar o catálogo — uma
 * referência de outro ruleset nunca "acerta por acaso" um ID igual no pack errado.
 *
 * Nota sobre `MissingRulesetError.rulesetRef.version`: `DefinitionRef` não carrega versão (só
 * `rulesetId` + `entityId`), então quando `ref.rulesetId` não bate com o pack carregado não há
 * como saber qual versão o chamador pretendia. Usa-se `pack.manifest.version` como valor
 * informativo (o pack que RECEBEU a referência errada), documentado aqui para não ser lido como
 * "versão esperada da referência". `resolveRulesetRef` (load.ts), que recebe um `RulesetRef`
 * completo, é quem tem a versão real solicitada.
 */

import { type DefinitionRef, type EntityId, type TypedDefinitionRef } from "@domain/contracts/ids";
import { appError, err, ok, type MissingRulesetError, type NotFoundError, type Result } from "@domain/contracts/errors";
import { type RulePack } from "@domain/contracts/definitions/rulepack";
import { type BackgroundDefinition } from "@domain/contracts/definitions/background";
import { type CharacterTemplate } from "@domain/contracts/definitions/character-template";
import { type ClassDefinition, type SubclassDefinition } from "@domain/contracts/definitions/class";
import { type ConditionDefinition } from "@domain/contracts/definitions/condition";
import { type EquipmentDefinition } from "@domain/contracts/definitions/equipment";
import { type FeatDefinition } from "@domain/contracts/definitions/feat";
import { type FeatureDefinition } from "@domain/contracts/definitions/feature";
import { type ProgressionDefinition } from "@domain/contracts/definitions/progression";
import { type RaceDefinition, type SubraceDefinition } from "@domain/contracts/definitions/race";
import { type ResourceDefinition } from "@domain/contracts/definitions/resource";
import { type SpellDefinition } from "@domain/contracts/definitions/spell";

function resolveFromMap<T>(
  pack: RulePack,
  ref: DefinitionRef,
  map: ReadonlyMap<EntityId, T>,
  entityLabel: string,
): Result<T, NotFoundError | MissingRulesetError> {
  if (ref.rulesetId !== pack.manifest.id) {
    return err(
      appError.missingRuleset(
        { id: ref.rulesetId, version: pack.manifest.version },
        `Referência aponta para ruleset "${ref.rulesetId}", mas o pack carregado é "${pack.manifest.id}".`,
      ),
    );
  }
  const found = map.get(ref.entityId);
  if (!found) {
    return err(appError.notFound(entityLabel, ref.entityId));
  }
  return ok(found);
}

export function resolveRace(pack: RulePack, ref: DefinitionRef): Result<RaceDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.races, "race");
}

export function resolveSubrace(pack: RulePack, ref: DefinitionRef): Result<SubraceDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.subraces, "subrace");
}

export function resolveClass(pack: RulePack, ref: DefinitionRef): Result<ClassDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.classes, "class");
}

export function resolveSubclass(pack: RulePack, ref: DefinitionRef): Result<SubclassDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.subclasses, "subclass");
}

export function resolveBackground(pack: RulePack, ref: DefinitionRef): Result<BackgroundDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.backgrounds, "background");
}

export function resolveFeat(pack: RulePack, ref: DefinitionRef): Result<FeatDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.feats, "feat");
}

export function resolveFeature(pack: RulePack, ref: DefinitionRef): Result<FeatureDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.features, "feature");
}

export function resolveResource(pack: RulePack, ref: DefinitionRef): Result<ResourceDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.resources, "resource");
}

export function resolveCondition(pack: RulePack, ref: DefinitionRef): Result<ConditionDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.conditions, "condition");
}

export function resolveEquipment(pack: RulePack, ref: DefinitionRef): Result<EquipmentDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.equipment, "equipment");
}

export function resolveSpell(pack: RulePack, ref: DefinitionRef): Result<SpellDefinition, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.spells, "spell");
}

export function resolveCharacterTemplate(
  pack: RulePack,
  ref: DefinitionRef,
): Result<CharacterTemplate, NotFoundError | MissingRulesetError> {
  return resolveFromMap(pack, ref, pack.characterTemplates, "character-template");
}

/** `progression` é singular no contrato (não um `Map`); "resolver" checa ruleset + o único ID válido. */
export function resolveProgression(
  pack: RulePack,
  ref: DefinitionRef,
): Result<ProgressionDefinition, NotFoundError | MissingRulesetError> {
  if (ref.rulesetId !== pack.manifest.id) {
    return err(
      appError.missingRuleset(
        { id: ref.rulesetId, version: pack.manifest.version },
        `Referência aponta para ruleset "${ref.rulesetId}", mas o pack carregado é "${pack.manifest.id}".`,
      ),
    );
  }
  if (pack.progression.id !== ref.entityId) {
    return err(appError.notFound("progression", ref.entityId));
  }
  return ok(pack.progression);
}

export type AnyDefinition =
  | RaceDefinition
  | SubraceDefinition
  | ClassDefinition
  | SubclassDefinition
  | BackgroundDefinition
  | FeatDefinition
  | FeatureDefinition
  | ResourceDefinition
  | ConditionDefinition
  | EquipmentDefinition
  | SpellDefinition
  | ProgressionDefinition
  | CharacterTemplate;

/** Dispatcher genérico por `entityType` explícito (favoritos, busca, listas mistas). */
export function resolveByType(
  pack: RulePack,
  ref: TypedDefinitionRef,
): Result<AnyDefinition, NotFoundError | MissingRulesetError> {
  switch (ref.entityType) {
    case "race":
      return resolveRace(pack, ref);
    case "subrace":
      return resolveSubrace(pack, ref);
    case "class":
      return resolveClass(pack, ref);
    case "subclass":
      return resolveSubclass(pack, ref);
    case "background":
      return resolveBackground(pack, ref);
    case "feat":
      return resolveFeat(pack, ref);
    case "feature":
      return resolveFeature(pack, ref);
    case "resource":
      return resolveResource(pack, ref);
    case "condition":
      return resolveCondition(pack, ref);
    case "equipment":
      return resolveEquipment(pack, ref);
    case "spell":
      return resolveSpell(pack, ref);
    case "progression":
      return resolveProgression(pack, ref);
    case "character-template":
      return resolveCharacterTemplate(pack, ref);
    default: {
      const exhaustiveCheck: never = ref.entityType;
      return err(appError.notFound("unknown", String(exhaustiveCheck)));
    }
  }
}
