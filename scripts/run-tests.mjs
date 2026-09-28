#!/usr/bin/env node
/**
 * `npm run test` → vitest run (inclui a auditoria SRD, que só avalia).
 * `npm run test --aplica` (ou `npm run test -- --aplica`) → antes da suíte:
 *   1. auditoria SRD grava as correções aplicáveis em src/data/**;
 *   2. processo novo atualiza os checksums do manifesto do pack;
 *   3. suíte completa roda sobre os dados corrigidos.
 * Demais argumentos seguem para o vitest.
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const aplica = args.includes("--aplica") || process.env.npm_config_aplica === "true";
const vitestArgs = args.filter((arg) => arg !== "--aplica");

// O npm repassa `--aplica` como variável de ambiente; sem remover, cada npx filho avisa.
const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "npm_config_aplica"));

function vitest(extraArgs, env = {}) {
  const result = spawnSync("npx", ["vitest", "run", ...extraArgs], {
    stdio: "inherit",
    env: { ...baseEnv, ...env },
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

if (aplica) {
  const env = { SRD_APLICA: "1" };
  console.log("\n▶ --aplica: gravando correções da auditoria SRD em src/data/**");
  if (vitest(["tests/srd/srd-regras.test.ts", "--silent=false"], env) !== 0) process.exit(1);
  console.log("\n▶ --aplica: atualizando checksums do manifesto do pack");
  if (vitest(["tests/srd/manifesto.test.ts", "--silent=false"], env) !== 0) process.exit(1);
  console.log("\n▶ --aplica: suíte completa sobre os dados corrigidos");
}

process.exit(vitest(vitestArgs));
