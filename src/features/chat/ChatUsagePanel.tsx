import { useEffect, useState } from "react";
import type { ChatCredentialUsage } from "@application/ports/chat";
import { AppModal } from "@components/ui";
import { CaretDown } from "@phosphor-icons/react";
import styles from "./ChatScreen.module.css";

function countdown(until: number, now: number) {
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  return `${seconds} s`;
}

export function ChatUsagePanel({ usages }: { readonly usages: readonly ChatCredentialUsage[] }) {
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

  const until = usage.cooldownUntil ?? usage.retryAt;
  const status = `${usage.credentialLabel}${until !== undefined ? ` · ${countdown(until, now)}` : " · Limite atingido"}`;

  return <>
    <div className={styles.usageCompact}>
      <button type="button" className={styles.usageToggle} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Ver detalhes do limite do Gemini: ${status}`}>
        <span className={styles.usageToggleHeading}>{limitedKeys.length > 1 ? `${limitedKeys.length} chaves em espera` : "Chave em espera"} <CaretDown size={12} aria-hidden="true" /></span>
        <small data-limited={usage.limited || undefined}>{status}</small>
      </button>
      <a className={styles.usageLink} href="https://aistudio.google.com/rate-limit" target="_blank" rel="noopener noreferrer" aria-label="Verificar seu uso no Google AI Studio (abre em nova aba)">Verificar seu uso ↗</a>
    </div>
    {open ? <AppModal open title="Limite da chave" onClose={() => setOpen(false)}>
      <section className={styles.usagePanel} aria-label="Limites de uso do Gemini">
        <div className={styles.usageHeading}><strong>{usage.credentialLabel}</strong><small>Atualizado às {new Date(usage.observedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>
        {limitedKeys.length > 1 ? <label className={styles.usageKeySelector}>Ver outra chave<select value={usage.credentialId} onChange={(event) => setSelectedId(event.currentTarget.value)}>{limitedKeys.map((item) => <option key={item.credentialId} value={item.credentialId}>{item.credentialLabel}</option>)}</select></label> : null}
        <p className={styles.usageWarning} role="status">O Google limitou esta chave (uso, créditos ou acesso do projeto) e ela está em espera. {until !== undefined ? `Poderá ser tentada novamente em ${countdown(until, now)}.` : "A liberação depende do Google."} As demais chaves disponíveis continuam sendo usadas.</p>
        <details className={styles.usageInfo}><summary>Sobre os limites</summary><p>O Gemini conta o uso por projeto do Google, por minuto e por dia. Chaves do mesmo projeto dividem o mesmo limite; o limite diário é renovado à meia-noite no horário do Pacífico. O painel do Google AI Studio mostra o consumo da conta em que você estiver conectado.</p></details>
      </section>
    </AppModal> : null}
  </>;
}
