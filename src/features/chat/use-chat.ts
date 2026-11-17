import { useEffect, useRef, useState } from "react";
import type { ChatService } from "@application/chat/service";
import { DEFAULT_CHAT_PREFERENCES, type ChatConversation, type ChatMessage } from "@application/ports/chat";

export function useChat(service: ChatService | undefined, uid: string | undefined, context: string) {
  const [conversations, setConversations] = useState<readonly ChatConversation[]>([]);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [preferences, setPreferences] = useState(DEFAULT_CHAT_PREFERENCES);
  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(Boolean(uid && service));
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => () => { inFlight.current?.abort(); }, [uid, service]);

  useEffect(() => {
    if (!service || !uid) return;
    const fail = (cause: Error) => { setError(`Não foi possível ler o Firestore: ${cause.message}`); setHistoryLoading(false); };
    const stopConversations = service.repository.watchConversations(uid)((value) => { setConversations(value); setHistoryLoading(false); }, fail);
    const stopPreferences = service.repository.watchPreferences(uid)(setPreferences, fail);
    return () => { stopConversations(); stopPreferences(); };
  }, [service, uid]);

  useEffect(() => {
    setMessages([]);
    setMessagesLoading(false);
    if (!service || !uid || !activeId) return;
    setMessagesLoading(true);
    return service.repository.watchMessages(uid, activeId)((value) => { setMessages(value); setMessagesLoading(false); }, (cause) => { setError(`Não foi possível ler a conversa: ${cause.message}`); setMessagesLoading(false); });
  }, [service, uid, activeId]);

  const select = (id?: string) => {
    if (inFlight.current) return;
    setActiveId(id); setDraft(""); setError("");
  };

  const send = async () => {
    if (!service || !uid || inFlight.current || !draft.trim()) return;
    if (!preferences.model) { setError("Escolha o modelo GroqCloud em Configurações antes de enviar."); return; }
    if (!navigator.onLine) { setError("Conecte-se à internet para salvar e enviar mensagens."); return; }
    const controller = new AbortController();
    inFlight.current = controller;
    setSending(true); setError("");
    const text = draft.trim();
    try {
      const id = activeId ?? await service.repository.createConversation(uid, text.slice(0, 80));
      controller.signal.throwIfAborted();
      setActiveId(id);
      await service.send(uid, id, text, context, controller.signal, () => { if (!controller.signal.aborted) setDraft(""); });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      if (!controller.signal.aborted) { setSending(false); inFlight.current = null; }
    }
  };

  return { conversations, messages, activeId, draft, setDraft, select, send, loading: historyLoading || messagesLoading, sending, preferences, error };
}
