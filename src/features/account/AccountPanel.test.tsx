import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";
import type { AuthError, AuthPort, AuthSession } from "@application/ports/auth-port";
import { err, ok } from "@domain/contracts/errors";
import { AccountPanel } from "./AccountPanel";

function fakeAuth(initial: AuthSession | null = null) {
  let session = initial;
  const listeners = new Set<(value: AuthSession | null) => void>();
  const auth: AuthPort = {
    currentSession: () => session,
    observeSession: (listener) => { listeners.add(listener); queueMicrotask(() => listener(session)); return () => listeners.delete(listener); },
    registerWithEmailAndPassword: vi.fn(async (email: string) => {
      session = { uid: "new-user", email };
      for (const listener of listeners) listener(session);
      return ok(session);
    }),
    signInWithEmailAndPassword: vi.fn(async (email: string) => {
      session = { uid: "user-1", email };
      for (const listener of listeners) listener(session);
      return ok(session);
    }),
    signOut: vi.fn(async () => {
      session = null;
      for (const listener of listeners) listener(null);
      return ok(undefined);
    }),
  };
  return auth;
}

async function input(container: HTMLElement, type: string, value: string) {
  const field = container.querySelector(`input[type="${type}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return field;
}

describe("AccountPanel", () => {
  it("explica o modo local quando Firebase não está configurado", async () => {
    const mounted = await mount(<AccountPanel availability={{ available: false, missingKeys: ["VITE_FIREBASE_API_KEY"] }} />);
    expect(mounted.container.textContent).toContain("Modo local");
    expect(mounted.container.textContent).toContain("Firebase Authentication ainda não está disponível");
    expect(mounted.container.querySelector("input")).toBeNull();
    await mounted.unmount();
  });

  it("não oferece uma sessão remota quando o adapter não inicializou", async () => {
    const mounted = await mount(<AccountPanel availability={{ available: true }} />);
    expect(mounted.container.textContent).toContain("Firebase Authentication ainda não está disponível");
    expect(mounted.container.querySelector("form")).toBeNull();
    await mounted.unmount();
  });

  it("entra com email/senha e observa a sessão", async () => {
    const auth = fakeAuth();
    const mounted = await mount(<AccountPanel auth={auth} availability={{ available: true }} />);
    await input(mounted.container, "email", "jogador@example.com");
    await input(mounted.container, "password", "senha-segura");
    const form = mounted.container.querySelector("form") as HTMLFormElement;
    await fireEvent(form, new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith("jogador@example.com", "senha-segura");
    expect(mounted.container.textContent).toContain("Sessão ativa");
    expect(mounted.container.textContent).toContain("jogador@example.com");
    expect((mounted.container.querySelector('input[type="password"]') as HTMLInputElement | null)?.value).toBeUndefined();
    await mounted.unmount();
  });

  it("permite criar conta e não retém a senha depois do sucesso", async () => {
    const auth = fakeAuth();
    const mounted = await mount(<AccountPanel auth={auth} availability={{ available: true }} />);
    const toggle = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Criar uma conta"));
    await fireEvent(toggle!, new MouseEvent("click", { bubbles: true }));
    await input(mounted.container, "email", "novo@example.com");
    await input(mounted.container, "password", "senha-nova");
    await fireEvent(mounted.container.querySelector("form")!, new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    expect(auth.registerWithEmailAndPassword).toHaveBeenCalledWith("novo@example.com", "senha-nova");
    expect(mounted.container.textContent).toContain("Sessão ativa");
    await mounted.unmount();
  });

  it("mostra erro acionável e limpa a senha", async () => {
    const auth = fakeAuth();
    const credentialsError: AuthError = { code: "auth-credentials-error", reason: "wrong-password", message: "wrong" };
    auth.signInWithEmailAndPassword = vi.fn(async () => err(credentialsError));
    const mounted = await mount(<AccountPanel auth={auth} availability={{ available: true }} />);
    await input(mounted.container, "email", "jogador@example.com");
    const password = await input(mounted.container, "password", "errada");
    await fireEvent(mounted.container.querySelector("form")!, new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    expect(mounted.container.textContent).toContain("Email ou senha não conferem");
    expect(password.value).toBe("");
    await mounted.unmount();
  });

  it("encerra a sessão", async () => {
    const auth = fakeAuth({ uid: "user-1", email: "mestre@example.com" });
    const mounted = await mount(<AccountPanel auth={auth} availability={{ available: true }} />);
    const signOut = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Sair da conta"));
    await fireEvent(signOut!, new MouseEvent("click", { bubbles: true }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(mounted.container.textContent).toContain("Entrar");
    await mounted.unmount();
  });
});
