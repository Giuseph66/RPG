import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, describe, expect, it } from "vitest";

const enabled = process.env.FIREBASE_RULES_EMULATOR === "1";
const firestoreHost = process.env.FIRESTORE_RULES_HOST ?? "127.0.0.1:8182";
const authHost = process.env.FIREBASE_AUTH_RULES_HOST ?? "127.0.0.1:9199";
const projectId = "demo-rpg-proposal-acl";
const apps: FirebaseApp[] = [];
let appCounter = 0;
let campaignCounter = 0;

type User = { app: FirebaseApp; auth: Auth; db: Firestore; uid: string };

async function newUser(label: string): Promise<User> {
  const app = initializeApp({ apiKey: "demo", authDomain: "demo", projectId, appId: `proposal-${label}` }, `proposal-${label}-${++appCounter}`);
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

async function createCampaign(master: User, ...players: readonly User[]): Promise<string> {
  const campaignId = `campaign-creatures-${++campaignCounter}`;
  await setDoc(doc(master.db, `campaigns/${campaignId}`), {
    id: campaignId,
    ownerUid: master.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    revision: 1,
    schemaVersion: 1,
    name: "Criaturas",
  });
  for (const [index, player] of players.entries()) await createAcceptedMember(master, player, campaignId, index + campaignCounter * 10);
  return campaignId;
}

async function createAcceptedMember(master: User, member: User, campaignId: string, number: number): Promise<void> {
  const inviteId = `e${String(number).padStart(63, "0")}`;
  const invite = doc(master.db, `campaigns/${campaignId}/inviteLinks/${inviteId}`);
  const memberRef = doc(master.db, `campaigns/${campaignId}/members/${member.uid}`);
  await setDoc(invite, {
    campaignId,
    ownerUid: master.uid,
    status: "open",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
  });
  await setDoc(memberRef, {
    campaignId,
    accountId: member.uid,
    ownerUid: master.uid,
    role: "player",
    status: "invited",
    invitedBy: master.uid,
    inviteLinkId: inviteId,
    inviteExpiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
    revision: 1,
  });
  const batch = writeBatch(member.db);
  batch.update(doc(member.db, `campaigns/${campaignId}/inviteLinks/${inviteId}`), {
    status: "accepted",
    acceptedBy: member.uid,
    acceptedAt: serverTimestamp(),
  });
  batch.update(doc(member.db, `campaigns/${campaignId}/members/${member.uid}`), { status: "active", revision: 2 });
  await batch.commit();
}

async function expectDenied(operation: Promise<unknown>): Promise<void> {
  await expect(operation).rejects.toMatchObject({ code: "permission-denied" });
}

function statBlock(challengeRating: { numerator: number; denominator: number } | null) {
  return {
    id: "beast:homebrew-stag",
    name: "Cervo cinzento",
    creatureType: "beast",
    size: "medium",
    armorClass: 12,
    hitPoints: { average: 8, hitDice: "2d8" },
    speeds: { walkCm: 900 },
    abilityScores: { str: 10, dex: 12, con: 10, int: 2, wis: 12, cha: 6 },
    challengeRating,
    sourceRefs: [{ sourceId: "homebrew", chapter: "bestas" }],
  };
}

function pendingProposal(campaignId: string, authorUid: string, id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    campaignId,
    schemaVersion: 1,
    revision: 0,
    proposedBy: authorUid,
    status: "pending",
    statBlock: statBlock(null),
    suggestionReasons: ["Animal não encontrado no catálogo."],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ownerUid: authorUid,
    operationId: `create-${id}`,
    ...overrides,
  };
}

describe.skipIf(!enabled)("regras Firestore de propostas e estado de forma", () => {
  afterAll(async () => {
    await Promise.all(apps.map((app) => deleteApp(app)));
    apps.length = 0;
  });

  it("mantém propostas próprias, pendentes e revisáveis apenas pelo mestre com CAS", async () => {
    const master = await newUser("proposal-master");
    const author = await newUser("proposal-author");
    const other = await newUser("proposal-other");
    const campaignId = await createCampaign(master, author, other);
    const proposalsPath = `campaigns/${campaignId}/proposals`;
    const ownId = "proposal__pending-unknown-cr";
    const ownRef = doc(author.db, `${proposalsPath}/${ownId}`);

    await expect(setDoc(ownRef, pendingProposal(campaignId, author.uid, ownId))).resolves.toBeUndefined();
    await expect(getDoc(ownRef).then((snapshot) => snapshot.data()?.status)).resolves.toBe("pending");

    const otherId = "proposal__another-author";
    const otherRef = doc(other.db, `${proposalsPath}/${otherId}`);
    await setDoc(otherRef, pendingProposal(campaignId, other.uid, otherId));
    await expectDenied(getDoc(doc(author.db, `${proposalsPath}/${otherId}`)).then((snapshot) => snapshot.exists()));
    await expectDenied(getDocs(collection(author.db, proposalsPath)));
    const ownQuery = await getDocs(query(collection(author.db, proposalsPath), where("proposedBy", "==", author.uid)));
    expect(ownQuery.docs.map((snapshot) => snapshot.id)).toEqual([ownId]);
    const masterQuery = await getDocs(collection(master.db, proposalsPath));
    expect(masterQuery.docs.map((snapshot) => snapshot.id).sort()).toEqual([ownId, otherId].sort());

    await expectDenied(setDoc(doc(author.db, `${proposalsPath}/proposal__self-approved`), pendingProposal(
      campaignId,
      author.uid,
      "proposal__self-approved",
      { status: "approved", reviewedBy: author.uid, reviewedAt: new Date().toISOString(), creatureId: "creature__fake" },
    )));
    await expectDenied(setDoc(doc(author.db, `${proposalsPath}/proposal__false-author`), pendingProposal(
      campaignId,
      other.uid,
      "proposal__false-author",
    )));
    await expectDenied(setDoc(doc(author.db, `${proposalsPath}/proposal__bad-size`), pendingProposal(
      campaignId,
      author.uid,
      "proposal__bad-size",
      { statBlock: { ...statBlock(null), size: "colossal" } },
    )));
    await expectDenied(updateDoc(ownRef, { status: "approved", reviewedBy: author.uid, revision: 1 }));

    const override = statBlock({ numerator: 1, denominator: 4 });
    const reviewRef = doc(master.db, `${proposalsPath}/${ownId}`);
    await expectDenied(updateDoc(reviewRef, {
      status: "approved",
      reviewedBy: master.uid,
      reviewedAt: new Date().toISOString(),
      creatureId: "creature__without-applicable-challenge-rating",
      revision: 1,
      updatedAt: serverTimestamp(),
      operationId: "bad-review-keeps-null-cr",
    }));
    await expectDenied(updateDoc(reviewRef, {
      status: "approved",
      reviewedBy: master.uid,
      reviewedAt: new Date().toISOString(),
      reviewedStatBlock: override,
      statBlock: override,
      creatureId: "creature__reviewed",
      revision: 1,
      updatedAt: serverTimestamp(),
      operationId: "bad-review-mutates-draft",
    }));
    await expectDenied(updateDoc(reviewRef, {
      status: "approved",
      reviewedBy: master.uid,
      reviewedAt: new Date().toISOString(),
      reviewedStatBlock: override,
      creatureId: "creature__reviewed",
      revision: 2,
      updatedAt: serverTimestamp(),
      operationId: "bad-review-skips-revision",
    }));
    await expectDenied(updateDoc(reviewRef, {
      status: "approved",
      reviewedBy: master.uid,
      reviewedAt: new Date().toISOString(),
      reviewedStatBlock: override,
      creatureId: "creature__reviewed",
      ownerUid: master.uid,
      revision: 1,
      updatedAt: serverTimestamp(),
      operationId: "bad-review-changes-authority",
    }));
    await updateDoc(reviewRef, {
      status: "approved",
      reviewedBy: master.uid,
      reviewedAt: new Date().toISOString(),
      reviewNote: "ND arbitrado pelo mestre",
      reviewedStatBlock: override,
      creatureId: "creature__reviewed",
      revision: 1,
      updatedAt: serverTimestamp(),
      operationId: "review-approved",
    });
    await expect(getDoc(ownRef).then((snapshot) => snapshot.data()?.status)).resolves.toBe("approved");
    await expectDenied(updateDoc(reviewRef, { status: "rejected", revision: 2, operationId: "second-decision" }));
  }, 30000);

  it("preserva privacidade de registros, avistamentos e palpites legados", async () => {
    const master = await newUser("visibility-master");
    const author = await newUser("visibility-author");
    const other = await newUser("visibility-other");
    const campaignId = await createCampaign(master, author, other);
    const creatureId = "creature__secret-stag";
    await setDoc(doc(master.db, `campaigns/${campaignId}/creatures/${creatureId}`), {
      id: creatureId,
      campaignId,
      schemaVersion: 1,
      revision: 0,
      ownerUid: master.uid,
      name: "Cervo secreto",
      appearance: "Pelagem cinzenta",
      race: "",
      description: "",
      hitPoints: "8",
      armorClass: "12",
      abilities: "FOR 10",
      notes: "Privado até revelar",
      reveals: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await expectDenied(getDoc(doc(author.db, `campaigns/${campaignId}/creatures/${creatureId}`)).then((snapshot) => snapshot.exists()));

    const authorSightingId = `${creatureId}__${author.uid}`;
    const otherSightingId = `${creatureId}__${other.uid}`;
    const createSighting = (accountId: string, id: string) => setDoc(doc(master.db, `campaigns/${campaignId}/sightings/${id}`), {
      id,
      campaignId,
      creatureId,
      accountId,
      schemaVersion: 1,
      revision: 0,
      kind: "beast",
      revealed: { name: "Cervo cinzento", statBlock: statBlock({ numerator: 1, denominator: 4 }) },
      ownerUid: master.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await createSighting(author.uid, authorSightingId);
    await createSighting(other.uid, otherSightingId);

    const ownSighting = await getDoc(doc(author.db, `campaigns/${campaignId}/sightings/${authorSightingId}`));
    expect(ownSighting.data()?.revealed.name).toBe("Cervo cinzento");
    expect(ownSighting.data()?.revealed.statBlock.challengeRating).toEqual({ numerator: 1, denominator: 4 });
    await expectDenied(getDoc(doc(author.db, `campaigns/${campaignId}/sightings/${otherSightingId}`)).then((snapshot) => snapshot.exists()));
    const ownSightings = await getDocs(query(collection(author.db, `campaigns/${campaignId}/sightings`), where("accountId", "==", author.uid)));
    expect(ownSightings.docs.map((snapshot) => snapshot.id)).toEqual([authorSightingId]);
    await expectDenied(getDocs(collection(author.db, `campaigns/${campaignId}/sightings`)));

    const ownGuessRef = doc(author.db, `campaigns/${campaignId}/guesses/${authorSightingId}`);
    const otherGuessRef = doc(other.db, `campaigns/${campaignId}/guesses/${otherSightingId}`);
    const guess = (accountId: string, id: string) => ({
      id,
      campaignId,
      creatureId,
      accountId,
      schemaVersion: 1,
      revision: 0,
      name: "Animal desconhecido",
      note: "Parece um cervo.",
      ownerUid: accountId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(ownGuessRef, guess(author.uid, authorSightingId));
    await setDoc(otherGuessRef, guess(other.uid, otherSightingId));
    await expect(getDoc(ownGuessRef).then((snapshot) => snapshot.data()?.name)).resolves.toBe("Animal desconhecido");
    await expectDenied(getDoc(doc(author.db, `campaigns/${campaignId}/guesses/${otherSightingId}`)).then((snapshot) => snapshot.exists()));
    const ownGuesses = await getDocs(query(collection(author.db, `campaigns/${campaignId}/guesses`), where("accountId", "==", author.uid)));
    expect(ownGuesses.docs.map((snapshot) => snapshot.id)).toEqual([authorSightingId]);
    const masterGuesses = await getDocs(collection(master.db, `campaigns/${campaignId}/guesses`));
    expect(masterGuesses.size).toBe(2);
  }, 30000);

  it("limita o mestre a PV da forma e encerra sem trocar PV original ou snapshot", async () => {
    const master = await newUser("form-master");
    const player = await newUser("form-player");
    const campaignId = await createCampaign(master, player);
    const characterId = "character-form-state";
    const form = statBlock({ numerator: 1, denominator: 4 });
    const transformation = {
      id: "shape-session-1",
      formRef: { rulesetId: "rules-2014", entityId: form.id },
      formSnapshot: form,
      originalSnapshot: { id: characterId, hp: { current: 17, temp: 0 }, classes: [{ id: "druid", level: 5 }] },
      originalSnapshotRef: "shape-session-1",
      formHp: { current: 11, temp: 2 },
      formMaximumHitPoints: 11,
      originalMaximumHitPoints: 17,
      duration: { kind: "hours", value: 1 },
      elapsedMinutes: 0,
    };
    const characterRef = doc(player.db, `campaigns/${campaignId}/characters/${characterId}`);
    const character = {
      id: characterId,
      campaignId,
      ownerUid: player.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revision: 1,
      schemaVersion: 1,
      hp: { current: 17, temp: 0 },
      conditions: [],
      manualAdjustments: [],
      classes: [{ id: "druid", level: 5 }],
      inventory: [{ id: "staff", quantity: 1 }],
      transformation,
    };
    await setDoc(characterRef, character);

    await updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      transformation: { ...transformation, formHp: { current: 9, temp: 2 } },
      updatedAt: serverTimestamp(),
      revision: 2,
      operationId: "master-form-hp",
    });
    const afterHp = (await getDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`))).data()!;
    const currentTransformation = afterHp.transformation as Record<string, unknown>;
    await expectDenied(updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      transformation: { ...currentTransformation, formSnapshot: statBlock({ numerator: 1, denominator: 2 }) },
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "bad-master-changes-snapshot",
    }));
    await expectDenied(updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      transformation: { ...currentTransformation, formHp: { current: 0, temp: 2 } },
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "bad-master-persists-zero-form-hp",
    }));
    await expectDenied(updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      classes: [{ id: "wizard", level: 20 }],
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "bad-master-changes-class",
    }));
    await expectDenied(updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      inventory: [],
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "bad-master-changes-inventory",
    }));
    await expectDenied(updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      transformation: deleteField(),
      hp: { current: 0, temp: 5 },
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "bad-master-changes-original-hp",
    }));

    await updateDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`), {
      transformation: deleteField(),
      hp: { current: 17, temp: 5 },
      updatedAt: serverTimestamp(),
      revision: 3,
      operationId: "normalized-form-exit-temp-5",
    });
    const exited = (await getDoc(doc(master.db, `campaigns/${campaignId}/characters/${characterId}`))).data()!;
    expect(exited.hp).toEqual({ current: 17, temp: 5 });
    expect(exited).not.toHaveProperty("transformation");
    expect(exited.classes).toEqual([{ id: "druid", level: 5 }]);
    expect(exited.inventory).toEqual([{ id: "staff", quantity: 1 }]);
  }, 30000);
});
