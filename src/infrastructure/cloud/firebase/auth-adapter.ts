/**
 * Adaptador de AuthPort sobre Firebase Authentication (email/senha). Autoridade: ADR-0007
 * ("Firebase Authentication começa com email e senha"; "nenhuma chave de cliente é tratada
 * como segredo").
 *
 * Traduz erros do SDK para AuthError normalizado; nenhum tipo do `firebase/auth` escapa deste
 * módulo através do AuthPort.
 */

import {
  type Auth,
  type User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignIn,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { type AuthError, type AuthPort, type AuthSession } from "@application/ports/auth-port";
import { type Result, err, ok } from "@domain/contracts/errors";

import { type FirebaseApp } from "firebase/app";

function toSession(user: User): AuthSession {
  return { uid: user.uid, email: user.email };
}

/** Mapeia códigos do Firebase (ex.: "auth/email-already-in-use") para um motivo normalizado. */
function toAuthError(error: unknown): AuthError {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "unknown";
  const message = error instanceof Error ? error.message : "Falha de autenticação desconhecida.";
  const reason = code.startsWith("auth/") ? code.slice("auth/".length) : code;
  return { code: "auth-credentials-error", message, reason };
}

export class FirebaseAuthAdapter implements AuthPort {
  private readonly auth: Auth;

  constructor(app: FirebaseApp) {
    this.auth = getAuth(app);
  }

  async registerWithEmailAndPassword(email: string, password: string): Promise<Result<AuthSession, AuthError>> {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      return ok(toSession(credential.user));
    } catch (error) {
      return err(toAuthError(error));
    }
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<Result<AuthSession, AuthError>> {
    try {
      const credential = await firebaseSignIn(this.auth, email, password);
      return ok(toSession(credential.user));
    } catch (error) {
      return err(toAuthError(error));
    }
  }

  async signOut(): Promise<Result<void, AuthError>> {
    try {
      await firebaseSignOut(this.auth);
      return ok(undefined);
    } catch (error) {
      return err(toAuthError(error));
    }
  }

  currentSession(): AuthSession | null {
    return this.auth.currentUser ? toSession(this.auth.currentUser) : null;
  }

  observeSession(listener: (session: AuthSession | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => {
      listener(user ? toSession(user) : null);
    });
  }
}
