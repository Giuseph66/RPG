import { CHAT_PROVIDER, ChatRequestError, type ChatCredential, type ChatRepository, type ChatClient } from "@application/ports/chat";

export function credentialAvailable(key: ChatCredential, now = Date.now()): boolean {
  return key.status === "active" || (key.status === "cooldown" && key.cooldownUntil <= now);
}

export function createChatService(repository: ChatRepository, client: ChatClient, currentUid: () => string | undefined) {
  const assertSession = (uid: string, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    if (currentUid() !== uid) throw new Error("Entre na sua conta para usar o chat.");
  };

  async function withAvailableKey<T>(uid: string, call: (key: ChatCredential) => Promise<T>, signal?: AbortSignal): Promise<T> {
    assertSession(uid, signal);
    const keys = [...await repository.listCredentials()].sort((a, b) => a.createdAt - b.createdAt || a.ownerUid.localeCompare(b.ownerUid));
    assertSession(uid, signal);
    for (const key of keys) {
      if (!credentialAvailable(key)) continue;
      try { return await call(key); } catch (error) {
        assertSession(uid, signal);
        if (!(error instanceof ChatRequestError)) throw error;
        if (error.status === 429) {
          await repository.setCredentialState(key, "cooldown", Date.now() + Math.min(Math.max(error.retryAfterMs, 1_000), 3_600_000));
        } else if (error.status === 401) {
          await repository.setCredentialState(key, "invalid", 0);
        } else throw error;
      }
    }
    throw new Error("Nenhuma chave disponível no pool. Cadastre uma chave em Configurações ou aguarde o fim do limite de uso.");
  }

  return {
    repository,
    async saveCredential(uid: string, label: string, apiKey: string) {
      assertSession(uid);
      const value = apiKey.trim();
      const name = label.trim();
      if (!value.startsWith("gsk_") || value.length < 12 || value.length > 512 || /\s/.test(value)) throw new Error("Informe uma chave GroqCloud válida, iniciada por gsk_ e sem espaços.");
      if (!name || name.length > 60) throw new Error("Use uma identificação de até 60 caracteres.");
      await repository.saveCredential(uid, name, value);
    },
    async removeCredential(uid: string) { assertSession(uid); await repository.removeCredential(uid); },
    async send(uid: string, conversationId: string, content: string, context = "", signal?: AbortSignal, onPersisted?: () => void) {
      assertSession(uid, signal);
      const text = content.trim();
      if (!text || text.length > 12_000) throw new Error("Escreva uma mensagem com até 12.000 caracteres.");
      await repository.appendMessage(uid, conversationId, "user", text);
      onPersisted?.();
      assertSession(uid, signal);
      const messages = await repository.recentMessages(uid, conversationId);
      const answer = await withAvailableKey(uid, (key) => client.complete(CHAT_PROVIDER.baseUrl, key.apiKey, CHAT_PROVIDER.model, messages, context, signal), signal);
      assertSession(uid, signal);
      await repository.appendMessage(uid, conversationId, "assistant", answer);
    },
  };
}

export type ChatService = ReturnType<typeof createChatService>;
