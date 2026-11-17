import { useEffect, useRef, useState } from "react";
import type { ChatService } from "@application/chat/service";
import type { ChatConversation, ChatMessage, ChatCredentialUsage } from "@application/ports/chat";
import { DEFAULT_CHAT_SCOPE, type ChatAction, type ChatScope, type ChatTrace } from "@application/ports/chat-agent";

export function useChat(service: ChatService | undefined, uid: string | undefined) {
  const [conversations, setConversations] = useState<readonly ChatConversation[]>([]);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [actions, setActions] = useState<readonly ChatAction[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState<ChatScope>(DEFAULT_CHAT_SCOPE);
  const [options, setOptions] = useState<Awaited<ReturnType<ChatService["agent"]["options"]>>>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyLoading, setHistoryLoading] = useState(Boolean(uid && service));
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [partial, setPartial] = useState("");
  const [trace, setTrace] = useState<ChatTrace>();
  const [usageByKey, setUsageByKey] = useState<Readonly<Record<string, ChatCredentialUsage>>>({});
  const inFlight = useRef<AbortController | null>(null);
  const actionLock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; inFlight.current?.abort(); }; }, [uid, service]);
  useEffect(() => { setUsageByKey({}); }, [uid, service]);
  useEffect(() => {
    if (!service || !uid) return;
    let current = true;
    void service.agent.options(uid).then((value) => { if (current) { setOptions(value); setScope(value.defaults); } }).catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : "Falha ao consultar acesso."); });
    const stop = service.repository.watchConversations(uid)((value) => { setConversations(value); setHistoryLoading(false); }, (cause) => { setError(cause.message); setHistoryLoading(false); });
    return () => { current = false; stop(); };
  }, [service, uid]);
  useEffect(() => {
    setMessages([]); setActions([]); setMessagesLoading(false);
    if (!service || !uid || !activeId) return;
    setMessagesLoading(true);
    const stopMessages = service.repository.watchMessages(uid, activeId)((value) => { setMessages(value); setMessagesLoading(false); }, (cause) => { setError(cause.message); setMessagesLoading(false); });
    const stopActions = service.repository.watchActions(uid, activeId)(setActions, (cause) => setError(cause.message));
    return () => { stopMessages(); stopActions(); };
  }, [service, uid, activeId]);
  const selected = conversations.find((item) => item.id === activeId);
  const activeScope = selected?.scope ?? scope;
  const select = (id?: string) => {
    if (inFlight.current || busyAction) return;
    setActiveId(id); setDraft(""); setError(""); setNotice(""); setPartial(""); setTrace(undefined);
    if (!id && options) setScope(options.defaults);
  };
  const send = async (retry?: ChatMessage) => {
    if (!service || !uid || inFlight.current || busyAction || (!retry && !draft.trim())) return;
    if (!navigator.onLine) { setError("Conecte-se à internet para consultar a IA e salvar mensagens."); return; }
    if (!options) { setError("Aguarde a consulta das permissões."); return; }
    const controller = new AbortController();
    inFlight.current = controller; setSending(true); setError(""); setNotice(""); setPartial(""); setTrace(undefined);
    try {
      const content = retry?.content ?? draft.trim();
      const id = activeId ?? await service.createConversation(uid, content.slice(0, 80), activeScope);
      controller.signal.throwIfAborted();
      if (!alive.current) return;
      setActiveId(id);
      await service.send(uid, id, content, { scope: activeScope, signal: controller.signal,
        ...(retry ? { retry: true, turnId: retry.id } : {}),
        onPersisted: () => { if (!controller.signal.aborted && alive.current) { setDraft(""); } },
        onProgress: (text, details) => { if (!controller.signal.aborted && alive.current) { setPartial(text); setTrace(details); } },
        onUsage: (value) => {
          if (!controller.signal.aborted && alive.current) setUsageByKey((previous) => {
            const next = { ...previous };
            if (value.limited) next[value.credentialId] = { ...previous[value.credentialId], ...value };
            else delete next[value.credentialId];
            return next;
          });
        },
      });
    } catch (cause) {
      if (alive.current) setError(controller.signal.aborted ? "Geração cancelada. A mensagem foi preservada; você pode tentar novamente." : cause instanceof Error ? cause.message : "Não foi possível enviar a mensagem.");
    } finally {
      if (alive.current) { setSending(false); setPartial(""); setTrace(undefined); }
      if (inFlight.current === controller) inFlight.current = null;
    }
  };
  const resolveAction = async (id: string, decision: "confirm" | "reject" | "undo") => {
    if (!service || !uid || !activeId || actionLock.current || sending) return;
    actionLock.current = true;
    setBusyAction(id); setError(""); setNotice("");
    try { await service.resolveAction(uid, activeId, id, decision); if (alive.current) setNotice(decision === "reject" ? "Proposta recusada." : "Operação concluída."); }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Falha na operação. Confira o estado no app."); }
    finally { actionLock.current = false; if (alive.current) setBusyAction(undefined); }
  };
  const manageConversation = async (patch: { title?: string; archived?: boolean; deleted?: boolean }) => {
    if (!service || !uid || !activeId || sending || busyAction) return;
    try { await service.repository.updateConversation(uid, activeId, patch); if (patch.deleted || patch.archived) select(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao atualizar conversa."); }
  };
  const exportConversation = async () => {
    if (!service || !uid || !activeId) return;
    try {
      const content = await service.exportConversation(uid, activeId);
      const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "conversa-oraculo.md"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao exportar."); }
  };
  return { conversations, messages, actions, activeId, draft, setDraft, select, send, loading: historyLoading || messagesLoading,
    sending, error, setError, notice, partial, trace, usage: Object.values(usageByKey), options, scope: activeScope, setScope,
    resolveAction, busyAction, manageConversation, exportConversation, cancel: () => inFlight.current?.abort() };
}
