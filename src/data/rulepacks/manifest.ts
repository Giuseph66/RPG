/**
 * Manifest do pack `phb-ptbr-local-2017@1.0.0`. Autoridade: docs/criacao/dados/ids.md,
 * docs/criacao/dados/regras-estaticas.md, docs/criacao/14-CONTEUDO-E-FONTES.md.
 *
 * `entityCounts`/`checksums` são declarações verificáveis do conteúdo compilado. O validator
 * compara esses valores com os catálogos carregados antes de publicar o snapshot; divergência
 * falha o carregamento e nunca é corrigida silenciosamente.
 */

import { asPackVersion, asRulesetId, type EntityType, type RulesetId } from "@domain/contracts/ids";
import { type SourceRef } from "@domain/contracts/primitives";
import { type ContentPolicy, type RulePackManifest } from "@domain/contracts/definitions/rulepack";
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

export const PHB_PTBR_LOCAL_2017_ID: RulesetId = asRulesetId("phb-ptbr-local-2017");

/**
 * Catálogos imutáveis do pack, como arrays (forma de entrada; `RulePack` os indexa em `Map`).
 * Compartilhado entre manifest.ts (contagens), checksum.ts (hashes) e validate.ts
 * (`RulePackInput` estende esta forma acrescentando `manifest` e metadados fora do contrato).
 */
export interface RulePackCatalogs {
  readonly races: readonly RaceDefinition[];
  readonly subraces: readonly SubraceDefinition[];
  readonly classes: readonly ClassDefinition[];
  readonly subclasses: readonly SubclassDefinition[];
  readonly backgrounds: readonly BackgroundDefinition[];
  readonly feats: readonly FeatDefinition[];
  readonly features: readonly FeatureDefinition[];
  readonly resources: readonly ResourceDefinition[];
  readonly conditions: readonly ConditionDefinition[];
  readonly equipment: readonly EquipmentDefinition[];
  readonly spells: readonly SpellDefinition[];
  readonly progression: ProgressionDefinition;
  readonly characterTemplates: readonly CharacterTemplate[];
}

const PHB_ENTITY_COUNTS: Readonly<Record<EntityType, number>> = {
  race: 9,
  subrace: 9,
  class: 12,
  subclass: 41,
  background: 13,
  feat: 42,
  feature: 930,
  resource: 9,
  condition: 15,
  equipment: 220,
  spell: 6,
  progression: 1,
  "character-template": 12,
};

/** Conta cada categoria a partir dos catálogos reais; `progression` é sempre 0 ou 1 (singular). */
export function computeEntityCounts(catalogs: RulePackCatalogs): Readonly<Record<EntityType, number>> {
  return {
    race: catalogs.races.length,
    subrace: catalogs.subraces.length,
    class: catalogs.classes.length,
    subclass: catalogs.subclasses.length,
    background: catalogs.backgrounds.length,
    feat: catalogs.feats.length,
    feature: catalogs.features.length,
    resource: catalogs.resources.length,
    condition: catalogs.conditions.length,
    equipment: catalogs.equipment.length,
    spell: catalogs.spells.length,
    progression: catalogs.progression ? 1 : 0,
    "character-template": catalogs.characterTemplates.length,
  };
}

/** cap.14 (fontes) — identidade do pack e da compilação local. */
export const PHB_PTBR_LOCAL_2017_SOURCE_REF: SourceRef = {
  sourceId: PHB_PTBR_LOCAL_2017_ID,
  chapter: "Sumário",
  printedPage: 1,
  pdfPage: 1,
  section: "Identificação da compilação (docs/criacao/14-CONTEUDO-E-FONTES.md)",
};

/**
 * Política de conteúdo escolhida: "embedded" — o pack vive como dado local no bundle do app
 * (paráfrase estruturada, não o texto do PDF), sem exigir arquivo externo nem licença de
 * suplemento privado. Ver docs/criacao/14-CONTEUDO-E-FONTES.md ("Política de conteúdo").
 */
const CONTENT_POLICY: ContentPolicy = "embedded";

/**
 * Manifesto declarado do pack local. Estes valores correspondem aos catálogos atualmente
 * compilados; qualquer alteração nos catálogos exige atualizar o manifesto deliberadamente.
 */
export const PHB_PTBR_LOCAL_2017_MANIFEST: RulePackManifest = {
  id: PHB_PTBR_LOCAL_2017_ID,
  name: "Livro do Jogador — compilação local pt-BR 2017",
  edition: "5e, compilação fornecida, base 2014 com divergências registradas",
  version: asPackVersion("1.0.0"),
  language: "pt-BR",
  sourceRefs: [PHB_PTBR_LOCAL_2017_SOURCE_REF],
  contentPolicy: CONTENT_POLICY,
  entityCounts: PHB_ENTITY_COUNTS,
  checksums: {
    race: "62ea6f52",
    subrace: "f173996e",
    class: "2b9d5b91",
    subclass: "193917db",
    background: "80d1be8a",
    feat: "2bd75a8f",
    feature: "b87e9a56",
    resource: "bb1fab4a",
    condition: "7e539456",
    equipment: "5a01d5cf",
    spell: "8e1fdd97",
    progression: "10a8a812",
    "character-template": "8ec0050d",
  },
  schemaCompatibility: { minSchemaVersion: 1, maxSchemaVersion: 1 },
};
