/**
 * Montagem REAL do pack `phb-ptbr-local-2017@1.0.0`. Autoridade:
 * docs/criacao/passos/08-classes-racas.md (escopo DATA-002).
 *
 * Os catálogos aceitos por DATA-004, DATA-005 e ITEM-001 são conectados aqui; magias e
 * condições continuam vazias até os respectivos owners entregarem seus catálogos.
 */

import { asEntityId } from "@domain/contracts/ids";
import { type AppError, type Result } from "@domain/contracts/errors";
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

import { PHB_PTBR_LOCAL_2017_MANIFEST } from "../manifest";
import { loadRulePack } from "../load";
import { type RulePackInput } from "../validate";
import { ABILITIES } from "../../abilities/abilities";
import { SKILLS } from "../../skills/skills";
import { DICE } from "../../dice/dice";
import { races, subraces } from "../../races";
import { classes, features, resources } from "../../classes";
import { subclasses } from "../../subclasses";
import { backgrounds } from "../../backgrounds";
import { feats } from "../../feats";
import { progression } from "../../progression";
import { characterTemplates } from "../../character-templates";
import { equipment } from "../../equipment";

const publishedRaces: readonly RaceDefinition[] = races;

const publishedSubraces: readonly SubraceDefinition[] = subraces;

const publishedClasses: readonly ClassDefinition[] = classes;

const publishedSubclasses: readonly SubclassDefinition[] = subclasses;

/** Compatibilidade de ID entre o export de DATA-005 e o catálogo aceito de ITEM-001. */
const publishedBackgrounds: readonly BackgroundDefinition[] = backgrounds.map((background) => ({
  ...background,
  equipment: background.equipment.map((grant) =>
    grant.equipmentRef.entityId === "pen"
      ? { ...grant, equipmentRef: { ...grant.equipmentRef, entityId: asEntityId("ink-pen") } }
      : grant,
  ),
}));

const publishedFeats: readonly FeatDefinition[] = feats;

const publishedFeatures: readonly FeatureDefinition[] = features;

const publishedResources: readonly ResourceDefinition[] = resources;

// TODO(RULE-002): condições entregues por RULE-002 (Apêndice A, docs/criacao/regras/condicoes.md).
const conditions: readonly ConditionDefinition[] = [];

const publishedEquipment: readonly EquipmentDefinition[] = equipment;

// TODO(SPELL-001): magias entregues por SPELL-001 (docs/criacao/magia/).
const spells: readonly SpellDefinition[] = [];

const publishedCharacterTemplates: readonly CharacterTemplate[] = characterTemplates;

/**
 * A progressão completa aceita por DATA-005 é publicada como definição singular do contrato.
 */
const publishedProgression: ProgressionDefinition = progression;

/**
 * Entrada do loader para o pack: catálogos publicados e os catálogos "núcleo" que pertencem a
 * DATA-002 (abilities/skills/dice). Estes três últimos não
 * têm slot em `RulePack` — `Ability`/`Skill`/`DiceFaces` já são uniões fechadas do contrato, não
 * entidades com `EntityId` — então participam apenas da validação de fonte/unicidade aqui.
 */
export const PHB_PTBR_LOCAL_2017_INPUT: RulePackInput = {
  manifest: PHB_PTBR_LOCAL_2017_MANIFEST,
  races: publishedRaces,
  subraces: publishedSubraces,
  classes: publishedClasses,
  subclasses: publishedSubclasses,
  backgrounds: publishedBackgrounds,
  feats: publishedFeats,
  features: publishedFeatures,
  resources: publishedResources,
  conditions,
  equipment: publishedEquipment,
  spells,
  progression: publishedProgression,
  characterTemplates: publishedCharacterTemplates,
  abilities: ABILITIES,
  skills: SKILLS,
  diceFaces: DICE,
};

/** Monta e valida o pack local atual. */
export function loadPhbPtBrLocal2017(): Result<RulePack, AppError> {
  return loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
}
