import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, InlineStatus, Input } from "@components/ui";
import type { ChatService } from "@application/chat/service";
import { DEFAULT_CHAT_PREFERENCES, type ChatCredentialSummary } from "@application/ports/chat";
import styles from "./ChatSettingsPanel.module.css";

export function ChatSettingsPanel({ service, uid, onOpenAccount }: { readonly service?: ChatService; readonly uid?: string; readonly onOpenAccount: () => void }) {
  const [preferences, setPreferences] = useState(DEFAULT_CHAT_PREFERENCES);
  const [credential, setCredential] = useState<ChatCredentialSummary>();
  const [label, setLabel] = useState("Minha chave Ollama");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<readonly string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!service || !uid) return;
    const fail = (cause: Error) => { setError(`Não foi possível ler a configuração no Firestore: ${cause.message}`); setReady(false); };
    const stopPreferences = service.repository.watchPreferences(uid)((value) => { setPreferences(value); setReady(true); }, fail);
    const stopCredential = service.repository.watchCredential(uid)((value) => { setCredential(value); if (value) setLabel(value.label); }, fail);
    return () => { stopPreferences(); stopCredential(); };
  }, [service, uid]);

  const perform = async (operation: () => Promise<void>, message: string) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await operation(); setNotice(message); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a configuração."); }
    finally { setBusy(false); }
  };

  const saveKey = (event: FormEvent) => {
    event.preventDefault();
    if (!service || !uid) return;
    void perform(async () => { await service.saveCredential(uid, label, apiKey); setApiKey(""); }, "Chave salva no pool compartilhado. Ela será verificada na próxima consulta ao servidor.");
  };

  return <section className={styles.panel} aria-labelledby="ollama-settings-title">
    <header><p className={styles.eyebrow}>ORÁCULO</p><h2 id="ollama-settings-title">Chat e inteligência artificial</h2><p>Conversas na sua conta. Chaves compartilhadas por ordem de cadastro.</p></header>
    {!uid ? <div><p>Entre na conta para configurar o chat e salvar conversas.</p><Button variant="secondary" onClick={onOpenAccount}>Entrar na conta</Button></div> : !service ? <InlineStatus tone="warning">O Firebase não está configurado para o chat.</InlineStatus> : <>
      {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
      {notice ? <InlineStatus tone="info">{notice}</InlineStatus> : null}
      {!ready && !error ? <p role="status">Carregando configuração…</p> : null}
      <form className={styles.form} onSubmit={saveKey}>
        <h3>Sua chave Ollama</h3>
        <p className={styles.sharedNotice}>Ao cadastrar, você compartilha esta chave com todas as contas autenticadas do app. Como as chamadas saem do navegador, essas contas podem acessar a chave.</p>
        {credential ? <p>Chave cadastrada: <strong>{credential.label}</strong> · {credential.status === "invalid" ? "inválida — substitua a chave" : credential.status === "cooldown" && credential.cooldownUntil > Date.now() ? `em espera até ${new Date(credential.cooldownUntil).toLocaleTimeString("pt-BR")}` : "disponível"}</p> : <p>Nenhuma chave sua cadastrada. Você também pode usar o pool existente.</p>}
        <Input label="Identificação" value={label} maxLength={60} disabled={busy || !ready} onChange={(event) => setLabel(event.currentTarget.value)} />
        <Input label={credential ? "Nova chave para substituir a atual" : "API key Ollama"} type="password" autoComplete="new-password" value={apiKey} maxLength={512} disabled={busy || !ready} onChange={(event) => setApiKey(event.currentTarget.value)} />
        <div className={styles.actions}>
          <Button type="submit" busy={busy} disabled={!ready || !apiKey.trim()}>{credential ? "Substituir chave" : "Cadastrar chave"}</Button>
          {credential ? <Button variant="danger" disabled={busy || !ready} onClick={() => void perform(() => service.removeCredential(uid), "Sua chave foi removida do pool.")}>Remover minha chave</Button> : null}
        </div>
      </form>
      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void perform(() => service.savePreferences(uid, preferences), "Servidor e modelo salvos no Firestore."); }}>
        <h3>Servidor e modelo</h3>
        <Input label="URL base do Ollama" type="url" value={preferences.baseUrl} disabled={busy || !ready} onChange={(event) => setPreferences((current) => ({ ...current, baseUrl: event.currentTarget.value }))} hint="Informe a origem do servidor, sem /api/chat. Ele precisa permitir CORS para este site." />
        <Input label="Modelo" value={preferences.model} list="ollama-models" placeholder="Nome retornado pelo servidor" maxLength={128} disabled={busy || !ready} onChange={(event) => setPreferences((current) => ({ ...current, model: event.currentTarget.value }))} />
        <datalist id="ollama-models">{models.map((model) => <option key={model} value={model} />)}</datalist>
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy || !ready} onClick={() => void perform(async () => {
            const available = await service.listModels(uid, preferences.baseUrl);
            setModels(available);
            if (!preferences.model && available[0]) setPreferences((current) => ({ ...current, model: available[0] }));
            if (!available.length) throw new Error("O servidor não retornou modelos disponíveis.");
          }, "Modelos consultados. Escolha o modelo e salve a configuração.")}>Buscar modelos</Button>
          <Button type="submit" disabled={busy || !ready || !preferences.model.trim()}>Salvar configuração</Button>
        </div>
      </form>
    </>}
  </section>;
}
