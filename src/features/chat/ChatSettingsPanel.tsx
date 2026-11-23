import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowSquareOutIcon, ArrowsClockwiseIcon, CaretDownIcon, KeyIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge, Button, InlineStatus, Input } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { CHAT_MODELS, MAX_CREDENTIALS_PER_USER, type ChatCredentialSummary, type ChatModelUsage } from "@application/ports/chat";
import { ALL_KEYS, usageDay } from "@application/chat/key-rotation";
import styles from "./ChatSettingsPanel.module.css";

type Feedback = { readonly tone: "info" | "error"; readonly text: string };
/** `new` adds a key in a free slot; `replace` swaps the secret of an existing key. */
type Editing = { readonly kind: "new" } | { readonly kind: "replace"; readonly credential: ChatCredentialSummary };

const DEFAULT_KEY_LABEL = "Minha chave Gemini";

function keyStatus(credential: ChatCredentialSummary) {
  if (credential.status === "invalid") return { tone: "danger" as const, text: "Inválida" };
  if (credential.status === "cooldown" && credential.cooldownUntil > Date.now()) return { tone: "warning" as const, text: `Em espera até ${new Date(credential.cooldownUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` };
  return { tone: "xp" as const, text: "Disponível" };
}

const REASON: Record<string, string> = { day: "cota do dia usada", minute: "limite por minuto", unavailable: "modelo indisponível", overload: "modelo sobrecarregado" };
const clock = (time: number) => new Date(time).toLocaleString("pt-BR", { ...(time - Date.now() > 12 * 3_600_000 ? { day: "2-digit", month: "2-digit" } : {}), hour: "2-digit", minute: "2-digit" });

/** What the shared control table knows about one key; the rows of a replaced secret are ignored. */
function KeyUsage({ keyId, rows }: { readonly keyId: string; readonly rows: readonly ChatModelUsage[] }) {
  const now = Date.now(), today = usageDay(now);
  const own = rows.filter((row) => row.keyId === keyId);
  const hash = own.reduce<ChatModelUsage | undefined>((latest, row) => !latest || row.lastUsedAt > latest.lastUsedAt ? row : latest, undefined)?.keyHash;
  const models = CHAT_MODELS.map((model) => {
    const row = own.find((item) => item.model === model && item.keyHash === hash);
    const overload = rows.find((item) => item.keyId === ALL_KEYS && item.model === model && item.blockedUntil > now);
    const block = row && row.blockedUntil > now ? row : overload;
    return { model, block, requests: row?.day === today ? row.requests : 0, tokens: row?.day === today ? row.tokens : 0, limit: row?.dayLimit ?? 0 };
  });
  const free = models.filter((item) => !item.block).length;
  return <details className={styles.usage}>
    <summary>{free} de {models.length} modelos disponíveis<CaretDownIcon size={12} weight="bold" aria-hidden="true" /></summary>
    <ul>
      {models.map(({ model, block, requests, tokens, limit }) => <li key={model}>
        <strong>{model}</strong>
        <span>Hoje: {requests}{limit ? ` de ${limit}` : ""} {requests === 1 && !limit ? "pedido" : "pedidos"} · {tokens.toLocaleString("pt-BR")} tokens</span>
        <span data-blocked={Boolean(block) || undefined}>{block ? `${REASON[block.reason] ?? "em espera"} até ${clock(block.blockedUntil)}` : "Disponível"}</span>
      </li>)}
    </ul>
    <p>Conta só o que passou por este app. O dia renova à meia-noite do Pacífico.</p>
  </details>;
}

/** The Oráculo's model is fixed; players only manage their shared Gemini keys. */
export function ChatSettingsPanel({ service, uid, onOpenAccount }: { readonly service?: ChatService; readonly uid?: string; readonly onOpenAccount: () => void }) {
  const [credentials, setCredentials] = useState<readonly ChatCredentialSummary[]>([]);
  const [usage, setUsage] = useState<readonly ChatModelUsage[]>([]);
  const [editing, setEditing] = useState<Editing>();
  const [confirmRemove, setConfirmRemove] = useState<string>();
  const [label, setLabel] = useState(DEFAULT_KEY_LABEL);
  const [apiKey, setApiKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!service || !uid) return;
    return service.repository.watchCredentials(uid)(
      (value) => { setCredentials(value); setReady(true); },
      (cause) => { setLoadError(`Não foi possível carregar suas chaves: ${cause.message}`); setReady(false); },
    );
  }, [service, uid]);

  useEffect(() => {
    if (!service || !uid) return;
    // Informative only: without access to the table the keys can still be managed.
    return service.repository.watchUsage()(setUsage, () => setUsage([]));
  }, [service, uid]);

  const perform = async (operation: () => Promise<void>, message: string) => {
    if (busy) return false;
    setBusy(true); setFeedback(undefined);
    try { await operation(); setFeedback({ tone: "info", text: message }); return true; }
    catch (cause) { setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Não foi possível salvar." }); return false; }
    finally { setBusy(false); }
  };

  const openForm = (next: Editing) => {
    setFeedback(undefined); setConfirmRemove(undefined); setApiKey("");
    setLabel(next.kind === "replace" ? next.credential.label : credentials.length ? `Chave Gemini ${credentials.length + 1}` : DEFAULT_KEY_LABEL);
    setEditing(next);
  };
  const closeForm = () => { setEditing(undefined); setApiKey(""); setFeedback(undefined); };

  const saveKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!service || !uid || !editing) return;
    const replacing = editing.kind === "replace" ? editing.credential.id : undefined;
    const ok = await perform(() => service.saveCredential(uid, label.trim() || DEFAULT_KEY_LABEL, apiKey, replacing), replacing ? "Chave trocada. Ela será testada na próxima pergunta ao Oráculo." : "Chave adicionada. Ela será testada na próxima pergunta ao Oráculo.");
    if (ok) { setApiKey(""); setEditing(undefined); }
  };

  const removeKey = async (credential: ChatCredentialSummary) => {
    if (!service || !uid) return;
    const ok = await perform(() => service.removeCredential(uid, credential.id), `"${credential.label}" foi removida.`);
    if (ok) setConfirmRemove(undefined);
  };

  const header = (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Oráculo</p>
      <h2 id="oracle-settings-title">Inteligência artificial</h2>
      <p>O Oráculo responde usando chaves de acesso do Google Gemini cadastradas pela mesa, em rodízio. Ele anota o que cada chave já gastou em cada modelo e vai direto para a que ainda tem cota. Se ninguém tiver chave, adicione a sua (o plano gratuito serve). As chaves antigas do Groq não são mais usadas.</p>
    </header>
  );

  if (!uid) {
    return <section className={styles.panel} aria-labelledby="oracle-settings-title">
      {header}
      <div className={styles.callout}><p>Entre na sua conta para configurar o Oráculo e guardar suas conversas.</p><Button variant="secondary" onClick={onOpenAccount}>Entrar na conta</Button></div>
    </section>;
  }
  if (!service) {
    return <section className={styles.panel} aria-labelledby="oracle-settings-title">{header}<InlineStatus tone="warning">O Oráculo não está disponível neste aparelho: a sincronização na nuvem está desligada.</InlineStatus></section>;
  }

  const full = credentials.length >= MAX_CREDENTIALS_PER_USER;
  const feedbackStatus = feedback ? <InlineStatus tone={feedback.tone} assertive={feedback.tone === "error"}>{feedback.text}</InlineStatus> : null;

  return <section className={styles.panel} aria-labelledby="oracle-settings-title">
    {header}
    {loadError ? <InlineStatus tone="error" assertive>{loadError}</InlineStatus> : null}
    {!ready && !loadError ? <p className={styles.muted} role="status">Carregando…</p> : null}

    {ready && credentials.length ? (
      <div className={styles.keyBlock}>
        <h3 className={styles.listTitle}>Suas chaves <span>{credentials.length} de {MAX_CREDENTIALS_PER_USER}</span></h3>
        <ul className={styles.keyList}>
          {credentials.map((credential) => {
            const status = keyStatus(credential);
            const removing = confirmRemove === credential.id;
            return (
              <li key={credential.id} className={styles.keyItem}>
                <div className={styles.keyCard}>
                  <KeyIcon size={20} weight="duotone" aria-hidden="true" />
                  <div className={styles.keyInfo}>
                    <strong>{credential.label}</strong>
                    <span className={styles.keyMeta}>
                      <Badge tone={status.tone}>{status.text}</Badge>
                      <span>{credential.createdAt ? `desde ${new Date(credential.createdAt).toLocaleDateString("pt-BR")}` : "agora"}</span>
                    </span>
                  </div>
                  <div className={styles.keyActions}>
                    <button type="button" className={styles.iconAction} disabled={busy} onClick={() => openForm({ kind: "replace", credential })} aria-label={`Trocar ${credential.label}`} title="Trocar chave">
                      <ArrowsClockwiseIcon size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconAction} data-tone="danger" disabled={busy} onClick={() => { setFeedback(undefined); setEditing(undefined); setConfirmRemove(credential.id); }} aria-label={`Remover ${credential.label}`} title="Remover chave">
                      <TrashIcon size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {credential.status === "invalid" ? <p className={styles.warn}>O Google recusou esta chave. Troque por uma chave válida.</p> : null}
                {credential.status !== "invalid" ? <KeyUsage keyId={credential.id} rows={usage} /> : null}
                {removing ? (
                  <div className={styles.confirm} role="group" aria-label={`Confirmar remoção de ${credential.label}`}>
                    <p>Remover "{credential.label}"? {credentials.length === 1 ? "Se não houver outras chaves na mesa, o Oráculo para de responder." : "As outras chaves continuam funcionando."}</p>
                    <div className={styles.actions}>
                      <Button variant="danger" busy={busy} onClick={() => void removeKey(credential)}>Remover</Button>
                      <Button variant="ghost" disabled={busy} onClick={() => setConfirmRemove(undefined)}>Cancelar</Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    ) : null}

    {editing ? (
      <form className={styles.keyForm} onSubmit={(event) => void saveKey(event)}>
        <h3 className={styles.listTitle}>{editing.kind === "replace" ? `Trocar "${editing.credential.label}"` : "Nova chave"}</h3>
        <div className={styles.callout} data-tone="warning">
          <KeyIcon size={18} weight="duotone" aria-hidden="true" />
          <p><strong>Sua chave será usada por toda a mesa.</strong> As perguntas saem do navegador de cada jogador, então quem estiver logado no app consegue ver a chave. Use uma chave só para isso.</p>
        </div>
        <details className={styles.tutorial} open={!credentials.length}>
          <summary>Como conseguir sua chave<CaretDownIcon size={12} weight="bold" aria-hidden="true" /></summary>
          <ol>
            <li><span><strong>Entre com sua conta Google</strong> no Google AI Studio e aceite os termos (é preciso ter 18 anos ou mais).</span></li>
            <li><span>Abra a página <strong>API Keys</strong>.</span></li>
            <li><span>Toque em <strong>Create API key</strong>, dê um nome (ex.: "Oráculo da Mesa") e confirme.</span></li>
            <li><span><strong>Copie a chave inteira</strong>, sem espaços.</span></li>
            <li><span>Volte aqui, cole no campo abaixo e toque em <strong>Salvar chave</strong>.</span></li>
          </ol>
          <p>O limite de uso é contado por projeto do Google. Várias chaves do mesmo projeto dividem o mesmo limite; para somar, use chaves de contas ou projetos diferentes. No plano gratuito, o Google pode usar as conversas para melhorar os produtos dele.</p>
          <a className={styles.tutorialLink} href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
            Abrir API Keys no Google AI Studio<ArrowSquareOutIcon size={16} weight="bold" aria-hidden="true" />
          </a>
        </details>
        <Input label="Chave da API Gemini" type="password" autoComplete="new-password" value={apiKey} maxLength={512} disabled={busy} onChange={(event) => setApiKey(event.currentTarget.value)} hint="Cole aqui a chave criada no Google AI Studio." />
        <Input label="Nome (opcional)" value={label} maxLength={60} disabled={busy} onChange={(event) => setLabel(event.currentTarget.value)} hint="Para você reconhecer a chave depois." />
        {feedbackStatus}
        <div className={styles.actions}>
          <Button type="submit" busy={busy} disabled={!apiKey.trim()}>{editing.kind === "replace" ? "Trocar chave" : "Salvar chave"}</Button>
          <Button variant="ghost" disabled={busy} onClick={closeForm}>Cancelar</Button>
        </div>
      </form>
    ) : ready ? (
      <div className={styles.keyBlock}>
        {feedbackStatus}
        {full
          ? <p className={styles.muted}>Você atingiu o limite de {MAX_CREDENTIALS_PER_USER} chaves. Remova uma para adicionar outra.</p>
          : <div className={styles.actions}><Button variant="secondary" className={styles.iconLabel} onClick={() => openForm({ kind: "new" })}><PlusIcon size={18} weight="bold" aria-hidden="true" />{credentials.length ? "Adicionar outra chave" : "Adicionar minha chave"}</Button></div>}
      </div>
    ) : null}
  </section>;
}
