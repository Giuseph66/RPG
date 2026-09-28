import { doc, getDoc, type Firestore } from "firebase/firestore";

import type { PortraitRemoteStore } from "@application/ports/portrait-store";

export function createFirestorePortraitStore(firestore: Firestore): PortraitRemoteStore {
  return {
    async get(id) {
      try {
        const snapshot = await getDoc(doc(firestore, "portraits", id));
        if (!snapshot.exists()) return undefined;
        const value = snapshot.data();
        if (value.id !== id || typeof value.data !== "string" || typeof value.mediaType !== "string" || typeof value.sha256 !== "string" || typeof value.ownerUid !== "string") return undefined;
        return {
          id,
          ownerUid: value.ownerUid,
          mediaType: value.mediaType,
          sha256: value.sha256,
          data: value.data,
        };
      } catch {
        return undefined;
      }
    },
  };
}
