/**
 * Inicialização defensiva do Firebase App. Autoridade: ADR-0007 ("Firebase é uma capacidade
 * planejada/opcional"). Nunca lança na ausência de config; chamadores recebem diagnóstico e
 * decidem degradar para uso local.
 */

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";

import {
  type FirebaseConfigDiagnostic,
  type FirebaseEnvSource,
  readViteFirebaseEnv,
  resolveFirebaseConfig,
} from "./config";

let cachedApp: FirebaseApp | null = null;
let cachedDiagnostic: FirebaseConfigDiagnostic | null = null;

/** Resolve o diagnóstico de config sem inicializar SDK algum; seguro para checagens de UI. */
export function getFirebaseConfigDiagnostic(env: FirebaseEnvSource = readViteFirebaseEnv()): FirebaseConfigDiagnostic {
  if (cachedDiagnostic === null) {
    cachedDiagnostic = resolveFirebaseConfig(env);
  }
  return cachedDiagnostic;
}

/**
 * Inicializa (uma vez) e retorna o FirebaseApp, ou null se a config estiver ausente/incompleta.
 * Lazy: nenhum módulo do SDK além de firebase/app é tocado até que Auth/Firestore/Storage sejam
 * explicitamente solicitados por quem os usa.
 */
export function getFirebaseApp(env: FirebaseEnvSource = readViteFirebaseEnv()): FirebaseApp | null {
  const diagnostic = getFirebaseConfigDiagnostic(env);
  if (!diagnostic.available) {
    return null;
  }

  if (cachedApp) {
    return cachedApp;
  }

  try {
    const existing = getApps();
    cachedApp = existing.length > 0 ? existing[0]! : initializeApp(diagnostic.config);
    return cachedApp;
  } catch {
    // A malformed/stale client config must degrade to local-only mode instead of
    // preventing the application shell from mounting.
    return null;
  }
}

/** Uso exclusivo de testes: limpa o estado memoizado do módulo entre casos. */
export function resetFirebaseAppCacheForTests(): void {
  cachedApp = null;
  cachedDiagnostic = null;
}
