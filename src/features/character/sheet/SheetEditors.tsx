import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AppModal, Button, Input } from "@components/ui";
import type { Character } from "@domain/contracts/character";

import { SPELL_SCHOOL_LABELS, formatSpellLevel } from "./mapping";
import type { CharacterSheetPatch, SheetPortrait, SheetSpellOption } from "./types";
import styles from "./character-sheet.module.css";

const ALIGNMENTS: Readonly<Record<NonNullable<Character["alignment"]>, string>> = {
  "lawful-good": "Leal e bom",
  "neutral-good": "Neutro e bom",
  "chaotic-good": "Caótico e bom",
  "lawful-neutral": "Leal e neutro",
  "true-neutral": "Neutro",
  "chaotic-neutral": "Caótico e neutro",
  "lawful-evil": "Leal e mau",
  "neutral-evil": "Neutro e mau",
  "chaotic-evil": "Caótico e mau",
  unaligned: "Sem alinhamento",
};

function NarrativeField({ label, value, onChange, wide = false }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void; readonly wide?: boolean }) {
  return <label className={[styles.textareaField, wide ? styles.wide : ""].join(" ")}><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={wide ? 5 : 3} /></label>;
}

export interface EditCharacterModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly value: <K extends keyof CharacterSheetPatch>(key: K, fallback: NonNullable<CharacterSheetPatch[K]>) => NonNullable<CharacterSheetPatch[K]>;
  readonly character: Character;
  readonly onPatch: (patch: CharacterSheetPatch) => void;
  readonly portrait?: SheetPortrait;
  readonly portraitUrl?: string;
  readonly fallbackSrc: string;
  readonly hasCustomPortrait: boolean;
  readonly canSave: boolean;
  readonly onSave: () => void;
  readonly children?: ReactNode;
}

/** Edição de identidade, narrativa, retrato e exibição — em modal para não se perder na ficha. */
export function EditCharacterModal({ open, onClose, value, character, onPatch, portrait, portraitUrl, fallbackSrc, hasCustomPortrait, canSave, onSave, children }: EditCharacterModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const display = value("sheetDisplay", character.sheetDisplay ?? {});

  const handleFile = async (file: File | undefined) => {
    if (!file || !portrait?.upload) return;
    setUploading(true);
    setUploadMessage(undefined);
    const result = await portrait.upload(file);
    setUploading(false);
    if (!result.ok) { setUploadMessage(result.message); return; }
    onPatch({ portraitAssetId: result.assetId, portraitSha256: result.sha256 });
    setUploadMessage("Retrato atualizado.");
  };

  return (
    <AppModal
      open={open}
      title="Editar personagem"
      onClose={onClose}
      className={styles.editModal}
      footer={<div className={styles.modalFooter}><Button variant="ghost" onClick={onClose}>Fechar</Button>{canSave ? <Button variant="primary" onClick={onSave}>Salvar ficha</Button> : null}</div>}
    >
      <div className={styles.editBody}>
        {portrait?.upload ? (
          <section className={styles.editSection} aria-labelledby="edit-portrait-title">
            <h3 id="edit-portrait-title">Retrato de fundo</h3>
            <div className={styles.portraitRow}>
              <div className={styles.portraitPreview}><img src={hasCustomPortrait && portraitUrl ? portraitUrl : fallbackSrc} alt={hasCustomPortrait ? "Retrato atual" : "Arte da classe (padrão)"} /></div>
              <div className={styles.portraitActions}>
                <input ref={fileRef} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Escolher imagem do retrato" onChange={(event) => { void handleFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                <Button size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Enviando…" : "Escolher foto"}</Button>
                {hasCustomPortrait ? <Button size="sm" variant="ghost" onClick={() => onPatch({ portraitAssetId: undefined, portraitSha256: undefined })}>Usar arte da classe</Button> : null}
                {uploadMessage ? <p className={styles.muted} role="status">{uploadMessage}</p> : <p className={styles.muted}>PNG, JPEG ou WebP. A imagem é reduzida e salva na ficha (e na nuvem quando você está conectado).</p>}
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.editSection} aria-labelledby="edit-display-title">
          <h3 id="edit-display-title">Exibição</h3>
          <label className={styles.checkRow}><input type="checkbox" checked={Boolean(display.hideRace)} onChange={(event) => onPatch({ sheetDisplay: { ...display, hideRace: event.target.checked } })} /> <span>Ocultar raça no cabeçalho</span></label>
          <label className={styles.checkRow}><input type="checkbox" checked={Boolean(display.hideClass)} onChange={(event) => onPatch({ sheetDisplay: { ...display, hideClass: event.target.checked } })} /> <span>Ocultar classe no cabeçalho</span></label>
        </section>

        <section className={styles.editSection} aria-labelledby="edit-identity-title">
          <h3 id="edit-identity-title">Identidade</h3>
          <div className={styles.formGrid}>
            <Input label="Nome" value={value("name", character.name)} onChange={(event) => onPatch({ name: event.target.value })} />
            <Input label="Jogador" value={value("playerName", character.playerName ?? "")} onChange={(event) => onPatch({ playerName: event.target.value })} />
            <div className={styles.field}><label htmlFor="sheet-alignment">Tendência</label><select id="sheet-alignment" value={value("alignment", character.alignment ?? "unaligned")} onChange={(event) => onPatch({ alignment: event.target.value as Character["alignment"] })}>{Object.entries(ALIGNMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          </div>
        </section>

        <section className={styles.editSection} aria-labelledby="edit-narrative-title">
          <h3 id="edit-narrative-title">Narrativa</h3>
          <div className={styles.narrativeGrid}>
            <NarrativeField label="Aparência" value={value("appearance", character.appearance)} onChange={(next) => onPatch({ appearance: next })} />
            <NarrativeField label="Traços de personalidade" value={value("personalityTraits", character.personalityTraits).join("\n")} onChange={(next) => onPatch({ personalityTraits: next.split("\n") })} />
            <NarrativeField label="Ideais" value={value("ideals", character.ideals).join("\n")} onChange={(next) => onPatch({ ideals: next.split("\n") })} />
            <NarrativeField label="Ligações" value={value("bonds", character.bonds).join("\n")} onChange={(next) => onPatch({ bonds: next.split("\n") })} />
            <NarrativeField label="Defeitos" value={value("flaws", character.flaws).join("\n")} onChange={(next) => onPatch({ flaws: next.split("\n") })} />
            <NarrativeField wide label="História" value={value("history", character.history)} onChange={(next) => onPatch({ history: next })} />
          </div>
        </section>
        {children}
      </div>
    </AppModal>
  );
}

export function PortraitModal({ open, onClose, src, alt, name }: { readonly open: boolean; readonly onClose: () => void; readonly src: string; readonly alt: string; readonly name: string }) {
  return (
    <AppModal open={open} title={name} onClose={onClose} className={styles.portraitModal}>
      <img className={styles.portraitFull} src={src} alt={alt} />
    </AppModal>
  );
}

export interface SpellManagerModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly options: readonly SheetSpellOption[];
  readonly selected: ReadonlySet<string>;
  readonly onChange: (next: ReadonlySet<string>) => void;
  readonly cantripLimit?: number;
  readonly leveledLimit?: number;
  readonly leveledLabel: string;
}

/** Seleção de truques e magias da lista da classe; os limites do livro são guia, não trava. */
export function SpellManagerModal({ open, onClose, options, selected, onChange, cantripLimit, leveledLimit, leveledLabel }: SpellManagerModalProps) {
  const [query, setQuery] = useState("");
  const byLevel = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const groups = new Map<number, SheetSpellOption[]>();
    for (const option of options) {
      if (needle && !option.name.toLowerCase().includes(needle)) continue;
      groups.set(option.level, [...(groups.get(option.level) ?? []), option]);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [options, query]);
  const cantripCount = options.filter((option) => option.level === 0 && selected.has(String(option.ref.entityId))).length;
  const leveledCount = options.filter((option) => option.level > 0 && selected.has(String(option.ref.entityId))).length;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  return (
    <AppModal open={open} title="Gerenciar magias" onClose={onClose} className={styles.spellModal} footer={<div className={styles.modalFooter}><Button variant="primary" onClick={onClose}>Concluir</Button></div>}>
      <div className={styles.spellCounters}>
        <span className={cantripLimit !== undefined && cantripCount > cantripLimit ? styles.counterOver : undefined}>Truques <strong>{cantripCount}{cantripLimit !== undefined ? `/${cantripLimit}` : ""}</strong></span>
        <span className={leveledLimit !== undefined && leveledCount > leveledLimit ? styles.counterOver : undefined}>{leveledLabel} <strong>{leveledCount}{leveledLimit !== undefined ? `/${leveledLimit}` : ""}</strong></span>
      </div>
      <label className={styles.spellSearch}><span>Buscar</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Nome da magia" /></label>
      <div className={styles.spellGroups}>
        {byLevel.length === 0 ? <p className={styles.muted}>Nenhuma magia encontrada na lista da classe.</p> : byLevel.map(([level, group]) => (
          <fieldset key={level} className={styles.spellGroup}>
            <legend>{level === 0 ? "Truques" : formatSpellLevel(level)}</legend>
            {group.map((option) => {
              const id = String(option.ref.entityId);
              return (
                <label key={id} className={[styles.spellOption, selected.has(id) ? styles.spellOptionOn : ""].join(" ")}>
                  <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
                  <span className={styles.spellOptionName}>{option.name}</span>
                  <span className={styles.spellOptionMeta}>{SPELL_SCHOOL_LABELS[option.school] ?? option.school}{option.concentration ? " · concentração" : ""}{option.ritual ? " · ritual" : ""}</span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>
    </AppModal>
  );
}
