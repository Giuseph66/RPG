/**
 * Identidade estável: brands, referências e helpers de marcação.
 * Ver docs/criacao/dados/ids.md (autoridade) e docs/criacao/09-MODELO-DE-DADOS.md.
 *
 * IDs de entidade (EntityId) são canônicos, em inglês kebab-case, definidos uma vez no pack
 * (ex.: "druid", "cure-wounds"). Qualificadores usam ponto ("druid.wild-shape"). IDs de estado
 * (Uuid) identificam instâncias mutáveis (personagem, item de inventário, comando, etc.).
 *
 * Helpers de marcação são checagens estruturais leves, não validação semântica completa.
 * EntityId recebe checagem de formato kebab-case (decisão explícita do contrato); os demais
 * brands aceitam qualquer string não vazia com o formato mínimo esperado.
 */

declare const brand: unique symbol;

/** Utilitário de branding reutilizado por outros contratos (primitives.ts, versioning.ts). */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

// ---------------------------------------------------------------------------
// Brands de identidade
// ---------------------------------------------------------------------------

/** Identificador estável de definição, kebab-case, com qualificadores opcionais por ponto. */
export type EntityId = Brand<string, "EntityId">;

/** Identificador de estado mutável (personagem, campanha, item, comando, etc.). */
export type Uuid = Brand<string, "Uuid">;

/** Identificador do rule pack (ex.: "phb-ptbr-local-2017"). */
export type RulesetId = Brand<string, "RulesetId">;

/** Versão do rule pack, formato semver simples (ex.: "1.0.0"). */
export type PackVersion = Brand<string, "PackVersion">;

/** Identificador de comando emitido pela aplicação (idempotência). */
export type CommandId = Brand<string, "CommandId">;

/** Timestamp ISO-8601 gerado pela aplicação (nunca pelo domínio). */
export type IsoTimestamp = Brand<string, "IsoTimestamp">;

const KEBAB_SEGMENT = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";
const ENTITY_ID_PATTERN = new RegExp(`^${KEBAB_SEGMENT}(?:\\.${KEBAB_SEGMENT})*$`);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PACK_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** Marca uma string como EntityId; rejeita formato que não seja kebab-case (com qualificadores por ponto). */
export function asEntityId(value: string): EntityId {
  if (!ENTITY_ID_PATTERN.test(value)) {
    throw new Error(
      `EntityId inválido: "${value}". Esperado kebab-case, ex.: "druid" ou "druid.wild-shape".`,
    );
  }
  return value as EntityId;
}

/** Verifica sem lançar exceção; útil para narrowing e validação de importação. */
export function isEntityId(value: string): value is EntityId {
  return ENTITY_ID_PATTERN.test(value);
}

/** Marca uma string como Uuid; checagem de formato mínima (não valida versão/variant). */
export function asUuid(value: string): Uuid {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Uuid inválido: "${value}".`);
  }
  return value as Uuid;
}

export function isUuid(value: string): value is Uuid {
  return UUID_PATTERN.test(value);
}

/** RulesetId reaproveita o formato EntityId (kebab-case), pois identifica o pack pelo nome técnico. */
export function asRulesetId(value: string): RulesetId {
  if (!ENTITY_ID_PATTERN.test(value)) {
    throw new Error(`RulesetId inválido: "${value}".`);
  }
  return value as RulesetId;
}

export function asPackVersion(value: string): PackVersion {
  if (!PACK_VERSION_PATTERN.test(value)) {
    throw new Error(`PackVersion inválida: "${value}". Esperado "MAJOR.MINOR.PATCH".`);
  }
  return value as PackVersion;
}

/** CommandId não exige formato UUID estrito no contrato; qualquer string não vazia é aceita. */
export function asCommandId(value: string): CommandId {
  if (value.length === 0) {
    throw new Error("CommandId não pode ser vazio.");
  }
  return value as CommandId;
}

export function asIsoTimestamp(value: string): IsoTimestamp {
  if (!ISO_TIMESTAMP_PATTERN.test(value)) {
    throw new Error(`IsoTimestamp inválido: "${value}". Esperado ISO-8601 UTC.`);
  }
  return value as IsoTimestamp;
}

// ---------------------------------------------------------------------------
// Referências
// ---------------------------------------------------------------------------

/** Fixa a versão do pack resolvida; DefinitionRef só resolve dentro desta versão exata. */
export interface RulesetRef {
  readonly id: RulesetId;
  readonly version: PackVersion;
}

/**
 * Categoria conhecida de definição imutável. Fechado: nova categoria exige revisão deste
 * contrato (DATA-001), nunca extensão silenciosa por consumidor.
 */
export type EntityType =
  | "race"
  | "subrace"
  | "class"
  | "subclass"
  | "background"
  | "feat"
  | "feature"
  | "resource"
  | "condition"
  | "equipment"
  | "spell"
  | "progression"
  | "character-template";

/**
 * Referência a uma definição dentro de um ruleset. A categoria normalmente é conhecida pelo
 * campo que guarda a referência (ex.: `raceRef` só aponta para "race"); para referências
 * genéricas (favoritos, busca), usar TypedDefinitionRef com `entityType` explícito.
 */
export interface DefinitionRef {
  readonly rulesetId: RulesetId;
  readonly entityId: EntityId;
}

/** DefinitionRef com categoria explícita, para uso genérico (favoritos, busca, listas mistas). */
export interface TypedDefinitionRef<T extends EntityType = EntityType> extends DefinitionRef {
  readonly entityType: T;
}
