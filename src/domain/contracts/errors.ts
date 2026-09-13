/**
 * Erros discriminados e Result. Autoridade: dados/schemas.md ("Erros discriminados"),
 * 08-PERSISTENCIA-LOCAL.md, dados/migracoes.md.
 *
 * Mensagem legível é obrigatória em todo erro; nunca tratar falha como coleção vazia.
 */

import { type RulesetRef } from "./ids";
import { type SourceRef } from "./primitives";
import { type Revision } from "./versioning";

export interface ValidationError {
  readonly code: "validation-error";
  readonly message: string;
  readonly field: string;
}

export interface NotFoundError {
  readonly code: "not-found";
  readonly message: string;
  readonly entity: string;
  readonly id: string;
}

export interface ConflictError {
  readonly code: "conflict";
  readonly message: string;
  readonly expectedRevision: Revision;
  readonly actualRevision: Revision;
}

export interface QuotaExceededError {
  readonly code: "quota-exceeded";
  readonly message: string;
  readonly requestedBytes?: number;
  readonly availableBytes?: number;
}

export interface StorageUnavailableError {
  readonly code: "storage-unavailable";
  readonly message: string;
  readonly cause?: string;
}

export interface UnsupportedSchemaError {
  readonly code: "unsupported-schema";
  readonly message: string;
  readonly foundVersion: number;
  readonly supportedRange: { readonly min: number; readonly max: number };
}

export interface MissingRulesetError {
  readonly code: "missing-ruleset";
  readonly message: string;
  readonly rulesetRef: RulesetRef;
}

export interface CorruptRecordError {
  readonly code: "corrupt-record";
  readonly message: string;
  readonly recordId: string;
  readonly rawPreservedRef?: string;
}

export interface UnresolvedRuleError {
  readonly code: "unresolved-rule";
  readonly message: string;
  readonly pendencyId?: string;
  readonly sourceRef?: SourceRef;
}

/** Erros explícitos dos casos de uso de conta e participação em campanha. */
export type MembershipErrorCode =
  | "membership-unauthenticated"
  | "membership-forbidden"
  | "membership-not-found"
  | "membership-invalid-state"
  | "membership-validation"
  | "membership-unavailable";

export interface MembershipError {
  readonly code: MembershipErrorCode;
  readonly message: string;
  readonly campaignId?: string;
  readonly accountId?: string;
}

/** União fechada de erros de aplicação/infraestrutura. Distinta de RuleError (rules.ts), que
 * cobre rejeições de domínio dentro de um RuleResult. */
export type AppError =
  | ValidationError
  | NotFoundError
  | ConflictError
  | QuotaExceededError
  | StorageUnavailableError
  | UnsupportedSchemaError
  | MissingRulesetError
  | CorruptRecordError
  | UnresolvedRuleError
  | MembershipError;

export type Result<T, E = AppError> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/** Construtores de erro legíveis; mensagem padrão pode ser sobrescrita pelo chamador. */
export const appError = {
  validation(field: string, message: string): ValidationError {
    return { code: "validation-error", field, message };
  },
  notFound(entity: string, id: string, message = `${entity} "${id}" não encontrado.`): NotFoundError {
    return { code: "not-found", entity, id, message };
  },
  conflict(
    expectedRevision: Revision,
    actualRevision: Revision,
    message = "Revisão esperada não confere com a revisão atual.",
  ): ConflictError {
    return { code: "conflict", expectedRevision, actualRevision, message };
  },
  quotaExceeded(
    message = "Cota de armazenamento excedida.",
    requestedBytes?: number,
    availableBytes?: number,
  ): QuotaExceededError {
    return { code: "quota-exceeded", message, requestedBytes, availableBytes };
  },
  storageUnavailable(message = "Armazenamento indisponível.", cause?: string): StorageUnavailableError {
    return { code: "storage-unavailable", message, cause };
  },
  unsupportedSchema(
    foundVersion: number,
    supportedRange: { readonly min: number; readonly max: number },
    message = "Versão de schema não suportada.",
  ): UnsupportedSchemaError {
    return { code: "unsupported-schema", foundVersion, supportedRange, message };
  },
  missingRuleset(rulesetRef: RulesetRef, message = "Rule pack não encontrado ou incompatível."): MissingRulesetError {
    return { code: "missing-ruleset", rulesetRef, message };
  },
  corruptRecord(recordId: string, message = "Registro corrompido.", rawPreservedRef?: string): CorruptRecordError {
    return { code: "corrupt-record", recordId, message, rawPreservedRef };
  },
  unresolvedRule(message: string, pendencyId?: string, sourceRef?: SourceRef): UnresolvedRuleError {
    return { code: "unresolved-rule", message, pendencyId, sourceRef };
  },
};
