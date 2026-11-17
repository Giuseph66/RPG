import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, CaretDown, ChatsCircle, Eye, NotePencil, X } from "@phosphor-icons/react";
import { Button, InlineStatus } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { useChat } from "./use-chat";

import { EXAMPLE_ANSWER, EXAMPLE_QUESTION, EXAMPLE_TRACE, OracleAnswer } from "./OracleAnswer";
import styles from "./ChatScreen.module.css";

const formatTime = (value: number) => value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora";

const suggestions: readonly string[] = [
  "Como funciona a vantagem em testes?",
  "Resuma o que aconteceu na última sessão",
  "Sugira uma complicação para a próxima cena",
];

export function ChatScreen({ service, uid, context = "", onOpenSettings = () => {}, onOpenAccount = () => {} }: { readonly service?: ChatService; readonly uid?: string; readonly context?: string; readonly onOpenSettings?: () => void; readonly onOpenAccount?: () => void }) {
  const { conversations, messages, activeId, draft, setDraft, select, send, loading, sending, preferences, error } = useChat(service, uid, context);
  const canChat = Boolean(service && uid);
  const [historyOpen, setHistoryOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const activeTitle = activeConversation?.title ?? "Nova conversa";
  const setup: { readonly title: string; readonly text: string; readonly action?: string; readonly onAction?: () => void } | undefined = !uid
    ? { title: "Entre para consultar o Oráculo", text: "Suas conversas ficam guardadas na sua conta.", action: "Entrar na conta", onAction: onOpenAccount }
    : !service
      ? { title: "Oráculo indisponível", text: "A sincronização na nuvem não está ativa neste aparelho." }
      : !preferences.model
        ? { title: "O Oráculo ainda não despertou", text: "Escolha qual IA vai responder nas configurações do chat.", action: "Configurar Oráculo", onAction: onOpenSettings }
        : undefined;

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages]);

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
        <button type="button" className={styles.newConversation} disabled={!canChat || sending} onClick={startConversation}>
          <NotePencil size={18} weight="duotone" aria-hidden="true" />
          Nova conversa
        </button>
        <nav className={styles.conversationList} aria-label="Conversas recentes">
          {conversations.map((conversation) => {
            const active = activeId === conversation.id;
            return (
              <button
                key={conversation.id}
                type="button"
                className={[styles.conversationItem, active ? styles.conversationItemActive : ""].filter(Boolean).join(" ")}
                aria-current={active ? "page" : undefined}
                disabled={sending}
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
          <button type="button" className={styles.previewBadge} onClick={onOpenSettings} aria-label={preferences.model ? `Modelo ${preferences.model}. Configurar Oráculo` : "Escolher modelo do Oráculo"}>
            <span>{preferences.model || "Escolher modelo"}</span>
            <CaretDown size={11} weight="bold" aria-hidden="true" />
          </button>
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

        <div ref={transcriptRef} className={styles.transcript} role="log" aria-label={`Conversa: ${activeTitle}`} aria-live="polite">
          {setup && messages.length > 0 ? (
            <p className={styles.setupBanner}>
              <span>{setup.title}</span>
              {setup.action ? <button type="button" onClick={setup.onAction}>{setup.action}</button> : null}
            </p>
          ) : null}
          {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
          {loading ? <p role="status">Carregando conversas…</p> : null}
          {!loading && messages.length === 0 ? (
            <>
            <p className={styles.exampleDivider}><span>Exemplo de resposta</span></p>
            <article className={styles.userMessage} aria-label="Pergunta de exemplo">
              <p>{EXAMPLE_QUESTION}</p>
            </article>
            <OracleAnswer content={EXAMPLE_ANSWER} time="exemplo" trace={EXAMPLE_TRACE} example />
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
            </>
          ) : messages.map((message) => message.role === "assistant" ? (
            <OracleAnswer key={message.id} content={message.content} time={formatTime(message.createdAt)} />
          ) : (
            <article key={message.id} className={styles.userMessage} aria-label={`Você, ${formatTime(message.createdAt)}`}>
              <p>{message.content}</p>
              <time>{formatTime(message.createdAt)}</time>
            </article>
          ))}
          {sending ? <p role="status">O Oráculo está consultando…</p> : null}
        </div>

        <form className={styles.composer} onSubmit={sendMessage}>
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
              disabled={!canChat || sending}
            />
            <button type="submit" className={styles.sendButton} disabled={!canChat || sending || loading || !preferences.model || !draft.trim()} aria-label="Enviar mensagem">
              <ArrowUp size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <p className={styles.composerHint}>Histórico no Firestore · até 30 mensagens de contexto · Enter envia</p>
        </form>
      </div>
    </section>
  );
}
