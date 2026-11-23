import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Archive, ArrowCounterClockwise, ArrowUp, CaretUp, ChatsCircle, DownloadSimple, Eye, Info, List, Microphone, NotePencil, SpeakerHigh, Stop, Trash, X } from "@phosphor-icons/react";
import { AppModal, BottomSheet, Button, InlineStatus } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { useShellChrome } from "@components/layout/chrome-context";
import { useChat } from "./use-chat";
import { DictationPanel } from "./DictationPanel";
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
  const { conversations, messages, actions, activeId, draft, setDraft, setNotice, select, send, loading, sending, error, setError, notice, partial, trace, usage, options, scope, setScope, resolveAction, busyAction, manageConversation, exportConversation, cancel } = useChat(service, uid);
  const voice = useChatVoice((text, sendNow) => {
    const content = (draft + " " + text).trim().slice(0, 12000);
    // Kept in the field either way: if sending fails, nothing that was said is lost.
    setDraft(content);
    if (sendNow) void send(undefined, content);
    else window.setTimeout(() => composerRef.current?.focus());
  }, setError, setNotice);
  const canChat = Boolean(service && uid);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const chrome = useShellChrome();
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 767px)").matches));
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
  const lastAnswer = [...messages].reverse().find((message) => message.role === "assistant");
  const setup: { readonly title: string; readonly text: string; readonly action?: string; readonly onAction?: () => void } | undefined = !uid
    ? { title: "Entre para consultar o Oráculo", text: "Suas conversas ficam guardadas na sua conta.", action: "Entrar na conta", onAction: onOpenAccount }
    : !service
      ? { title: "Oráculo indisponível", text: "A sincronização na nuvem não está ativa neste aparelho." }
      : undefined;

  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 767px)");
    if (!query) return;
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript) transcript.scrollTop = transcript.scrollHeight;
  }, [messages, partial, trace]);

  useEffect(() => { setRenameTitle(activeTitle); setDeleteReview(false); }, [activeId, activeTitle]);
  // Changing conversation ends the dictation for review, never sends it to another one.
  // The first message of a new conversation also sets its id, while the next one may already be dictated.
  const sendingRef = useRef(sending);
  sendingRef.current = sending;
  useEffect(() => { voice.stopReading(); if (!sendingRef.current) voice.finishDictation(false); }, [activeId, voice.stopReading, voice.finishDictation]);
  useEffect(() => voice.cancelDictation, [uid, voice.cancelDictation]);

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
    if (sending) return; // The text waits in the field until the answer ends.
    voice.stopReading();
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

  const chatInfo = canChat ? <div className={styles.infoBody}>
          <section className={styles.infoSection} aria-labelledby="chat-info-context">
            <h3 id="chat-info-context" className={styles.infoHeading}>Contexto do Oráculo</h3>
            <ChatContextPanel service={service} uid={uid} scope={scope} options={options} locked={Boolean(activeId) || sending || Boolean(busyAction)} onScope={setScope} onPrompt={(text) => { setInfoOpen(false); applySuggestion(text); }} onError={setError} />
          </section>
          {activeId ? <section className={[styles.conversationTools, styles.infoSection].join(" ")} aria-labelledby="chat-info-conversation"><h3 id="chat-info-conversation" className={styles.infoHeading}>Esta conversa</h3>
            <form className={styles.renameForm} onSubmit={(event) => { event.preventDefault(); void manageConversation({ title: renameTitle.trim() }); }}>
              <label className={styles.renameField}><span>Título</span><input value={renameTitle} maxLength={80} onChange={(event) => setRenameTitle(event.currentTarget.value)} /></label>
              <button type="submit" className={styles.renameButton} disabled={sending || Boolean(busyAction) || !renameTitle.trim()}>Salvar</button>
            </form>
            <div className={styles.actionList}>
              <button type="button" className={styles.actionButton} onClick={() => void exportConversation()}><DownloadSimple size={18} aria-hidden="true" />Exportar conversa</button>
              <button type="button" className={styles.actionButton} disabled={sending || Boolean(busyAction)} onClick={() => void manageConversation({ archived: !activeConversation?.archived })}><Archive size={18} aria-hidden="true" />{activeConversation?.archived ? "Desarquivar" : "Arquivar"}</button>
              {activeConversation?.deleted
                ? <button type="button" className={styles.actionButton} onClick={() => void manageConversation({ deleted: false })}><ArrowCounterClockwise size={18} aria-hidden="true" />Restaurar da lixeira</button>
                : <button type="button" className={[styles.actionButton, styles.actionDanger].join(" ")} disabled={sending || Boolean(busyAction)} onClick={() => setDeleteReview(true)}><Trash size={18} aria-hidden="true" />Mover para lixeira</button>}
            </div>
            {deleteReview ? <div className={styles.deleteReview} role="alert"><p>Mover esta conversa para a lixeira? Você poderá restaurá-la.</p><div className={styles.deleteActions}><button type="button" className={styles.confirmDanger} disabled={sending || Boolean(busyAction)} onClick={() => void manageConversation({ deleted: true })}>Confirmar</button><button type="button" onClick={() => setDeleteReview(false)}>Cancelar</button></div></div> : null}
          </section> : null}
        </div> : null;

  return (
    <section className={styles.screen} aria-labelledby="chat-title" data-history-open={historyOpen || undefined}>
      <aside id="chat-history" className={styles.history} aria-label="Histórico de conversas">
        <div className={styles.historyTop}>
          <div className={styles.historyHeading}>
            <h2>Conversas</h2>
            <button type="button" className={styles.iconButton} onClick={() => setHistoryOpen(false)} aria-label="Fechar conversas" data-mobile-only>
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <div className={styles.historyFilters}>
            <div className={styles.historyTools}>
              <label className={styles.searchField}><span className={styles.srOnly}>Buscar conversas</span><input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Título ou última mensagem" /></label>
              <button type="button" className={styles.newConversation} disabled={!canChat || sending || Boolean(busyAction)} onClick={startConversation} aria-label="Nova conversa" title="Nova conversa">
                <NotePencil size={18} weight="duotone" aria-hidden="true" />
              </button>
            </div>
            <div className={styles.filterRow}>
              <label>Mostrar<select value={historyFilter} onChange={(event) => setHistoryFilter(event.currentTarget.value)}><option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="trash">Lixeira</option></select></label>
              <small>Até 200 recentes</small>
            </div>
          </div>
        </div>
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
          {chrome.supported ? (
            <button type="button" className={styles.iconButton} onClick={() => chrome.setCollapsed(!chrome.collapsed)} aria-label={chrome.collapsed ? "Mostrar menu do app" : "Esconder menu do app"} aria-pressed={!chrome.collapsed} title={chrome.collapsed ? "Mostrar menu" : "Esconder menu"} data-mobile-only>
              {chrome.collapsed ? <List size={22} weight="bold" aria-hidden="true" /> : <CaretUp size={22} weight="bold" aria-hidden="true" />}
            </button>
          ) : null}
          {canChat ? (
            <button type="button" className={styles.iconButton} onClick={() => setInfoOpen(true)} aria-label="Informações da conversa" aria-haspopup="dialog" title="Informações da conversa">
              <Info size={22} weight="duotone" aria-hidden="true" />
            </button>
          ) : null}
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
            <OracleAnswer key={message.id} content={message.content} time={formatTime(message.createdAt)} trace={message.trace} actions={actions.filter((action) => action.messageId === message.id)} busy={sending || Boolean(busyAction) || readOnly} onAction={(id, decision) => void resolveAction(id, decision)} spokenRange={voice.reading?.messageId === message.id ? voice.reading : undefined} readingRate={voice.rate} onReadingRateChange={message.id === lastAnswer?.id && typeof window !== "undefined" && window.speechSynthesis ? voice.changeRate : undefined} />
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
          <label className={styles.visuallyHidden} htmlFor="chat-message">Escreva uma mensagem</label>
          {voice.listening ? <DictationPanel state={voice.dictation} canSend={Boolean(options) && !sending && !busyAction} onDiscard={() => { voice.cancelDictation(); composerRef.current?.focus(); }} onReview={() => voice.finishDictation(false)} onSend={() => voice.finishDictation(true)} /> : null}
          <div className={styles.composerField} hidden={voice.listening}>
            <textarea
              ref={composerRef}
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={"Pergunte ao oráculo…"}
              rows={1}
              maxLength={12000}
              disabled={!canChat || readOnly}
            />
            {voice.available ? <button type="button" className={styles.composerTool} disabled={!canChat || readOnly} onClick={voice.startDictation} aria-label="Ditar mensagem" title="Ditar mensagem. O navegador transcreve o áudio."><Microphone size={19} aria-hidden="true" /></button> : null}
            {typeof window !== "undefined" && window.speechSynthesis && lastAnswer ? <button type="button" className={styles.composerTool} aria-pressed={voice.speaking} onClick={() => voice.readAloud(lastAnswer.content, lastAnswer.id)} aria-label={voice.speaking ? "Parar leitura" : "Ouvir resposta"} title={voice.speaking ? "Parar leitura" : "Ouvir resposta"}>{voice.speaking ? <Stop size={19} weight="fill" aria-hidden="true" /> : <SpeakerHigh size={19} aria-hidden="true" />}</button> : null}
            {sending ? <button type="button" className={styles.sendButton} onClick={cancel} aria-label="Cancelar resposta" title="Cancelar resposta"><Stop size={19} weight="fill" aria-hidden="true" /></button> : <button type="submit" className={styles.sendButton} disabled={!canChat || !options || sending || loading || readOnly || Boolean(busyAction) || voice.listening || !draft.trim()} aria-label="Enviar mensagem">
              <ArrowUp size={20} weight="bold" aria-hidden="true" />
            </button>}
          </div>
          <p className={styles.composerHint} hidden={voice.listening}>Fontes consultáveis · alterações com confirmação · Enter envia</p>
        </form>
      </div>
      {compact
        ? <BottomSheet open={infoOpen} title="Informações da conversa" onClose={() => setInfoOpen(false)} className={styles.infoSurface}>{chatInfo}</BottomSheet>
        : <AppModal open={infoOpen} title="Informações da conversa" onClose={() => setInfoOpen(false)} className={styles.infoSurface}>{chatInfo}</AppModal>}
    </section>
  );
}
