import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

import type { CampaignLogPort } from "@application/ports/campaign-log";
import { CAMPAIGN_LOG_KINDS, type CampaignLogEntry } from "@domain/contracts/campaign-log";
import type { DicePurpose } from "@domain/contracts/dice";
import { asIsoTimestamp } from "@domain/contracts/ids";

/** Quantas entradas recentes a mesa acompanha em tempo real. */
export const CAMPAIGN_LOG_WINDOW = 100;

function toEntry(value: Record<string, unknown>, campaignId: string): CampaignLogEntry | undefined {
  const { id, characterId, characterName, actorUid, kind, summary, detail, rollPurpose, rollTotal, byMaster, createdAt } = value;
  if (typeof id !== "string" || typeof characterId !== "string" || typeof characterName !== "string" || typeof actorUid !== "string" ||
    typeof summary !== "string" || typeof createdAt !== "string" || !CAMPAIGN_LOG_KINDS.includes(kind as CampaignLogEntry["kind"])) return undefined;
  try {
    return {
      id,
      campaignId,
      characterId,
      characterName,
      actorUid,
      byMaster: byMaster === true,
      kind: kind as CampaignLogEntry["kind"],
      summary,
      ...(typeof detail === "string" ? { detail } : {}),
      ...(typeof rollPurpose === "string" ? { rollPurpose: rollPurpose as DicePurpose } : {}),
      ...(typeof rollTotal === "number" ? { rollTotal } : {}),
      createdAt: asIsoTimestamp(createdAt),
    };
  } catch {
    return undefined;
  }
}

export function createFirestoreCampaignLog(firestore: Firestore): CampaignLogPort {
  return {
    async append(entry) {
      await setDoc(doc(firestore, "campaigns", entry.campaignId, "log", entry.id), {
        ...entry,
        at: serverTimestamp(),
      });
    },
    watch(campaignId, onEntries, onError) {
      const recent = query(collection(firestore, "campaigns", campaignId, "log"), orderBy("createdAt", "desc"), limit(CAMPAIGN_LOG_WINDOW));
      return onSnapshot(recent, (snapshot) => {
        onEntries(snapshot.docs.flatMap((item) => toEntry(item.data(), campaignId) ?? []));
      }, (cause) => onError?.(cause));
    },
  };
}
