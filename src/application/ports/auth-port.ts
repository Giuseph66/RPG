/**
 * AuthPort. Autoridade: docs/criacao/decisoes/ADR-0007-cloud-sync.md ("Firebase Authentication
 * começa com email e senha"; "sessão autenticada identifica o usuário; nenhuma chave de cliente
 * é tratada como segredo").
 *
 * Isola o domínio/aplicação do SDK de autenticação concreto. Nenhum tipo do Firebase (ou de
 * qualquer outro provedor) atravessa esta fronteira.
 */

import { type Result } from "@domain/contracts/errors";

export interface AuthSession {
  readonly uid: string;
  readonly email: string | null;
}

export interface AuthUnavailableError {
  readonly code: "auth-unavailable";
  readonly message: string;
  readonly cause?: string;
}

export interface AuthCredentialsError {
  readonly code: "auth-credentials-error";
  readonly message: string;
  /** Motivo normalizado, independente do provedor (ex.: "email-in-use", "invalid-credential"). */
  readonly reason: string;
}

/** União fechada de erros de autenticação; distinta de AppError (contratos de domínio local). */
export type AuthError = AuthUnavailableError | AuthCredentialsError;

export interface AuthPort {
  registerWithEmailAndPassword(email: string, password: string): Promise<Result<AuthSession, AuthError>>;
  signInWithEmailAndPassword(email: string, password: string): Promise<Result<AuthSession, AuthError>>;
  signOut(): Promise<Result<void, AuthError>>;
  /** Sessão atual, se já resolvida; null antes da primeira notificação do observador. */
  currentSession(): AuthSession | null;
  /** Observa mudanças de sessão (login, logout, expiração). Retorna função de cancelamento. */
  observeSession(listener: (session: AuthSession | null) => void): () => void;
}
