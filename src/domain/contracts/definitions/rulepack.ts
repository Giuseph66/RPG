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
import { type EquipmentDefinition } from "./equipment";
import { type FeatDefinition } from "./feat";
import { type FeatureDefinition } from "./feature";
import { type ProgressionDefinition } from "./progression";
import { type RaceDefinition, type SubraceDefinition } from "./race";
import { type ResourceDefinition } from "./resource";
import { type SpellDefinition } from "./spell";

export type ContentPolicy = "embedded" | "external-required" | "private-supplement";

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
}
