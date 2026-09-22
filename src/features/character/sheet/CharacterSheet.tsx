import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Badge, Button, InlineStatus, Input, SectionCard } from "@components/ui";
import { artworkForClass } from "../../../assets/art/fantasy";
import type { Ability, Skill } from "@domain/contracts/primitives";
import type { Character } from "@domain/contracts/character";
import type { CharacterDerived, Explanation } from "@domain/contracts/derived";
import type { EntityType } from "@domain/contracts/ids";

import { ABILITY_LABELS, DAMAGE_LABELS, SKILL_LABELS, formatModifier, formatRef, formatSource } from "./mapping";
import type { CharacterRollIntent, CharacterSheetPatch, CharacterSheetProps, CharacterSheetView } from "./types";
import styles from "./character-sheet.module.css";

const ABILITIES: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
const CLASS_ALIASES: Readonly<Record<string, string>> = {
  guerreiro: "fighter",
  paladino: "paladin",
  ladino: "rogue",
  mago: "wizard",
  feiticeiro: "sorcerer",
  clerigo: "cleric",
  clérigo: "cleric",
  druida: "druid",
  barbaro: "barbarian",
  bárbaro: "barbarian",
  patrulheiro: "ranger",
  bardo: "bard",
  bruxo: "warlock",
};
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

function valueOr<T>(draft: CharacterSheetPatch, key: keyof CharacterSheetPatch, value: T): T {
  const next = draft[key];
  return (next === undefined ? value : next) as T;
}

function explanationText<T>(explanation: Explanation<T> | undefined): string {
  return explanation === undefined ? "Valor derivado indisponível" : `Valor ${String(explanation.value)} com ${explanation.contributions.length} origem${explanation.contributions.length === 1 ? "" : "ens"}.`;
}

function Provenance({ explanation, label }: { readonly explanation?: Explanation<number>; readonly label: string }) {
  if (!explanation) return null;
  return (
    <details className={styles.provenance}>
      <summary aria-label={`Ver origem de ${label}`}>origem</summary>
      <ul>
        {explanation.contributions.length === 0 ? <li>Fonte não registrada.</li> : explanation.contributions.map((item, index) => <li key={`${item.description}-${index}`}>{formatSource(item)}</li>)}
      </ul>
    </details>
  );
}

function RollButton({ label, accessibleLabel = label, intent, onRoll }: { readonly label: string; readonly accessibleLabel?: string; readonly intent: CharacterRollIntent; readonly onRoll?: (intent: CharacterRollIntent) => void }) {
  if (!onRoll) return <span className={styles.value}>{label}</span>;
  return <Button className={styles.roll} variant="ghost" size="sm" aria-label={`Rolar ${accessibleLabel}`} onClick={() => onRoll(intent)}>{label}</Button>;
}

function StatValue({ label, accessibleLabel, value, explanation, action }: { readonly label: string; readonly accessibleLabel?: string; readonly value: string; readonly explanation?: Explanation<number>; readonly action?: ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel} title={accessibleLabel} aria-label={accessibleLabel}>{label}</span>
      <div className={styles.statValueRow}><strong>{action ?? value}</strong>{explanation ? <Provenance explanation={explanation} label={label} /> : null}</div>
      {explanation ? <span className={styles.statHint}>{explanationText(explanation)}</span> : null}
    </div>
  );
}

function LoadingState() {
  return <section className={styles.state} aria-live="polite"><span className={styles.stateMark} aria-hidden="true">◌</span><h1>Carregando ficha</h1><p>Buscando o último estado salvo do personagem.</p></section>;
}

function EmptyState() {
  return <section className={styles.state} aria-labelledby="sheet-empty-title"><img className={styles.stateArt} src={artworkForClass(undefined).src} alt={artworkForClass(undefined).alt} /><span className={styles.stateMark} aria-hidden="true">✦</span><h1 id="sheet-empty-title">Nenhum personagem selecionado</h1><p>Selecione uma ficha para consultar atributos, recursos e narrativa. A ficha permanece vazia até que um personagem real seja escolhido.</p></section>;
}

function ErrorState({ error }: { readonly error?: unknown }) {
  const message = error instanceof Error ? error.message : "Não foi possível carregar a ficha.";
  return <section className={styles.state} aria-labelledby="sheet-error-title"><span className={styles.stateMark} aria-hidden="true">!</span><h1 id="sheet-error-title">A ficha não pôde ser carregada</h1><p>{message}</p></section>;
}

const RULESET_LABELS: Readonly<Record<string, string>> = { "phb-ptbr-local-2017": "Livro do Jogador (PT-BR, 2017)" };

function pluralize(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}

export function CharacterSheet({ character, derived, service, status = "clean", error, initialView = "quick", onViewChange, onRoll, onDraftChange, resolveName }: CharacterSheetProps) {
  const [view, setView] = useState<CharacterSheetView>(initialView);
  const [draft, setDraft] = useState<CharacterSheetPatch>({});
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setDraft({});
    setMessage(undefined);
  }, [character?.id]);

  const updatePatch = (patch: CharacterSheetPatch) => {
    setDraft((current) => ({ ...current, ...patch }));
    onDraftChange?.(patch);
    if (!service || !character) return;
    const result = service.update((current) => ({ ...current, ...patch }));
    if (!result.ok) setMessage(result.error.message);
    else setMessage("Alteração em rascunho; salve quando estiver pronto.");
  };

  const setSheetView = (next: CharacterSheetView) => {
    setView(next);
    onViewChange?.(next);
  };

  const saveDraft = async () => {
    if (!service) return;
    const result = await service.save();
    setMessage(result.ok ? "Ficha salva." : "Não foi possível salvar; o rascunho foi preservado.");
  };

  if (status === "hydrating" || status === "saving") return <LoadingState />;
  if (status === "error" || error) return <ErrorState error={error} />;
  if (!character) return <EmptyState />;

  const hp = valueOr(draft, "hp", character.hp);
  const currentView = view === "expanded";
  const staleDerived = derived && derived.characterId !== character.id;
  const name = (entityType: EntityType, ref: { readonly entityId: string } | string): string => {
    const entityId = typeof ref === "string" ? ref : ref.entityId;
    return resolveName?.(entityType, entityId) ?? formatRef(entityId);
  };
  const classes = character.classes.length === 0 ? "Classe pendente" : character.classes.map((entry) => `${name("class", entry.classId)} ${entry.level}`).join(" · ");
  const primaryClass = character.classes[0]?.classId;
  const heroArtwork = artworkForClass(CLASS_ALIASES[String(primaryClass ?? "").toLowerCase()] ?? String(primaryClass ?? ""));
  const primarySpeed = derived?.speedsCm.find((speed) => speed.kind === "walk")?.value.value;
  const abilityMap = new Map(derived?.abilityScores.map((item) => [item.ability, item]) ?? []);

  const intentFor = (kind: CharacterRollIntent["kind"], id: Ability | Skill, modifier: number): CharacterRollIntent => {
    if (kind === "ability") return { kind, characterId: character.id, ability: id as Ability, modifier };
    if (kind === "skill") return { kind, characterId: character.id, skill: id as Skill, modifier };
    if (kind === "saving-throw") return { kind, characterId: character.id, ability: id as Ability, modifier };
    return { kind: "initiative", characterId: character.id, modifier };
  };

  return (
    <section className={styles.sheet} aria-labelledby="character-sheet-title">
      <header className={styles.hero}>
        <div className={styles.heroArt}><img src={heroArtwork.src} alt={heroArtwork.alt} /></div>
        <div className={styles.heroBody}>
          <p className={styles.eyebrow}>FICHA DO PERSONAGEM</p>
          <h1 id="character-sheet-title">{valueOr(draft, "name", character.name) || "Personagem sem nome"}</h1>
          <p className={styles.subtitle}>{classes} <span aria-hidden="true">·</span> {name("race", character.raceRef)} <span aria-hidden="true">·</span> {name("background", character.backgroundRef)}</p>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.viewToggle} role="group" aria-label="Visão da ficha"><Button size="sm" variant={view === "quick" ? "primary" : "ghost"} aria-pressed={view === "quick"} onClick={() => setSheetView("quick")}>Rápida</Button><Button size="sm" variant={currentView ? "primary" : "ghost"} aria-pressed={currentView} onClick={() => setSheetView("expanded")}>Expandida</Button></div>
          {service ? <Button size="sm" variant="secondary" onClick={() => void saveDraft()}>Salvar ficha</Button> : null}
        </div>
      </header>
      {message ? <InlineStatus tone={message.includes("não") || message.includes("Não") ? "error" : "info"}>{message}</InlineStatus> : null}
      {staleDerived ? <InlineStatus tone="warning">Os valores derivados pertencem a outra revisão; atualize a ficha antes de rolar.</InlineStatus> : null}

      <section className={styles.quickGrid} aria-label="Estado da sessão">
        <SectionCard heading="Pontos de vida" headingLevel={2}>
          <div className={styles.hpPanel}><div className={styles.hpTotal}><strong>{hp.current}</strong><span>/ {derived?.hitPointsMax.value ?? "—"}</span>{hp.temp > 0 ? <span className={styles.hpTemp}>+{hp.temp} temp.</span> : null}</div><div className={styles.hpFields}><label className={styles.inlineField}><span>Atuais</span><input aria-label="Pontos de vida atuais" type="number" min={0} value={hp.current} onChange={(event) => updatePatch({ hp: { ...hp, current: Number(event.target.value) } })} /></label><label className={styles.inlineField}><span>Temporários</span><input aria-label="Pontos de vida temporários" type="number" min={0} value={hp.temp} onChange={(event) => updatePatch({ hp: { ...hp, temp: Number(event.target.value) } })} /></label></div></div>
          {derived ? <Provenance explanation={derived.hitPointsMax} label="pontos de vida máximos" /> : null}
          {hp.current === 0 ? <InlineStatus tone="error" assertive>PV zerados: resolva o estado de morte antes da próxima ação.</InlineStatus> : null}
        </SectionCard>
        <SectionCard heading="Defesas" headingLevel={2}>
          <div className={styles.statsGrid}><StatValue label="CA" accessibleLabel="Classe de Armadura" value={derived ? String(derived.armorClass.value) : "—"} explanation={derived?.armorClass} /><StatValue label="Iniciativa" value={derived ? formatModifier(derived.initiative.value) : "—"} explanation={derived?.initiative} action={derived ? <RollButton label={formatModifier(derived.initiative.value)} accessibleLabel="iniciativa" intent={intentFor("initiative", "dex", derived.initiative.value)} onRoll={onRoll} /> : undefined} /><StatValue label="Deslocamento" value={primarySpeed === undefined ? "—" : `${(Number(primarySpeed) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`} /></div>
        </SectionCard>
        <SectionCard heading="Sessão" headingLevel={2} actions={character.inspiration ? <Badge tone="xp">Inspiração</Badge> : undefined}>
          <div className={styles.sessionList}><p><span>Proficiência</span><strong>{derived ? formatModifier(derived.proficiencyBonus.value) : "—"}</strong></p><p><span>Percepção passiva</span><strong>{derived?.passivePerception.value ?? "—"}</strong></p><p><span>Experiência</span><strong>{valueOr(draft, "xp", character.xp).toLocaleString("pt-BR")} XP</strong></p></div>
          <label className={styles.checkRow}><input type="checkbox" checked={valueOr(draft, "inspiration", character.inspiration)} onChange={(event) => updatePatch({ inspiration: event.target.checked })} /> <span>Inspiração disponível</span></label>
        </SectionCard>
      </section>

      <SectionCard heading="Atributos" headingLevel={2}>
        <div className={styles.abilityGrid}>{ABILITIES.map((ability) => { const item = abilityMap.get(ability); return <div className={styles.ability} key={ability}><span className={styles.abilityShort}>{ABILITY_LABELS[ability].short}</span><span className={styles.abilityName}>{ABILITY_LABELS[ability].name}</span><strong>{item ? <RollButton label={String(item.score.value)} accessibleLabel={ABILITY_LABELS[ability].name} intent={intentFor("ability", ability, item.modifier.value)} onRoll={onRoll} /> : "—"}</strong><span className={styles.modifier}>{item ? formatModifier(item.modifier.value) : "—"}</span>{item ? <Provenance explanation={item.modifier} label={ABILITY_LABELS[ability].name} /> : null}</div>; })}</div>
      </SectionCard>

      <section className={styles.splitGrid}>
        <SectionCard heading="Perícias" headingLevel={2}>
          <div className={styles.actionList}>{derived?.skills.map((skill) => <div className={styles.actionRow} key={skill.skill}><span className={[styles.dot, skill.proficient ? styles.dotActive : ""].join(" ")} aria-label={skill.proficient ? "proficiente" : "não proficiente"} /> <span className={styles.actionName}>{SKILL_LABELS[skill.skill]}{skill.expertise ? <small> expertise</small> : null}</span><RollButton label={formatModifier(skill.modifier.value)} accessibleLabel={`${SKILL_LABELS[skill.skill]} (${formatModifier(skill.modifier.value)})`} intent={intentFor("skill", skill.skill, skill.modifier.value)} onRoll={onRoll} /></div>) ?? <p className={styles.muted}>Perícias derivadas ainda não estão disponíveis.</p>}</div>
        </SectionCard>
        <SectionCard heading="Resistências" headingLevel={2}>
          <div className={styles.actionList}>{derived?.savingThrows.map((save) => <div className={styles.actionRow} key={save.ability}><span className={[styles.dot, save.proficient ? styles.dotActive : ""].join(" ")} aria-label={save.proficient ? "proficiente" : "não proficiente"} /><span className={styles.actionName}>{ABILITY_LABELS[save.ability].name}</span><RollButton label={formatModifier(save.modifier.value)} accessibleLabel={`resistência de ${ABILITY_LABELS[save.ability].name} (${formatModifier(save.modifier.value)})`} intent={intentFor("saving-throw", save.ability, save.modifier.value)} onRoll={onRoll} /></div>) ?? <p className={styles.muted}>Resistências derivadas ainda não estão disponíveis.</p>}</div>
        </SectionCard>
      </section>

        <SectionCard heading="Condições e morte" headingLevel={2}>
        <div className={styles.conditionLayout}><div><h3>Condições ativas</h3>{character.conditions.length === 0 ? <p className={styles.muted}>Nenhuma condição ativa.</p> : <div className={styles.conditionList}>{character.conditions.map((condition) => <details className={styles.condition} key={condition.id}><summary><Badge tone="warning">{name("condition", condition.definitionRef)}</Badge><span>{condition.severity ? `Nível ${condition.severity}` : "Origem registrada"}</span></summary><p>{formatConditionOrigin(condition.origin, name)}</p></details>)}</div>}</div><div className={styles.deathSaves}><h3>Salvamentos contra morte</h3><p className={styles.muted}>{character.deathSaves.stable ? "Estável" : "Em acompanhamento"}</p><div className={styles.saveMarks}><span>Sucessos <strong>{character.deathSaves.successes}/3</strong></span><span>Falhas <strong>{character.deathSaves.failures}/3</strong></span></div></div></div>
      </SectionCard>

      {currentView ? <div className={styles.expanded}>
        <SectionCard heading="Identidade e narrativa" headingLevel={2}>
          <div className={styles.formGrid}><Input label="Nome" value={valueOr(draft, "name", character.name)} onChange={(event) => updatePatch({ name: event.target.value })} /><Input label="Jogador" value={valueOr(draft, "playerName", character.playerName ?? "")} onChange={(event) => updatePatch({ playerName: event.target.value })} /><div className={styles.field}><label htmlFor="sheet-alignment">Tendência</label><select id="sheet-alignment" value={valueOr(draft, "alignment", character.alignment ?? "unaligned")} onChange={(event) => updatePatch({ alignment: event.target.value as Character["alignment"] })}>{Object.entries(ALIGNMENTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
          <div className={styles.narrativeGrid}><NarrativeField label="Aparência" value={valueOr(draft, "appearance", character.appearance)} onChange={(value) => updatePatch({ appearance: value })} /><NarrativeField label="Traços de personalidade" value={valueOr(draft, "personalityTraits", character.personalityTraits).join("\n")} onChange={(value) => updatePatch({ personalityTraits: value.split("\n") })} /><NarrativeField label="Ideais" value={valueOr(draft, "ideals", character.ideals).join("\n")} onChange={(value) => updatePatch({ ideals: value.split("\n") })} /><NarrativeField label="Ligações" value={valueOr(draft, "bonds", character.bonds).join("\n")} onChange={(value) => updatePatch({ bonds: value.split("\n") })} /><NarrativeField label="Defeitos" value={valueOr(draft, "flaws", character.flaws).join("\n")} onChange={(value) => updatePatch({ flaws: value.split("\n") })} /><NarrativeField wide label="História" value={valueOr(draft, "history", character.history)} onChange={(value) => updatePatch({ history: value })} /></div>
        </SectionCard>
        {character.resources.length === 0 ? null : <SectionCard heading="Recursos" headingLevel={2}>
          <div className={styles.resourceList}>{character.resources.map((resource) => { const capacity = derived?.resourceCapacities.find((item) => item.definitionRef.entityId === resource.definitionRef.entityId); const total = capacity?.capacity.value; return <div className={styles.resourceRow} key={resource.id}><div><strong>{name("resource", resource.definitionRef)}</strong><Provenance explanation={capacity?.capacity} label={name("resource", resource.definitionRef)} /></div><span>{total === undefined ? "—" : `${Math.max(0, total - resource.spent)} / ${total}`}</span></div>; })}</div>
        </SectionCard>}
        <section className={styles.detailColumns}><SectionCard heading="Inventário e moedas" headingLevel={2}><p className={styles.muted}>{character.inventory.length === 0 ? "Nenhum item registrado." : `${pluralize(character.inventory.length, "item", "itens")} no inventário.`}</p><div className={styles.currency}>{Object.entries(character.currency).map(([coin, amount]) => <span key={coin}><strong>{coin.toUpperCase()}</strong>{amount}</span>)}</div></SectionCard><SectionCard heading="Magia e progressão" headingLevel={2}><p className={styles.muted}>{character.castingSources.length === 0 ? "Nenhuma fonte de conjuração registrada." : `${pluralize(character.castingSources.length, "fonte", "fontes")} de conjuração.`}</p><p className={styles.detailLine}><span>XP</span><strong>{valueOr(draft, "xp", character.xp).toLocaleString("pt-BR")}</strong></p><p className={styles.detailLine}><span>Níveis registrados</span><strong>{character.progressionHistory.length}</strong></p></SectionCard></section>
        <SectionCard heading="Fontes e pendências" headingLevel={2}><p className={styles.detailLine}><span>Livro de regras</span><strong>{RULESET_LABELS[character.rulesetRef.id] ?? formatRef(character.rulesetRef.id)}</strong></p>{character.pendingResolutions.length === 0 ? <p className={styles.muted}>Nenhuma resolução pendente.</p> : <ul className={styles.pendingList}>{character.pendingResolutions.map((pending, index) => <li key={`${pending.kind}-${index}`}>{pending.kind === "unresolved-rule" ? pending.description : pending.kind === "input-request" ? pending.reason : "Conjuração pendente"}</li>)}</ul>}</SectionCard>
      </div> : null}
    </section>
  );
}

function formatConditionOrigin(origin: Character["conditions"][number]["origin"], name: (entityType: EntityType, ref: { readonly entityId: string }) => string): string {
  switch (origin.kind) {
    case "environment":
    case "table-decision":
      return origin.description;
    case "spell":
      return `Aplicada por ${name("spell", origin.spellRef)}`;
    case "feature":
      return `Aplicada por ${name("feature", origin.featureRef)}`;
    case "item":
      return `Aplicada por ${name("equipment", origin.equipmentRef)}`;
  }
}

function NarrativeField({ label, value, onChange, wide = false }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void; readonly wide?: boolean }) {
  return <label className={[styles.textareaField, wide ? styles.wide : ""].join(" ")}><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={wide ? 5 : 3} /></label>;
}
