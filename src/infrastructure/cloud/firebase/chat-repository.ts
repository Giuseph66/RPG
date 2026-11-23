import { nextUsage, usageId } from "@application/chat/key-rotation";
import { collection, deleteDoc, doc, getDocFromServer, increment, getDocsFromServer, limit, limitToLast, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, where, writeBatch, type Firestore, type QueryDocumentSnapshot } from "firebase/firestore";
import { CHAT_MODELS, MAX_CREDENTIALS_PER_USER, type ChatConversation, type ChatCredential, type ChatCredentialSummary, type ChatModelUsage, type ChatRepository } from "@application/ports/chat";
import type { ChatAction, ChatMemory, ChatScope } from "@application/ports/chat-agent";

const millis = (value: unknown): number => value && typeof value === "object" && "toMillis" in value ? (value as { toMillis(): number }).toMillis() : 0;
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function credential(id: string, data: Record<string, unknown>): ChatCredentialSummary {
  // The first slot reuses the owner uid as document id (the old single-key layout); ownerUid is stored in every key.
  return { id, ownerUid: String(data.ownerUid ?? id), label: String(data.label ?? "Chave Gemini"), status: data.status === "cooldown" || data.status === "invalid" ? data.status : "active", cooldownUntil: Number(data.cooldownUntil ?? 0), createdAt: millis(data.createdAt) };
}
export function createFirestoreChatRepository(getFirestore: () => Firestore): ChatRepository {
  const conversationsRef = (uid: string) => collection(getFirestore(), "users", uid, "chatConversations");
  const conversationRef = (uid: string, id: string) => doc(conversationsRef(uid), id);
  const messagesRef = (uid: string, id: string) => collection(conversationRef(uid, id), "messages");
  const actionsRef = (uid: string, id: string) => collection(conversationRef(uid, id), "actions");
  const keysRef = () => collection(getFirestore(), "geminiKeys");
  const usageRef = () => collection(getFirestore(), "geminiUsage");
  const keyRef = (id: string) => doc(keysRef(), id);
  /** Fixed slots per account (`uid`, `uid_2` … `uid_N`); the Firestore rules accept only these ids, which caps keys per account. */
  const keySlots = (uid: string) => Array.from({ length: MAX_CREDENTIALS_PER_USER }, (_, index) => index === 0 ? uid : `${uid}_${index + 1}`);
  const memoryRef = (uid: string, memory: ChatMemory) => memory.visibility === "private"
    ? doc(getFirestore(), "users", uid, "chatMemories", memory.id)
    : doc(getFirestore(), "campaigns", memory.campaignId!, "oracleMemories", memory.id);
  const toConversation = (id: string, data: Record<string, unknown>): ChatConversation => ({ id, title: String(data.title), preview: String(data.preview ?? ""), updatedAt: millis(data.updatedAt), ...(data.scope ? { scope: data.scope as ChatScope } : {}), archived: data.archived === true, deleted: data.deleted === true, summary: typeof data.summary === "string" ? data.summary : "", summarizedThrough: Number(data.summarizedThrough ?? 0) });
  const toMessage = (item: { id: string; data(): Record<string, unknown> }) => {
    const data = item.data();
    return { id: item.id, role: data.role === "assistant" ? "assistant" as const : "user" as const, content: String(data.content ?? ""), createdAt: millis(data.createdAt),
      ...(data.trace ? { trace: data.trace as import("@application/ports/chat-agent").ChatTrace } : {}),
      ...(typeof data.turnId === "string" ? { turnId: data.turnId } : {}),
      ...(Array.isArray(data.attachments) ? { attachments: data.attachments } : {}) };
  };
  async function campaignRole(uid: string, id: string): Promise<"master" | "player" | undefined> {
    const campaign = await getDocFromServer(doc(getFirestore(), "campaigns", id));
    if (!campaign.exists()) return undefined;
    if (campaign.data().ownerUid === uid) return "master";
    const member = await getDocFromServer(doc(getFirestore(), "campaigns", id, "members", uid));
    return member.exists() && member.data().status === "active" ? "player" : undefined;
  }
  return {
    campaignRole,
    watchCredentials: (uid) => (next, fail) => onSnapshot(query(keysRef(), where("ownerUid", "==", uid)), (snapshot) => next(snapshot.docs.map((item) => credential(item.id, item.data())).sort((a, b) => a.createdAt - b.createdAt)), fail),
    watchConversations: (uid) => (next, fail) => onSnapshot(query(conversationsRef(uid), orderBy("updatedAt", "desc"), limit(200)), (snapshot) => next(snapshot.docs.map((item) => toConversation(item.id, item.data()))), fail),
    watchMessages: (uid, id) => (next, fail) => onSnapshot(query(messagesRef(uid, id), orderBy("createdAt", "asc"), limitToLast(200)), (snapshot) => next(snapshot.docs.map(toMessage)), fail),
    watchActions: (uid, id) => (next, fail) => onSnapshot(query(actionsRef(uid, id), limit(200)), (snapshot) => next(snapshot.docs.map((item) => ({ ...item.data(), id: item.id, createdAt: millis(item.data().createdAt) }) as ChatAction)), fail),
    async saveCredential(uid, label, apiKey, credentialId) {
      await runTransaction(getFirestore(), async (transaction) => {
        let reference = credentialId ? keyRef(credentialId) : undefined;
        let existing = reference ? await transaction.get(reference) : undefined;
        if (reference && (!existing?.exists() || existing.data().ownerUid !== uid)) throw new Error("Esta chave não existe mais ou não é sua.");
        if (!reference) {
          for (const slot of keySlots(uid)) {
            const candidate = keyRef(slot);
            const snapshot = await transaction.get(candidate);
            if (!snapshot.exists()) { reference = candidate; existing = snapshot; break; }
          }
        }
        if (!reference) throw new Error(`Você já cadastrou ${MAX_CREDENTIALS_PER_USER} chaves. Remova uma para adicionar outra.`);
        transaction.set(reference, { ownerUid: uid, label, apiKey, status: "active", cooldownUntil: 0, createdAt: existing?.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp() });
      });
    },
    async removeCredential(_uid, credentialId) {
      await deleteDoc(keyRef(credentialId));
      // Leftover rows are harmless (their hash no longer matches any key), so failing here is not an error.
      const batch = writeBatch(getFirestore());
      for (const model of CHAT_MODELS) batch.delete(doc(usageRef(), usageId(credentialId, model)));
      await batch.commit().catch(() => {});
    },
    watchUsage: () => (next, fail) => onSnapshot(usageRef(), (snapshot) => next(snapshot.docs.map((item) => { const { updatedAt: _updatedAt, ...row } = item.data(); return row as ChatModelUsage; })), fail),
    async recordUsage(previous, change) {
      const row = nextUsage(previous, change), same = previous?.keyHash === change.keyHash;
      // Counters add up on the server, so simultaneous players do not overwrite each other.
      const count = (kept: boolean, total: number, added = 0) => kept ? increment(added) : total;
      const today = same && previous.day === row.day, current = same && previous.minute === row.minute;
      const counters = { requests: count(today, row.requests, change.requests), tokens: count(today, row.tokens, change.tokens), minuteRequests: count(current, row.minuteRequests, change.requests), minuteTokens: count(current, row.minuteTokens, change.tokens) };
      const { dayLimit, blockedUntil, reason, lastUsedAt, ...base } = row;
      // Within the same secret, only what this change knows is written; the rest may be newer on the server.
      const known = same ? { ...(change.dayLimit ? { dayLimit } : {}), ...(change.block ? { blockedUntil, reason } : {}), ...(change.requests ? { lastUsedAt } : {}) } : { dayLimit, blockedUntil, reason, lastUsedAt };
      await setDoc(doc(usageRef(), usageId(change.keyId, change.model)), { ...base, ...counters, ...known, updatedAt: serverTimestamp() }, { merge: true });
    },
    async listCredentials() {
      const snapshot = await getDocsFromServer(query(keysRef(), orderBy("createdAt", "asc")));
      return snapshot.docs.flatMap((item) => typeof item.data().apiKey === "string" ? [{ ...credential(item.id, item.data()), apiKey: item.data().apiKey } as ChatCredential] : []);
    },
    async setCredentialState(key, status, cooldownUntil) {
      await runTransaction(getFirestore(), async (transaction) => {
        const reference = keyRef(key.id);
        const current = await transaction.get(reference);
        if (current.exists() && current.data().apiKey === key.apiKey) transaction.update(reference, { status, cooldownUntil, updatedAt: serverTimestamp() });
      });
    },
    async createConversation(uid, title, scope) {
      const reference = doc(conversationsRef(uid));
      await setDoc(reference, { ownerUid: uid, title: title.slice(0, 80), preview: "", ...(scope ? { scope: clean(scope) } : {}), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return reference.id;
    },
    async getConversation(uid, id) {
      const value = await getDocFromServer(conversationRef(uid, id));
      if (!value.exists()) throw new Error("Conversa não encontrada.");
      return toConversation(value.id, value.data());
    },
    async pinScope(uid, id, scope) {
      return runTransaction(getFirestore(), async (tx) => {
        const ref = conversationRef(uid, id), current = await tx.get(ref);
        if (!current.exists()) throw new Error("Conversa não encontrada.");
        if (current.data().scope) return current.data().scope as ChatScope;
        tx.update(ref, { scope: clean(scope), updatedAt: serverTimestamp() });
        return scope;
      });
    },
    async updateConversation(uid, id, patch) {
      await runTransaction(getFirestore(), async (tx) => {
        const ref = conversationRef(uid, id), current = await tx.get(ref);
        if (!current.exists()) throw new Error("Conversa não encontrada.");
        if (patch.title !== undefined && (!patch.title.trim() || patch.title.length > 80)) throw new Error("Use um título de até 80 caracteres.");
        tx.update(ref, { ...patch, updatedAt: serverTimestamp() });
      });
    },
    async saveSummary(uid, id, summary, through) {
      await setDoc(conversationRef(uid, id), { summary: summary.slice(0, 8000), summarizedThrough: through, updatedAt: serverTimestamp() }, { merge: true });
    },
    async appendMessage(uid, id, role, content, metadata = {}) {
      const reference = metadata.id ? doc(messagesRef(uid, id), metadata.id) : doc(messagesRef(uid, id));
      await runTransaction(getFirestore(), async (tx) => {
        const existing = await tx.get(reference);
        if (existing.exists()) return; // A retry reuses the same turn/message identity.
        const { id: _id, actions = [], ...fields } = metadata;
        tx.set(reference, { ...clean(fields), role, content, createdAt: serverTimestamp() });
        for (const action of actions) tx.set(doc(actionsRef(uid, id), action.id), { ...clean(action), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        tx.update(conversationRef(uid, id), { preview: content.slice(0, 160), updatedAt: serverTimestamp() });
      });
      return reference.id;
    },
    async recentMessages(uid, id) { return (await getDocsFromServer(query(messagesRef(uid, id), orderBy("createdAt", "desc"), limit(30)))).docs.map(toMessage).reverse(); },
    async allMessages(uid, id) {
      const messages: ReturnType<typeof toMessage>[] = [];
      let cursor: QueryDocumentSnapshot | undefined;
      while (true) {
        const snapshot = await getDocsFromServer(query(messagesRef(uid, id), orderBy("createdAt"), ...(cursor ? [startAfter(cursor)] : []), limit(200)));
        messages.push(...snapshot.docs.map(toMessage));
        if (snapshot.size < 200) return messages;
        if (messages.length >= 5000) throw new Error("A conversa excede 5.000 mensagens. Exporte por períodos antes de continuar.");
        cursor = snapshot.docs.at(-1);
      }
    },
    async claimAction(uid, id, actionId, undo = false) {
      return runTransaction(getFirestore(), async (tx) => {
        const ref = doc(actionsRef(uid, id), actionId), value = await tx.get(ref);
        if (!value.exists()) throw new Error("Ação não encontrada.");
        const action = { ...value.data(), id: value.id } as ChatAction;
        if (undo ? action.status !== "done" || !action.undo : action.status !== "pending") throw new Error("Esta ação já foi processada ou está em execução. Confira o resultado antes de repetir.");
        tx.update(ref, { status: "executing", updatedAt: serverTimestamp() });
        return action;
      });
    },
    async finishAction(uid, id, actionId, status, result, undo) {
      await runTransaction(getFirestore(), async (tx) => {
        const ref = doc(actionsRef(uid, id), actionId), current = await tx.get(ref);
        if (!current.exists()) throw new Error("Ação não encontrada.");
        const content = `${status === "done" ? "Recibo de ação" : status === "rejected" ? "Decisão registrada" : "Falha de execução"}: ${String(current.data().label)}\n${result.slice(0, 8000)}`;
        tx.update(ref, { status, result: result.slice(0, 8000), ...(undo ? { undo: clean(undo) } : {}), updatedAt: serverTimestamp() });
        tx.set(doc(messagesRef(uid, id), `${actionId}-${status}`), { role: "assistant", content, createdAt: serverTimestamp() });
        tx.update(conversationRef(uid, id), { preview: content.slice(0, 160), updatedAt: serverTimestamp() });
      });
    },
    async listMemories(uid, scope) {
      const own = await getDocsFromServer(query(collection(getFirestore(), "users", uid, "chatMemories"), limit(100)));
      const result = own.docs.map((item) => ({ ...item.data(), id: item.id }) as ChatMemory)
        .filter((item) => (!item.campaignId || item.campaignId === scope.campaignId) && (!item.characterId || item.characterId === scope.characterId));
      if (scope.campaignId) {
        const role = await campaignRole(uid, scope.campaignId);
        if (!role) throw new Error("Você não participa desta campanha.");
        const shared = await getDocsFromServer(query(collection(getFirestore(), "campaigns", scope.campaignId, "oracleMemories"), ...(role === "master" ? [] : [where("visibility", "==", "party")]), limit(100)));
        result.push(...shared.docs.map((item) => ({ ...item.data(), id: item.id }) as ChatMemory));
      }
      return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async saveMemory(uid, memory, expectedUpdatedAt) {
      if (memory.visibility !== "private" && (!memory.campaignId || await campaignRole(uid, memory.campaignId) !== "master")) throw new Error("Somente o mestre pode publicar memórias compartilhadas.");
      await runTransaction(getFirestore(), async (tx) => {
        const ref = memoryRef(uid, memory), current = await tx.get(ref);
        if (expectedUpdatedAt ? !current.exists() || current.data().updatedAt !== expectedUpdatedAt : current.exists()) throw new Error("A memória já foi alterada ou registrada. Atualize antes de continuar.");
        tx.set(ref, { ...clean(memory), ownerUid: uid, updatedAt: new Date().toISOString() });
      });
    },
    async deleteMemory(uid, memory) {
      if (memory.visibility !== "private" && (!memory.campaignId || await campaignRole(uid, memory.campaignId) !== "master")) throw new Error("Somente o mestre pode remover memórias compartilhadas.");
      await runTransaction(getFirestore(), async (tx) => {
        const ref = memoryRef(uid, memory), current = await tx.get(ref);
        if (!current.exists()) return;
        if (current.data().updatedAt !== memory.updatedAt) throw new Error("A memória mudou desde a consulta. Atualize antes de remover.");
        tx.delete(ref);
      });
    },
  };
}
