import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowsClockwise, CaretDown, CheckCircle, Key, WarningCircle } from "@phosphor-icons/react";
import { Badge, Button, InlineStatus, Input, Select } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { DEFAULT_CHAT_PREFERENCES, type ChatCredentialSummary, type ChatPreferences } from "@application/ports/chat";
import styles from "./ChatSettingsPanel.module.css";

type Feedback = { readonly area: "model" | "key"; readonly tone: "info" | "error"; readonly text: string };
type ModelList = { readonly state: "idle" | "loading" | "ready" | "error"; readonly items: readonly string[]; readonly message?: string };

const DEFAULT_KEY_LABEL = "Minha chave Ollama";

function keyStatus(credential: ChatCredentialSummary) {
  if (credential.status === "invalid") return { tone: "danger" as const, text: "Inválida" };
  if (credential.status === "cooldown" && credential.cooldownUntil > Date.now()) return { tone: "warning" as const, text: `Em espera até ${new Date(credential.cooldownUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` };
  return { tone: "xp" as const, text: "Disponível" };
}

export function ChatSettingsPanel({ service, uid, onOpenAccount }: { readonly service?: ChatService; readonly uid?: string; readonly onOpenAccount: () => void }) {
  const [saved, setSaved] = useState<ChatPreferences>(DEFAULT_CHAT_PREFERENCES);
  const [draft, setDraft] = useState<ChatPreferences>(DEFAULT_CHAT_PREFERENCES);
  const [credential, setCredential] = useState<ChatCredentialSummary>();
  const [models, setModels] = useState<ModelList>({ state: "idle", items: [] });
  const [keyForm, setKeyForm] = useState<"closed" | "edit" | "confirm-remove">("closed");
  const [label, setLabel] = useState(DEFAULT_KEY_LABEL);
  const [apiKey, setApiKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback>();
  const [loadError, setLoadError] = useState("");
  const [busyArea, setBusyArea] = useState<Feedback["area"]>();
  const [ready, setReady] = useState(false);

  const busy = busyArea !== undefined;
  const dirty = draft.baseUrl !== saved.baseUrl || draft.model !== saved.model;

  useEffect(() => {
    if (!service || !uid) return;
    const fail = (cause: Error) => { setLoadError(`Não foi possível carregar a configuração: ${cause.message}`); setReady(false); };
    const stopPreferences = service.repository.watchPreferences(uid)((value) => { setSaved(value); setDraft(value); setReady(true); }, fail);
    const stopCredential = service.repository.watchCredential(uid)((value) => { setCredential(value); if (value) setLabel(value.label); }, fail);
    return () => { stopPreferences(); stopCredential(); };
  }, [service, uid]);

  const loadModels = useCallback(async (baseUrl: string, signal?: AbortSignal) => {
    if (!service || !uid) return;
    setModels((current) => ({ ...current, state: "loading", message: undefined }));
    try {
      const items = await service.listModels(uid, baseUrl, signal);
      if (signal?.aborted) return;
      setModels(items.length ? { state: "ready", items } : { state: "error", items: [], message: "O servidor não informou nenhum modelo." });
      if (items[0]) setDraft((current) => current.model ? current : { ...current, model: items[0] });
    } catch (cause) {
      if (signal?.aborted) return;
      setModels({ state: "error", items: [], message: cause instanceof Error ? cause.message : "Não foi possível buscar os modelos." });
    }
  }, [service, uid]);

  // Fetch the model list once the saved server is known, so picking a model is a single choice.
  useEffect(() => {
    if (!ready || !service || !uid) return;
    const controller = new AbortController();
    void loadModels(saved.baseUrl, controller.signal);
    return () => controller.abort();
  }, [ready, service, uid, saved.baseUrl, loadModels]);

  const perform = async (area: Feedback["area"], operation: () => Promise<void>, message: string) => {
    if (busy) return false;
    setBusyArea(area); setFeedback(undefined);
    try { await operation(); setFeedback({ area, tone: "info", text: message }); return true; }
    catch (cause) { setFeedback({ area, tone: "error", text: cause instanceof Error ? cause.message : "Não foi possível salvar." }); return false; }
    finally { setBusyArea(undefined); }
  };

  const saveModel = (event: FormEvent) => {
    event.preventDefault();
    if (!service || !uid) return;
    void perform("model", () => service.savePreferences(uid, draft), "Pronto! O Oráculo vai usar este modelo.");
  };

  const saveKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!service || !uid) return;
    const ok = await perform("key", () => service.saveCredential(uid, label.trim() || DEFAULT_KEY_LABEL, apiKey), "Chave salva. Ela será testada na próxima pergunta ao Oráculo.");
    if (ok) { setApiKey(""); setKeyForm("closed"); }
  };

  const removeKey = async () => {
    if (!service || !uid) return;
    const ok = await perform("key", () => service.removeCredential(uid), "Sua chave foi removida.");
    if (ok) setKeyForm("closed");
  };

  const header = (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Oráculo</p>
      <h2 id="oracle-settings-title">Inteligência artificial</h2>
      <p>Escolha qual IA responde no chat da mesa.</p>
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

  const modelOptions = draft.model && !models.items.includes(draft.model) ? [draft.model, ...models.items] : models.items;
  const status = !ready ? undefined : saved.model ? { ok: true, text: "Pronto para conversar", detail: saved.model } : { ok: false, text: "Falta escolher um modelo", detail: "Escolha abaixo para começar a usar o chat." };
  const credentialStatus = credential ? keyStatus(credential) : undefined;
  const showFeedback = (area: Feedback["area"]) => feedback?.area === area ? <InlineStatus tone={feedback.tone} assertive={feedback.tone === "error"}>{feedback.text}</InlineStatus> : null;

  return <section className={styles.panel} aria-labelledby="oracle-settings-title">
    {header}

    {loadError ? <InlineStatus tone="error" assertive>{loadError}</InlineStatus> : null}
    {!ready && !loadError ? <p className={styles.muted} role="status">Carregando configuração…</p> : null}
    {status ? (
      <div className={styles.status} data-ok={status.ok || undefined} role="status">
        {status.ok ? <CheckCircle size={22} weight="fill" aria-hidden="true" /> : <WarningCircle size={22} weight="fill" aria-hidden="true" />}
        <p><strong>{status.text}</strong><span>{status.detail}</span></p>
      </div>
    ) : null}

    {/* 1 · Model */}
    <form className={styles.step} onSubmit={saveModel}>
      <h3><span className={styles.stepNumber} aria-hidden="true">1</span>Modelo</h3>
      <p className={styles.muted}>A IA que vai pensar e responder. Modelos maiores costumam responder melhor, mas demoram mais.</p>

      {models.state === "ready" ? (
        <Select label="Modelo" value={draft.model} disabled={busy || !ready} onChange={(event) => setDraft((current) => ({ ...current, model: event.currentTarget.value }))} options={modelOptions.map((model) => ({ value: model, label: model }))} />
      ) : (
        <Input label="Modelo" value={draft.model} placeholder={models.state === "loading" ? "Buscando modelos…" : "ex.: llama3.1:8b"} maxLength={128} disabled={busy || !ready} onChange={(event) => setDraft((current) => ({ ...current, model: event.currentTarget.value }))} />
      )}

      <div className={styles.inlineRow}>
        {models.state === "loading" ? <span className={styles.muted} role="status">Buscando modelos disponíveis…</span>
          : models.state === "error" ? <span className={styles.warn}>{models.message} Digite o nome do modelo ou tente de novo.</span>
            : models.state === "ready" ? <span className={styles.muted}>{models.items.length} {models.items.length === 1 ? "modelo disponível" : "modelos disponíveis"}</span> : null}
        <button type="button" className={styles.linkButton} disabled={busy || !ready || models.state === "loading"} onClick={() => void loadModels(draft.baseUrl)}>
          <ArrowsClockwise size={15} aria-hidden="true" /> Atualizar lista
        </button>
      </div>

      <details className={styles.advanced}>
        <summary>Servidor (avançado)<CaretDown size={12} weight="bold" aria-hidden="true" /></summary>
        <Input label="Endereço do servidor Ollama" type="url" value={draft.baseUrl} disabled={busy || !ready} onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.currentTarget.value }))} hint="Deixe https://ollama.com para usar o serviço oficial. Servidores próprios precisam liberar acesso (CORS) para este site." />
      </details>

      {showFeedback("model")}
      <div className={styles.actions}>
        <Button type="submit" busy={busyArea === "model"} disabled={busy || !ready || !draft.model.trim() || !dirty}>{dirty ? "Salvar modelo" : "Salvo"}</Button>
        {dirty ? <Button variant="ghost" disabled={busy} onClick={() => setDraft(saved)}>Desfazer</Button> : null}
      </div>
    </form>

    {/* 2 · Key */}
    <div className={styles.step}>
      <h3><span className={styles.stepNumber} aria-hidden="true">2</span>Chave de acesso</h3>
      <p className={styles.muted}>O Oráculo usa as chaves Ollama cadastradas pela mesa, na ordem em que foram adicionadas. Se ninguém tiver chave, adicione a sua.</p>

      {keyForm === "edit" ? (
        <form className={styles.keyForm} onSubmit={(event) => void saveKey(event)}>
          <div className={styles.callout} data-tone="warning">
            <Key size={18} weight="duotone" aria-hidden="true" />
            <p><strong>Sua chave será usada por toda a mesa.</strong> As perguntas saem do navegador de cada jogador, então quem estiver logado no app consegue ver a chave. Use uma chave só para isso.</p>
          </div>
          <Input label="Chave da API Ollama" type="password" autoComplete="new-password" value={apiKey} maxLength={512} disabled={busy} onChange={(event) => setApiKey(event.currentTarget.value)} hint="Crie em ollama.com → Settings → Keys." />
          <Input label="Nome (opcional)" value={label} maxLength={60} disabled={busy} onChange={(event) => setLabel(event.currentTarget.value)} hint="Para você reconhecer a chave depois." />
          {showFeedback("key")}
          <div className={styles.actions}>
            <Button type="submit" busy={busyArea === "key"} disabled={busy || !apiKey.trim()}>{credential ? "Trocar chave" : "Salvar chave"}</Button>
            <Button variant="ghost" disabled={busy} onClick={() => { setKeyForm("closed"); setApiKey(""); setFeedback(undefined); }}>Cancelar</Button>
          </div>
        </form>
      ) : credential && credentialStatus ? (
        <>
          <div className={styles.keyCard}>
            <Key size={20} weight="duotone" aria-hidden="true" />
            <p><strong>{credential.label}</strong><span>Sua chave</span></p>
            <Badge tone={credentialStatus.tone}>{credentialStatus.text}</Badge>
          </div>
          {credential.status === "invalid" ? <p className={styles.warn}>O servidor recusou esta chave. Troque por uma chave válida.</p> : null}
          {showFeedback("key")}
          {keyForm === "confirm-remove" ? (
            <div className={styles.confirm} role="group" aria-label="Confirmar remoção">
              <p>Remover sua chave? Se não houver outras chaves na mesa, o Oráculo para de responder.</p>
              <div className={styles.actions}>
                <Button variant="danger" busy={busyArea === "key"} onClick={() => void removeKey()}>Remover</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setKeyForm("closed")}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <Button variant="secondary" disabled={busy || !ready} onClick={() => { setFeedback(undefined); setKeyForm("edit"); }}>Trocar chave</Button>
              <button type="button" className={styles.dangerLink} disabled={busy || !ready} onClick={() => setKeyForm("confirm-remove")}>Remover</button>
            </div>
          )}
        </>
      ) : (
        <>
          {showFeedback("key")}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy || !ready} onClick={() => { setFeedback(undefined); setKeyForm("edit"); }}>Adicionar minha chave</Button>
          </div>
        </>
      )}
    </div>
  </section>;
}
