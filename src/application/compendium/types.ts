import type { AnyDefinition } from "@data/rulepacks/lookup";
import type { RulePack } from "@domain/contracts/definitions/rulepack";
import type { EntityType, PackVersion, RulesetId, RulesetRef } from "@domain/contracts/ids";
import type { SourceRef } from "@domain/contracts/primitives";

export type CompendiumCategoryId = EntityType | "rules" | "combat" | "attributes" | "skills" | "weapons" | "armor" | "rest" | "movement" | "adventure" | "conditions" | "races" | "classes" | "backgrounds" | "spells" | "magia" | "magias" | "truques" | "cantrips" | "regras";
export type StaticCompendiumCategory = "attributes" | "skills" | "rules" | "combat" | "rest" | "movement" | "adventure" | "spell" | "condition" | "race" | "subrace" | "class" | "subclass" | "feature" | "resource" | "progression" | "background" | "equipment" | "feat";

export type CompendiumCategoryStatus = "available" | "pending";

export interface CompendiumCategory {
  readonly id: CompendiumCategoryId;
  readonly label: string;
  readonly status: CompendiumCategoryStatus;
  readonly targetId?: CompendiumCategoryId;
}

export const COMPENDIUM_CATEGORIES: readonly CompendiumCategory[] = [
  { id: "rules", label: "Regras", status: "pending" },
  { id: "combat", label: "Combate", status: "pending" },
  { id: "condition", label: "Condições", status: "available" },
  { id: "attributes", label: "Atributos", status: "pending" },
  { id: "skills", label: "Perícias", status: "pending" },
  { id: "race", label: "Raças", status: "available" },
  { id: "subrace", label: "Sub-raças", status: "available" },
  { id: "class", label: "Classes", status: "available" },
  { id: "subclass", label: "Subclasses", status: "available" },
  { id: "background", label: "Antecedentes", status: "available" },
  { id: "equipment", label: "Equipamentos", status: "available" },
  { id: "weapons", label: "Armas", status: "available", targetId: "equipment" },
  { id: "armor", label: "Armaduras", status: "available", targetId: "equipment" },
  { id: "feat", label: "Talentos", status: "available" },
  { id: "spell", label: "Magia", status: "available" },
  { id: "resource", label: "Recursos", status: "available" },
  { id: "feature", label: "Características", status: "available" },
  { id: "progression", label: "Progressão", status: "available" },
  { id: "rest", label: "Descanso", status: "pending" },
  { id: "movement", label: "Movimentação", status: "pending" },
  { id: "adventure", label: "Aventura", status: "pending" },
];

/** Categories that reuse the equipment dataset but narrow it to a single equipment tag. */
export const COMPENDIUM_CATEGORY_SUBSET_TAG: Readonly<Partial<Record<CompendiumCategoryId, string>>> = {
  weapons: "weapon",
  armor: "armor",
};

/** Visual aliases resolve to the same canonical destination and never duplicate a definition. */
export const COMPENDIUM_CATEGORY_ALIASES: Readonly<Record<string, CompendiumCategoryId>> = {
  regras: "rules",
  rule: "rules",
  rules: "rules",
  magia: "spell",
  magias: "spell",
  truques: "spell",
  spells: "spell",
  cantrips: "spell",
  races: "race",
  classes: "class",
  backgrounds: "background",
  equipment: "equipment",
  condicoes: "condition",
  conditions: "condition",
  atributos: "attributes",
  pericias: "skills",
  perícias: "skills",
};

export interface CompendiumStaticDefinition {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly sourceRefs: readonly SourceRef[];
}

export interface CompendiumBookSpellDefinition extends CompendiumStaticDefinition {
  readonly kind: "book-spell";
  readonly level: number;
  readonly school: string;
  readonly castingTime: string;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly classes: readonly string[];
  readonly description: string;
  readonly higherLevels?: string;
}

/** Texto integral extraído do Livro do Jogador, sem inferir automações do motor. */
export interface CompendiumBookRuleDefinition extends CompendiumStaticDefinition {
  readonly kind: "book-rule";
  readonly sourceHeading: string;
  readonly text: string;
}

export interface CompendiumCatalogItem {
  /** Present for rule-pack definitions; static entries use `kind: "static"`. */
  readonly kind?: "rulepack" | "static";
  readonly entityType?: EntityType;
  readonly category?: StaticCompendiumCategory;
  readonly definition: AnyDefinition | CompendiumStaticDefinition | CompendiumBookSpellDefinition | CompendiumBookRuleDefinition;
  readonly ruleset: RulesetRef;
  readonly aliases?: readonly string[];
  readonly summary?: string;
}

export interface CompendiumIndexEntry {
  readonly key: string;
  readonly ref: CompendiumReference;
  readonly ruleset: RulesetRef;
  readonly category: CompendiumCategoryId;
  readonly title: string;
  readonly aliases: readonly string[];
  readonly tags: readonly string[];
  readonly searchText: string;
  readonly summary?: string;
  readonly sourceRefs: readonly SourceRef[];
}

export interface CompendiumDetail extends CompendiumIndexEntry {
  readonly definition: AnyDefinition | CompendiumStaticDefinition;
}

export interface CompendiumFilters {
  readonly query: string;
  readonly category?: CompendiumCategoryId;
  readonly tag?: string;
  readonly favoriteOnly?: boolean;
}

export interface CompendiumSearchResult {
  readonly entries: readonly CompendiumIndexEntry[];
  readonly filters: CompendiumFilters;
}

export interface RulepackCompendiumReference {
  readonly kind?: "rulepack";
  readonly rulesetId: RulesetId;
  readonly entityId: string;
  readonly entityType: EntityType;
}

export interface StaticCompendiumReference {
  readonly kind: "static";
  readonly rulesetId: RulesetId;
  readonly entityId: string;
  readonly category: StaticCompendiumCategory;
}

export type CompendiumReference = RulepackCompendiumReference | StaticCompendiumReference;

export type CompendiumFavoriteRef =
  | RulepackCompendiumReference & { readonly rulesetVersion: PackVersion }
  | StaticCompendiumReference & { readonly rulesetVersion: PackVersion };

/* Legacy-compatible shape accepted by getDetail for callers that have not yet added `kind`. */
export interface LegacyCompendiumDetailReference {
  readonly rulesetId: RulesetId | string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly version?: string;
}

export interface CompendiumFavoriteState {
  readonly ref: CompendiumFavoriteRef;
  readonly key: string;
  readonly exists: boolean;
  readonly entry?: CompendiumIndexEntry;
}

export interface CompendiumCategoryState {
  readonly category: CompendiumCategory;
  readonly status: "idle" | "loading" | "loaded" | "pending" | "error";
  readonly entries: readonly CompendiumIndexEntry[];
  readonly error?: string;
}

export interface CompendiumLoader {
  (category: EntityType): Promise<readonly CompendiumCatalogItem[]>;
}

export interface CompendiumServiceOptions {
  readonly items?: readonly CompendiumCatalogItem[];
  readonly packs?: readonly RulePack[];
  readonly pendingCategories?: readonly CompendiumCategoryId[];
  readonly loadCategory?: CompendiumLoader;
  readonly initialFavorites?: readonly CompendiumFavoriteRef[];
  readonly excludePackEntityTypes?: readonly EntityType[];
}

export type CompendiumError =
  | { readonly code: "not-found"; readonly message: string; readonly entity: "definition" | "category"; readonly id: string }
  | { readonly code: "category-pending"; readonly message: string; readonly category: CompendiumCategoryId }
  | { readonly code: "category-load-failed"; readonly message: string; readonly category: CompendiumCategoryId };

export function favoriteKey(ref: CompendiumFavoriteRef): string {
  return ref.kind === "static"
    ? `${ref.rulesetId}@${ref.rulesetVersion}:static:${ref.category}:${ref.entityId}`
    : `${ref.rulesetId}@${ref.rulesetVersion}:${ref.entityType}:${ref.entityId}`;
}

export function referenceFromEntry(entry: CompendiumIndexEntry): CompendiumFavoriteRef {
  if (entry.ref.kind === "static") {
    return { kind: "static", rulesetId: entry.ruleset.id, rulesetVersion: entry.ruleset.version, category: entry.ref.category, entityId: String(entry.ref.entityId) };
  }
  return { rulesetId: entry.ruleset.id, rulesetVersion: entry.ruleset.version, entityType: entry.ref.entityType, entityId: String(entry.ref.entityId) };
}

export function canonicalCategory(category: string | undefined): CompendiumCategoryId | undefined {
  if (!category) return undefined;
  const normalized = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  return COMPENDIUM_CATEGORY_ALIASES[normalized] ?? (COMPENDIUM_CATEGORIES.some((candidate) => candidate.id === normalized) ? normalized as CompendiumCategoryId : undefined);
}
