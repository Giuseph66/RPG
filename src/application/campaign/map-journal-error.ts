/**
 * Converte `JournalDomainError` (src/domain/campaign/journal/types.ts) para `AppError`
 * (src/domain/contracts/errors.ts). São uniões fechadas distintas por desenho: `RuleError`/
 * `AppError` cobrem regras do Rules Engine e infraestrutura; `JournalDomainError` é o erro de
 * domínio específico do agregado de jornada (campanha/diário), que não tem `Command`/
 * `RuleResult` dedicado (ver cabeçalho de `campaign-record-dispatcher.ts`). Os três dispatchers
 * deste diretório reportam falhas de domínio pelo mesmo canal `onError?: (error: AppError, ...)`
 * usado por `inventory-dispatcher.ts`, daí a necessidade desta ponte.
 */

import { appError, type AppError } from "@domain/contracts/errors";
import { type JournalDomainError } from "@domain/campaign/journal";

export function mapJournalError(error: JournalDomainError): AppError {
  switch (error.code) {
    case "validation-error":
      return appError.validation(error.field, error.message);
    case "invalid-link":
      return appError.validation(error.field, error.message);
    case "conflict":
      return appError.conflict(error.expectedRevision, error.actualRevision, error.message);
    case "deletion-scope-required":
      return appError.validation(error.field, error.message);
    case "backup-confirmation-required":
      return appError.validation(error.field, error.message);
  }
}
