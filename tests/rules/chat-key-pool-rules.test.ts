// @vitest-environment node
/// <reference types="node" />
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import type { ChatModelUsage } from "@application/ports/chat";
import { createFirestoreChatRepository } from "@infrastructure/cloud/firebase/chat-repository";
import { afterAll, describe, expect, it, vi } from "vitest";

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

  it("controla o uso por chave e modelo sem guardar a chave", async () => {
    const owner = await newUser("usage-owner"), player = await newUser("usage-player");
    await setDoc(doc(owner.db, `geminiKeys/${owner.uid}`), { ownerUid: owner.uid, label: "Minha", apiKey: "AQ." + "x".repeat(40), status: "active", cooldownUntil: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const row = (keyId: string, extra = {}) => ({ keyId, model: "gemini-4-hydrogen", keyHash: "0123456789abcdef", day: "2026-11-23", minute: 29_000_000, requests: 1, tokens: 10, minuteRequests: 1, minuteTokens: 10, dayLimit: 20, blockedUntil: Date.now() + 12 * 3_600_000, reason: "day", lastUsedAt: Date.now(), updatedAt: serverTimestamp(), ...extra });
    const path = `geminiUsage/${owner.uid}~gemini-4-hydrogen`;
    await setDoc(doc(player.db, path), row(owner.uid));
    await setDoc(doc(owner.db, path), { requests: increment(1), updatedAt: serverTimestamp() }, { merge: true });
    expect((await getDoc(doc(player.db, path))).data()?.requests).toBe(2);
    await denied(setDoc(doc(player.db, path), row(owner.uid, { apiKey: "AQ.x" })));
    await denied(setDoc(doc(player.db, path), row(owner.uid, { blockedUntil: Date.now() + 48 * 3_600_000 })));
    await denied(setDoc(doc(player.db, path), row(owner.uid, { requests: -1 })));
    await denied(setDoc(doc(player.db, "geminiUsage/inexistente~gemini-4-hydrogen"), row("inexistente")));
    await denied(setDoc(doc(player.db, `geminiUsage/${owner.uid}~outro`), row(owner.uid)));
    await setDoc(doc(player.db, "geminiUsage/all~gemini-4-hydrogen"), row("all", { blockedUntil: Date.now() + 5 * 60_000, reason: "overload" }));
    await denied(setDoc(doc(player.db, "geminiUsage/all~gemini-4-hydrogen"), row("all", { blockedUntil: Date.now() + 3_600_000 })));
    await denied(deleteDoc(doc(player.db, path)));
  });

  it("registra e remove pelo repositório do app, inclusive as linhas de uso da chave", async () => {
    const owner = await newUser("repo-owner"), repository = createFirestoreChatRepository(() => owner.db);
    await repository.saveCredential(owner.uid, "Minha", "AQ." + "z".repeat(40));
    const change = { keyId: owner.uid, model: "gemini-3.8-flash", keyHash: "0123456789abcdef", now: Date.now() };
    await repository.recordUsage(undefined, { ...change, requests: 1 });
    // One listener for the whole test, as in the app: it also proves the live table follows each write.
    let rows: readonly ChatModelUsage[] = [];
    const stop = repository.watchUsage()((value) => { rows = value.filter((item) => item.keyId === owner.uid); }, () => {});
    await vi.waitFor(() => expect(rows[0]?.requests).toBe(1), 5000);
    const first = rows[0];
    await repository.recordUsage(first, { ...change, tokens: 30 });
    await repository.recordUsage(first, { ...change, requests: 1, dayLimit: 20, block: { until: Date.now() + 60_000, reason: "day" } });
    await vi.waitFor(() => expect(rows[0]).toMatchObject({ requests: 2, tokens: 30, dayLimit: 20, reason: "day" }), 5000);
    await repository.removeCredential(owner.uid, owner.uid);
    await vi.waitFor(() => expect(rows).toEqual([]), 5000);
    stop();
  }, 30_000);
});
