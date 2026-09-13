import { describe, expect, it } from "vitest";

import { resolveFirebaseConfig } from "./config";

const FULL_ENV = {
  VITE_FIREBASE_API_KEY: "api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "app.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "app-id",
  VITE_FIREBASE_STORAGE_BUCKET: "app.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "123",
  VITE_FIREBASE_APP_ID: "1:123:web:abc",
};

describe("resolveFirebaseConfig", () => {
  it("relata indisponível sem lançar quando nenhuma variável está definida", () => {
    const diagnostic = resolveFirebaseConfig({});

    expect(diagnostic.available).toBe(false);
    if (!diagnostic.available) {
      expect(diagnostic.missingKeys).toContain("VITE_FIREBASE_API_KEY");
      expect(diagnostic.missingKeys.length).toBeGreaterThan(0);
    }
  });

  it("relata indisponível e lista exatamente as chaves ausentes quando config é parcial", () => {
    const diagnostic = resolveFirebaseConfig({ VITE_FIREBASE_API_KEY: "api-key" });

    expect(diagnostic.available).toBe(false);
    if (!diagnostic.available) {
      expect(diagnostic.missingKeys).not.toContain("VITE_FIREBASE_API_KEY");
      expect(diagnostic.missingKeys).toContain("VITE_FIREBASE_PROJECT_ID");
    }
  });

  it("resolve config disponível quando todas as chaves obrigatórias estão presentes", () => {
    const diagnostic = resolveFirebaseConfig(FULL_ENV);

    expect(diagnostic.available).toBe(true);
    if (diagnostic.available) {
      expect(diagnostic.config.projectId).toBe("app-id");
      expect(diagnostic.config.measurementId).toBeUndefined();
    }
  });

  it("inclui measurementId opcional quando presente", () => {
    const diagnostic = resolveFirebaseConfig({ ...FULL_ENV, VITE_FIREBASE_MEASUREMENT_ID: "G-XYZ" });

    expect(diagnostic.available).toBe(true);
    if (diagnostic.available) {
      expect(diagnostic.config.measurementId).toBe("G-XYZ");
    }
  });

  it("trata valores vazios ou apenas espaços como configuração ausente", () => {
    const diagnostic = resolveFirebaseConfig({ ...FULL_ENV, VITE_FIREBASE_PROJECT_ID: "  " });

    expect(diagnostic.available).toBe(false);
    if (!diagnostic.available) {
      expect(diagnostic.missingKeys).toContain("VITE_FIREBASE_PROJECT_ID");
    }
  });
});
