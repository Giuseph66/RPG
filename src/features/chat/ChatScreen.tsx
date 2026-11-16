import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, ChatsCircle, Eye, NotePencil, X } from "@phosphor-icons/react";

import styles from "./ChatScreen.module.css";

interface ChatMessage {
  readonly id: string;
  readonly role: "assistant" | "user";
  readonly content: string;
  readonly time: string;
}

interface ChatConversation {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly time: string;
  readonly messages: readonly ChatMessage[];
}

const conversations: readonly ChatConversation[] = [
  {
    id: "ponte",
    title: "A ponte de Vau de Sal",
    preview: "Como passar pelos cultistas?",
    time: "20:43",
    messages: [
      { id: "ponte-1", role: "user", content: "A ponte está vigiada por dois cultistas. Como atravesso sem chamar atenção?", time: "20:42" },
      { id: "ponte-2", role: "assistant", content: "A chuva cobre parte dos ruídos, mas a ponte range. Vocês podem esperar uma rajada de vento, criar uma distração na margem ou procurar uma passagem pelo leito do rio.\n\nSe escolherem a travessia furtiva, um teste de Destreza (Furtividade) combina bem com a cena.", time: "20:43" },
    ],
  },
  {
    id: "pocao",
    title: "Preparativos da jornada",
    preview: "Poções e descanso antes da saída",
    time: "Ontem",
    messages: [
      { id: "pocao-1", role: "user", content: "O que vale conferir antes de deixar o acampamento?", time: "Ontem" },
      { id: "pocao-2", role: "assistant", content: "Confiram os pontos de vida, espaços de magia e equipamentos do grupo. Se a jornada permitir, um descanso longo recupera recursos importantes antes da próxima cena.", time: "Ontem" },
    ],
  },
  {
    id: "concentracao",
    title: "Concentração em magia",
    preview: "Dúvida sobre dano recebido",
    time: "12 nov",
    messages: [
      { id: "concentracao-1", role: "user", content: "Se eu sofrer dano enquanto mantenho uma magia, o que acontece?", time: "12 nov" },
      { id: "concentracao-2", role: "assistant", content: "Você faz um teste de resistência de Constituição para manter a concentração. A dificuldade é 10 ou metade do dano recebido, usando o maior valor.", time: "12 nov" },
    ],
  },
];

const NEW_CONVERSATION_ID = "nova";

const suggestions: readonly string[] = [
  "Como funciona a vantagem em testes?",
  "Resuma o que aconteceu na última sessão",
  "Sugira uma complicação para a próxima cena",
];

export function ChatScreen() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [messages, setMessages] = useState<readonly ChatMessage[]>(conversations[0].messages);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const activeTitle = activeConversation?.title ?? "Nova conversa";

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

  const selectConversation = (conversation: ChatConversation) => {
    setActiveId(conversation.id);
    setMessages(conversation.messages);
    setDraft("");
    setHistoryOpen(false);
  };

  const startConversation = () => {
    setActiveId(NEW_CONVERSATION_ID);
    setMessages([]);
    setDraft("");
    setHistoryOpen(false);
    composerRef.current?.focus();
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content, time: "agora" }]);
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
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
        <button type="button" className={styles.newConversation} onClick={startConversation}>
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
                onClick={() => selectConversation(conversation)}
              >
                <span className={styles.conversationRow}>
                  <span className={styles.conversationTitle}>{conversation.title}</span>
                  <span className={styles.conversationTime}>{conversation.time}</span>
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
            <h1 id="chat-title">Oráculo da Mesa</h1>
            <p>{activeTitle}</p>
          </div>
          <span className={styles.previewBadge} title="Prévia visual: as respostas ainda são exemplos fixos.">Prévia</span>
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
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptySeal} aria-hidden="true"><Eye size={30} weight="duotone" /></span>
              <h2>O que deseja consultar?</h2>
              <p>Pergunte sobre regras, relembre fatos da campanha ou peça ideias para a próxima cena.</p>
              <div className={styles.suggestions}>
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className={styles.suggestion} onClick={() => applySuggestion(suggestion)}>{suggestion}</button>
                ))}
              </div>
            </div>
          ) : messages.map((message) => message.role === "assistant" ? (
            <article key={message.id} className={styles.oracleMessage}>
              <header className={styles.oracleMeta}>
                <span className={styles.messageSeal} aria-hidden="true"><Eye size={15} weight="duotone" /></span>
                <strong>Oráculo</strong>
                <time>{message.time}</time>
              </header>
              <p>{message.content}</p>
            </article>
          ) : (
            <article key={message.id} className={styles.userMessage} aria-label={`Você, ${message.time}`}>
              <p>{message.content}</p>
              <time>{message.time}</time>
            </article>
          ))}
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
            />
            <button type="submit" className={styles.sendButton} disabled={!draft.trim()} aria-label="Enviar mensagem">
              <ArrowUp size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <p className={styles.composerHint}>Enter envia · Shift + Enter quebra linha</p>
        </form>
      </div>
    </section>
  );
}
