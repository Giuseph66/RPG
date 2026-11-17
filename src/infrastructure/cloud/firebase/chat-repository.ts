import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, limitToLast, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, writeBatch, type Firestore } from "firebase/firestore";
import { DEFAULT_CHAT_PREFERENCES, type ChatCredential, type ChatCredentialSummary, type ChatPreferences, type ChatRepository } from "@application/ports/chat";

const millis = (value: unknown): number => value && typeof value === "object" && "toMillis" in value ? (value as { toMillis(): number }).toMillis() : 0;
const preferences = (data?: Record<string, unknown>): ChatPreferences => ({
  baseUrl: typeof data?.baseUrl === "string" ? data.baseUrl : DEFAULT_CHAT_PREFERENCES.baseUrl,
  model: typeof data?.model === "string" ? data.model : DEFAULT_CHAT_PREFERENCES.model,
});
function credential(uid: string, data: Record<string, unknown>): ChatCredentialSummary {
  return { ownerUid: uid, label: String(data.label ?? "Chave GroqCloud"), status: data.status === "cooldown" || data.status === "invalid" ? data.status : "active", cooldownUntil: Number(data.cooldownUntil ?? 0), createdAt: millis(data.createdAt) };
}

/** Pool compartilhado: todo usuário autenticado pode ler as credenciais para chamar GroqCloud pelo navegador. */
export function createFirestoreChatRepository(getFirestore: () => Firestore): ChatRepository {
  const settingsRef = (uid: string) => doc(getFirestore(), "users", uid, "chatSettings", "groq");
  const conversationsRef = (uid: string) => collection(getFirestore(), "users", uid, "chatConversations");
  const messagesRef = (uid: string, id: string) => collection(conversationsRef(uid), id, "messages");
  const keyRef = (uid: string) => doc(getFirestore(), "groqKeys", uid);
  const toMessage = (item: { id: string; data(): Record<string, unknown> }) => {
    const data = item.data();
    return { id: item.id, role: data.role === "assistant" ? "assistant" as const : "user" as const, content: String(data.content ?? ""), createdAt: millis(data.createdAt) };
  };
  return {
    watchPreferences: (uid) => (next, fail) => onSnapshot(settingsRef(uid), (snapshot) => next(preferences(snapshot.data())), fail),
    watchCredential: (uid) => (next, fail) => onSnapshot(keyRef(uid), (snapshot) => next(snapshot.exists() ? credential(uid, snapshot.data()) : undefined), fail),
    watchConversations: (uid) => (next, fail) => onSnapshot(query(conversationsRef(uid), orderBy("updatedAt", "desc"), limit(100)), (snapshot) => next(snapshot.docs.map((item) => ({ id: item.id, title: String(item.data().title), preview: String(item.data().preview ?? ""), updatedAt: millis(item.data().updatedAt) }))), fail),
    watchMessages: (uid, id) => (next, fail) => onSnapshot(query(messagesRef(uid, id), orderBy("createdAt", "asc"), limitToLast(100)), (snapshot) => next(snapshot.docs.map(toMessage)), fail),
    async readPreferences(uid) { return preferences((await getDocFromServer(settingsRef(uid))).data()); },
    async savePreferences(uid, value) { await setDoc(settingsRef(uid), { ...value, updatedAt: serverTimestamp() }); },
    async saveCredential(uid, label, apiKey) {
      const firestore = getFirestore();
      await runTransaction(firestore, async (transaction) => {
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
        // Uma falha em voo não deve desativar a nova chave cadastrada pelo dono.
        if (current.exists() && current.data().apiKey === key.apiKey) transaction.update(reference, { status, cooldownUntil, updatedAt: serverTimestamp() });
      });
    },
    async createConversation(uid, title) {
      const reference = doc(conversationsRef(uid));
      await setDoc(reference, { ownerUid: uid, title: title.slice(0, 80), preview: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return reference.id;
    },
    async appendMessage(uid, id, role, content) {
      const batch = writeBatch(getFirestore());
      batch.set(doc(messagesRef(uid, id)), { role, content, createdAt: serverTimestamp() });
      batch.update(doc(conversationsRef(uid), id), { preview: content.slice(0, 160), updatedAt: serverTimestamp() });
      await batch.commit();
    },
    async recentMessages(uid, id) { return (await getDocsFromServer(query(messagesRef(uid, id), orderBy("createdAt", "desc"), limit(30)))).docs.map(toMessage).reverse(); },
  };
}
