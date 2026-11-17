import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, limitToLast, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, where, writeBatch, type Firestore, type QueryDocumentSnapshot } from "firebase/firestore";
import type { ChatConversation, ChatCredential, ChatCredentialSummary, ChatRepository } from "@application/ports/chat";
import type { ChatAction, ChatMemory, ChatScope } from "@application/ports/chat-agent";

const millis = (value: unknown): number => value && typeof value === "object" && "toMillis" in value ? (value as { toMillis(): number }).toMillis() : 0;
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function credential(uid: string, data: Record<string, unknown>): ChatCredentialSummary {
  return { ownerUid: uid, label: String(data.label ?? "Chave GroqCloud"), status: data.status === "cooldown" || data.status === "invalid" ? data.status : "active", cooldownUntil: Number(data.cooldownUntil ?? 0), createdAt: millis(data.createdAt) };
}
export function createFirestoreChatRepository(getFirestore: () => Firestore): ChatRepository {
  const conversationsRef = (uid: string) => collection(getFirestore(), "users", uid, "chatConversations");
  const conversationRef = (uid: string, id: string) => doc(conversationsRef(uid), id);
  const messagesRef = (uid: string, id: string) => collection(conversationRef(uid, id), "messages");
  const actionsRef = (uid: string, id: string) => collection(conversationRef(uid, id), "actions");
  const keyRef = (uid: string) => doc(getFirestore(), "groqKeys", uid);
  const memoryRef = (uid: string, memory: ChatMemory) => memory.visibility === "private"
    ? doc(getFirestore(), "users", uid, "chatMemories", memory.id)
    : doc(getFirestore(), "campaigns", memory.campaignId!, "oracleMemories", memory.id);
  const toConversation = (id: string, data: Record<string, unknown>): ChatConversation => ({ id, title: String(data.title), preview: String(data.preview ?? ""), updatedAt: millis(data.updatedAt), ...(data.scope ? { scope: data.scope as ChatScope } : {}), archived: data.archived === true, deleted: data.deleted === true });
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
    watchCredential: (uid) => (next, fail) => onSnapshot(keyRef(uid), (snapshot) => next(snapshot.exists() ? credential(uid, snapshot.data()) : undefined), fail),
    watchConversations: (uid) => (next, fail) => onSnapshot(query(conversationsRef(uid), orderBy("updatedAt", "desc"), limit(200)), (snapshot) => next(snapshot.docs.map((item) => toConversation(item.id, item.data()))), fail),
    watchMessages: (uid, id) => (next, fail) => onSnapshot(query(messagesRef(uid, id), orderBy("createdAt", "asc"), limitToLast(200)), (snapshot) => next(snapshot.docs.map(toMessage)), fail),
    watchActions: (uid, id) => (next, fail) => onSnapshot(query(actionsRef(uid, id), limit(200)), (snapshot) => next(snapshot.docs.map((item) => ({ ...item.data(), id: item.id, createdAt: millis(item.data().createdAt) }) as ChatAction)), fail),
    async saveCredential(uid, label, apiKey) {
      await runTransaction(getFirestore(), async (transaction) => {
        const reference = keyRef(uid);
        const existing = await transaction.get(reference);
        transaction.set(reference, { ownerUid: uid, label, apiKey, status: "active", cooldownUntil: 0, createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp() });
      });
    },
    async removeCredential(uid) { await deleteDoc(keyRef(uid)); },
    async listCredentials() {
      const snapshot = await getDocsFromServer(query(collection(getFirestore(), "groqKeys"), orderBy("createdAt", "asc")));
      return snapshot.docs.flatMap((item) => typeof item.data().apiKey === "string" ? [{ ...credential(item.id, item.data()), apiKey: item.data().apiKey } as ChatCredential] : []);
    },
    async setCredentialState(key, status, cooldownUntil) {
      await runTransaction(getFirestore(), async (transaction) => {
        const reference = keyRef(key.ownerUid);
        const current = await transaction.get(reference);
        if (current.exists() && current.data().apiKey === key.apiKey) transaction.update(reference, { status, cooldownUntil, updatedAt: serverTimestamp() });
      });
    },
    async createConversation(uid, title, scope) {
      const reference = doc(conversationsRef(uid));
      await setDoc(reference, clean({ ownerUid: uid, title: title.slice(0, 80), preview: "", ...(scope ? { scope } : {}), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      return reference.id;
    },
    async getConversation(uid, id) {
      const value = await getDocFromServer(conversationRef(uid, id));
      if (!value.exists()) throw new Error("Conversa não encontrada.");
      return toConversation(value.id, value.data());
    },
    async updateConversation(uid, id, patch) {
      await runTransaction(getFirestore(), async (tx) => {
        const ref = conversationRef(uid, id), current = await tx.get(ref);
        if (!current.exists()) throw new Error("Conversa não encontrada.");
        if (patch.title !== undefined && (!patch.title.trim() || patch.title.length > 80)) throw new Error("Use um título de até 80 caracteres.");
        tx.update(ref, { ...patch, updatedAt: serverTimestamp() });
      });
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
      await setDoc(doc(actionsRef(uid, id), actionId), { status, result: result.slice(0, 8000), ...(undo ? { undo: clean(undo) } : {}), updatedAt: serverTimestamp() }, { merge: true });
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
    async saveMemory(uid, memory) {
      if (memory.visibility !== "private" && (!memory.campaignId || await campaignRole(uid, memory.campaignId) !== "master")) throw new Error("Somente o mestre pode publicar memórias compartilhadas.");
      await setDoc(memoryRef(uid, memory), { ...clean(memory), ownerUid: uid, updatedAt: new Date().toISOString() });
    },
    async deleteMemory(uid, memory) {
      if (memory.visibility !== "private" && (!memory.campaignId || await campaignRole(uid, memory.campaignId) !== "master")) throw new Error("Somente o mestre pode remover memórias compartilhadas.");
      await deleteDoc(memoryRef(uid, memory));
    },
  };
}
