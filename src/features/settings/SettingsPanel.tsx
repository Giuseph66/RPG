import { useEffect, useState } from "react";
import { Button, InlineStatus, SectionCard, Select } from "@components/ui";
import type { AppSettings } from "@application/ports/settings-repository";
import type { SettingsStore } from "@application/settings";
import styles from "./settings.module.css";

export interface SettingsPanelProps {
  readonly store?: SettingsStore;
}

const FALLBACK: AppSettings = { theme: "system", reducedMotion: undefined, diceHistoryRetention: 1000, language: "pt-BR" };

/** Settings stay a utility surface; persistence is optional until composition injects it. */
export function SettingsPanel({ store }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(store?.getSnapshot().value ?? FALLBACK);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot();
      if (next.value) setSettings(next.value);
      if (next.status === "error") setMessage("Não foi possível salvar a preferência.");
      if (next.status === "clean") setMessage("Preferência salva.");
    });
    void store.hydrate();
    return unsubscribe;
  }, [store]);

  async function update(patch: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    if (!store) return;
    const result = await store.update(patch);
    setMessage(result.ok ? "Preferência salva." : "Não foi possível salvar a preferência.");
  }

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <p className={styles.eyebrow}>FERRAMENTAS DA MESA</p>
      <h1 id="settings-title" className={styles.title} tabIndex={-1}>Configurações</h1>
      <p className={styles.intro}>Ajustes pequenos ficam neste dispositivo e acompanham seu modo de jogar.</p>
      {message ? <InlineStatus tone={message.includes("não") ? "error" : "success"}>{message}</InlineStatus> : null}
      <div className={styles.grid}>
        <SectionCard heading="Aparência" headingLevel={2}>
          <Select label="Tema" value={settings.theme} onChange={(event) => void update({ theme: event.target.value as AppSettings["theme"] })} options={[{ value: "system", label: "Sistema" }, { value: "dark", label: "Noite de pedra" }, { value: "light", label: "Papel claro" }]} />
          <label className={styles.checkRow}><input type="checkbox" checked={settings.reducedMotion === true} onChange={(event) => void update({ reducedMotion: event.target.checked })} /> <span>Reduzir movimento</span></label>
        </SectionCard>
        <SectionCard heading="Dados e idioma" headingLevel={2}>
          <p className={styles.detail}><strong>Idioma</strong><span>Português (Brasil)</span></p>
          <p className={styles.detail}><strong>Histórico de dados</strong><span>{settings.diceHistoryRetention} entradas</span></p>
          <Button variant="secondary" size="sm" onClick={() => void update({ diceHistoryRetention: 1000 })}>Restaurar retenção padrão</Button>
        </SectionCard>
      </div>
    </section>
  );
}
