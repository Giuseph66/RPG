import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = { currentUser: null as { uid: string; email: string | null } | null };
const getAuth = vi.fn((..._args: unknown[]) => mockAuth);
const createUserWithEmailAndPassword = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const signOut = vi.fn();
const onAuthStateChanged = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: (...args: unknown[]) => getAuth(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => signOut(...args),
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChanged(...args),
}));

import { FirebaseAuthAdapter } from "./auth-adapter";

const fakeApp = {} as never;

describe("FirebaseAuthAdapter", () => {
  beforeEach(() => {
    mockAuth.currentUser = null;
    getAuth.mockClear();
    createUserWithEmailAndPassword.mockReset();
    signInWithEmailAndPassword.mockReset();
    signOut.mockReset();
    onAuthStateChanged.mockReset();
  });

  it("registra usuário e retorna sessão normalizada em sucesso", async () => {
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: "u1", email: "a@b.com" } });
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.registerWithEmailAndPassword("a@b.com", "secret123");

    expect(result).toEqual({ ok: true, value: { uid: "u1", email: "a@b.com" } });
  });

  it("normaliza erro do SDK ao registrar com email já em uso", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce(
      Object.assign(new Error("The email address is already in use."), { code: "auth/email-already-in-use" }),
    );
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.registerWithEmailAndPassword("a@b.com", "secret123");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        code: "auth-credentials-error",
        message: "The email address is already in use.",
        reason: "email-already-in-use",
      });
    }
  });

  it("entra com email/senha e retorna sessão", async () => {
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: "u2", email: "c@d.com" } });
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.signInWithEmailAndPassword("c@d.com", "secret123");

    expect(result).toEqual({ ok: true, value: { uid: "u2", email: "c@d.com" } });
  });

  it("normaliza credencial inválida ao entrar", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(
      Object.assign(new Error("Invalid credential"), { code: "auth/invalid-credential" }),
    );
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.signInWithEmailAndPassword("c@d.com", "wrong");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth-credentials-error");
      if (result.error.code === "auth-credentials-error") {
        expect(result.error.reason).toBe("invalid-credential");
      }
    }
  });

  it("sai da sessão com sucesso", async () => {
    signOut.mockResolvedValueOnce(undefined);
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.signOut();

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("propaga falha de signOut como AuthError", async () => {
    signOut.mockRejectedValueOnce(new Error("network down"));
    const adapter = new FirebaseAuthAdapter(fakeApp);

    const result = await adapter.signOut();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("auth-credentials-error");
      if (result.error.code === "auth-credentials-error") {
        expect(result.error.reason).toBe("unknown");
      }
    }
  });

  it("currentSession reflete o usuário atual do SDK", () => {
    mockAuth.currentUser = { uid: "u3", email: "e@f.com" };
    const adapter = new FirebaseAuthAdapter(fakeApp);

    expect(adapter.currentSession()).toEqual({ uid: "u3", email: "e@f.com" });
  });

  it("currentSession retorna null sem usuário logado", () => {
    const adapter = new FirebaseAuthAdapter(fakeApp);

    expect(adapter.currentSession()).toBeNull();
  });

  it("observeSession repassa eventos do SDK traduzidos e retorna unsubscribe", () => {
    const unsubscribe = vi.fn();
    let capturedCallback: ((user: unknown) => void) | undefined;
    onAuthStateChanged.mockImplementationOnce((_auth: unknown, callback: (user: unknown) => void) => {
      capturedCallback = callback;
      return unsubscribe;
    });
    const adapter = new FirebaseAuthAdapter(fakeApp);
    const listener = vi.fn();

    const stop = adapter.observeSession(listener);
    capturedCallback?.({ uid: "u4", email: null });
    capturedCallback?.(null);
    stop();

    expect(listener).toHaveBeenNthCalledWith(1, { uid: "u4", email: null });
    expect(listener).toHaveBeenNthCalledWith(2, null);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
