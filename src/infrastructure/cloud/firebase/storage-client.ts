/**
 * Cliente Cloud Storage lazy. Autoridade: ADR-0007 ("bytes de imagens e outros assets ficam no
 * Cloud Storage, com metadados e hash no Firestore").
 */

import { type FirebaseApp } from "firebase/app";
import { type FirebaseStorage, getStorage } from "firebase/storage";

let cached: FirebaseStorage | null = null;

export function getStorageClient(app: FirebaseApp): FirebaseStorage {
  if (!cached) {
    cached = getStorage(app);
  }
  return cached;
}

export function resetStorageClientCacheForTests(): void {
  cached = null;
}
