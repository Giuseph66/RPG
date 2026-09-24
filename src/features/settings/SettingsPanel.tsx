import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@components/ui";
import type { AppSettings, DiceColorHex } from "@application/ports/settings-repository";
import type { SettingsStore } from "@application/settings";
import { Dice3D, type Dice3DHandle } from "@features/dice3d";
import styles from "./settings.module.css";

/** Ficha disponível para ser o personagem ativo. */
export interface SettingsCharacterOption {
  readonly id: string;
  readonly name: string;
  /** Classe e nível, ex.: "Druida 1". */
  readonly detail?: string;
}

/** Criação de personagem não concluída, retomável pelo dropdown. */
export interface SettingsDraftOption {
  readonly id: string;
  readonly name: string;
  /** Etapa em que parou, ex.: "Classe". */
  readonly step?: string;
}

export interface SettingsPanelProps {
  readonly store?: SettingsStore;
  /** Fichas deste aparelho; a escolha só aparece com mais de uma. */
  readonly characters?: readonly SettingsCharacterOption[];
  readonly activeCharacterId?: string;
  readonly onSelectCharacter?: (id: string) => void;
  /** Leva à criação de personagem (opção fixa no fim do dropdown). */
  readonly onCreateCharacter?: () => void;
  /** Rascunhos de criação; aparecem na seção "Em criação" do dropdown. */
  readonly drafts?: readonly SettingsDraftOption[];
  readonly onResumeDraft?: (id: string) => void;
}

const DICE_COLORS = { face: "#14100d", edge: "#D0AB72", shadow: "#090706" } as const;
const FALLBACK: AppSettings = { theme: "system", reducedMotion: undefined, diceFaceColor: DICE_COLORS.face, diceEdgeColor: DICE_COLORS.edge, diceShadowColor: DICE_COLORS.shadow, diceHistoryRetention: 1000, language: "pt-BR" };

/**
 * Dropdown do personagem ativo: botão com a ficha atual; aberto, lista as fichas (quatro
 * visíveis, o resto rola) e, fixa no fim, a opção de criar um novo personagem.
 */
function CharacterDropdown({ characters, activeCharacterId, onSelect, onCreate, drafts = [], onResumeDraft }: { readonly characters: readonly SettingsCharacterOption[]; readonly activeCharacterId?: string; readonly onSelect: (id: string) => void; readonly onCreate?: () => void; readonly drafts?: readonly SettingsDraftOption[]; readonly onResumeDraft?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = characters.find((option) => option.id === activeCharacterId);
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className={styles.characterPicker} ref={rootRef}>
      <span className={styles.controlsTitle}>Personagem ativo</span>
      <p className={styles.pickerIntro}>Ficha usada em Ficha, Ações e Jornada — e a que volta ao recarregar a página.</p>
      <button type="button" className={styles.dropdownButton} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        <span className={styles.characterCopy}>
          <strong>{active?.name ?? (characters.length ? "Escolha um personagem" : "Nenhum personagem")}</strong>
          {active?.detail ? <small>{active.detail}</small> : null}
        </span>
        <span className={[styles.dropdownCaret, open ? styles.dropdownCaretOpen : ""].join(" ")} aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className={styles.dropdownPanel}>
          <ul id={listId} role="listbox" aria-label="Personagens" className={styles.dropdownList}>
            {characters.map((option) => {
              const selected = option.id === activeCharacterId;
              return (
                <li key={option.id} role="option" aria-selected={selected}>
                  <button type="button" className={[styles.characterOption, selected ? styles.characterOptionActive : ""].join(" ")} onClick={() => { onSelect(option.id); setOpen(false); }}>
                    <span className={styles.characterMark} aria-hidden="true" />
                    <span className={styles.characterCopy}><strong>{option.name}</strong>{option.detail ? <small>{option.detail}</small> : null}</span>
                    {selected ? <span className={styles.characterBadge}>Ativo</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {drafts.length && onResumeDraft ? (
            <div className={styles.draftGroup} role="group" aria-label="Em criação">
              <span className={styles.draftTitle}>Em criação</span>
              <ul className={styles.dropdownList}>
                {drafts.map((draft) => (
                  <li key={draft.id}>
                    <button type="button" className={[styles.characterOption, styles.draftOption].join(" ")} onClick={() => { setOpen(false); onResumeDraft(draft.id); }}>
                      <span className={styles.draftMark} aria-hidden="true">✎</span>
                      <span className={styles.characterCopy}><strong>{draft.name}</strong><small>{draft.step ? `Parou em: ${draft.step}` : "Criação em andamento"}</small></span>
                      <span className={styles.draftAction}>Continuar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {onCreate ? <button type="button" className={styles.createOption} onClick={() => { setOpen(false); onCreate(); }}><span aria-hidden="true">+</span> Criar novo personagem</button> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Settings stay a utility surface; persistence is optional until composition injects it. */
export function SettingsPanel({ store, characters = [], activeCharacterId, onSelectCharacter, onCreateCharacter, drafts = [], onResumeDraft }: SettingsPanelProps) {
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
      {onSelectCharacter ? <CharacterDropdown characters={characters} activeCharacterId={activeCharacterId} onSelect={onSelectCharacter} onCreate={onCreateCharacter} drafts={drafts} onResumeDraft={onResumeDraft} /> : null}
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
