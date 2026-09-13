/**
 * Cliente Firestore lazy com persistência offline best-effort. Autoridade: ADR-0007
 * ("IndexedDB é a fonte de escrita imediata"; Firestore é cache/sincronização remota, nunca
 * pré-requisito para uso local).
 *
 * `getFirestoreClient` só é chamado por quem já decidiu usar a nuvem; nada aqui roda no
 * bootstrap padrão do app. Falha ao habilitar persistência (multi-aba, navegador sem suporte)
 * degrada para o cliente em memória sem lançar.
 */

import { type FirebaseApp } from "firebase/app";
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

export interface FirestoreClientResult {
  readonly firestore: Firestore;
  /** false quando o navegador/ambiente não suporta cache local persistente (degradado, não erro). */
  readonly offlinePersistenceEnabled: boolean;
}

let cached: FirestoreClientResult | null = null;

/** Injeção de dependência para teste: permite substituir os factories do SDK. */
export interface FirestoreClientDeps {
  readonly initializeFirestore: typeof initializeFirestore;
  readonly getFirestore: typeof getFirestore;
}

const defaultDeps: FirestoreClientDeps = { initializeFirestore, getFirestore };

export function getFirestoreClient(app: FirebaseApp, deps: FirestoreClientDeps = defaultDeps): FirestoreClientResult {
  if (cached) {
    return cached;
  }

  try {
    const firestore = deps.initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    cached = { firestore, offlinePersistenceEnabled: true };
    return cached;
  } catch {
    try {
      const firestore = deps.initializeFirestore(app, { localCache: memoryLocalCache() });
      cached = { firestore, offlinePersistenceEnabled: false };
      return cached;
    } catch {
      // If Firestore was already initialized elsewhere, initializeFirestore throws again.
      // Reuse that instance so an offline/multi-tab capability failure cannot break local use.
      const firestore = deps.getFirestore(app);
      cached = { firestore, offlinePersistenceEnabled: false };
      return cached;
    }
  }
}

export function resetFirestoreClientCacheForTests(): void {
  cached = null;
}
