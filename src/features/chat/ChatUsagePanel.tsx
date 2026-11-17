import { useEffect, useId, useState } from "react";
import type { ChatCredentialUsage, ChatUsageWindow } from "@application/ports/chat";
import { AppModal } from "@components/ui";
import { CaretDown } from "@phosphor-icons/react";
import styles from "./ChatScreen.module.css";

const number = (value: number) => value.toLocaleString("pt-BR");
function countdown(until: number, now: number) {
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  return `${seconds} s`;
}

export function ChatUsagePanel({ usages }: { readonly usages: readonly ChatCredentialUsage[] }) {
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [now, setNow] = useState(Date.now);
  const limitedKeys = usages.filter((item) => item.limited && (item.cooldownUntil ?? item.retryAt ?? Infinity) > now);
  const usage = limitedKeys.find((item) => item.credentialId === selectedId) ?? limitedKeys[0];
  useEffect(() => { if (!usage) setOpen(false); }, [usage]);
  useEffect(() => {
    const current = Date.now();
    setNow(current);
    const until = Math.max(0, ...usages.map((item) => item.cooldownUntil ?? item.retryAt ?? 0));
    if (until <= current) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= until) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [usages]);

  if (!usage) return null;

  const meter = (kind: string, label: string, window?: ChatUsageWindow) => {
    const expired = window?.resetsAt !== undefined && window.resetsAt <= now;
    const used = window ? window.limit - window.remaining : 0;
    const percentage = window ? Math.round(used / window.limit * 100) : 0;
    return <div className={styles.usageMeter}>
      <div className={styles.usageLabel}><span id={`${prefix}-${kind}`}>{label}</span><span>{window && !expired ? `${percentage}% usado` : "Sem leitura atual"}</span></div>
      {window && !expired
        ? <progress aria-labelledby={`${prefix}-${kind}`} max={window.limit} value={used} data-warning={percentage >= 90 || undefined} />
        : <div className={styles.usageTrack} aria-hidden="true" />}
      <small>{window
        ? expired ? "Aguardando nova leitura da Groq." : `${number(window.remaining)} de ${number(window.limit)} disponíveis${window.resetsAt !== undefined ? ` · reposição em ${countdown(window.resetsAt, now)}` : ""}`
        : "Limite ainda não informado."}</small>
    </div>;
  };

  const currentPercentage = (window?: ChatUsageWindow) => window && (window.resetsAt === undefined || window.resetsAt > now)
    ? Math.round((window.limit - window.remaining) / window.limit * 100) : undefined;
  const requests = currentPercentage(usage?.requests), tokens = currentPercentage(usage?.tokens);
  const until = usage.cooldownUntil ?? usage.retryAt;
  const status = `${usage.credentialLabel}${until !== undefined ? ` · ${countdown(until, now)}` : " · Limite atingido"}`;

  return <>
    <div className={styles.usageCompact}>
      <button type="button" className={styles.usageToggle} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Ver detalhes do uso da Groq: ${status}`}>
        <span className={styles.usageToggleHeading}>{limitedKeys.length > 1 ? `${limitedKeys.length} chaves em espera` : "Chave em espera"} <CaretDown size={12} aria-hidden="true" /></span>
        <small data-limited={usage?.limited || undefined}>{status}</small>
        <span className={styles.usageMiniMeters} aria-hidden="true">{[requests, tokens].map((value, index) => <span key={index} className={styles.usageTrack}><span style={{ width: `${value ?? 0}%` }} data-warning={value !== undefined && value >= 90 || undefined} /></span>)}</span>
      </button>
      <a className={styles.usageLink} href="https://console.groq.com/dashboard/usage" target="_blank" rel="noopener noreferrer" aria-label="Verificar seu uso no GroqCloud (abre em nova aba)">Verificar seu uso ↗</a>
    </div>
    {open ? <AppModal open title="Limite da chave" onClose={() => setOpen(false)}>
      <section className={styles.usagePanel} aria-label="Limites de uso do GroqCloud">
        <div className={styles.usageHeading}><strong>{usage.credentialLabel}</strong><small>Atualizado às {new Date(usage.observedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>
        {limitedKeys.length > 1 ? <label className={styles.usageKeySelector}>Ver outra chave<select value={usage.credentialId} onChange={(event) => setSelectedId(event.currentTarget.value)}>{limitedKeys.map((item) => <option key={item.credentialId} value={item.credentialId}>{item.credentialLabel}</option>)}</select></label> : null}
        <div className={styles.usageMeters}>
          {meter("requests", "Requisições / dia", usage.requests)}
          {meter("tokens", "Tokens / minuto", usage.tokens)}
        </div>
        <p className={styles.usageWarning} role="status">Esta chave recebeu um erro 429 e está em espera. {until !== undefined ? `Poderá ser tentada novamente em ${countdown(until, now)}.` : "A liberação depende da Groq."} As demais chaves disponíveis continuam sendo usadas.</p>
        <details className={styles.usageInfo}><summary>Sobre os limites</summary><p>{!usage.requests && !usage.tokens ? "A Groq não informou o saldo ao navegador nesta chamada. " : ""}Saldo informado para esta chave. A Groq compartilha limites entre chaves da mesma organização; o tempo de espera é controlado separadamente para cada chave cadastrada. O painel da Groq mostra o consumo da conta em que você estiver conectado.</p></details>
      </section>
    </AppModal> : null}
  </>;
}
