import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import {
  collectionGroup,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { afterAll, describe, expect, it } from "vitest";

const enabled = process.env.FIREBASE_RULES_EMULATOR === "1";
const firestoreHost = process.env.FIRESTORE_RULES_HOST ?? "127.0.0.1:8182";
const authHost = process.env.FIREBASE_AUTH_RULES_HOST ?? "127.0.0.1:9199";
const projectId = "demo-rpg-membership";
const campaignId = "campaign-membership-query";
const apps: FirebaseApp[] = [];
let appCounter = 0;

async function newUser(label: string) {
  const app = initializeApp({ apiKey: "demo", authDomain: "demo", projectId, appId: `membership-${label}` }, `membership-${label}-${++appCounter}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(app);
  const [host, portText] = firestoreHost.split(":");
  connectFirestoreEmulator(db, host ?? "127.0.0.1", Number(portText ?? "8182"));
  await signInAnonymously(auth);
  if (!auth.currentUser) throw new Error(`Auth emulator did not create ${label}`);
  return { db, uid: auth.currentUser.uid };
}

async function expectDenied(operation: Promise<unknown>): Promise<void> {
  await expect(operation).rejects.toMatchObject({ code: "permission-denied" });
}

describe.skipIf(!enabled)("regras da consulta collectionGroup de vínculos", () => {
  afterAll(async () => {
    await Promise.all(apps.map((app) => deleteApp(app)));
    apps.length = 0;
  });

  it("permite ao membro buscar só vínculos cujo accountId é sua própria conta", async () => {
    const master = await newUser("master");
    const player = await newUser("player");
    await setDoc(doc(master.db, `campaigns/${campaignId}`), {
      id: campaignId,
      ownerUid: master.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revision: 1,
      schemaVersion: 1,
      name: "Consulta de vínculos",
    });
    await setDoc(doc(master.db, `campaigns/${campaignId}/members/${master.uid}`), {
      campaignId,
      accountId: master.uid,
      ownerUid: master.uid,
      role: "master",
      status: "active",
      invitedBy: master.uid,
    });
    await setDoc(doc(master.db, `campaigns/${campaignId}/members/${player.uid}`), {
      campaignId,
      accountId: player.uid,
      ownerUid: master.uid,
      role: "player",
      status: "invited",
      invitedBy: master.uid,
      inviteExpiresAt: new Date(Date.now() + 60_000),
    });

    const own = await getDocs(query(collectionGroup(player.db, "members"), where("accountId", "==", player.uid)));
    expect(own.docs.map((entry) => entry.ref.path)).toEqual([`campaigns/${campaignId}/members/${player.uid}`]);
    await expectDenied(getDocs(collectionGroup(player.db, "members")));
    await expectDenied(getDocs(query(collectionGroup(player.db, "members"), where("accountId", "==", master.uid))));
  });
});
