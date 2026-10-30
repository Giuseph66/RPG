import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

import type { PortraitRecord, PortraitRemoteStore } from "@application/ports/portrait-store";

export function createFirestorePortraitStore(firestore: Firestore, currentOwnerUid?: () => string | undefined): PortraitRemoteStore {
  return {
    async get(id, campaignId, ownerUid) {
      const read = async (reference: ReturnType<typeof doc>, expectedOwner?: string): Promise<PortraitRecord | undefined> => {
        const snapshot = await getDoc(reference);
        if (!snapshot.exists()) return undefined;
        const value = snapshot.data();
        if (value.id !== id || typeof value.data !== "string" || typeof value.mediaType !== "string" || typeof value.sha256 !== "string" || typeof value.ownerUid !== "string" || (expectedOwner !== undefined && value.ownerUid !== expectedOwner)) return undefined;
        return { id, ownerUid: value.ownerUid, mediaType: value.mediaType, sha256: value.sha256, data: value.data };
      };

      if (campaignId) {
        try {
          return await read(doc(firestore, "campaigns", campaignId, "portraits", id));
        } catch {
          return undefined;
        }
      }
      const privateOwnerUid = ownerUid ?? currentOwnerUid?.();
      if (!privateOwnerUid) return undefined;

      // A deployment with only the legacy rule may reject the scoped read;
      // that must still allow a safe same-owner legacy fallback.
      try {
        const scoped = await read(doc(firestore, "users", privateOwnerUid, "portraits", id), privateOwnerUid);
        if (scoped) return scoped;
      } catch {
        // Continue to the owner-checked legacy read below.
      }
      try {
        return await read(doc(firestore, "portraits", id), privateOwnerUid);
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
