import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, describe, expect, it } from "vitest";

import { createFirestoreMapAssetTransferAdapter } from "@infrastructure/cloud/firebase/firestore-map-asset-adapter";
import { asUuid } from "@domain/contracts/ids";

const enabled = process.env.FIREBASE_RULES_EMULATOR === "1";
const firestoreHost = process.env.FIRESTORE_RULES_HOST ?? "127.0.0.1:8182";
const authHost = process.env.FIREBASE_AUTH_RULES_HOST ?? "127.0.0.1:9199";
const projectId = "demo-rpg-base64";
const campaignId = "campaign-base64-rules";
const mapId = "map-base64-rules";
const digest = "a".repeat(64);
const secondDigest = "c".repeat(64);
const chunkDigest = "b".repeat(64);
const now = Timestamp.fromMillis(Date.now() - 1_000);
const later = Timestamp.fromMillis(Date.now() + 86_400_000);

type User = { app: FirebaseApp; auth: Auth; db: Firestore; uid: string };

const apps: FirebaseApp[] = [];
let appCounter = 0;

async function newUser(label: string): Promise<User> {
  const app = initializeApp({ apiKey: "demo", authDomain: "demo", projectId, appId: `rules-${label}` }, `rules-${label}-${++appCounter}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const db = getFirestore(app);
  const [host, portText] = firestoreHost.split(":");
  connectFirestoreEmulator(db, host ?? "127.0.0.1", Number(portText ?? "8182"));
  await signInAnonymously(auth);
  if (!auth.currentUser) throw new Error(`Auth emulator did not create ${label}`);
  return { app, auth, db, uid: auth.currentUser.uid };
}

async function createAcceptedMember(master: User, member: User, number: number): Promise<void> {
  const inviteId = `e${String(number).padStart(63, "0")}`;
  const invite = doc(master.db, `campaigns/${campaignId}/inviteLinks/${inviteId}`);
  const memberRef = doc(master.db, `campaigns/${campaignId}/members/${member.uid}`);
  await setDoc(invite, { campaignId, ownerUid: master.uid, status: "open", createdAt: serverTimestamp(), expiresAt: later });
  await setDoc(memberRef, {
    campaignId,
    accountId: member.uid,
    ownerUid: master.uid,
    role: "player",
    status: "invited",
    invitedBy: master.uid,
    inviteLinkId: inviteId,
    inviteExpiresAt: later,
    revision: 1,
  });
  const batch = writeBatch(member.db);
  batch.update(doc(member.db, `campaigns/${campaignId}/inviteLinks/${inviteId}`), { status: "accepted", acceptedBy: member.uid, acceptedAt: serverTimestamp() });
  batch.update(doc(member.db, `campaigns/${campaignId}/members/${member.uid}`), { status: "active", revision: 2 });
  await batch.commit();
}

async function expectDenied(operation: Promise<unknown>): Promise<void> {
  await expect(operation).rejects.toMatchObject({ code: "permission-denied" });
}

function contentPath(sha256: string): string {
  return `campaigns/${campaignId}/maps/${mapId}/content/${sha256}`;
}

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    kind: "map-image",
    campaignId,
    mapId,
    ownerUid: "",
    sha256: digest,
    mediaType: "image/png",
    size: 3,
    chunkSize: 655360,
    chunkCount: 1,
    complete: false,
    ...overrides,
  };
}

function chunk(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    index: 0,
    chunkCount: 1,
    size: 3,
    sha256: chunkDigest,
    data: "AQID",
    ...overrides,
  };
}

describe.skipIf(!enabled)("C03 — regras de conteúdo base64 de mapa", () => {
  it("preserva privacidade, versionamento e imutabilidade no emulador", async () => {
    const master = await newUser("master");
    const activeUid = await newUser("active-uid");
    const activeAll = await newUser("active-all");
    const inactive = await newUser("inactive");
    const outsider = await newUser("outsider");

    await setDoc(doc(master.db, `campaigns/${campaignId}`), {
      id: campaignId,
      ownerUid: master.uid,
      createdAt: now,
      revision: 1,
      schemaVersion: 1,
      name: "Mapa base64",
    });
    await createAcceptedMember(master, activeUid, 1);
    await createAcceptedMember(master, activeAll, 2);
    await createAcceptedMember(master, inactive, 3);
    await updateDoc(doc(master.db, `campaigns/${campaignId}/members/${inactive.uid}`), { status: "revoked", revision: 3 });

    const mapRef = doc(master.db, `campaigns/${campaignId}/maps/${mapId}`);
    await setDoc(mapRef, {
      id: mapId,
      campaignId,
      ownerUid: master.uid,
      createdAt: now,
      revision: 1,
      schemaVersion: 1,
      name: "Costa",
      assetId: "local-asset",
      pins: [],
      visibleTo: [],
    });

    const contentRef = doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`);
    const chunkRef = doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/0`);
    await expect(getDoc(doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${secondDigest}`)).then((snapshot) => snapshot.exists())).resolves.toBe(false);
    await setDoc(contentRef, manifest({ ownerUid: master.uid }));
    await expect(getDoc(contentRef).then((snapshot) => snapshot.exists())).resolves.toBe(true);
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("staged content unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/0`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("staged chunk unexpectedly readable");
    }));

    await setDoc(chunkRef, chunk());
    await expectDenied(getDocs(collection(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content`)));
    await updateDoc(contentRef, { complete: true });

    const image = {
      storagePath: contentPath(digest),
      sha256: digest,
      ownerUid: master.uid,
      mediaType: "image/png",
      originalName: "costa.png",
      confirmedAt: now,
    };
    await updateDoc(mapRef, { image, visibleTo: [activeUid.uid], revision: 2 });
    await expect(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => snapshot.exists())).resolves.toBe(true);
    await expect(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/0`)).then((snapshot) => snapshot.exists())).resolves.toBe(true);
    await expectDenied(setDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/0`), chunk()));

    const unreferencedRef = doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${secondDigest}`);
    const unreferencedChunk = doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${secondDigest}/chunks/0`);
    await setDoc(unreferencedRef, manifest({ ownerUid: master.uid, sha256: secondDigest }));
    await setDoc(unreferencedChunk, chunk({ sha256: "d".repeat(64) }));
    await updateDoc(unreferencedRef, { complete: true });
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${secondDigest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("unreferenced version unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/wrong-map/content/${digest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("wrong map path unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/1`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("out-of-range chunk unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/01`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("non-canonical chunk path unexpectedly readable");
    }));

    await updateDoc(mapRef, { visibleTo: ["*"], revision: 3 });
    await expect(getDoc(doc(activeAll.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => snapshot.exists())).resolves.toBe(true);
    await expectDenied(getDoc(doc(inactive.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("revoked member unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(outsider.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("outsider unexpectedly readable");
    }));

    await updateDoc(mapRef, { visibleTo: [], revision: 4 });
    await expectDenied(getDoc(doc(activeUid.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("hidden content unexpectedly readable");
    }));
    await expectDenied(getDoc(doc(activeAll.db, `campaigns/${campaignId}/maps/${mapId}/content/${digest}/chunks/0`)).then((snapshot) => {
      if (snapshot.exists()) throw new Error("hidden chunk unexpectedly readable");
    }));

    const invalidManifest = async (sha256: string, overrides: Record<string, unknown>) => {
      await expectDenied(setDoc(doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${sha256}`), manifest({ ownerUid: master.uid, sha256, ...overrides })));
    };
    await invalidManifest("1".repeat(64), { extra: true });
    await invalidManifest("2".repeat(64), { sha256: digest });
    await invalidManifest("3".repeat(64), { complete: true });
    await invalidManifest("4".repeat(64), { size: 10485761 });
    await invalidManifest("5".repeat(64), { chunkCount: 16 });

    const invalidChunkSha = "6".repeat(64);
    const invalidChunkManifest = doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${invalidChunkSha}`);
    await setDoc(invalidChunkManifest, manifest({ ownerUid: master.uid, sha256: invalidChunkSha }));
    const invalidChunkPath = (index = "0") => doc(master.db, `campaigns/${campaignId}/maps/${mapId}/content/${invalidChunkSha}/chunks/${index}`);
    await expectDenied(setDoc(invalidChunkPath(), chunk({ index: 1 })));
    await expectDenied(setDoc(invalidChunkPath(), chunk({ chunkCount: 2 })));
    await expectDenied(setDoc(invalidChunkPath(), chunk({ size: 2 })));
    await expectDenied(setDoc(invalidChunkPath(), chunk({ data: "not-base64" })));
    await expectDenied(setDoc(invalidChunkPath(), chunk({ sha256: "not-a-digest" })));
    await expectDenied(setDoc(invalidChunkPath(), { ...chunk(), extra: true }));

    await expect(setDoc(chunkRef, chunk())).resolves.toBeUndefined();
    await expectDenied(setDoc(chunkRef, chunk({ data: "AgID" })));
  }, 30000);

  it("aceita o payload real do adapter, verifica o round-trip e permite limpeza pelo mestre", async () => {
    const master = await newUser("adapter-master");
    const adapterCampaignId = `campaign-adapter-${master.uid}`;
    const adapterMapId = asUuid("00000000-0000-4000-8000-00000000c303");
    await setDoc(doc(master.db, `campaigns/${adapterCampaignId}`), {
      id: adapterCampaignId,
      ownerUid: master.uid,
      createdAt: now,
      revision: 1,
      schemaVersion: 1,
      name: "Adapter base64",
    });
    await setDoc(doc(master.db, `campaigns/${adapterCampaignId}/maps/${adapterMapId}`), {
      id: adapterMapId,
      campaignId: adapterCampaignId,
      ownerUid: master.uid,
      createdAt: now,
      revision: 1,
      schemaVersion: 1,
      name: "Adapter",
      assetId: "local-adapter",
      pins: [],
      visibleTo: [],
    });

    const adapter = createFirestoreMapAssetTransferAdapter({ firestore: master.db, isAuthenticated: () => true });
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const uploaded = await adapter.upload({ ownerUid: master.uid, campaignId: adapterCampaignId, mapId: adapterMapId, bytes, mediaType: "image/png" });
    expect(uploaded.ok).toBe(true);
    if (!uploaded.ok) return;
    expect(uploaded.value.location).toBe("firestore-map");
    const manifestSnapshot = await getDoc(doc(master.db, uploaded.value.storagePath));
    expect(Object.keys(manifestSnapshot.data() ?? {}).sort()).toEqual(["campaignId", "chunkCount", "chunkSize", "complete", "kind", "mapId", "mediaType", "ownerUid", "schemaVersion", "sha256", "size"]);
    expect(manifestSnapshot.data()).toMatchObject({ complete: true, campaignId: adapterCampaignId, mapId: adapterMapId, ownerUid: master.uid, size: bytes.byteLength });
    const chunkSnapshot = await getDoc(doc(master.db, `${uploaded.value.storagePath}/chunks/0`));
    expect(Object.keys(chunkSnapshot.data() ?? {}).sort()).toEqual(["chunkCount", "data", "index", "schemaVersion", "sha256", "size"]);
    const downloaded = await adapter.download({ ownerUid: master.uid, campaignId: adapterCampaignId, mapId: adapterMapId, sha256: uploaded.value.sha256, storagePath: uploaded.value.storagePath });
    expect(downloaded).toMatchObject({ ok: true, value: { bytes } });
    await expect(adapter.delete({ ownerUid: master.uid, campaignId: adapterCampaignId, mapId: adapterMapId, sha256: uploaded.value.sha256, storagePath: uploaded.value.storagePath })).resolves.toMatchObject({ ok: true });
    await expect(getDoc(doc(master.db, uploaded.value.storagePath)).then((snapshot) => snapshot.exists())).resolves.toBe(false);
  }, 30000);
});

afterAll(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
});
