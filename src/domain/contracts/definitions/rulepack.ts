/**
 * RulePackManifest / RulePack. Autoridade: dados/ids.md, dados/regras-estaticas.md.
 * Pack inicial: id "phb-ptbr-local-2017", version "1.0.0", language "pt-BR".
 */

import { type EntityId, type EntityType, type PackVersion, type RulesetId } from "../ids";
import { type SourceRef } from "../primitives";
import { type BackgroundDefinition } from "./background";
import { type CharacterTemplate } from "./character-template";
import { type ClassDefinition, type SubclassDefinition } from "./class";
import { type ConditionDefinition } from "./condition";
import { type CreatureStatBlock } from "@domain/creatures";
import { type EquipmentDefinition } from "./equipment";
import { type FeatDefinition } from "./feat";
import { type FeatureDefinition } from "./feature";
import { type ProgressionDefinition } from "./progression";
import { type RaceDefinition, type SubraceDefinition } from "./race";
import { type ResourceDefinition } from "./resource";
import { type SpellDefinition } from "./spell";

export type ContentPolicy = "embedded" | "external-required" | "private-supplement";

/** Substituição opcional de traço de classe; sem seleção, o feature do pack base permanece ativo. */
export interface OptionalClassFeatureReplacement {
  readonly id: EntityId;
  readonly classId: EntityId;
  /** Quando a substituição altera grants de uma subclasse, informa o alvo explícito. */
  readonly subclassId?: EntityId;
  readonly replacesFeatureId: EntityId;
  /** Permite suprimir upgrades dependentes junto da característica-base; singular é legado. */
  readonly replacesFeatureIds?: readonly EntityId[];
  readonly replacementFeatureIds: readonly EntityId[];
  readonly choiceLevel: number;
  readonly sourceRefs: readonly SourceRef[];
}

/** Extensão/alternativa opt-in de uma classe publicada em suplemento. */
export interface OptionalClassOption {
  readonly id: EntityId;
  readonly classId: EntityId;
  readonly kind: "choice" | "extend";
  readonly choiceLevel: number;
  /** ID de uma escolha já concedida pela classe, ampliada sem criar nova concessão. */
  readonly choiceId?: string;
  readonly featureRefs: readonly EntityId[];
  readonly spellRefs?: readonly EntityId[];
  readonly sourceRefs: readonly SourceRef[];
}

/** Conteúdo de suplemento separado do RulePack base e ativado explicitamente por campanha/personagem. */
export interface OptionalRuleContentPack {
  readonly id: EntityId;
  readonly name: string;
  readonly sourceRefs: readonly SourceRef[];
  readonly creatures?: readonly CreatureStatBlock[];
  readonly races?: readonly RaceDefinition[];
  readonly subraces?: readonly SubraceDefinition[];
  readonly features?: readonly FeatureDefinition[];
  readonly subclasses?: readonly SubclassDefinition[];
  readonly spells?: readonly SpellDefinition[];
  readonly classFeatureReplacements?: readonly OptionalClassFeatureReplacement[];
  readonly classOptions?: readonly OptionalClassOption[];
  readonly resources?: readonly ResourceDefinition[];
}

export interface RulePackManifest {
  readonly id: RulesetId;
  readonly name: string;
  readonly edition: string;
  readonly version: PackVersion;
  readonly language: "pt-BR";
  readonly sourceRefs: readonly SourceRef[];
  readonly contentPolicy: ContentPolicy;
  readonly entityCounts: Readonly<Record<EntityType, number>>;
  readonly checksums: Readonly<Record<string, string>>;
  readonly schemaCompatibility: { readonly minSchemaVersion: number; readonly maxSchemaVersion: number };
}

/**
 * Snapshot imutável publicado pelo loader após validar manifesto, hashes, tipos, cardinalidades
 * e referências (dados/regras-estaticas.md). Catálogos indexados por EntityId para lookup O(1).
 */
export interface RulePack {
  readonly manifest: RulePackManifest;
  readonly races: ReadonlyMap<EntityId, RaceDefinition>;
  readonly subraces: ReadonlyMap<EntityId, SubraceDefinition>;
  readonly classes: ReadonlyMap<EntityId, ClassDefinition>;
  readonly subclasses: ReadonlyMap<EntityId, SubclassDefinition>;
  readonly backgrounds: ReadonlyMap<EntityId, BackgroundDefinition>;
  readonly feats: ReadonlyMap<EntityId, FeatDefinition>;
  readonly features: ReadonlyMap<EntityId, FeatureDefinition>;
  readonly resources: ReadonlyMap<EntityId, ResourceDefinition>;
  readonly conditions: ReadonlyMap<EntityId, ConditionDefinition>;
  readonly equipment: ReadonlyMap<EntityId, EquipmentDefinition>;
  readonly spells: ReadonlyMap<EntityId, SpellDefinition>;
  readonly progression: ProgressionDefinition;
  readonly characterTemplates: ReadonlyMap<EntityId, CharacterTemplate>;
  /** Catálogo base de criaturas; suplemento não é unido a ele sem opt-in. */
  readonly creatures?: ReadonlyMap<EntityId, CreatureStatBlock>;
  /** Catálogo disponível para seleção explícita; a presença não ativa seu conteúdo. */
  readonly optionalRulePacks?: ReadonlyMap<EntityId, OptionalRuleContentPack>;
}
