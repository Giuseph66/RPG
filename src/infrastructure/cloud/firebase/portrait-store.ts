import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

import type { PortraitRemoteStore } from "@application/ports/portrait-store";

export function createFirestorePortraitStore(firestore: Firestore): PortraitRemoteStore {
  return {
    async get(id, campaignId) {
      try {
        const snapshot = await getDoc(campaignId ? doc(firestore, "campaigns", campaignId, "portraits", id) : doc(firestore, "portraits", id));
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
    async putCampaignCopy(record) {
      await setDoc(doc(firestore, "campaigns", record.campaignId, "portraits", record.id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        revision: 1,
        schemaVersion: 1,
      });
    },
  };
}
