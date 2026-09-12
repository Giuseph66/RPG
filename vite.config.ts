import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
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
});
