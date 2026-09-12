import { useEffect, useMemo, useRef, useState } from "react";

import { Button, InlineStatus, Input, ProgressBar, Select, SectionCard } from "@components/ui";
import type { ChoiceSelection } from "@domain/contracts/primitives";
import type { DefinitionRef, EntityId } from "@domain/contracts/ids";
import { asEntityId, asUuid, type Uuid } from "@domain/contracts/ids";
import { asProgressionCatalog, buildLevelUpPreview, getProgressionStatus, type LevelUpRequest } from "@domain/character/progression";

import type { CharacterProgressionProps } from "./types";
import styles from "./character-progression.module.css";

const SKILLS = ["athletics", "acrobatics", "sleight-of-hand", "stealth", "arcana", "history", "investigation", "nature", "religion", "animal-handling", "insight", "medicine", "perception", "survival", "performance", "deception", "intimidation", "persuasion"] as const;

function refFor(character: CharacterProgressionProps["character"], id: string): DefinitionRef {
  return { rulesetId: character.rulesetRef.id, entityId: asEntityId(id) };
}

function issueText(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível preparar a progressão.";
}

export function CharacterProgression({ character, catalog, status = "idle", error, onGrantXp, onApplyLevelUp, onLevelUp, onCancel }: CharacterProgressionProps) {
  const pack = asProgressionCatalog(catalog).rulePack;
  const [classId, setClassId] = useState<EntityId>(character.classes[0]?.classId ?? asEntityId("fighter"));
  const [subclassId, setSubclassId] = useState<EntityId>();
  const [gainKind, setGainKind] = useState<"rolled" | "fixed-average">("fixed-average");
  const [gain, setGain] = useState(1);
  const [rollId, setRollId] = useState("");
  const [mode, setMode] = useState<"xp" | "milestone">("xp");
  const [xpAmount, setXpAmount] = useState(0);
  const [selections, setSelections] = useState<readonly ChoiceSelection[]>([]);
  const applyLock = useRef(false);
  useEffect(() => {
    if (status === "error") applyLock.current = false;
  }, [status]);
  const classDefinition = pack.classes.get(classId);
  const subclassOptions = classDefinition?.subclassIds.map((id) => pack.subclasses.get(id)).filter(Boolean) ?? [];
  const safeRollId = rollId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rollId) ? asUuid(rollId) : (rollId as Uuid);
  const request: LevelUpRequest = {
    classId,
    ...(subclassId ? { subclassId } : {}),
    mode,
    hitPointGain: gainKind === "rolled" ? { kind: "rolled", amount: gain, rollId: safeRollId } : { kind: "fixed-average", amount: gain },
    choices: selections,
  };
  const preview = useMemo(() => buildLevelUpPreview(character, request, catalog), [character, request.classId, request.subclassId, request.mode, request.hitPointGain, request.choices, catalog]);
  const progressionStatus = useMemo(() => getProgressionStatus(character.xp, character.classes.reduce((sum, entry) => sum + entry.level, 0), catalog), [character, catalog]);
  const choiceMap = new Map(selections.map((selection) => [selection.choiceId, selection]));
  const updateChoice = (choiceId: string, values: readonly string[]) => {
    const next = { choiceId, selectedIds: values.map((value) => refFor(character, value)), grantedAtLevel: (preview.ok ? preview.value.targetClassLevel : 1), grantingRef: refFor(character, String(classId)) };
    setSelections((current) => [...current.filter((selection) => selection.choiceId !== choiceId), next]);
  };
  const invokeApply = onApplyLevelUp ?? onLevelUp;
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const statusText = status === "applying" ? "Aplicando progressão…" : status === "previewing" ? "Atualizando prévia…" : undefined;

  return <section className={styles.progression} aria-labelledby="progression-title"><header className={styles.header}><div><p className={styles.eyebrow}>PROGRESSÃO</p><h1 id="progression-title">Avançar personagem</h1><p className={styles.subtitle}>Nível total {totalLevel} · {character.xp.toLocaleString("pt-BR")} XP</p></div>{onCancel ? <Button variant="ghost" onClick={onCancel}>Cancelar</Button> : null}</header>{statusText ? <InlineStatus tone="info">{statusText}</InlineStatus> : null}{status === "error" || error ? <InlineStatus tone="error" assertive>{issueText(error)}</InlineStatus> : null}{progressionStatus.ok ? <ProgressBar value={progressionStatus.value.progress * 100} max={100} label={`Progresso para o próximo nível: ${Math.round(progressionStatus.value.progress * 100)}%`} tone="xp" /> : null}<div className={styles.grid}><SectionCard heading="Prévia do próximo nível" headingLevel={2}><div className={styles.formGrid}><Select label="Classe que avança" required value={String(classId)} onChange={(event) => { const value = event.currentTarget.value; setClassId(value ? asEntityId(value) : ("" as EntityId)); setSubclassId(undefined); setSelections([]); }}><option value="">Selecione uma classe</option>{Array.from(pack.classes.values()).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select>{subclassOptions.length ? <Select label="Subclasse" value={String(subclassId ?? "")} onChange={(event) => setSubclassId(event.currentTarget.value ? asEntityId(event.currentTarget.value) : undefined)}><option value="">Escolha quando a classe exigir</option>{subclassOptions.map((entry) => entry ? <option key={entry.id} value={entry.id}>{entry.name}</option> : null)}</Select> : null}<Select label="Método de PV" value={gainKind} onChange={(event) => setGainKind(event.currentTarget.value as typeof gainKind)}><option value="fixed-average">Valor fixo informado</option><option value="rolled">Dado rolado</option></Select><Input label="Ganho-base de PV" type="number" min={1} value={gain} onChange={(event) => setGain(Number(event.currentTarget.value))} />{gainKind === "rolled" ? <Input label="ID da rolagem" hint="A rolagem precisa existir no histórico antes da confirmação." value={rollId} onChange={(event) => setRollId(event.currentTarget.value)} /> : null}<Select label="Autorização" value={mode} onChange={(event) => setMode(event.currentTarget.value as typeof mode)}><option value="xp">Usar XP acumulado</option><option value="milestone">Marco autorizado pela campanha</option></Select></div>{preview.ok ? <div className={styles.preview}><p><strong>Nível de classe:</strong> {preview.value.targetClassLevel}</p><p><strong>Bônus de proficiência:</strong> {preview.value.proficiencyBonus}</p><p><strong>Ganho-base de PV:</strong> {preview.value.hitPointGain.amount}</p><p><strong>Características:</strong> {preview.value.featureRefs.map((ref) => String(ref.entityId)).join(" · ") || "Nenhuma publicada"}</p><p><strong>Recursos:</strong> {preview.value.resources.map((resource) => String(resource.definition?.name ?? resource.definitionRef.entityId)).join(" · ") || "Nenhum ganho"}</p></div> : null}</SectionCard><SectionCard heading="Escolhas deste nível" headingLevel={2}>{preview.ok && preview.value.choices.length ? preview.value.choices.map((choice) => { const current = choiceMap.get(choice.id)?.selectedIds.map((ref) => String(ref.entityId)) ?? []; const options = choice.optionSet.kind === "explicit" ? choice.optionSet.options.map((ref) => ({ id: String(ref.entityId), name: String(ref.entityId) })) : choice.optionSet.selector.kind === "any-skill" ? SKILLS.map((id) => ({ id, name: id })) : choice.optionSet.selector.kind === "any-entity-of-type" && choice.optionSet.selector.entityType === "spell" ? Array.from(pack.spells.values()).map((entry) => ({ id: String(entry.id), name: entry.name })) : choice.optionSet.selector.kind === "any-entity-of-type" && choice.optionSet.selector.entityType === "equipment" ? Array.from(pack.equipment.values()).map((entry) => ({ id: String(entry.id), name: entry.name })) : []; return <Select key={choice.id} label={choice.id} multiple={choice.count.max > 1} value={choice.count.max > 1 ? current : current[0] ?? ""} onChange={(event) => updateChoice(choice.id, choice.count.max > 1 ? Array.from(event.currentTarget.selectedOptions, (option) => option.value) : event.currentTarget.value ? [event.currentTarget.value] : [])} required={choice.count.min > 0}><option value="">Selecione uma opção</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</Select>; }) : <p className={styles.muted}>Nenhuma escolha publicada para este nível.</p>}{preview.ok && preview.value.pending.length ? <div className={styles.pending} role="alert"><strong>Pendências</strong><ul>{preview.value.pending.map((entry, index) => <li key={`${entry.field}-${index}`}>{entry.message}</li>)}</ul></div> : null}</SectionCard></div><SectionCard heading="Experiência" headingLevel={2}><div className={styles.xpRow}><Input label="Adicionar XP" type="number" min={0} value={xpAmount} onChange={(event) => setXpAmount(Number(event.currentTarget.value))} /><Button variant="secondary" disabled={!onGrantXp || xpAmount < 0} onClick={() => { if (onGrantXp && xpAmount >= 0) { onGrantXp(xpAmount); setXpAmount(0); } }}>Registrar XP</Button></div></SectionCard><footer className={styles.footer}><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button busy={status === "applying"} disabled={!invokeApply || !preview.ok || !preview.value.valid || status === "applying"} disabledReason={!invokeApply ? "Intenção de aplicar progressão indisponível." : preview.ok && !preview.value.valid ? "Resolva as pendências da prévia." : undefined} onClick={() => { if (invokeApply && preview.ok && preview.value.valid && !applyLock.current) { applyLock.current = true; invokeApply(request); } }}>Confirmar avanço</Button></footer></section>;
}

export { CharacterProgression as CharacterProgressionWizard };
