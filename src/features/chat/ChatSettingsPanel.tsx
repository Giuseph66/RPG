import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowSquareOutIcon, CaretDownIcon, KeyIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge, Button, InlineStatus, Input } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import type { ChatCredentialSummary } from "@application/ports/chat";
import styles from "./ChatSettingsPanel.module.css";

type Feedback = { readonly tone: "info" | "error"; readonly text: string };

const DEFAULT_KEY_LABEL = "Minha chave Groq";

function keyStatus(credential: ChatCredentialSummary) {
  if (credential.status === "invalid") return { tone: "danger" as const, text: "Inválida" };
  if (credential.status === "cooldown" && credential.cooldownUntil > Date.now()) return { tone: "warning" as const, text: `Em espera até ${new Date(credential.cooldownUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` };
  return { tone: "xp" as const, text: "Disponível" };
}

/** The Oráculo's model is fixed; the only thing a player configures is the shared access key. */
export function ChatSettingsPanel({ service, uid, onOpenAccount }: { readonly service?: ChatService; readonly uid?: string; readonly onOpenAccount: () => void }) {
  const [credential, setCredential] = useState<ChatCredentialSummary>();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-remove">("view");
  const [label, setLabel] = useState(DEFAULT_KEY_LABEL);
  const [apiKey, setApiKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!service || !uid) return;
    return service.repository.watchCredential(uid)(
      (value) => { setCredential(value); if (value) setLabel(value.label); setReady(true); },
      (cause) => { setLoadError(`Não foi possível carregar sua chave: ${cause.message}`); setReady(false); },
    );
  }, [service, uid]);

  const perform = async (operation: () => Promise<void>, message: string) => {
    if (busy) return false;
    setBusy(true); setFeedback(undefined);
    try { await operation(); setFeedback({ tone: "info", text: message }); return true; }
    catch (cause) { setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Não foi possível salvar." }); return false; }
    finally { setBusy(false); }
  };

  const saveKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!service || !uid) return;
    const ok = await perform(() => service.saveCredential(uid, label.trim() || DEFAULT_KEY_LABEL, apiKey), "Chave salva. Ela será testada na próxima pergunta ao Oráculo.");
    if (ok) { setApiKey(""); setMode("view"); }
  };

  const removeKey = async () => {
    if (!service || !uid) return;
    const ok = await perform(() => service.removeCredential(uid), "Sua chave foi removida.");
    if (ok) setMode("view");
  };

  const openForm = () => { setFeedback(undefined); setMode("edit"); };

  const header = (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Oráculo</p>
      <h2 id="oracle-settings-title">Inteligência artificial</h2>
      <p>O Oráculo responde usando chaves de acesso do GroqCloud cadastradas pela mesa, na ordem em que foram adicionadas. Se ninguém tiver chave, adicione a sua (o plano gratuito serve).</p>
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

  const credentialStatus = credential ? keyStatus(credential) : undefined;
  const feedbackStatus = feedback ? <InlineStatus tone={feedback.tone} assertive={feedback.tone === "error"}>{feedback.text}</InlineStatus> : null;

  return <section className={styles.panel} aria-labelledby="oracle-settings-title">
    {header}
    {loadError ? <InlineStatus tone="error" assertive>{loadError}</InlineStatus> : null}
    {!ready && !loadError ? <p className={styles.muted} role="status">Carregando…</p> : null}

    {mode === "edit" ? (
      <form className={styles.keyForm} onSubmit={(event) => void saveKey(event)}>
        <div className={styles.callout} data-tone="warning">
          <KeyIcon size={18} weight="duotone" aria-hidden="true" />
          <p><strong>Sua chave será usada por toda a mesa.</strong> As perguntas saem do navegador de cada jogador, então quem estiver logado no app consegue ver a chave. Use uma chave só para isso.</p>
        </div>
        <details className={styles.tutorial} open={!credential}>
          <summary>Como conseguir sua chave<CaretDownIcon size={12} weight="bold" aria-hidden="true" /></summary>
          <ol>
            <li><span><strong>Crie uma conta grátis</strong> no GroqCloud (dá para entrar com Google ou GitHub).</span></li>
            <li><span>Abra a página <strong>API Keys</strong> do console.</span></li>
            <li><span>Toque em <strong>Create API Key</strong>, dê um nome (ex.: "Oráculo da Mesa") e confirme.</span></li>
            <li><span><strong>Copie a chave na hora</strong>: ela começa com <code>gsk_</code> e só aparece uma vez.</span></li>
            <li><span>Volte aqui, cole no campo abaixo e toque em <strong>Salvar chave</strong>.</span></li>
          </ol>
          <a className={styles.tutorialLink} href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">
            Abrir API Keys no GroqCloud<ArrowSquareOutIcon size={16} weight="bold" aria-hidden="true" />
          </a>
        </details>
        <Input label="Chave da API GroqCloud" type="password" autoComplete="new-password" value={apiKey} maxLength={512} disabled={busy} onChange={(event) => setApiKey(event.currentTarget.value)} hint="Cole aqui a chave que começa com gsk_." />
        <Input label="Nome (opcional)" value={label} maxLength={60} disabled={busy} onChange={(event) => setLabel(event.currentTarget.value)} hint="Para você reconhecer a chave depois." />
        {feedbackStatus}
        <div className={styles.actions}>
          <Button type="submit" busy={busy} disabled={!apiKey.trim()}>{credential ? "Trocar chave" : "Salvar chave"}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => { setMode("view"); setApiKey(""); setFeedback(undefined); }}>Cancelar</Button>
        </div>
      </form>
    ) : credential && credentialStatus ? (
      <div className={styles.keyBlock}>
        <div className={styles.keyCard}>
          <KeyIcon size={20} weight="duotone" aria-hidden="true" />
          <p><strong>{credential.label}</strong><span>Sua chave</span></p>
          <Badge tone={credentialStatus.tone}>{credentialStatus.text}</Badge>
        </div>
        {credential.status === "invalid" ? <p className={styles.warn}>O GroqCloud recusou esta chave. Troque por uma chave válida.</p> : null}
        {feedbackStatus}
        {mode === "confirm-remove" ? (
          <div className={styles.confirm} role="group" aria-label="Confirmar remoção">
            <p>Remover sua chave? Se não houver outras chaves na mesa, o Oráculo para de responder.</p>
            <div className={styles.actions}>
              <Button variant="danger" busy={busy} onClick={() => void removeKey()}>Remover</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setMode("view")}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy || !ready} onClick={openForm}>Trocar chave</Button>
            <Button variant="ghost" className={styles.removeButton} disabled={busy || !ready} onClick={() => setMode("confirm-remove")}><TrashIcon size={18} weight="duotone" aria-hidden="true" />Remover</Button>
          </div>
        )}
      </div>
    ) : ready ? (
      <div className={styles.keyBlock}>
        {feedbackStatus}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={openForm}>Adicionar minha chave</Button>
        </div>
      </div>
    ) : null}
  </section>;
}
