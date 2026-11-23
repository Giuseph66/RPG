/// <reference types="node" />
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, describe, expect, it } from "vitest";

const enabled = process.env.FIREBASE_RULES_EMULATOR === "1";
const firestoreHost = process.env.FIRESTORE_RULES_HOST ?? "127.0.0.1:8182";
const authHost = process.env.FIREBASE_AUTH_RULES_HOST ?? "127.0.0.1:9199";
const projectId = "demo-rpg-chat-keys";
const apps: FirebaseApp[] = [];

async function newUser(label: string) {
  const app = initializeApp({ apiKey: "demo", authDomain: "demo", projectId, appId: label }, label);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(app);
  const [host, port] = firestoreHost.split(":");
  connectFirestoreEmulator(db, host ?? "127.0.0.1", Number(port ?? "8182"));
  await signInAnonymously(auth);
  return { db, uid: auth.currentUser!.uid };
}
const denied = (operation: Promise<unknown>) => expect(operation).rejects.toMatchObject({ code: "permission-denied" });

describe.skipIf(!enabled)("regras do pool de chaves do Gemini", () => {
  afterAll(async () => { await Promise.all(apps.map((app) => deleteApp(app))); });

  it("compartilha a chave com a mesa, mas só o dono troca ou remove", async () => {
    const owner = await newUser("owner"), player = await newUser("player");
    const key = (uid: string, extra = {}) => ({ ownerUid: uid, label: "Minha", apiKey: "AQ." + "x".repeat(40), status: "active", cooldownUntil: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra });
    const path = `geminiKeys/${owner.uid}`;
    await setDoc(doc(owner.db, path), key(owner.uid));
    await setDoc(doc(owner.db, `${path}_5`), key(owner.uid));
    await denied(setDoc(doc(owner.db, `${path}_6`), key(owner.uid)));
    await denied(setDoc(doc(player.db, `geminiKeys/${player.uid}`), key(owner.uid)));
    expect((await getDoc(doc(player.db, path))).exists()).toBe(true);
    await updateDoc(doc(player.db, path), { status: "cooldown", cooldownUntil: Date.now() + 55 * 60_000, updatedAt: serverTimestamp() });
    await denied(updateDoc(doc(player.db, path), { status: "cooldown", cooldownUntil: Date.now() + 2 * 3_600_000, updatedAt: serverTimestamp() }));
    await updateDoc(doc(player.db, path), { status: "invalid", cooldownUntil: 0, updatedAt: serverTimestamp() });
    await denied(updateDoc(doc(player.db, path), { apiKey: "AQ." + "y".repeat(40), updatedAt: serverTimestamp() }));
    await denied(deleteDoc(doc(player.db, path)));
    await deleteDoc(doc(owner.db, path));
  });
});
