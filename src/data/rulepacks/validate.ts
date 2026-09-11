/**
 * Validador do rule pack. Autoridade: docs/criacao/dados/regras-estaticas.md ("Loader valida
 * manifesto, hashes, tipos, cardinalidades e referências antes de publicar snapshot imutável;
 * carregamento parcial não se torna pack ativo"), docs/criacao/passos/08-classes-racas.md
 * (critérios de aceite de DATA-002).
 *
 * `validateRulePack` acumula TODOS os erros encontrados (nunca para no primeiro) e só retorna
 * `ok` quando a lista de erros está vazia — carregamento parcial nunca vira `RulePack`.
 */

import { isEntityId, type DefinitionRef, type EntityType } from "@domain/contracts/ids";
import { type ChoiceDefinition, type Prerequisite, type SourceRef } from "@domain/contracts/primitives";
import { err, ok, type Result } from "@domain/contracts/errors";
import { CHARACTER_SCHEMA_VERSION } from "@domain/contracts/character";
import { type RulePack, type RulePackManifest } from "@domain/contracts/definitions/rulepack";

import { computeEntityCounts, type RulePackCatalogs } from "./manifest";
import { computeChecksums } from "./checksum";
import { ABILITIES, type AbilityDefinition } from "../abilities/abilities";
import { SKILLS, type SkillDefinition } from "../skills/skills";
import { type DiceCatalogEntry } from "../dice/dice";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Forma de entrada não confiável (arrays, não `Map`) — ver 09-MODELO-DE-DADOS.md ("Limites de
 * confiança"): reconstruímos toda checagem de formato mesmo que os tipos já estejam branded,
 * porque a origem real (import externo) pode não ter passado pelos construtores `asX`.
 *
 * Decisão de forma: além dos catálogos que compõem `RulePack` (via `RulePackCatalogs`), aceita
 * opcionalmente `abilities`/`skills`/`diceFaces` — catálogos que DATA-002 também possui, mas que
 * NÃO têm slot em `RulePack` porque `Ability`/`Skill`/`DiceFaces` já são uniões fechadas do
 * contrato (não entidades com `EntityId` cujo lookup dependa de um pack específico). Eles só
 * participam da validação de unicidade/fonte aqui; não aparecem no `RulePack` publicado. Ver
 * "decisões" no handoff de DATA-002 para o raciocínio completo.
 */
export interface RulePackInput extends RulePackCatalogs {
  readonly manifest: RulePackManifest;
  readonly abilities?: readonly AbilityDefinition[];
  readonly skills?: readonly SkillDefinition[];
  readonly diceFaces?: readonly DiceCatalogEntry[];
}

/** União fechada de códigos de erro de validação do rule pack. */
export type RulePackValidationErrorCode =
  | "invalid-id"
  | "duplicate-id"
  | "missing-source"
  | "foreign-source"
  | "dangling-reference"
  | "cycle"
  | "manifest-mismatch"
  | "incompatible-schema"
  | "invalid-version"
  | "invalid-number";

export interface RulePackValidationError {
  readonly code: RulePackValidationErrorCode;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly field?: string;
  readonly message: string;
}

interface ChoiceOwner {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly field: string;
}

export function validateRulePack(input: RulePackInput): Result<RulePack, readonly RulePackValidationError[]> {
  const errors: RulePackValidationError[] = [];
  const manifest = input.manifest;

  const catalogsByManifestKey: Readonly<Record<string, unknown>> = {
    race: input.races,
    subrace: input.subraces,
    class: input.classes,
    subclass: input.subclasses,
    background: input.backgrounds,
    feat: input.feats,
    feature: input.features,
    resource: input.resources,
    condition: input.conditions,
    equipment: input.equipment,
    spell: input.spells,
    progression: input.progression,
    "character-template": input.characterTemplates,
  };
  const expectedEntityCounts = computeEntityCounts(input);
  const expectedChecksums = computeChecksums(catalogsByManifestKey);

  function compareManifestValues<T extends number | string>(
    declared: Readonly<Record<string, T>>,
    expected: Readonly<Record<string, T>>,
    field: string,
  ): void {
    const keys = [...new Set([...Object.keys(declared), ...Object.keys(expected)])].sort();
    for (const key of keys) {
      if (declared[key] !== expected[key]) {
        errors.push({
          code: "manifest-mismatch",
          field: `manifest.${field}.${key}`,
          message:
            `Manifesto ${field}.${key} divergente: declarado=${String(declared[key])}, ` +
            `calculado=${String(expected[key])}.`,
        });
      }
    }
  }

  // Os valores declarados são a prova do conteúdo publicado. Compará-los antes da publicação
  // impede que o loader faça auto-healing e esconda manifesto stale/adulterado.
  compareManifestValues(manifest.entityCounts, expectedEntityCounts, "entityCounts");
  compareManifestValues(manifest.checksums, expectedChecksums, "checksums");

  // -------------------------------------------------------------------------
  // Manifesto
  // -------------------------------------------------------------------------
  if (!SEMVER_PATTERN.test(manifest.version)) {
    errors.push({
      code: "invalid-version",
      field: "manifest.version",
      message: `Versão do manifesto não é semver "MAJOR.MINOR.PATCH" válido: "${manifest.version}".`,
    });
  }

  const { minSchemaVersion, maxSchemaVersion } = manifest.schemaCompatibility;
  const schemaRangeIsFinite =
    Number.isInteger(minSchemaVersion) &&
    Number.isInteger(maxSchemaVersion) &&
    Number.isFinite(minSchemaVersion) &&
    Number.isFinite(maxSchemaVersion);
  if (!schemaRangeIsFinite || minSchemaVersion < 1 || maxSchemaVersion < minSchemaVersion) {
    errors.push({
      code: "invalid-number",
      field: "manifest.schemaCompatibility",
      message: `schemaCompatibility inválido: min=${minSchemaVersion}, max=${maxSchemaVersion}.`,
    });
  } else if (CHARACTER_SCHEMA_VERSION < minSchemaVersion || CHARACTER_SCHEMA_VERSION > maxSchemaVersion) {
    errors.push({
      code: "incompatible-schema",
      field: "manifest.schemaCompatibility",
      message:
        `schemaCompatibility [${minSchemaVersion}, ${maxSchemaVersion}] não cobre ` +
        `CHARACTER_SCHEMA_VERSION=${CHARACTER_SCHEMA_VERSION}.`,
    });
  }

  // -------------------------------------------------------------------------
  // IDs e fonte por categoria
  // -------------------------------------------------------------------------
  const seenByType = new Map<string, Set<string>>();
  function seenSetFor(type: string): Set<string> {
    let set = seenByType.get(type);
    if (!set) {
      set = new Set<string>();
      seenByType.set(type, set);
    }
    return set;
  }

  function checkBase(
    entityType: EntityType | undefined,
    id: string,
    sourceRefs: readonly SourceRef[] | undefined,
    seenKey: string,
    field = "id",
  ): void {
    if (!isEntityId(id)) {
      errors.push({
        code: "invalid-id",
        entityType,
        entityId: id,
        field,
        message: `ID inválido (esperado kebab-case): "${id}".`,
      });
    } else {
      const seen = seenSetFor(seenKey);
      if (seen.has(id)) {
        errors.push({
          code: "duplicate-id",
          entityType,
          entityId: id,
          field,
          message: `ID duplicado na categoria "${seenKey}": "${id}".`,
        });
      } else {
        seen.add(id);
      }
    }

    if (!sourceRefs || sourceRefs.length === 0) {
      errors.push({
        code: "missing-source",
        entityType,
        entityId: id,
        field: "sourceRefs",
        message: `Definição "${id}"${entityType ? ` (${entityType})` : ""} sem sourceRefs.`,
      });
    } else {
      for (const ref of sourceRefs) {
        if (ref.sourceId !== manifest.id) {
          errors.push({
            code: "foreign-source",
            entityType,
            entityId: id,
            field: "sourceRefs",
            message:
              `sourceRef de "${id}"${entityType ? ` (${entityType})` : ""} aponta para pack ` +
              `"${ref.sourceId}", esperado "${manifest.id}".`,
          });
        }
      }
    }
  }

  for (const race of input.races) checkBase("race", race.id, race.sourceRefs, "race");
  for (const subrace of input.subraces) checkBase("subrace", subrace.id, subrace.sourceRefs, "subrace");
  for (const cls of input.classes) checkBase("class", cls.id, cls.sourceRefs, "class");
  for (const subclass of input.subclasses) checkBase("subclass", subclass.id, subclass.sourceRefs, "subclass");
  for (const bg of input.backgrounds) checkBase("background", bg.id, bg.sourceRefs, "background");
  for (const feat of input.feats) checkBase("feat", feat.id, feat.sourceRefs, "feat");
  for (const feature of input.features) checkBase("feature", feature.id, feature.sourceRefs, "feature");
  for (const resource of input.resources) checkBase("resource", resource.id, resource.sourceRefs, "resource");
  for (const condition of input.conditions) checkBase("condition", condition.id, condition.sourceRefs, "condition");
  for (const item of input.equipment) checkBase("equipment", item.id, item.sourceRefs, "equipment");
  for (const spell of input.spells) checkBase("spell", spell.id, spell.sourceRefs, "spell");
  for (const template of input.characterTemplates) {
    checkBase("character-template", template.templateId, template.sourceRefs, "character-template");
  }
  checkBase("progression", input.progression.id, input.progression.sourceRefs, "progression");

  if (input.abilities) {
    for (const ability of input.abilities) checkBase(undefined, ability.id, ability.sourceRefs, "ability");
  }
  if (input.skills) {
    for (const skill of input.skills) checkBase(undefined, skill.id, skill.sourceRefs, "skill");
  }
  if (input.diceFaces) {
    for (const dice of input.diceFaces) {
      checkBase(undefined, `d${dice.faces}`, dice.sourceRefs, "dice");
    }
  }

  // -------------------------------------------------------------------------
  // Índices para referências cruzadas
  // -------------------------------------------------------------------------
  const racesById = new Map(input.races.map((race) => [race.id, race] as const));
  const subracesById = new Map(input.subraces.map((subrace) => [subrace.id, subrace] as const));
  const classesById = new Map(input.classes.map((cls) => [cls.id, cls] as const));
  const subclassesById = new Map(input.subclasses.map((subclass) => [subclass.id, subclass] as const));
  const backgroundsById = new Map(input.backgrounds.map((bg) => [bg.id, bg] as const));
  const featsById = new Map(input.feats.map((feat) => [feat.id, feat] as const));
  const featuresById = new Map(input.features.map((feature) => [feature.id, feature] as const));
  const resourcesById = new Map(input.resources.map((resource) => [resource.id, resource] as const));
  const conditionsById = new Map(input.conditions.map((condition) => [condition.id, condition] as const));
  const equipmentById = new Map(input.equipment.map((item) => [item.id, item] as const));
  const spellsById = new Map(input.spells.map((spell) => [spell.id, spell] as const));
  const templatesById = new Map(input.characterTemplates.map((template) => [template.templateId, template] as const));

  const skillIds = new Set<string>(SKILLS.map((skill) => skill.id));
  const abilityIds = new Set<string>(ABILITIES.map((ability) => ability.id));

  /**
   * Resolve uma opção explícita de escolha contra todos os catálogos do pack, mais o fallback de
   * perícias/habilidades (uniões fechadas sem catálogo próprio em `RulePack`, mas usadas como
   * `entityId` em escolhas como "skill-proficiency"/"expertise"/"ability-score-increase").
   * Não cobre "language": não existe catálogo de idiomas no contrato congelado (ver handoff).
   */
  function optionResolves(ref: DefinitionRef): boolean {
    if (ref.rulesetId !== manifest.id) return false;
    const id = ref.entityId;
    return (
      racesById.has(id) ||
      subracesById.has(id) ||
      classesById.has(id) ||
      subclassesById.has(id) ||
      backgroundsById.has(id) ||
      featsById.has(id) ||
      featuresById.has(id) ||
      resourcesById.has(id) ||
      conditionsById.has(id) ||
      equipmentById.has(id) ||
      spellsById.has(id) ||
      templatesById.has(id) ||
      skillIds.has(id) ||
      abilityIds.has(id)
    );
  }

  function checkPrerequisites(
    entityType: EntityType,
    entityId: string,
    field: string,
    prerequisites: readonly Prerequisite[],
  ): void {
    for (const prereq of prerequisites) {
      if (prereq.kind === "has-feature") {
        if (prereq.featureRef.rulesetId !== manifest.id || !featuresById.has(prereq.featureRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType,
            entityId,
            field,
            message:
              `Pré-requisito "has-feature" de "${entityId}" (${entityType}) referencia feature ` +
              `inexistente: "${prereq.featureRef.entityId}".`,
          });
        }
      } else if (prereq.kind === "min-class-level") {
        if (prereq.classRef.rulesetId !== manifest.id || !classesById.has(prereq.classRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType,
            entityId,
            field,
            message:
              `Pré-requisito "min-class-level" de "${entityId}" (${entityType}) referencia classe ` +
              `inexistente: "${prereq.classRef.entityId}".`,
          });
        }
      }
      // "has-proficiency"/"custom"/"min-ability-score"/"spellcasting-ability-present": sem
      // checagem cruzada nesta versão — categoria alvo de "has-proficiency" é ambígua no
      // contrato atual (ferramenta/arma/armadura/perícia); ver handoff ("pendências").
    }
  }

  function checkChoice(owner: ChoiceOwner, choice: ChoiceDefinition): void {
    checkPrerequisites(owner.entityType, owner.entityId, `${owner.field}.prerequisites`, choice.prerequisites);
    if (choice.optionSet.kind === "explicit" && choice.kind !== "language") {
      for (const option of choice.optionSet.options) {
        if (!optionResolves(option)) {
          errors.push({
            code: "dangling-reference",
            entityType: owner.entityType,
            entityId: owner.entityId,
            field: `${owner.field}.optionSet`,
            message:
              `Opção da escolha "${choice.id}" em "${owner.entityId}" (${owner.entityType}) referencia ` +
              `entidade inexistente: "${option.entityId}".`,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Referências cruzadas por categoria
  // -------------------------------------------------------------------------
  for (const race of input.races) {
    for (const subraceId of race.subraceIds) {
      const subrace = subracesById.get(subraceId);
      if (!subrace || subrace.raceId !== race.id) {
        errors.push({
          code: "dangling-reference",
          entityType: "race",
          entityId: race.id,
          field: "subraceIds",
          message: `subraceIds de "${race.id}" referencia sub-raça inexistente ou com raceId divergente: "${subraceId}".`,
        });
      }
    }
    for (const choice of race.choices) checkChoice({ entityType: "race", entityId: race.id, field: "choices" }, choice);
  }

  for (const subrace of input.subraces) {
    if (!racesById.has(subrace.raceId)) {
      errors.push({
        code: "dangling-reference",
        entityType: "subrace",
        entityId: subrace.id,
        field: "raceId",
        message: `raceId de "${subrace.id}" referencia raça inexistente: "${subrace.raceId}".`,
      });
    }
    for (const choice of subrace.choices) {
      checkChoice({ entityType: "subrace", entityId: subrace.id, field: "choices" }, choice);
    }
  }

  for (const cls of input.classes) {
    for (const subclassId of cls.subclassIds) {
      const subclass = subclassesById.get(subclassId);
      if (!subclass || subclass.classId !== cls.id) {
        errors.push({
          code: "dangling-reference",
          entityType: "class",
          entityId: cls.id,
          field: "subclassIds",
          message: `subclassIds de "${cls.id}" referencia subclasse inexistente ou com classId divergente: "${subclassId}".`,
        });
      }
    }
    checkChoice({ entityType: "class", entityId: cls.id, field: "skillChoices" }, cls.skillChoices);
    for (const choice of cls.initialEquipmentChoices) {
      checkChoice({ entityType: "class", entityId: cls.id, field: "initialEquipmentChoices" }, choice);
    }
    for (const entry of cls.progression) {
      for (const choice of entry.choicesGranted) {
        checkChoice({ entityType: "class", entityId: cls.id, field: `progression[${entry.level}].choicesGranted` }, choice);
      }
      for (const change of entry.resourceChanges) {
        if (change.resourceRef.rulesetId !== manifest.id || !resourcesById.has(change.resourceRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "class",
            entityId: cls.id,
            field: "progression.resourceChanges",
            message: `resourceChanges de "${cls.id}" nível ${entry.level} referencia recurso inexistente: "${change.resourceRef.entityId}".`,
          });
        }
      }
      for (const featureRef of entry.featureRefs) {
        if (featureRef.rulesetId !== manifest.id || !featuresById.has(featureRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "class",
            entityId: cls.id,
            field: "progression.featureRefs",
            message: `featureRefs de "${cls.id}" nível ${entry.level} referencia feature inexistente: "${featureRef.entityId}".`,
          });
        }
      }
    }
    checkPrerequisites("class", cls.id, "multiclassPrerequisites", cls.multiclassPrerequisites);
  }

  for (const subclass of input.subclasses) {
    if (!classesById.has(subclass.classId)) {
      errors.push({
        code: "dangling-reference",
        entityType: "subclass",
        entityId: subclass.id,
        field: "classId",
        message: `classId de "${subclass.id}" referencia classe inexistente: "${subclass.classId}".`,
      });
    }
    for (const grant of subclass.featureGrants) {
      if (grant.featureRef.rulesetId !== manifest.id || !featuresById.has(grant.featureRef.entityId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "subclass",
          entityId: subclass.id,
          field: "featureGrants",
          message: `featureGrants de "${subclass.id}" referencia feature inexistente: "${grant.featureRef.entityId}".`,
        });
      }
    }
    for (const grant of subclass.spellGrants) {
      if (grant.spellRef.rulesetId !== manifest.id || !spellsById.has(grant.spellRef.entityId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "subclass",
          entityId: subclass.id,
          field: "spellGrants",
          message: `spellGrants de "${subclass.id}" referencia magia inexistente: "${grant.spellRef.entityId}".`,
        });
      }
    }
    for (const change of subclass.resourceChanges) {
      if (change.resourceRef.rulesetId !== manifest.id || !resourcesById.has(change.resourceRef.entityId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "subclass",
          entityId: subclass.id,
          field: "resourceChanges",
          message: `resourceChanges de "${subclass.id}" referencia recurso inexistente: "${change.resourceRef.entityId}".`,
        });
      }
    }
    for (const choice of subclass.choices) {
      checkChoice({ entityType: "subclass", entityId: subclass.id, field: "choices" }, choice);
    }
  }

  for (const bg of input.backgrounds) {
    for (const choice of bg.toolChoices) checkChoice({ entityType: "background", entityId: bg.id, field: "toolChoices" }, choice);
    for (const choice of bg.languageChoices) {
      checkChoice({ entityType: "background", entityId: bg.id, field: "languageChoices" }, choice);
    }
    for (const grant of bg.equipment) {
      if (grant.equipmentRef.rulesetId !== manifest.id || !equipmentById.has(grant.equipmentRef.entityId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "background",
          entityId: bg.id,
          field: "equipment",
          message: `equipment de "${bg.id}" referencia item inexistente: "${grant.equipmentRef.entityId}".`,
        });
      }
    }
  }

  for (const feat of input.feats) {
    checkPrerequisites("feat", feat.id, "prerequisites", feat.prerequisites);
    for (const choice of feat.choices) checkChoice({ entityType: "feat", entityId: feat.id, field: "choices" }, choice);
  }

  for (const feature of input.features) {
    checkPrerequisites("feature", feature.id, "eligibility", feature.eligibility);
    for (const cost of feature.resourceCosts) {
      if (cost.resourceRef.rulesetId !== manifest.id || !resourcesById.has(cost.resourceRef.entityId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "feature",
          entityId: feature.id,
          field: "resourceCosts",
          message: `resourceCosts de "${feature.id}" referencia recurso inexistente: "${cost.resourceRef.entityId}".`,
        });
      }
    }
    for (const choice of feature.choices) {
      checkChoice({ entityType: "feature", entityId: feature.id, field: "choices" }, choice);
    }
    for (const effect of feature.effects) {
      if (effect.kind === "grants-choice") {
        checkChoice({ entityType: "feature", entityId: feature.id, field: "effects.choice" }, effect.choice);
      } else if (effect.kind === "grants-resource") {
        if (effect.resourceRef.rulesetId !== manifest.id || !resourcesById.has(effect.resourceRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "feature",
            entityId: feature.id,
            field: "effects.resourceRef",
            message: `effects de "${feature.id}" referencia recurso inexistente: "${effect.resourceRef.entityId}".`,
          });
        }
      } else if (effect.kind === "grants-condition-immunity") {
        if (effect.conditionRef.rulesetId !== manifest.id || !conditionsById.has(effect.conditionRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "feature",
            entityId: feature.id,
            field: "effects.conditionRef",
            message: `effects de "${feature.id}" referencia condição inexistente: "${effect.conditionRef.entityId}".`,
          });
        }
      } else if (effect.kind === "grants-spell") {
        if (effect.spellRef.rulesetId !== manifest.id || !spellsById.has(effect.spellRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "feature",
            entityId: feature.id,
            field: "effects.spellRef",
            message: `effects de "${feature.id}" referencia magia inexistente: "${effect.spellRef.entityId}".`,
          });
        }
      }
    }
  }

  for (const spell of input.spells) {
    for (const classId of spell.classes) {
      if (!classesById.has(classId)) {
        errors.push({
          code: "dangling-reference",
          entityType: "spell",
          entityId: spell.id,
          field: "classes",
          message: `classes de "${spell.id}" referencia classe inexistente: "${classId}".`,
        });
      }
    }
    for (const effect of spell.effects) {
      if (effect.kind === "grant-choice") {
        checkChoice({ entityType: "spell", entityId: spell.id, field: "effects.choice" }, effect.choice);
      } else if (effect.kind === "apply-condition") {
        if (effect.conditionRef.rulesetId !== manifest.id || !conditionsById.has(effect.conditionRef.entityId)) {
          errors.push({
            code: "dangling-reference",
            entityType: "spell",
            entityId: spell.id,
            field: "effects.conditionRef",
            message: `effects de "${spell.id}" referencia condição inexistente: "${effect.conditionRef.entityId}".`,
          });
        }
      }
    }
  }

  for (const template of input.characterTemplates) {
    if (template.rulesetRef.id !== manifest.id) {
      errors.push({
        code: "dangling-reference",
        entityType: "character-template",
        entityId: template.templateId,
        field: "rulesetRef",
        message: `Template "${template.templateId}" referencia ruleset "${template.rulesetRef.id}", esperado "${manifest.id}".`,
      });
    }
    for (const selection of template.suggestedChoices) {
      for (const ref of selection.selectedIds) {
        if (!optionResolves(ref)) {
          errors.push({
            code: "dangling-reference",
            entityType: "character-template",
            entityId: template.templateId,
            field: "suggestedChoices",
            message: `suggestedChoices de "${template.templateId}" referencia entidade inexistente: "${ref.entityId}".`,
          });
        }
      }
    }
  }

  for (const entry of input.progression.table) {
    if (!Number.isFinite(entry.totalLevel) || !Number.isFinite(entry.xpThreshold) || !Number.isFinite(entry.proficiencyBonus)) {
      errors.push({
        code: "invalid-number",
        entityType: "progression",
        entityId: input.progression.id,
        field: "table",
        message: `Entrada da tabela de progressão com número não finito (nível ${entry.totalLevel}).`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Ciclos de pré-requisito ("has-feature") entre features e talentos
  // -------------------------------------------------------------------------
  type NodeKey = string;
  const graph = new Map<NodeKey, NodeKey[]>();
  function addEdge(from: NodeKey, to: NodeKey): void {
    const list = graph.get(from);
    if (list) {
      list.push(to);
    } else {
      graph.set(from, [to]);
    }
  }
  for (const feature of input.features) {
    const from: NodeKey = `feature:${feature.id}`;
    if (!graph.has(from)) graph.set(from, []);
    for (const prereq of feature.eligibility) {
      if (prereq.kind === "has-feature" && prereq.featureRef.rulesetId === manifest.id) {
        addEdge(from, `feature:${prereq.featureRef.entityId}`);
      }
    }
  }
  for (const feat of input.feats) {
    const from: NodeKey = `feat:${feat.id}`;
    if (!graph.has(from)) graph.set(from, []);
    for (const prereq of feat.prerequisites) {
      if (prereq.kind === "has-feature" && prereq.featureRef.rulesetId === manifest.id) {
        addEdge(from, `feature:${prereq.featureRef.entityId}`);
      }
    }
  }

  const color = new Map<NodeKey, 0 | 1 | 2>();
  const stack: NodeKey[] = [];
  const reportedCycles = new Set<string>();
  function dfs(node: NodeKey): void {
    color.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const nextColor = color.get(next) ?? 0;
      if (nextColor === 0) {
        dfs(next);
      } else if (nextColor === 1) {
        const startIndex = stack.indexOf(next);
        const cycle = stack.slice(startIndex).concat(next);
        const signature = [...cycle].sort().join(">");
        if (!reportedCycles.has(signature)) {
          reportedCycles.add(signature);
          errors.push({
            code: "cycle",
            field: "prerequisites",
            message: `Ciclo de pré-requisito detectado: ${cycle.join(" -> ")}.`,
          });
        }
      }
    }
    stack.pop();
    color.set(node, 2);
  }
  for (const node of graph.keys()) {
    if ((color.get(node) ?? 0) === 0) dfs(node);
  }

  // -------------------------------------------------------------------------
  // Publicação
  // -------------------------------------------------------------------------
  if (errors.length > 0) {
    return err(errors);
  }

  const finalManifest: RulePackManifest = {
    ...manifest,
    entityCounts: { ...manifest.entityCounts },
    checksums: { ...manifest.checksums },
  };

  const rulePack: RulePack = {
    manifest: finalManifest,
    races: racesById,
    subraces: subracesById,
    classes: classesById,
    subclasses: subclassesById,
    backgrounds: backgroundsById,
    feats: featsById,
    features: featuresById,
    resources: resourcesById,
    conditions: conditionsById,
    equipment: equipmentById,
    spells: spellsById,
    progression: input.progression,
    characterTemplates: templatesById,
  };

  return ok(rulePack);
}
