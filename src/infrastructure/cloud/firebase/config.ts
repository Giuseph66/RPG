/**
 * Config do Firebase. Autoridade: docs/criacao/decisoes/ADR-0007-cloud-sync.md ("configuração
 * não secreta"; "nenhuma chave de cliente é tratada como segredo"; "não haverá anúncio de
 * backend disponível antes da configuração do projeto").
 *
 * Lê variáveis de build-time (VITE_FIREBASE_*, com fallback FIREBASE_* resolvido em
 * vite.config.ts) e produz um diagnóstico explícito em vez de lançar exceção — a ausência de
 * configuração é um estado esperado (Firebase é capacidade opcional) e não deve derrubar o app.
 */

export interface FirebaseClientConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
  readonly measurementId?: string;
}

export interface FirebaseConfigMissing {
  readonly available: false;
  /** Nomes das chaves obrigatórias ausentes; ajuda o diagnóstico sem expor valores. */
  readonly missingKeys: readonly string[];
}

export interface FirebaseConfigAvailable {
  readonly available: true;
  readonly config: FirebaseClientConfig;
}

export type FirebaseConfigDiagnostic = FirebaseConfigMissing | FirebaseConfigAvailable;

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export type FirebaseEnvSource = Readonly<Record<string, string | undefined>>;

/** Resolve e valida a config a partir de um env já materializado; nunca lê process.env/import.meta.env diretamente. */
export function resolveFirebaseConfig(env: FirebaseEnvSource): FirebaseConfigDiagnostic {
  const missingKeys = REQUIRED_KEYS.filter((key) => typeof env[key] !== "string" || env[key]!.trim() === "");
  if (missingKeys.length > 0) {
    return { available: false, missingKeys };
  }

  return {
    available: true,
    config: {
      apiKey: env.VITE_FIREBASE_API_KEY as string,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
      projectId: env.VITE_FIREBASE_PROJECT_ID as string,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId: env.VITE_FIREBASE_APP_ID as string,
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
    },
  };
}

/** Fonte real de env em runtime de app (Vite substitui cada import.meta.env.VITE_* em build-time). */
export function readViteFirebaseEnv(): FirebaseEnvSource {
  return {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}
