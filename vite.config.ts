import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Firebase config chega via VITE_FIREBASE_* (convenção Vite). Nomes legados sem o prefixo
 * (apiKey/authDomain/projectId/storageBucket/messagingSenderId/appId/measurementId) continuam
 * aceitos como fallback de build-time para não quebrar .env já existentes;
 * nenhum valor é gravado em código-fonte, só resolvido de env no momento do build.
 */
const FIREBASE_ENV_KEYS = [
  ["FIREBASE_API_KEY", "apiKey"],
  ["FIREBASE_AUTH_DOMAIN", "authDomain"],
  ["FIREBASE_PROJECT_ID", "projectId"],
  ["FIREBASE_STORAGE_BUCKET", "storageBucket"],
  ["FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"],
  ["FIREBASE_APP_ID", "appId"],
  ["FIREBASE_MEASUREMENT_ID", "measurementId"],
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const firebaseDefine = Object.fromEntries(
    FIREBASE_ENV_KEYS.map(([key, camelKey]) => {
      const viteKey = `VITE_${key}`;
      const value = env[viteKey] ?? env[key] ?? env[camelKey] ?? "";
      return [`import.meta.env.${viteKey}`, JSON.stringify(value)];
    }),
  );

  return {
  define: firebaseDefine,
  plugins: [react()],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@domain": fileURLToPath(new URL("./src/domain", import.meta.url)),
      "@application": fileURLToPath(
        new URL("./src/application", import.meta.url),
      ),
      "@data": fileURLToPath(new URL("./src/data", import.meta.url)),
      "@infrastructure": fileURLToPath(
        new URL("./src/infrastructure", import.meta.url),
      ),
      "@features": fileURLToPath(
        new URL("./src/features", import.meta.url),
      ),
      "@components": fileURLToPath(
        new URL("./src/components", import.meta.url),
      ),
      "@styles": fileURLToPath(new URL("./src/styles", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ["umbonate-theda-conterminously.ngrok-free.dev"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
  };
});
