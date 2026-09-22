import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@components/ui";
import type { AppSettings, DiceColorHex } from "@application/ports/settings-repository";
import type { SettingsStore } from "@application/settings";
import { Dice3D, type Dice3DHandle } from "@features/dice3d";
import styles from "./settings.module.css";

export interface SettingsPanelProps {
  readonly store?: SettingsStore;
}

const DICE_COLORS = { face: "#14100d", edge: "#D0AB72", shadow: "#090706" } as const;
const FALLBACK: AppSettings = { theme: "system", reducedMotion: undefined, diceFaceColor: DICE_COLORS.face, diceEdgeColor: DICE_COLORS.edge, diceShadowColor: DICE_COLORS.shadow, diceHistoryRetention: 1000, language: "pt-BR" };

/** Settings stay a utility surface; persistence is optional until composition injects it. */
export function SettingsPanel({ store }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(store?.getSnapshot().value ?? FALLBACK);
  const previewRef = useRef<Dice3DHandle>(null);

  useEffect(() => {
    if (!store) return;
    const unsubscribe = store.subscribe(() => {
      const next = store.getSnapshot();
      if (next.value) setSettings(next.value);
    });
    void store.hydrate();
    return unsubscribe;
  }, [store]);

  function update(patch: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    if (!store) return;
    void store.update(patch);
  }

  const corDoDado = settings.diceFaceColor ?? DICE_COLORS.face;
  const corDasArestas = settings.diceEdgeColor ?? DICE_COLORS.edge;
  const corDaSombra = settings.diceShadowColor ?? DICE_COLORS.shadow;
  const previewAppearance = useMemo(() => ({
    color: corDoDado,
    edgeColor: corDasArestas,
    edgeOpacity: 0.85,
    numberColor: "#f7f7fa",
    roughness: 0.34,
    metalness: 0.32,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
  }), [corDasArestas, corDoDado]);

  useEffect(() => {
    previewRef.current?.setAppearance("d20", previewAppearance);
  }, [previewAppearance]);

  useEffect(() => {
    previewRef.current?.setShadowColor(corDaSombra);
  }, [corDaSombra]);

  return (
    <section className={styles.panel} aria-labelledby="settings-title">
      <p className={styles.eyebrow}>FERRAMENTAS DA MESA</p>
      <h1 id="settings-title" className={styles.title} tabIndex={-1}>Definição do dado</h1>
      <p className={styles.intro}>Escolha as cores usadas por todos os dados da mesa.</p>
      <div className={styles.preview}>
        <Dice3D
          ref={previewRef}
          dice={["d20"]}
          appearance={previewAppearance}
          background={null}
          shadowColor={corDaSombra}
          cameraDistance={0.16}
          className={styles.previewCanvas}
        />
      </div>
      <fieldset className={styles.colorControls}>
        <legend className={styles.controlsTitle}>Cores</legend>
        <div className={styles.colorGrid}>
          <Input className={styles.colorInput} label="Face" type="color" value={corDoDado} onChange={(event) => update({ diceFaceColor: event.target.value as DiceColorHex })} />
          <Input className={styles.colorInput} label="Arestas" type="color" value={corDasArestas} onChange={(event) => update({ diceEdgeColor: event.target.value as DiceColorHex })} />
          <Input className={styles.colorInput} label="Sombra" type="color" value={corDaSombra} onChange={(event) => update({ diceShadowColor: event.target.value as DiceColorHex })} />
        </div>
      </fieldset>
    </section>
  );
}
