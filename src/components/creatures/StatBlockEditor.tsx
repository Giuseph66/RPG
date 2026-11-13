import { useEffect, useState } from "react";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { asCentimeters, type Ability, type DamageType, type DiceFaces } from "@domain/contracts/primitives";
import { CREATURE_TYPES, isCreatureStatBlock, type CreatureAction, type CreatureSense, type CreatureStatBlock, type CreatureStatBlockSuggestion, type CreatureStatBlockSuggestionInput, type CreatureTrait, type CreatureType } from "@domain/creatures";
import type { AppError, Result } from "@domain/contracts/errors";
import { Button, InlineStatus } from "@components/ui";
import { StatBlock } from "./StatBlock";
import styles from "./stat-block-editor.module.css";

const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS: Readonly<Record<Ability, string>> = { str: "FOR", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" };
const TYPE_LABELS: Readonly<Record<CreatureType, string>> = { aberration: "Aberração", beast: "Besta", celestial: "Celestial", construct: "Constructo", dragon: "Dragão", elemental: "Elemental", fey: "Fada", fiend: "Ínfero", giant: "Gigante", humanoid: "Humanoide", monstrosity: "Monstruosidade", ooze: "Limo", plant: "Planta", undead: "Morto-vivo" };
const SIZE_OPTIONS = [["tiny", "Miúda"], ["small", "Pequena"], ["medium", "Média"], ["large", "Grande"], ["huge", "Enorme"], ["gargantuan", "Imensa"]] as const;
const DAMAGE_TYPES: readonly DamageType[] = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
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

export interface StatBlockEditorProps {
  readonly value?: CreatureStatBlock;
  readonly name: string;
  readonly onChange: (value?: CreatureStatBlock) => void;
  readonly onValidityChange?: (valid: boolean) => void;
  readonly creatureTypeMode?: "any" | "beast-only";
  readonly onSuggest?: (input: Omit<CreatureStatBlockSuggestionInput, "catalog">) => Result<CreatureStatBlockSuggestion, AppError>;
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

  useEffect(() => {
    setBlock(value);
    setAdvancedText(value ? JSON.stringify(advancedFields(value), null, 2) : "{}");
    setAdvancedError(undefined);
    onValidityChange?.(true);
  }, [value?.id]);

  const update = (next: CreatureStatBlock) => { setBlock(next); onChange(next); };
  const numeric = (label: string, value: number, onValue: (next: number) => void, min = 0, step = 1, key?: string) => <label key={key} className={styles.field}><span>{label}</span><input type="number" min={min} step={step} value={value} onChange={(event) => onValue(Number(event.currentTarget.value))} /></label>;
  const text = (label: string, value: string | undefined, onValue: (next: string) => void) => <label className={styles.field}><span>{label}</span><input value={value ?? ""} onChange={(event) => onValue(event.currentTarget.value)} /></label>;

  const add = () => update(createDraft(name));
  if (!block) return <section className={styles.editor}><div><strong>Bloco estatístico completo</strong><p>Opcional · o cadastro narrativo continua disponível sem estatísticas.</p></div><Button type="button" variant="secondary" onClick={add}>Adicionar bloco estatístico</Button></section>;

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

  return <section className={styles.editor} aria-labelledby="stat-block-editor-title">
    <div className={styles.editorHeading}><div><strong id="stat-block-editor-title">Bloco estatístico completo</strong><p>Estatísticas publicadas, ações e detalhes adicionais são preservados neste bloco.</p></div><Button type="button" size="sm" variant="ghost" onClick={() => { setBlock(undefined); setAdvancedText("{}"); setAdvancedError(undefined); onValidityChange?.(true); onChange(undefined); }}>Remover bloco</Button></div>
    {onSuggest ? <fieldset className={styles.group}><legend>Gerar rascunho editável</legend><p className={styles.help}>Usa o bloco publicado de mesmo tipo e tamanho com ND mais próximo. Confira e edite todos os campos antes de salvar.</p>
      <div className={styles.fields}>
        {text("Nome sugerido", suggestionName || name, setSuggestionName)}
        {creatureTypeMode === "beast-only" ? <label className={styles.field}><span>Tipo</span><input readOnly value="Besta" /></label> : <label className={styles.field}><span>Tipo</span><select value={suggestionType} onChange={(event) => setSuggestionType(event.currentTarget.value as CreatureType)}>{CREATURE_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select></label>}
        <label className={styles.field}><span>Tamanho</span><select value={suggestionSize} onChange={(event) => setSuggestionSize(event.currentTarget.value as CreatureStatBlock["size"])}>{SIZE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className={styles.field}><span>ND desejado (opcional)</span><input inputMode="numeric" value={suggestionCr} placeholder="Ex.: 1/4" onChange={(event) => setSuggestionCr(event.currentTarget.value)} /></label>
      </div>
      {suggestionReasons.length ? <ul className={styles.reasonList}>{suggestionReasons.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      {suggestionError ? <InlineStatus tone="error" assertive>{suggestionError}</InlineStatus> : null}
      <Button type="button" variant="secondary" disabled={Boolean(advancedError)} onClick={generateSuggestion}>Gerar sugestão pelo catálogo</Button>
    </fieldset> : null}
    <div className={styles.fields}>
      {text("Nome no bloco", block.name, (next) => update({ ...block, name: next }))}
      {creatureTypeMode === "beast-only" ? <label className={styles.field}><span>Tipo de criatura</span><input readOnly value="Besta" aria-label="Tipo de criatura: besta" /></label> : <label className={styles.field}><span>Tipo de criatura</span><select value={block.creatureType} onChange={(event) => update({ ...block, creatureType: event.currentTarget.value as CreatureType })}>{CREATURE_TYPES.map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}</select></label>}
      <label className={styles.field}><span>Tamanho</span><select value={block.size} onChange={(event) => update({ ...block, size: event.currentTarget.value as CreatureStatBlock["size"] })}>{SIZE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {text("Tendência", block.alignment, (next) => update({ ...block, alignment: next || undefined }))}
      {numeric("CA", block.armorClass, (next) => update({ ...block, armorClass: next }))}
      {text("Nota da CA", block.armorClassNote, (next) => update({ ...block, armorClassNote: next || undefined }))}
      {numeric("PV médios", block.hitPoints.average, (next) => update({ ...block, hitPoints: { ...block.hitPoints, average: next } }))}
      {text("Dados de vida", block.hitPoints.hitDice, (next) => update({ ...block, hitPoints: { ...block.hitPoints, hitDice: next || undefined } }))}
      <label className={styles.check}><input type="checkbox" checked={block.challengeRating === null} onChange={(event) => update({ ...block, challengeRating: event.currentTarget.checked ? null : { numerator: 0, denominator: 1 } })} /> ND não informado</label>
      {block.challengeRating ? <>{numeric("ND — numerador", block.challengeRating.numerator, (next) => update({ ...block, challengeRating: { ...block.challengeRating!, numerator: next } }))}{numeric("ND — denominador", block.challengeRating.denominator, (next) => update({ ...block, challengeRating: { ...block.challengeRating!, denominator: next } }), 1)}</> : null}
      {numeric("XP", block.experiencePoints ?? 0, (next) => update({ ...block, experiencePoints: next || undefined }))}
      {numeric("Bônus de proficiência", block.proficiencyBonus ?? 0, (next) => update({ ...block, proficiencyBonus: next || undefined }), -10)}
      {text("Marcadores (separados por vírgula)", (block.tags ?? []).join(", "), (next) => update({ ...block, tags: next.split(",").map((tag) => tag.trim()).filter(Boolean) }))}
    </div>
    <fieldset className={styles.group}><legend>Atributos</legend><div className={styles.abilities}>{ABILITIES.map((ability) => numeric(ABILITY_LABELS[ability], block.abilityScores[ability], (next) => updateAbility(ability, next), 0, 1, ability))}</div></fieldset>
    <fieldset className={styles.group}><legend>Deslocamentos · metros</legend><div className={styles.fields}>{numeric("Andar", Number(block.speeds.walkCm ?? 0) / 100, (next) => updateMeters("walkCm", next), 0, .5)}{numeric("Escalada", Number(block.speeds.climbCm ?? 0) / 100, (next) => updateMeters("climbCm", next), 0, .5)}{numeric("Natação", Number(block.speeds.swimCm ?? 0) / 100, (next) => updateMeters("swimCm", next), 0, .5)}{numeric("Voo", Number(block.speeds.flyCm ?? 0) / 100, (next) => updateMeters("flyCm", next), 0, .5)}{numeric("Escavação", Number(block.speeds.burrowCm ?? 0) / 100, (next) => updateMeters("burrowCm", next), 0, .5)}<label className={styles.check}><input type="checkbox" checked={block.speeds.hover ?? false} onChange={(event) => update({ ...block, speeds: { ...block.speeds, hover: event.currentTarget.checked } })} /> Paira durante o voo</label></div></fieldset>
    <fieldset className={styles.group}><legend>Traços</legend>
      {(block.traits ?? []).map((trait, index) => <div className={styles.entry} key={trait.id}>
        <div className={styles.entryHeading}><strong>Traço {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={Boolean(advancedError)} onClick={() => updateTrait("traits", index, undefined)}>Remover</Button></div>
        {text("Nome do traço", trait.name, (next) => updateTrait("traits", index, { ...trait, name: next }))}
        <label className={styles.field}><span>Descrição</span><textarea rows={2} value={trait.description} disabled={Boolean(advancedError)} onChange={(event) => updateTrait("traits", index, { ...trait, description: event.currentTarget.value })} /></label>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={Boolean(advancedError)} onClick={() => updateTrait("traits", block.traits?.length ?? 0, { id: newEntryId("trait"), name: "Novo traço", description: "" })}>Adicionar traço</Button>
    </fieldset>
    <fieldset className={styles.group}><legend>Ações e ataques</legend>
      {(block.actions ?? []).map((action, index) => {
        const damage = action.damage?.[0];
        const formula = damage?.formula;
        return <div className={styles.entry} key={action.id}>
          <div className={styles.entryHeading}><strong>Ação {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={Boolean(advancedError)} onClick={() => updateTrait("actions", index, undefined)}>Remover</Button></div>
          {text("Nome da ação", action.name, (next) => updateAction(index, { name: next }))}
          <label className={styles.field}><span>Descrição</span><textarea rows={2} value={action.description} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { description: event.currentTarget.value })} /></label>
          <div className={styles.fields}>
            <label className={styles.field}><span>Bônus de ataque</span><input type="number" value={action.attackBonus ?? ""} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { attackBonus: optionalNumber(event.currentTarget.value) })} /></label>
            <label className={styles.field}><span>Alcance corpo a corpo · m</span><input type="number" min="0" step="0.5" value={action.reachCm === undefined ? "" : action.reachCm / 100} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { reachCm: optionalNumber(event.currentTarget.value) === undefined ? undefined : Math.round(optionalNumber(event.currentTarget.value)! * 100) as CreatureAction["reachCm"] })} /></label>
            <label className={styles.field}><span>Alcance à distância · m</span><input type="number" min="0" step="0.5" value={action.rangeCm === undefined ? "" : action.rangeCm / 100} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { rangeCm: optionalNumber(event.currentTarget.value) === undefined ? undefined : Math.round(optionalNumber(event.currentTarget.value)! * 100) as CreatureAction["rangeCm"] })} /></label>
          </div>
          <label className={styles.check}><input type="checkbox" checked={Boolean(action.damage?.length)} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { damage: event.currentTarget.checked ? [{ damageType: "piercing", formula: { quantity: 1, faces: 6 } }] : undefined })} /> Tem dano</label>
          {damage ? <div className={styles.fields}>
            <label className={styles.field}><span>Dados de dano</span><span className={styles.inlineNumber}><input aria-label={`Quantidade de dados da ação ${index + 1}`} type="number" min="1" value={formula?.quantity ?? 1} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { damage: [{ ...damage, formula: { ...(formula ?? { quantity: 1, faces: 6 }), quantity: Math.max(1, Number(event.currentTarget.value) || 1) } }, ...(action.damage?.slice(1) ?? [])] })} /><span>d</span><input aria-label={`Faces dos dados da ação ${index + 1}`} type="number" min="1" value={formula?.faces ?? 6} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { damage: [{ ...damage, formula: { ...(formula ?? { quantity: 1, faces: 6 }), faces: Math.max(1, Number(event.currentTarget.value) || 6) as DiceFaces } }, ...(action.damage?.slice(1) ?? [])] })} /></span></label>
            <label className={styles.field}><span>Bônus fixo de dano</span><input type="number" value={damage.flatBonus ?? ""} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { damage: [{ ...damage, flatBonus: optionalNumber(event.currentTarget.value) }, ...(action.damage?.slice(1) ?? [])] })} /></label>
            <label className={styles.field}><span>Tipo de dano</span><select value={damage.damageType} disabled={Boolean(advancedError)} onChange={(event) => updateAction(index, { damage: [{ ...damage, damageType: event.currentTarget.value as DamageType }, ...(action.damage?.slice(1) ?? [])] })}>{DAMAGE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          </div> : null}
        </div>;
      })}
      <Button type="button" size="sm" variant="secondary" disabled={Boolean(advancedError)} onClick={() => updateTrait("actions", block.actions?.length ?? 0, { id: newEntryId("action"), name: "Novo ataque", description: "" })}>Adicionar ação ou ataque</Button>
    </fieldset>
    <fieldset className={styles.group}><legend>Sentidos e idiomas</legend>
      {(block.senses ?? []).map((sense, index) => <div className={styles.entry} key={`${sense.kind}-${index}`}>
        <div className={styles.entryHeading}><strong>Sentido {index + 1}</strong><Button type="button" size="sm" variant="ghost" disabled={Boolean(advancedError)} onClick={() => updateSense(index, undefined)}>Remover</Button></div>
        {text("Sentido", sense.kind, (next) => updateSense(index, { ...sense, kind: next }))}
        <div className={styles.fields}><label className={styles.field}><span>Alcance · m</span><input type="number" min="0" step="0.5" value={sense.rangeCm === undefined ? "" : sense.rangeCm / 100} disabled={Boolean(advancedError)} onChange={(event) => { const meters = optionalNumber(event.currentTarget.value); updateSense(index, { ...sense, rangeCm: meters === undefined ? undefined : Math.round(meters * 100) as CreatureSense["rangeCm"] }); }} /></label>{text("Descrição", sense.description, (next) => updateSense(index, { ...sense, description: next || undefined }))}</div>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={Boolean(advancedError)} onClick={() => updateSense(block.senses?.length ?? 0, { kind: "Novo sentido" })}>Adicionar sentido</Button>
      <label className={styles.field}><span>Idiomas · um por linha</span><textarea rows={3} value={(block.languages ?? []).join("\n")} disabled={Boolean(advancedError)} onChange={(event) => updateLanguageList(event.currentTarget.value)} /></label>
    </fieldset>
    <label className={styles.field}><span>Notas</span><textarea rows={3} value={block.additionalInfo?.notes ?? ""} disabled={Boolean(advancedError)} onChange={(event) => updateNotes(event.currentTarget.value)} placeholder="Notas relevantes do bloco" /></label>
    <details className={styles.advanced}><summary>Campos adicionais · fontes, defesas, conjuração, covil e extras</summary><small>JSON opcional para preservar todos os campos do bloco completo. Remover uma propriedade do objeto também a remove do bloco. Campos guiados acima não devem ser repetidos aqui.</small><textarea rows={12} spellCheck={false} value={advancedText} aria-invalid={Boolean(advancedError)} aria-describedby="stat-block-advanced-help" onChange={(event) => updateAdvanced(event.currentTarget.value)} /><span id="stat-block-advanced-help" className={advancedError ? styles.error : styles.help}>{advancedError ?? "Campos avançados validados antes de salvar."}</span></details>
    {advancedError ? <InlineStatus tone="error">{advancedError}</InlineStatus> : <details className={styles.preview}><summary>Prévia do bloco completo</summary><StatBlock creature={block} headingLevel={3} /></details>}
  </section>;
}
