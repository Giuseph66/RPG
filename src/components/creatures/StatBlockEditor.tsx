import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { CaretDown, Heart, IdentificationCard, ListBullets, Plus, Sparkle, Sword, Trash, Trophy, PersonSimpleRun, Barbell, Eye } from "@phosphor-icons/react";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { asCentimeters, type Ability, type DamageType, type DiceFaces } from "@domain/contracts/primitives";
import { CREATURE_TYPES, isCreatureStatBlock, type CreatureAction, type CreatureSense, type CreatureStatBlock, type CreatureStatBlockSuggestion, type CreatureStatBlockSuggestionInput, type CreatureTrait, type CreatureType } from "@domain/creatures";
import type { AppError, Result } from "@domain/contracts/errors";
import { abilityModifier } from "@domain/rules/core/modifiers";
import { Button, InlineStatus } from "@components/ui";
import { StatBlock } from "./StatBlock";
import styles from "./stat-block-editor.module.css";

const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Readonly<Record<Ability, string>> = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const ABILITY_NAMES: Readonly<Record<Ability, string>> = { str: "Força", dex: "Destreza", con: "Constituição", int: "Inteligência", wis: "Sabedoria", cha: "Carisma" };
const TYPE_LABELS: Readonly<Record<CreatureType, string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };
const SIZE_OPTIONS = [["tiny", "Miúda"], ["small", "Pequena"], ["medium", "Média"], ["large", "Grande"], ["huge", "Enorme"], ["gargantuan", "Imensa"]] as const;
const DAMAGE_TYPES: readonly DamageType[] = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const DAMAGE_LABELS: Readonly<Record<DamageType, string>> = {
  acid: "Ácido", bludgeoning: "Concussão", cold: "Frio", fire: "Fogo", force: "Força", lightning: "Elétrico", necrotic: "Necrótico",
  piercing: "Perfurante", poison: "Veneno", psychic: "Psíquico", radiant: "Radiante", slashing: "Cortante", thunder: "Trovejante",
};
const CORE_FIELDS = new Set(["id", "name", "creatureType", "size", "tags", "alignment", "armorClass", "armorClassNote", "hitPoints", "speeds", "abilityScores", "challengeRating", "experiencePoints", "proficiencyBonus"]);

function randomSuffix(): string {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replaceAll("-", "");
}

function createDraft(name: string): CreatureStatBlock {
  return {
    id: asEntityId(`manual-creature-m${randomSuffix()}`), name: name.trim() || "Nova criatura", creatureType: "beast", size: "medium", tags: [],
    armorClass: 10, hitPoints: { average: 1 }, speeds: { walkCm: asCentimeters(0) }, abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    challengeRating: { numerator: 0, denominator: 1 }, sourceRefs: [{ sourceId: asRulesetId("manual-campaign"), chapter: "Criação do mestre" }],
  };
}

function advancedFields(value: CreatureStatBlock): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !CORE_FIELDS.has(key)));
}

function coreFields(value: CreatureStatBlock): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => CORE_FIELDS.has(key)));
}

function newEntryId(prefix: string): string { return `${prefix}-${randomSuffix()}`; }

function updateList<T>(items: readonly T[] | undefined, index: number, value: T | undefined): readonly T[] | undefined {
  const next = [...(items ?? [])];
  if (value === undefined) next.splice(index, 1); else if (index < next.length) next[index] = value; else next.push(value);
  return next.length ? next : undefined;
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseChallengeRating(value: string): CreatureStatBlock["challengeRating"] | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const match = /^(\d+)(?:\s*\/\s*(\d+))?$/.exec(trimmed);
  if (!match) return undefined;
  const numerator = Number(match[1]);
  const denominator = Number(match[2] ?? 1);
  return Number.isSafeInteger(numerator) && Number.isSafeInteger(denominator) && denominator > 0 ? { numerator, denominator } : undefined;
}

/** Modificador de atributo no formato impresso: +4, +0, −1 (sinal de menos tipográfico). */
function formatModifier(score: number): string {
  const modifier = Number.isFinite(score) ? abilityModifier(score) : 0;
  return `${modifier < 0 ? "−" : "+"}${Math.abs(modifier)}`;
}

function formatChallenge(challenge: NonNullable<CreatureStatBlock["challengeRating"]>): string {
  return challenge.denominator === 1 ? String(challenge.numerator) : `${challenge.numerator}/${challenge.denominator}`;
}

interface SectionProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly hint?: string;
  readonly count?: number;
  /** Seções longas (traços, ações…) recolhem para o bloco não virar uma parede de campos. */
  readonly collapsible?: boolean;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

function Section({ icon, title, hint, count, collapsible = false, defaultOpen = true, children }: SectionProps) {
  const headingId = useId();
  const head = <>
    <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>
    <span className={styles.sectionTitle}><strong id={headingId}>{title}</strong>{hint ? <small>{hint}</small> : null}</span>
    {count !== undefined ? <span className={styles.count} aria-label={`${count} ${count === 1 ? "item" : "itens"}`}>{count}</span> : null}
  </>;
  if (collapsible) {
    return <details className={styles.section} open={defaultOpen}>
      <summary className={styles.sectionHead}>{head}<CaretDown className={styles.chevron} size={16} aria-hidden="true" /></summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>;
  }
  return <section className={styles.section} aria-labelledby={headingId}>
    <div className={styles.sectionHead}>{head}</div>
    <div className={styles.sectionBody}>{children}</div>
  </section>;
}

export interface StatBlockEditorProps {
  readonly value?: CreatureStatBlock;
  readonly name: string;
  readonly onChange: (value?: CreatureStatBlock) => void;
  readonly onValidityChange?: (valid: boolean) => void;
  readonly creatureTypeMode?: "any" | "beast-only";
  readonly onSuggest?: (input: Omit<CreatureStatBlockSuggestionInput, "catalog">) => Result<CreatureStatBlockSuggestion, AppError>;
}

interface NumericOptions {
  /** Nome por extenso exibido entre parênteses depois da sigla. */
  readonly full?: string;
  readonly hint?: string;
  readonly min?: number;
  readonly step?: number;
}

/** Editor do mestre: entradas comuns guiadas e campos estendidos validados sem truncar a fonte. */
export function StatBlockEditor({ value, name, onChange, onValidityChange, creatureTypeMode = "any", onSuggest }: StatBlockEditorProps) {
  const [block, setBlock] = useState<CreatureStatBlock | undefined>(value);
  const [advancedText, setAdvancedText] = useState(value ? JSON.stringify(advancedFields(value), null, 2) : "{}");
  const [advancedError, setAdvancedError] = useState<string>();
  const [suggestionType, setSuggestionType] = useState<CreatureType>(value?.creatureType ?? "beast");
  const [suggestionSize, setSuggestionSize] = useState<CreatureStatBlock["size"]>(value?.size ?? "medium");
  const [suggestionName, setSuggestionName] = useState(value?.name ?? "");
  const [suggestionCr, setSuggestionCr] = useState(value?.challengeRating ? `${value.challengeRating.numerator}/${value.challengeRating.denominator}` : "");
  const [suggestionReasons, setSuggestionReasons] = useState<readonly string[]>([]);
  const [suggestionError, setSuggestionError] = useState<string>();
  const baseId = useId();

  useEffect(() => {
    setBlock(value);
    setAdvancedText(value ? JSON.stringify(advancedFields(value), null, 2) : "{}");
    setAdvancedError(undefined);
    onValidityChange?.(true);
    // O bloco pode chegar de fora (cópia de uma criatura do livro): tipo e porte do assistente acompanham o bloco.
    // Nome e ND desejado ficam como estão — vazios, valem os padrões (nome da criatura, ND mais próximo).
    if (value) { setSuggestionType(value.creatureType); setSuggestionSize(value.size); }
  }, [value?.id]);

  // Ids das dicas: sequência determinística por renderização, só precisa ser única dentro dela.
  let hintSeq = 0;
  const nextHintId = () => `${baseId}-hint-${hintSeq++}`;
  const labelText = (label: string, full?: string) => <span className={styles.labelText}>{label}{full ? <span className={styles.labelFull}> ({full})</span> : null}</span>;
  const cell = (label: ReactNode, control: (describedBy?: string) => ReactNode, hint?: string, wide = false) => {
    const hintId = hint ? nextHintId() : undefined;
    return <div className={[styles.cell, wide ? styles.wide : ""].filter(Boolean).join(" ")}>
      <label className={styles.field}>{label}{control(hintId)}</label>
      {hint ? <small id={hintId} className={styles.hint}>{hint}</small> : null}
    </div>;
  };

  const update = (next: CreatureStatBlock) => { setBlock(next); onChange(next); };
  const numeric = (label: string, current: number, onValue: (next: number) => void, { full, hint, min = 0, step = 1 }: NumericOptions = {}) =>
    cell(labelText(label, full), (describedBy) => <input type="number" min={min} step={step} value={current} aria-describedby={describedBy} onChange={(event) => onValue(Number(event.currentTarget.value))} />, hint);
  const text = (label: string, current: string | undefined, onValue: (next: string) => void, options: { readonly full?: string; readonly hint?: string; readonly placeholder?: string } = {}) =>
    cell(labelText(label, options.full), (describedBy) => <input value={current ?? ""} placeholder={options.placeholder} aria-describedby={describedBy} onChange={(event) => onValue(event.currentTarget.value)} />, options.hint);

  const add = () => update(createDraft(name));
  if (!block) return <section className={styles.editor}>
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true"><IdentificationCard size={26} weight="duotone" /></span>
      <div><strong>Bloco estatístico completo</strong><p>Opcional · a ficha de combate da criatura (CA, PV, atributos, ações). O cadastro narrativo continua disponível sem estatísticas.</p></div>
    </div>
    <Button type="button" variant="secondary" onClick={add}><Plus size={16} aria-hidden="true" /> Adicionar bloco estatístico</Button>
  </section>;

  const locked = Boolean(advancedError);
  const updateAdvanced = (raw: string) => {
    setAdvancedText(raw);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Informe um objeto JSON com os campos avançados.");
      const object = parsed as Record<string, unknown>;
      const reserved = Object.keys(object).find((key) => CORE_FIELDS.has(key));
      if (reserved) throw new Error(`Edite “${reserved}” nos campos básicos acima.`);
      // Rebuild all advanced fields from the parsed document. Spreading over the
      // previous block kept keys that the user had removed from the JSON.
      const next = { ...coreFields(block), ...object } as unknown as CreatureStatBlock;
      if (!isCreatureStatBlock(next)) throw new Error("O bloco avançado tem um campo inválido. Confira listas, ações e referências de fonte.");
      setAdvancedError(undefined); onValidityChange?.(true); update(next);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "JSON avançado inválido.";
      setAdvancedError(message); onValidityChange?.(false);
    }
  };

  const updateMeters = (field: "walkCm" | "climbCm" | "swimCm" | "flyCm" | "burrowCm", value: number | undefined) => update({ ...block, speeds: { ...block.speeds, [field]: value === undefined ? undefined : asCentimeters(Math.round(value * 100)) } });
  const updateAbility = (ability: Ability, value: number) => update({ ...block, abilityScores: { ...block.abilityScores, [ability]: value } });
  const updateAdvancedField = <K extends keyof CreatureStatBlock>(key: K, nextValue: CreatureStatBlock[K]) => {
    const next = { ...block, [key]: nextValue } as CreatureStatBlock;
    setAdvancedText(JSON.stringify(advancedFields(next), null, 2));
    setAdvancedError(undefined); onValidityChange?.(true); update(next);
  };
  const updateTrait = (field: "traits" | "actions", index: number, entry: CreatureTrait | CreatureAction | undefined) => {
    if (advancedError) return;
    updateAdvancedField(field, updateList(block[field] as readonly (CreatureTrait | CreatureAction)[] | undefined, index, entry) as CreatureStatBlock[typeof field]);
  };
  const updateSense = (index: number, sense: CreatureSense | undefined) => {
    if (advancedError) return;
    updateAdvancedField("senses", updateList(block.senses, index, sense));
  };
  const updateLanguageList = (raw: string) => updateAdvancedField("languages", raw.split("\n").map((item) => item.trim()).filter(Boolean));
  const updateNotes = (raw: string) => updateAdvancedField("additionalInfo", { ...block.additionalInfo, notes: raw || undefined });
  const updateAction = (index: number, patch: Partial<CreatureAction>) => {
    const current = block.actions?.[index];
    if (!current) return;
    updateTrait("actions", index, { ...current, ...patch });
  };
  const generateSuggestion = () => {
    if (!onSuggest) return;
    const requestedName = suggestionName.trim() || block.name.trim() || name.trim();
    const challengeRating = parseChallengeRating(suggestionCr);
    if (!requestedName) { setSuggestionError("Informe o nome do animal para gerar o rascunho."); return; }
    if (suggestionCr.trim() && challengeRating === undefined) { setSuggestionError("Informe o ND como número ou fração, por exemplo 1/4."); return; }
    const result = onSuggest({
      id: asEntityId(`suggested-creature-${randomSuffix()}`), name: requestedName,
      creatureType: creatureTypeMode === "beast-only" ? "beast" : suggestionType,
      size: suggestionSize, ...(challengeRating === undefined ? {} : { challengeRating }),
      role: creatureTypeMode === "beast-only" ? "player-beast" : "master",
    });
    if (!result.ok) { setSuggestionError(result.error.message); return; }
    const next = result.value.statBlock;
    setBlock(next); setAdvancedText(JSON.stringify(advancedFields(next), null, 2)); setAdvancedError(undefined);
    setSuggestionName(next.name); setSuggestionType(next.creatureType); setSuggestionSize(next.size);
    setSuggestionCr(next.challengeRating ? `${next.challengeRating.numerator}/${next.challengeRating.denominator}` : "");
    setSuggestionReasons(result.value.reasons); setSuggestionError(undefined); onValidityChange?.(true); onChange(next);
  };

  const typeSelect = (current: CreatureType, onValue: (next: CreatureType) => void, hint: string, ariaLabel?: string) => creatureTypeMode === "beast-only"
    ? cell(labelText(ariaLabel ? "Tipo de criatura" : "Tipo"), (describedBy) => <input readOnly value="Besta" aria-label={ariaLabel} aria-describedby={describedBy} />, "Propostas de jogador são sempre bestas.")
    : cell(labelText(ariaLabel ? "Tipo de criatura" : "Tipo"), (describedBy) => <select value={current} aria-describedby={describedBy} onChange={(event) => onValue(event.currentTarget.value as CreatureType)}>{CREATURE_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select>, hint);
  const sizeSelect = (current: CreatureStatBlock["size"], onValue: (next: CreatureStatBlock["size"]) => void, hint: string) =>
    cell(labelText("Tamanho"), (describedBy) => <select value={current} aria-describedby={describedBy} onChange={(event) => onValue(event.currentTarget.value as CreatureStatBlock["size"])}>{SIZE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>, hint);

  const challengeHintId = nextHintId();
  const challengeLabelId = `${baseId}-cr-label`;
  const challenge = block.challengeRating;
  const traitCount = block.traits?.length ?? 0;
  const actionCount = block.actions?.length ?? 0;
  const senseCount = block.senses?.length ?? 0;

  return <section className={styles.editor} aria-labelledby="stat-block-editor-title">
    <div className={styles.editorHeading}>
      <span className={styles.emptyIcon} aria-hidden="true"><IdentificationCard size={26} weight="duotone" /></span>
      <div><strong id="stat-block-editor-title">Bloco estatístico completo</strong><p>A ficha de combate da criatura. Estatísticas publicadas, ações e detalhes adicionais são preservados neste bloco.</p></div>
      <Button type="button" size="sm" variant="ghost" onClick={() => { setBlock(undefined); setAdvancedText("{}"); setAdvancedError(undefined); onValidityChange?.(true); onChange(undefined); }}><Trash size={15} aria-hidden="true" /> Remover bloco</Button>
    </div>

    {onSuggest ? <section className={styles.assistant} aria-labelledby={`${baseId}-assistant`}>
      <div className={styles.assistantHead}><span className={styles.sectionIcon} aria-hidden="true"><Sparkle size={18} weight="duotone" /></span><span className={styles.sectionTitle}><strong id={`${baseId}-assistant`}>Gerar rascunho editável</strong><small>Usa o bloco publicado de mesmo tipo e tamanho com ND mais próximo. Confira e edite todos os campos antes de salvar.</small></span></div>
      <div className={styles.fields}>
        {text("Nome sugerido", suggestionName || name, setSuggestionName, { hint: "Nome que o novo bloco vai receber, ex.: Lobo da neve." })}
        {typeSelect(suggestionType, setSuggestionType, "Só entram blocos desse tipo de criatura.")}
        {sizeSelect(suggestionSize, setSuggestionSize, "Só entram blocos desse tamanho.")}
        {cell(labelText("ND desejado (opcional)"), (describedBy) => <input inputMode="numeric" value={suggestionCr} placeholder="Ex.: 1/4" aria-describedby={describedBy} onChange={(event) => setSuggestionCr(event.currentTarget.value)} />, "Escolhe o bloco de ND mais próximo. Aceita frações, ex.: 1/4.")}
      </div>
      {suggestionReasons.length ? <ul className={styles.reasonList}>{suggestionReasons.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      {suggestionError ? <InlineStatus tone="error" assertive>{suggestionError}</InlineStatus> : null}
      <Button type="button" variant="secondary" disabled={locked} onClick={generateSuggestion}><Sparkle size={16} aria-hidden="true" /> Gerar sugestão pelo catálogo</Button>
    </section> : null}

    <Section icon={<IdentificationCard size={18} weight="duotone" />} title="Identidade" hint="Como o bloco se apresenta no topo da ficha.">
      <div className={styles.fields}>
        {text("Nome no bloco", block.name, (next) => update({ ...block, name: next }), { hint: "Título impresso no topo do bloco. Pode ser diferente do nome no elenco." })}
        {typeSelect(block.creatureType, (next) => update({ ...block, creatureType: next }), "Grupo de regras da criatura: besta, morto-vivo, dragão…", "Tipo de criatura: besta")}
        {sizeSelect(block.size, (next) => update({ ...block, size: next }), "Espaço que a criatura ocupa no mapa, de Miúda a Imensa.")}
        {text("Tendência", block.alignment, (next) => update({ ...block, alignment: next || undefined }), { hint: "Moral e ética, ex.: neutro e mau, sem tendência.", placeholder: "Ex.: sem tendência" })}
        <div className={styles.wide}>{text("Marcadores", (block.tags ?? []).join(", "), (next) => update({ ...block, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) }), { full: "separados por vírgula", hint: "Etiquetas livres, ex.: aquático, bando. Use “swarm” só para enxames — eles não contam como bestas individuais.", placeholder: "Ex.: aquático, bando" })}</div>
      </div>
    </Section>

    <Section icon={<Heart size={18} weight="duotone" />} title="Defesa e vida" hint="Quanto é difícil acertar a criatura e quanto dano ela aguenta.">
      <div className={styles.fields}>
        {numeric("CA", block.armorClass, (next) => update({ ...block, armorClass: next }), { full: "classe de armadura", hint: "Quanto um ataque precisa tirar no d20 para acertar." })}
        {text("Nota da CA", block.armorClassNote, (next) => update({ ...block, armorClassNote: next || undefined }), { hint: "De onde vem o valor, ex.: armadura natural.", placeholder: "Ex.: armadura natural" })}
        {numeric("PV médios", block.hitPoints.average, (next) => update({ ...block, hitPoints: { ...block.hitPoints, average: next } }), { full: "pontos de vida", hint: "Vida usada em jogo; ao chegar a 0, a criatura cai." })}
        {text("Dados de vida", block.hitPoints.hitDice, (next) => update({ ...block, hitPoints: { ...block.hitPoints, hitDice: next || undefined } }), { hint: "Fórmula que gera os PV, ex.: 2d8+2.", placeholder: "Ex.: 2d8+2" })}
      </div>
    </Section>

    <Section icon={<Trophy size={18} weight="duotone" />} title="Desafio e experiência" hint="O quanto a criatura vale em um encontro.">
      <div className={styles.fields}>
        <div className={[styles.cell, styles.wide, styles.challenge].join(" ")}>
          <div className={styles.challengeHead}>
            <span id={challengeLabelId} className={styles.labelText}>ND<span className={styles.labelFull}> (nível de desafio)</span></span>
            <label className={styles.switch}>
              <input type="checkbox" role="switch" checked={challenge === null} onChange={(event) => update({ ...block, challengeRating: event.currentTarget.checked ? null : { numerator: 0, denominator: 1 } })} />
              <span className={styles.track} aria-hidden="true" />
              <span>ND não informado</span>
            </label>
          </div>
          {challenge ? <div className={styles.fraction} role="group" aria-labelledby={challengeLabelId} aria-describedby={challengeHintId}>
            <label className={styles.fractionPart}>
              <span className={styles.visuallyHidden}>ND — numerador</span>
              <input type="number" min={0} step={1} value={challenge.numerator} onChange={(event) => update({ ...block, challengeRating: { ...challenge, numerator: Number(event.currentTarget.value) } })} />
              <small aria-hidden="true">numerador</small>
            </label>
            <span className={styles.slash} aria-hidden="true">/</span>
            <label className={styles.fractionPart}>
              <span className={styles.visuallyHidden}>ND — denominador</span>
              <input type="number" min={1} step={1} value={challenge.denominator} onChange={(event) => update({ ...block, challengeRating: { ...challenge, denominator: Number(event.currentTarget.value) } })} />
              <small aria-hidden="true">denominador</small>
            </label>
            <span className={styles.challengeResult}>ND {formatChallenge(challenge)}</span>
          </div> : <p className={styles.notice}>Sem ND: o bloco mostra “ND —”. Defina o valor antes de usar a criatura em um encontro.</p>}
          <small id={challengeHintId} className={styles.hint}>Quão perigosa a criatura é para um grupo. Frações comuns: 1/8, 1/4 e 1/2. “ND não informado” é para quando o livro imprime “—”; não é o mesmo que ND 0.</small>
        </div>
        {numeric("XP", block.experiencePoints ?? 0, (next) => update({ ...block, experiencePoints: next || undefined }), { full: "pontos de experiência", hint: "Experiência dada a quem derrota a criatura. Costuma acompanhar o ND." })}
        {numeric("Bônus de proficiência", block.proficiencyBonus ?? 0, (next) => update({ ...block, proficiencyBonus: next || undefined }), { min: -10, hint: "Somado a ataques, resistências e perícias em que a criatura é proficiente. Costuma acompanhar o ND." })}
      </div>
    </Section>

    <Section icon={<Barbell size={18} weight="duotone" />} title="Atributos" hint="Digite o valor; o modificador, em dourado, é calculado na hora: (valor − 10) ÷ 2, arredondado para baixo.">
      <div className={styles.abilities}>{ABILITIES.map((ability) => {
        const score = block.abilityScores[ability];
        const inputId = `${baseId}-${ability}`;
        const modifierId = `${inputId}-mod`;
        return <div className={styles.ability} key={ability}>
          <div className={styles.abilityHead}>
            <label htmlFor={inputId} className={styles.abilityName} title={ABILITY_NAMES[ability]}>{ABILITY_LABELS[ability]}<span className={styles.visuallyHidden}> — {ABILITY_NAMES[ability]}</span></label>
            <span id={modifierId} className={styles.modifier} title={`Modificador de ${ABILITY_NAMES[ability]}`}><span className={styles.visuallyHidden}>modificador </span>{formatModifier(score)}</span>
          </div>
          <input id={inputId} type="number" min={0} step={1} value={score} aria-describedby={modifierId} onChange={(event) => updateAbility(ability, Number(event.currentTarget.value))} />
        </div>;
      })}</div>
    </Section>

    <Section icon={<PersonSimpleRun size={18} weight="duotone" />} title="Deslocamento" hint="Em metros por turno (1,5 m equivalem a 5 pés). Deixe 0 nos movimentos que a criatura não tem.">
      <div className={styles.fields}>
        {numeric("Andar", Number(block.speeds.walkCm ?? 0) / 100, (next) => updateMeters("walkCm", next), { step: .5 })}
        {numeric("Escalada", Number(block.speeds.climbCm ?? 0) / 100, (next) => updateMeters("climbCm", next), { step: .5 })}
        {numeric("Natação", Number(block.speeds.swimCm ?? 0) / 100, (next) => updateMeters("swimCm", next), { step: .5 })}
        {numeric("Voo", Number(block.speeds.flyCm ?? 0) / 100, (next) => updateMeters("flyCm", next), { step: .5 })}
        {numeric("Escavação", Number(block.speeds.burrowCm ?? 0) / 100, (next) => updateMeters("burrowCm", next), { step: .5 })}
        <label className={[styles.switch, styles.switchCell].join(" ")}>
          <input type="checkbox" role="switch" checked={block.speeds.hover ?? false} onChange={(event) => update({ ...block, speeds: { ...block.speeds, hover: event.currentTarget.checked } })} />
          <span className={styles.track} aria-hidden="true" />
          <span>Paira durante o voo</span>
        </label>
      </div>
    </Section>

    <Section icon={<ListBullets size={18} weight="duotone" />} title="Traços" hint="Capacidades passivas ou especiais, ex.: Visão no escuro, Faro apurado." count={traitCount} collapsible>
      {(block.traits ?? []).map((trait, index) => <div className={styles.entry} key={trait.id}>
        <div className={styles.entryHeading}><strong>Traço {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => updateTrait("traits", index, undefined)}><Trash size={15} aria-hidden="true" /> Remover</Button></div>
        {text("Nome do traço", trait.name, (next) => updateTrait("traits", index, { ...trait, name: next }))}
        <label className={styles.field}><span className={styles.labelText}>Descrição</span><textarea rows={2} value={trait.description} disabled={locked} onChange={(event) => updateTrait("traits", index, { ...trait, description: event.currentTarget.value })} /></label>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={locked} onClick={() => updateTrait("traits", block.traits?.length ?? 0, { id: newEntryId("trait"), name: "Novo traço", description: "" })}><Plus size={15} aria-hidden="true" /> Adicionar traço</Button>
    </Section>

    <Section icon={<Sword size={18} weight="duotone" />} title="Ações e ataques" hint="O que a criatura faz no turno dela: golpes, mordidas, magias." count={actionCount} collapsible>
      {(block.actions ?? []).map((action, index) => {
        const damage = action.damage?.[0];
        const formula = damage?.formula;
        return <div className={styles.entry} key={action.id}>
          <div className={styles.entryHeading}><strong>Ação {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => updateTrait("actions", index, undefined)}><Trash size={15} aria-hidden="true" /> Remover</Button></div>
          {text("Nome da ação", action.name, (next) => updateAction(index, { name: next }), { placeholder: "Ex.: Mordida" })}
          <label className={styles.field}><span className={styles.labelText}>Descrição</span><textarea rows={2} value={action.description} disabled={locked} onChange={(event) => updateAction(index, { description: event.currentTarget.value })} /></label>
          <div className={styles.fields}>
            {cell(labelText("Bônus de ataque"), (describedBy) => <input type="number" value={action.attackBonus ?? ""} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateAction(index, { attackBonus: optionalNumber(event.currentTarget.value) })} />, "Somado ao d20 para acertar. Deixe vazio se não houver jogada de ataque.")}
            {cell(labelText("Alcance corpo a corpo · m"), (describedBy) => <input type="number" min="0" step="0.5" value={action.reachCm === undefined ? "" : action.reachCm / 100} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateAction(index, { reachCm: optionalNumber(event.currentTarget.value) === undefined ? undefined : Math.round(optionalNumber(event.currentTarget.value)! * 100) as CreatureAction["reachCm"] })} />, "Até onde o golpe chega, ex.: 1,5.")}
            {cell(labelText("Alcance à distância · m"), (describedBy) => <input type="number" min="0" step="0.5" value={action.rangeCm === undefined ? "" : action.rangeCm / 100} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateAction(index, { rangeCm: optionalNumber(event.currentTarget.value) === undefined ? undefined : Math.round(optionalNumber(event.currentTarget.value)! * 100) as CreatureAction["rangeCm"] })} />, "Alcance de ataques à distância; vazio se não houver.")}
          </div>
          <label className={styles.switch}>
            <input type="checkbox" role="switch" checked={Boolean(action.damage?.length)} disabled={locked} onChange={(event) => updateAction(index, { damage: event.currentTarget.checked ? [{ damageType: "piercing", formula: { quantity: 1, faces: 6 } }] : undefined })} />
            <span className={styles.track} aria-hidden="true" />
            <span>Tem dano</span>
          </label>
          {damage ? <div className={styles.fields}>
            {cell(labelText("Dados de dano"), () => <span className={styles.inlineNumber}><input aria-label={`Quantidade de dados da ação ${index + 1}`} type="number" min="1" value={formula?.quantity ?? 1} disabled={locked} onChange={(event) => updateAction(index, { damage: [{ ...damage, formula: { ...(formula ?? { quantity: 1, faces: 6 }), quantity: Math.max(1, Number(event.currentTarget.value) || 1) } }, ...(action.damage?.slice(1) ?? [])] })} /><span>d</span><input aria-label={`Faces dos dados da ação ${index + 1}`} type="number" min="1" value={formula?.faces ?? 6} disabled={locked} onChange={(event) => updateAction(index, { damage: [{ ...damage, formula: { ...(formula ?? { quantity: 1, faces: 6 }), faces: Math.max(1, Number(event.currentTarget.value) || 6) as DiceFaces } }, ...(action.damage?.slice(1) ?? [])] })} /></span>, "Quantidade × faces, ex.: 2 d 6.")}
            {cell(labelText("Bônus fixo de dano"), (describedBy) => <input type="number" value={damage.flatBonus ?? ""} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateAction(index, { damage: [{ ...damage, flatBonus: optionalNumber(event.currentTarget.value) }, ...(action.damage?.slice(1) ?? [])] })} />, "Somado ao total dos dados, ex.: 3.")}
            {cell(labelText("Tipo de dano"), (describedBy) => <select value={damage.damageType} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateAction(index, { damage: [{ ...damage, damageType: event.currentTarget.value as DamageType }, ...(action.damage?.slice(1) ?? [])] })}>{DAMAGE_TYPES.map((type) => <option key={type} value={type}>{DAMAGE_LABELS[type]}</option>)}</select>, "Define resistências e imunidades que se aplicam.")}
          </div> : null}
        </div>;
      })}
      <Button type="button" size="sm" variant="secondary" disabled={locked} onClick={() => updateTrait("actions", block.actions?.length ?? 0, { id: newEntryId("action"), name: "Novo ataque", description: "" })}><Plus size={15} aria-hidden="true" /> Adicionar ação ou ataque</Button>
    </Section>

    <Section icon={<Eye size={18} weight="duotone" />} title="Sentidos e idiomas" hint="Como a criatura percebe o mundo e com quem consegue conversar." count={senseCount} collapsible>
      {(block.senses ?? []).map((sense, index) => <div className={styles.entry} key={`${sense.kind}-${index}`}>
        <div className={styles.entryHeading}><strong>Sentido {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => updateSense(index, undefined)}><Trash size={15} aria-hidden="true" /> Remover</Button></div>
        {text("Sentido", sense.kind, (next) => updateSense(index, { ...sense, kind: next }), { hint: "Ex.: visão no escuro, faro, sentido sísmico." })}
        <div className={styles.fields}>
          {cell(labelText("Alcance · m"), () => <input type="number" min="0" step="0.5" value={sense.rangeCm === undefined ? "" : sense.rangeCm / 100} disabled={locked} onChange={(event) => { const meters = optionalNumber(event.currentTarget.value); updateSense(index, { ...sense, rangeCm: meters === undefined ? undefined : Math.round(meters * 100) as CreatureSense["rangeCm"] }); }} />)}
          {text("Descrição", sense.description, (next) => updateSense(index, { ...sense, description: next || undefined }))}
        </div>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={locked} onClick={() => updateSense(block.senses?.length ?? 0, { kind: "Novo sentido" })}><Plus size={15} aria-hidden="true" /> Adicionar sentido</Button>
      {cell(labelText("Idiomas · um por linha"), (describedBy) => <textarea rows={3} value={(block.languages ?? []).join("\n")} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateLanguageList(event.currentTarget.value)} />, "Deixe vazio se a criatura não fala nem entende idiomas.", true)}
    </Section>

    {cell(labelText("Notas"), (describedBy) => <textarea rows={3} value={block.additionalInfo?.notes ?? ""} disabled={locked} aria-describedby={describedBy} onChange={(event) => updateNotes(event.currentTarget.value)} placeholder="Notas relevantes do bloco" />, "Observações que ficam junto do bloco: táticas, comportamento, origem.", true)}

    <details className={styles.advanced}><summary>Campos adicionais · fontes, defesas, conjuração, covil e extras</summary><small>JSON opcional para preservar todos os campos do bloco completo. Remover uma propriedade do objeto também a remove do bloco. Campos guiados acima não devem ser repetidos aqui.</small><textarea rows={12} spellCheck={false} value={advancedText} aria-invalid={locked} aria-describedby="stat-block-advanced-help" onChange={(event) => updateAdvanced(event.currentTarget.value)} /><span id="stat-block-advanced-help" className={advancedError ? styles.error : styles.help}>{advancedError ?? "Campos avançados validados antes de salvar."}</span></details>
    {advancedError ? <InlineStatus tone="error">{advancedError}</InlineStatus> : <details className={styles.preview}><summary>Prévia do bloco completo</summary><StatBlock creature={block} headingLevel={3} /></details>}
  </section>;
}
