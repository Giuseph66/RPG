import { afterEach, describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn((..._args: unknown[]) => ({ name: "[DEFAULT]" }));
const getApps = vi.fn(() => [] as unknown[]);

vi.mock("firebase/app", () => ({
  initializeApp: (...args: unknown[]) => initializeApp(...args),
  getApps: () => getApps(),
}));

import { getFirebaseApp, getFirebaseConfigDiagnostic, resetFirebaseAppCacheForTests } from "./app";

const FULL_ENV = {
  VITE_FIREBASE_API_KEY: "api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "app.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "app-id",
  VITE_FIREBASE_STORAGE_BUCKET: "app.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
  VITE_FIREBASE_APP_ID: "1:123:web:abc",
};

describe("getFirebaseApp", () => {
  afterEach(() => {
    resetFirebaseAppCacheForTests();
    initializeApp.mockClear();
    getApps.mockClear();
  });

  it("retorna null sem inicializar o SDK quando a config está ausente", () => {
    const app = getFirebaseApp({});

    expect(app).toBeNull();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("relata diagnóstico indisponível sem tocar o SDK", () => {
    const diagnostic = getFirebaseConfigDiagnostic({});

    expect(diagnostic.available).toBe(false);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("inicializa uma única vez e memoiza a instância entre chamadas", () => {
    const first = getFirebaseApp(FULL_ENV);
    const second = getFirebaseApp(FULL_ENV);

    expect(first).toBe(second);
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it("reaproveita app já inicializado por outro chamador (getApps não vazio)", () => {
    getApps.mockReturnValueOnce([{ name: "[DEFAULT]" }]);

    const app = getFirebaseApp(FULL_ENV);

    expect(app).toEqual({ name: "[DEFAULT]" });
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it("degrada para modo local quando a configuração é rejeitada pelo SDK", () => {
    initializeApp.mockImplementationOnce(() => {
      throw new Error("invalid firebase config");
    });

    expect(getFirebaseApp(FULL_ENV)).toBeNull();
  });
});
