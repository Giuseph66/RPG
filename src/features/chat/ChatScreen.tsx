import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, ChatsCircle, Eye, Microphone, NotePencil, SpeakerHigh, Stop, X } from "@phosphor-icons/react";
import { Button, InlineStatus } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { useChat } from "./use-chat";
import { useChatVoice } from "./use-chat-voice";
import { ChatContextPanel } from "./ChatContextPanel";

import { OracleAnswer } from "./OracleAnswer";
import { ChatUsagePanel } from "./ChatUsagePanel";
import styles from "./ChatScreen.module.css";

const formatTime = (value: number) => value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora";

const suggestions: readonly string[] = [
  "Como funciona a vantagem em testes?",
  "Analise minha ficha e explique meus bônus e recursos disponíveis",
  "Resuma o que aconteceu na última sessão",
  "Sugira uma complicação para a próxima cena",
];

export function ChatScreen({ service, uid, onOpenSettings = () => {}, onOpenAccount = () => {} }: { readonly service?: ChatService; readonly uid?: string; readonly context?: string; readonly onOpenSettings?: () => void; readonly onOpenAccount?: () => void }) {
  const { conversations, messages, actions, activeId, draft, setDraft, select, send, loading, sending, error, setError, notice, partial, trace, usage, options, scope, setScope, resolveAction, busyAction, manageConversation, exportConversation, cancel } = useChat(service, uid);
  const voice = useChatVoice((text) => setDraft((previous) => (previous + " " + text).trim().slice(0, 12000)), setError);
  const canChat = Boolean(service && uid);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("active");
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteReview, setDeleteReview] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const activeTitle = activeConversation?.title ?? "Nova conversa";
  const readOnly = Boolean(activeConversation?.archived || activeConversation?.deleted);
  const filteredConversations = conversations.filter((item) => historyFilter === "trash" ? item.deleted : historyFilter === "archived" ? item.archived && !item.deleted : !item.archived && !item.deleted).filter((item) => `${item.title} ${item.preview}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const lastMessage = messages.at(-1);
  const setup: { readonly title: string; readonly text: string; readonly action?: string; readonly onAction?: () => void } | undefined = !uid
    ? { title: "Entre para consultar o Oráculo", text: "Suas conversas ficam guardadas na sua conta.", action: "Entrar na conta", onAction: onOpenAccount }
    : !service
      ? { title: "Oráculo indisponível", text: "A sincronização na nuvem não está ativa neste aparelho." }
      : undefined;

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, partial, trace]);

  useEffect(() => { setRenameTitle(activeTitle); setDeleteReview(false); }, [activeId, activeTitle]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    if (!historyOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [historyOpen]);

  const selectConversation = (id: string) => {
    select(id);
    setHistoryOpen(false);
  };

  const startConversation = () => {
    select();
    setHistoryOpen(false);
    composerRef.current?.focus();
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    voice.stop();
    void send();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const applySuggestion = (suggestion: string) => {
    setDraft(suggestion);
    composerRef.current?.focus();
  };

  return (
    <section className={styles.screen} aria-labelledby="chat-title" data-history-open={historyOpen || undefined}>
      <aside id="chat-history" className={styles.history} aria-label="Histórico de conversas">
        <div className={styles.historyHeading}>
          <h2>Conversas</h2>
          <button type="button" className={styles.iconButton} onClick={() => setHistoryOpen(false)} aria-label="Fechar conversas" data-mobile-only>
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <button type="button" className={styles.newConversation} disabled={!canChat || sending || Boolean(busyAction)} onClick={startConversation}>
          <NotePencil size={18} weight="duotone" aria-hidden="true" />
          Nova conversa
        </button>
        <div className={styles.historyFilters}><label>Buscar conversas<input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Título ou última mensagem" /></label><label>Mostrar<select value={historyFilter} onChange={(event) => setHistoryFilter(event.currentTarget.value)}><option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="trash">Lixeira</option></select></label><small>Até 200 conversas recentes</small></div>
        <nav className={styles.conversationList} aria-label="Conversas recentes">
          {filteredConversations.map((conversation) => {
            const active = activeId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                className={[styles.conversationItem, active ? styles.conversationItemActive : ""].filter(Boolean).join(" ")}
                aria-current={active ? "page" : undefined}
                disabled={sending || Boolean(busyAction)}
                onClick={() => selectConversation(conversation.id)}
              >
                <span className={styles.conversationRow}>
                  <span className={styles.conversationTitle}>{conversation.title}</span>
                  <span className={styles.conversationTime}>{conversation.updatedAt ? new Date(conversation.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "agora"}</span>
                </span>
                <span className={styles.conversationPreview}>{conversation.preview}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <button type="button" className={styles.scrim} tabIndex={-1} aria-hidden="true" onClick={() => setHistoryOpen(false)} />

      <div className={styles.conversation}>
        <header className={styles.conversationHeader}>
          <span className={styles.oracleSeal} aria-hidden="true"><Eye size={22} weight="duotone" /></span>
          <div className={styles.oracleIdentity}>
            <h1 id="chat-title">Oráculo</h1>
            <p>{activeTitle}</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setHistoryOpen(true)}
            aria-label="Abrir conversas"
            aria-expanded={historyOpen}
            aria-controls="chat-history"
            data-mobile-only
          >
            <ChatsCircle size={22} weight="duotone" aria-hidden="true" />
          </button>
        </header>

        {canChat ? <div className={styles.controls}>
          <ChatContextPanel service={service} uid={uid} scope={scope} options={options} locked={Boolean(activeId) || sending || Boolean(busyAction)} onScope={setScope} onPrompt={applySuggestion} onError={setError} />
          {activeId ? <details className={styles.conversationTools}><summary><span className={styles.desktopLabel}>Gerenciar conversa</span><span className={styles.mobileLabel}>Conversa</span></summary><div>
            <form onSubmit={(event) => { event.preventDefault(); void manageConversation({ title: renameTitle.trim() }); }}><label>Título<input value={renameTitle} maxLength={80} onChange={(event) => setRenameTitle(event.currentTarget.value)} /></label><button type="submit" disabled={sending || Boolean(busyAction) || !renameTitle.trim()}>Renomear</button></form>
            <button type="button" onClick={() => void exportConversation()}>Exportar conversa</button>
            <button type="button" disabled={sending || Boolean(busyAction)} onClick={() => void manageConversation({ archived: !activeConversation?.archived })}>{activeConversation?.archived ? "Desarquivar" : "Arquivar"}</button>
            {activeConversation?.deleted ? <button type="button" onClick={() => void manageConversation({ deleted: false })}>Restaurar da lixeira</button> : <button type="button" disabled={sending || Boolean(busyAction)} onClick={() => setDeleteReview(true)}>Mover para lixeira</button>}
            {deleteReview ? <div><p>Mover esta conversa para a lixeira? Você poderá restaurá-la.</p><button type="button" disabled={sending || Boolean(busyAction)} onClick={() => void manageConversation({ deleted: true })}>Confirmar</button><button type="button" onClick={() => setDeleteReview(false)}>Cancelar</button></div> : null}
          </div></details> : null}
        </div> : null}

        <div ref={transcriptRef} className={styles.transcript} role="log" aria-label={`Conversa: ${activeTitle}`} aria-live="polite">
          {setup && messages.length > 0 ? (
            <p className={styles.setupBanner}>
              <span>{setup.title}</span>
              {setup.action ? <button type="button" onClick={setup.onAction}>{setup.action}</button> : null}
            </p>
          ) : null}
          {error ? (
            <div className={styles.errorRow}>
              <InlineStatus tone="error" assertive>{error}</InlineStatus>
              {/chave/i.test(error) ? <button type="button" onClick={onOpenSettings}>Configurar chave</button> : null}
            </div>
          ) : null}
          {loading ? <p role="status">Carregando conversas…</p> : null}
          {notice ? <InlineStatus tone="info">{notice}</InlineStatus> : null}
          {readOnly ? <InlineStatus tone="info">Esta conversa está arquivada ou na lixeira. Restaure-a para continuar.</InlineStatus> : null}
          {!loading && messages.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptySeal} aria-hidden="true"><Eye size={30} weight="duotone" /></span>
              {setup ? (
                <>
                  <h2>{setup.title}</h2>
                  <p>{setup.text}</p>
                  {setup.action ? <Button onClick={setup.onAction} className={styles.setupAction}>{setup.action}</Button> : null}
                </>
              ) : (
                <>
                  <h2>O que deseja consultar?</h2>
                  <p>Pergunte sobre regras, relembre fatos da campanha ou peça ideias para a próxima cena.</p>
                  <div className={styles.suggestions}>
                    {suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" className={styles.suggestion} onClick={() => applySuggestion(suggestion)}>{suggestion}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : messages.map((message) => message.role === "assistant" ? (
            <OracleAnswer key={message.id} content={message.content} time={formatTime(message.createdAt)} trace={message.trace} actions={actions.filter((action) => action.messageId === message.id)} busy={sending || Boolean(busyAction) || readOnly} onAction={(id, decision) => void resolveAction(id, decision)} />
          ) : (
            <article key={message.id} className={styles.userMessage} aria-label={`Você, ${formatTime(message.createdAt)}`}>
              <p>{message.content}</p>
              {message.attachments?.map((file) => <details key={file.name}><summary>Arquivo: {file.name}</summary><pre>{file.text}</pre></details>)}
              <time>{formatTime(message.createdAt)}</time>
            </article>
          ))}
          {sending ? <OracleAnswer content={partial || (trace?.tools?.length ? "Consultando as fontes autorizadas…" : "Preparando resposta…")} time="agora" trace={trace} streaming /> : null}
          {!sending && lastMessage?.role === "user" && !readOnly ? <button type="button" className={styles.retryButton} disabled={Boolean(busyAction)} onClick={() => void send(lastMessage)}>Tentar responder novamente</button> : null}
        </div>

        <form className={styles.composer} onSubmit={sendMessage}>
          {canChat && usage.length ? <ChatUsagePanel usages={usage} /> : null}
          {voice.available ? <small className={styles.voiceHint}>O ditado usa o serviço de voz do navegador. Revise o texto antes de enviar.</small> : null}
          <label className={styles.visuallyHidden} htmlFor="chat-message">Escreva uma mensagem</label>
          <div className={styles.composerField}>
            <textarea
              ref={composerRef}
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Pergunte ao oráculo…"
              rows={1}
              maxLength={12000}
              disabled={!canChat || sending || readOnly || Boolean(busyAction)}
            />
            {voice.available ? <button type="button" className={styles.composerTool} disabled={!canChat || sending || readOnly} aria-pressed={voice.listening} onClick={voice.toggleListening} aria-label={voice.listening ? "Parar ditado" : "Ditar mensagem"} title={voice.listening ? "Parar ditado" : "Ditar mensagem"}>{voice.listening ? <Stop size={19} weight="fill" aria-hidden="true" /> : <Microphone size={19} aria-hidden="true" />}</button> : null}
            {typeof window !== "undefined" && window.speechSynthesis && messages.some((item) => item.role === "assistant") ? <button type="button" className={styles.composerTool} aria-pressed={voice.speaking} onClick={() => voice.readAloud([...messages].reverse().find((item) => item.role === "assistant")!.content)} aria-label={voice.speaking ? "Parar leitura" : "Ouvir resposta"} title={voice.speaking ? "Parar leitura" : "Ouvir resposta"}>{voice.speaking ? <Stop size={19} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={19} aria-hidden="true" />}</button> : null}
            {sending ? <button type="button" className={styles.sendButton} onClick={cancel} aria-label="Cancelar resposta" title="Cancelar resposta"><Stop size={19} weight="fill" aria-hidden="true" /></button> : <button type="submit" className={styles.sendButton} disabled={!canChat || !options || sending || loading || readOnly || Boolean(busyAction) || voice.listening || !draft.trim()} aria-label="Enviar mensagem">
              <ArrowUp size={20} weight="bold" aria-hidden="true" />
            </button>}
          </div>
          <p className={styles.composerHint}>Fontes consultáveis · alterações com confirmação · Enter envia</p>
        </form>
      </div>
    </section>
  );
}
