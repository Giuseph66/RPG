import { useEffect, useId, useState } from "react";
import type { ElementType, ReactNode } from "react";

import { Badge, Button, InlineStatus, VisuallyHidden } from "@components/ui";
import { CaretRight, PencilSimple, X } from "@phosphor-icons/react";
import {
  GiAngryEyes,
  GiBackpack,
  GiBoots,
  GiBreastplate,
  GiBroadsword,
  GiCartwheel,
  GiChest,
  GiConversation,
  GiCrossedSwords,
  GiCrystalBall,
  GiCrystalWand,
  GiDramaMasks,
  GiFirstAidKit,
  GiHammerNails,
  GiHandOk,
  GiHearts,
  GiHolySymbol,
  GiHorseHead,
  GiHunterEyes,
  GiMagnifyingGlass,
  GiOpenBook,
  GiPaw,
  GiPawHeart,
  GiPotionBall,
  GiScrollUnfurled,
  GiShield,
  GiSocks,
  GiSparkles,
  GiTalk,
  GiThirdEye,
  GiWingfoot,
} from "react-icons/gi";
import { artworkForClass } from "../../../assets/art/fantasy";
import { applyDamage, applyHealing } from "@domain/rules/combat";
import type { Ability, Skill } from "@domain/contracts/primitives";
import type { Character, ConditionInstance } from "@domain/contracts/character";
import type { Explanation } from "@domain/contracts/derived";
import { asUuid, type EntityType } from "@domain/contracts/ids";

import {
  ABILITY_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  KNOWN_SPELL_CLASSES,
  SKILL_ABILITY,
  SKILL_LABELS,
  SPELL_SCHOOL_LABELS,
  cantripsKnown,
  formatGrams,
  formatModifier,
  formatRef,
  formatSource,
  formatSpellLevel,
  preparedSpellCount,
} from "./mapping";
import { EditCharacterModal, PortraitModal, SpellManagerModal } from "./SheetEditors";
import { SpellIcon } from "./SpellIcon";
import { useRuleHint, type RuleHintProps, type RuleQuery } from "@features/compendium";
import type { CharacterRollIntent, CharacterSheetPatch, CharacterSheetProps, CharacterSheetView, SheetSpellOption } from "./types";
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
const SKILL_ICONS: Readonly<Record<Skill, ReactNode>> = {
  athletics: <GiCrossedSwords />,
  acrobatics: <GiCartwheel />,
  "sleight-of-hand": <GiHandOk />,
  stealth: <GiSocks />,
  arcana: <GiCrystalBall />,
  history: <GiScrollUnfurled />,
  investigation: <GiMagnifyingGlass />,
  nature: <GiOpenBook />,
  religion: <GiHolySymbol />,
  "animal-handling": <GiPawHeart />,
  insight: <GiThirdEye />,
  medicine: <GiFirstAidKit />,
  perception: <GiHunterEyes />,
  survival: <GiPaw />,
  performance: <GiDramaMasks />,
  deception: <GiConversation />,
  intimidation: <GiAngryEyes />,
  persuasion: <GiTalk />,
};
const CATEGORY_ICONS: Readonly<Record<string, ReactNode>> = {
  weapon: <GiBroadsword />,
  armor: <GiBreastplate />,
  tool: <GiHammerNails />,
  consumable: <GiPotionBall />,
  focus: <GiCrystalWand />,
  container: <GiChest />,
  mount: <GiHorseHead />,
};
const EQUIPPED_STATE_LABELS: Readonly<Record<Character["inventory"][number]["equippedState"], string>> = {
  equipped: "Equipado",
  carried: "Carregado",
  stored: "Guardado",
};
const SKILLS_COMPACT_COUNT = 6;
const ITEMS_COMPACT_COUNT = 3;
const TABLE_ORIGIN = { kind: "table-decision" as const, description: "Marcada na ficha." };

function valueOr<T>(draft: CharacterSheetPatch, key: keyof CharacterSheetPatch, value: T): T {
  return (key in draft ? draft[key] : value) as T;
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

/** Painel ornamentado (borda bronze, título Cinzel) com ação opcional alinhada à direita. */
function Panel({ heading, headingLevel = 2, action, children, className, hint }: { readonly heading: string; readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6; readonly action?: ReactNode; readonly children: ReactNode; readonly className?: string; readonly hint?: RuleHintProps }) {
  const headingId = useId();
  const HeadingTag = `h${headingLevel}` as ElementType;
  return (
    <section className={[styles.panel, className ?? ""].filter(Boolean).join(" ")} aria-labelledby={headingId}>
      <span className={styles.panelCornerTl} aria-hidden="true" />
      <span className={styles.panelCornerTr} aria-hidden="true" />
      <span className={styles.panelCornerBl} aria-hidden="true" />
      <span className={styles.panelCornerBr} aria-hidden="true" />
      <div className={styles.panelHeader}>
        <HeadingTag {...hint} id={headingId} className={styles.panelHeading}>{heading}</HeadingTag>
        {action}
      </div>
      <span className={styles.panelHeadingRule} aria-hidden="true" />
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function PanelLink({ label, expanded, onClick }: { readonly label: string; readonly expanded?: boolean; readonly onClick: () => void }) {
  return (
    <button type="button" className={styles.panelLink} aria-expanded={expanded} onClick={onClick}>
      {label}<CaretRight aria-hidden="true" />
    </button>
  );
}

function SkillRow({ skill, modifier, proficient, expertise, onRoll, intent, hint }: { readonly skill: Skill; readonly modifier: number; readonly proficient: boolean; readonly expertise: boolean; readonly onRoll?: (intent: CharacterRollIntent) => void; readonly intent: CharacterRollIntent; readonly hint?: RuleHintProps }) {
  const modText = formatModifier(modifier);
  const content = (
    <>
      <span className={[styles.skillIcon, proficient ? styles.skillIconActive : ""].join(" ")} aria-hidden="true">{SKILL_ICONS[skill]}</span>
      <span className={styles.skillInfo}>
        <span className={styles.skillName}>{SKILL_LABELS[skill]}{expertise ? <small> expertise</small> : null}</span>
        <span className={styles.skillAbility}>({ABILITY_LABELS[SKILL_ABILITY[skill]].short})</span>
      </span>
      <span className={styles.skillMod}>{modText}</span>
    </>
  );
  if (!onRoll) return <div {...hint} className={styles.skillRow}>{content}</div>;
  return <button {...hint} type="button" className={styles.skillRow} aria-label={`Rolar ${SKILL_LABELS[skill]} (${modText})`} onClick={() => onRoll(intent)}>{content}</button>;
}

/** Três marcas clicáveis: clicar na n-ésima define o total em n (ou n-1 se já marcada). */
function SaveMarks({ label, count, tone, onChange }: { readonly label: string; readonly count: number; readonly tone: "success" | "failure"; readonly onChange?: (next: number) => void }) {
  return (
    <fieldset className={styles.saveMarkGroup}>
      <legend>{label} <strong>{count}/3</strong></legend>
      <div className={styles.saveMarkRow}>
        {[1, 2, 3].map((index) => (
          <label key={index} className={[styles.saveMark, tone === "success" ? styles.saveMarkSuccess : styles.saveMarkFailure].join(" ")}>
            <input type="checkbox" aria-label={`${label} ${index}`} checked={count >= index} disabled={!onChange} onChange={() => onChange?.(count >= index ? index - 1 : index)} />
            <span aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
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

function newConditionId(): ConditionInstance["id"] {
  return asUuid(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`);
}

export function CharacterSheet({ character, derived, service, status = "clean", error, initialView = "quick", onViewChange, onRoll, onDraftChange, resolveName, equipmentInfo, spellOptions, conditionOptions, portrait }: CharacterSheetProps) {
  const rule = useRuleHint();
  const [view, setView] = useState<CharacterSheetView>(initialView);
  const [draft, setDraft] = useState<CharacterSheetPatch>({});
  const [message, setMessage] = useState<string>();
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [managingSpells, setManagingSpells] = useState(false);
  const [viewingPortrait, setViewingPortrait] = useState(false);
  const [hpAmount, setHpAmount] = useState("");
  const [conditionToAdd, setConditionToAdd] = useState("");
  const [portraitUrl, setPortraitUrl] = useState<string>();
  const draftPortraitId = "portraitAssetId" in draft ? draft.portraitAssetId : character?.portraitAssetId;
  const draftPortraitSha = "portraitSha256" in draft ? draft.portraitSha256 : character?.portraitSha256;

  useEffect(() => {
    if (!draftPortraitId || !portrait) { setPortraitUrl(undefined); return; }
    let active = true;
    let loaded: string | undefined;
    void portrait.load(draftPortraitId, draftPortraitSha).then((url) => {
      loaded = url;
      if (active) setPortraitUrl(url);
      else if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    return () => {
      active = false;
      if (loaded?.startsWith("blob:")) URL.revokeObjectURL(loaded);
    };
  }, [draftPortraitId, draftPortraitSha, portrait]);

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
    else setMessage(undefined);
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

  // Autosave passa por "saving" a cada edição; manter a ficha montada evita fechar editores.
  if (status === "hydrating" || (status === "saving" && !character)) return <LoadingState />;
  if (status === "error" || error) return <ErrorState error={error} />;
  if (!character) return <EmptyState />;

  const hp = valueOr(draft, "hp", character.hp);
  const deathSaves = valueOr(draft, "deathSaves", character.deathSaves);
  const conditions = valueOr(draft, "conditions", character.conditions);
  const castingSources = valueOr(draft, "castingSources", character.castingSources);
  const preparedSelections = valueOr(draft, "preparedSelections", character.preparedSelections);
  const sheetDisplay = valueOr(draft, "sheetDisplay", character.sheetDisplay ?? {});
  const portraitAssetId = valueOr(draft, "portraitAssetId", character.portraitAssetId);
  const editing = view === "expanded";
  const staleDerived = derived && derived.characterId !== character.id;
  const name = (entityType: EntityType, ref: { readonly entityId: string } | string): string => {
    const entityId = typeof ref === "string" ? ref : ref.entityId;
    return resolveName?.(entityType, entityId) ?? formatRef(entityId);
  };
  const className = character.classes.length === 0 ? "Classe pendente" : character.classes.map((entry) => name("class", entry.classId)).join(" / ");
  const totalLevel = character.classes.reduce((sum, entry) => sum + entry.level, 0);
  const primaryClass = character.classes[0]?.classId;
  const classArtwork = artworkForClass(CLASS_ALIASES[String(primaryClass ?? "").toLowerCase()] ?? String(primaryClass ?? ""));
  const heroImage = portraitAssetId && portraitUrl ? { src: portraitUrl, alt: `Retrato de ${character.name}` } : classArtwork;
  const primarySpeed = derived?.speedsCm.find((speed) => speed.kind === "walk")?.value.value;
  const abilityMap = new Map(derived?.abilityScores.map((item) => [item.ability, item]) ?? []);
  const displayName = valueOr(draft, "name", character.name) || "Personagem sem nome";
  const quoteText = character.ideals[0]?.trim() || character.personalityTraits[0]?.trim() || undefined;
  const maxHp = derived?.hitPointsMax.value;
  const identityParts: readonly { readonly label: string; readonly query: RuleQuery }[] = [
    ...(sheetDisplay.hideRace ? [] : [{ label: name("race", character.raceRef), query: { category: "race" as const, title: name("race", character.raceRef) } }]),
    ...(sheetDisplay.hideClass || character.classes.length === 0 ? [] : character.classes.map((entry) => ({ label: name("class", entry.classId), query: { category: "class" as const, title: name("class", entry.classId) } }))),
  ];

  const intentFor = (kind: CharacterRollIntent["kind"], id: Ability | Skill, modifier: number): CharacterRollIntent => {
    if (kind === "ability") return { kind, characterId: character.id, ability: id as Ability, modifier };
    if (kind === "skill") return { kind, characterId: character.id, skill: id as Skill, modifier };
    if (kind === "saving-throw") return { kind, characterId: character.id, ability: id as Ability, modifier };
    return { kind: "initiative", characterId: character.id, modifier };
  };

  const hasDraft = Object.keys(draft).length > 0;
  const current: Character = { ...character, hp, deathSaves };

  // Dano consome primeiro os PV temporários; cura nunca os repõe (Livro do Jogador, cap. 9).
  const applyHp = (kind: "damage" | "heal" | "temp") => {
    const amount = Number(hpAmount);
    if (!Number.isInteger(amount) || amount <= 0) { setMessage("Informe um valor inteiro maior que zero."); return; }
    if (kind === "temp") {
      updatePatch({ hp: { ...hp, temp: amount } });
      setHpAmount("");
      return;
    }
    if (maxHp === undefined) { setMessage("O máximo de PV ainda não foi calculado."); return; }
    const result = kind === "damage"
      ? applyDamage(current, { amount, damageType: "bludgeoning", maximumHitPoints: maxHp })
      : applyHealing(current, { amount, maximumHitPoints: maxHp });
    if (result.status !== "success") { setMessage(result.status === "rejected" ? result.errors[0]?.message ?? "Operação recusada." : "A operação exige uma decisão adicional."); return; }
    updatePatch({ hp: result.nextState.hp, deathSaves: result.nextState.deathSaves, ...(result.nextState.pendingResolutions !== character.pendingResolutions ? { pendingResolutions: result.nextState.pendingResolutions } : {}) });
    setHpAmount("");
  };

  const sortedSkills = derived ? [...derived.skills].sort((a, b) => Number(b.proficient) - Number(a.proficient)) : [];
  const visibleSkills = skillsExpanded ? sortedSkills : sortedSkills.slice(0, SKILLS_COMPACT_COUNT);
  // Resumo prioriza o que importa em jogo: equipados, armas, armaduras, focos e ferramentas.
  const categoryRank = (category: string | undefined) => ["weapon", "armor", "focus", "tool", "consumable"].indexOf(category ?? "") + 1 || 9;
  const sortedInventory = [...character.inventory].sort((a, b) =>
    Number(b.equippedState === "equipped") - Number(a.equippedState === "equipped")
    || categoryRank(equipmentInfo?.(String(a.equipmentRef.entityId))?.category) - categoryRank(equipmentInfo?.(String(b.equipmentRef.entityId))?.category));
  const visibleInventory = inventoryExpanded ? sortedInventory : sortedInventory.slice(0, ITEMS_COMPACT_COUNT);

  // Magias: conhecidas + preparadas + grimório, sem duplicatas.
  const spellById = new Map((spellOptions ?? []).map((option) => [String(option.ref.entityId), option]));
  const source = castingSources[0];
  const sourceClassId = source ? String(source.grantingRef.entityId) : undefined;
  const spellEntries = castingSources.flatMap((entry) => [...new Map([...entry.knownSpellRefs, ...entry.preparedSpellRefs, ...entry.spellbookRefs].map((ref) => [String(ref.entityId), ref])).values()].map((ref) => ({
    ref,
    ability: entry.ability,
    option: spellById.get(String(ref.entityId)),
    prepared: preparedSelections.some((selection) => selection.castingSourceId === entry.id && selection.spellRef.entityId === ref.entityId),
  }))).sort((a, b) => (a.option?.level ?? 0) - (b.option?.level ?? 0));
  const cantripEntries = spellEntries.filter((entry) => (entry.option?.level ?? 0) === 0);
  const leveledEntries = spellEntries.filter((entry) => (entry.option?.level ?? 0) > 0);
  const selectedSpellIds = new Set(spellEntries.map((entry) => String(entry.ref.entityId)));
  const sourceLevel = character.classes.find((entry) => String(entry.classId) === sourceClassId)?.level ?? totalLevel;
  const sourceModifier = source ? abilityMap.get(source.ability)?.modifier.value ?? 0 : 0;
  const knownCaster = sourceClassId ? KNOWN_SPELL_CLASSES.has(sourceClassId) : false;

  const updateSpells = (ids: ReadonlySet<string>) => {
    if (!source) return;
    const options = [...ids].map((id) => spellById.get(id)).filter((option): option is SheetSpellOption => option !== undefined);
    const cantrips = options.filter((option) => option.level === 0).map((option) => option.ref);
    const leveled = options.filter((option) => option.level > 0).map((option) => option.ref);
    const nextSource = knownCaster
      ? { ...source, knownSpellRefs: [...cantrips, ...leveled], preparedSpellRefs: [] }
      : { ...source, knownSpellRefs: cantrips, preparedSpellRefs: leveled };
    updatePatch({
      castingSources: [nextSource, ...castingSources.slice(1)],
      preparedSelections: [
        ...preparedSelections.filter((selection) => selection.castingSourceId !== source.id || selection.alwaysPrepared),
        ...(knownCaster ? [] : leveled.map((spellRef) => ({ castingSourceId: source.id, spellRef, alwaysPrepared: false }))),
      ],
    });
  };

  const addCondition = () => {
    const option = conditionOptions?.find((entry) => String(entry.ref.entityId) === conditionToAdd);
    if (!option) return;
    updatePatch({ conditions: [...conditions, { id: newConditionId(), definitionRef: option.ref, origin: TABLE_ORIGIN }] });
    setConditionToAdd("");
  };

  const canEdit = Boolean(service);

  return (
    <section className={styles.sheet} aria-labelledby="character-sheet-title">
      <header className={styles.hero}>
        <span className={styles.heroCornerTr} aria-hidden="true" />
        <span className={styles.heroCornerBl} aria-hidden="true" />
        <div className={styles.heroMain}>
          <button type="button" className={styles.heroArt} aria-label={`Ver ${portraitUrl ? "retrato" : "arte"} de ${displayName}`} onClick={() => setViewingPortrait(true)}><img src={heroImage.src} alt="" /></button>
          <div className={styles.heroFade} aria-hidden="true" />
          <div className={styles.heroText}>
            {quoteText ? <p className={styles.heroQuote}>&ldquo;{quoteText}&rdquo;</p> : null}
            <div className={styles.heroNameRow}>
              <h1 id="character-sheet-title">{displayName}</h1>
              <button type="button" className={styles.heroEdit} aria-label="Editar personagem" aria-pressed={editing} onClick={() => setSheetView(editing ? "quick" : "expanded")}>
                <span className={styles.heroEditIcon} aria-hidden="true"><PencilSimple weight="bold" /></span>
              </button>
            </div>
            {identityParts.length > 0 ? <p className={styles.heroLine}>{identityParts.map((part, index) => <span key={part.label}>{index > 0 ? <span aria-hidden="true"> • </span> : null}<span {...rule(part.query)} className={styles.ruleText}>{part.label}</span></span>)}</p> : null}
            <p className={styles.heroLine}>Nível {totalLevel}</p>
            <div className={styles.heroDivider} aria-hidden="true"><span className={styles.heroDividerRule} /><span className={styles.heroDividerMark}><GiSparkles /></span><span className={styles.heroDividerRule} /></div>
          </div>
        </div>
        <div className={styles.heroStats}>
          <details className={styles.statTile}>
            <summary {...rule({ category: "combat", title: "Dano e cura" })} className={styles.statTileSummary} aria-label={`Pontos de vida: ${hp.current}${hp.temp > 0 ? ` mais ${hp.temp} temporários` : ""} de ${maxHp ?? "—"}. Abrir controle de PV.`}>
              <span className={styles.statTileHead}><span className={styles.statIcon} aria-hidden="true"><GiHearts /></span><span className={styles.statLabel}>PV</span></span>
              <strong className={[styles.statValue, hp.temp > 0 ? styles.statValueTemp : ""].join(" ")}>{hp.current + hp.temp}<span className={styles.statValueSub}>/{maxHp ?? "—"}</span></strong>
            </summary>
            <div className={styles.hpEditor}>
              <div className={styles.hpBreakdown}>
                <span>Vida <strong>{hp.current}/{maxHp ?? "—"}</strong></span>
                <span className={styles.hpTempChip}>Temporários <strong>{hp.temp}</strong></span>
              </div>
              {canEdit ? (
                <>
                  <label className={styles.hpAmount}><span>Valor</span><input aria-label="Quantidade de PV" type="number" min={1} inputMode="numeric" value={hpAmount} onChange={(event) => setHpAmount(event.target.value)} /></label>
                  <div className={styles.hpButtons}>
                    <button type="button" className={styles.hpDamage} onClick={() => applyHp("damage")}>Dano</button>
                    <button type="button" className={styles.hpHeal} onClick={() => applyHp("heal")}>Cura</button>
                    <button type="button" className={styles.hpTempButton} onClick={() => applyHp("temp")}>Temp.</button>
                  </div>
                  <p className={styles.hpHint}>Dano gasta os temporários primeiro. Cura não repõe temporários, e temporários não acumulam.</p>
                </>
              ) : null}
              <details className={styles.hpManual}>
                <summary>Ajuste manual</summary>
                <label className={styles.hpField}><span>Atuais</span><input aria-label="Pontos de vida atuais" type="number" min={0} value={hp.current} onChange={(event) => updatePatch({ hp: { ...hp, current: Number(event.target.value) } })} /></label>
                <label className={styles.hpField}><span>Temporários</span><input aria-label="Pontos de vida temporários" type="number" min={0} value={hp.temp} onChange={(event) => updatePatch({ hp: { ...hp, temp: Number(event.target.value) } })} /></label>
              </details>
              {derived ? <Provenance explanation={derived.hitPointsMax} label="pontos de vida máximos" /> : null}
            </div>
          </details>
          <div className={styles.statTile}>
            <span className={styles.statTileHead}><span className={styles.statIcon} aria-hidden="true"><GiShield /></span><span className={styles.statLabel}>CA</span></span>
            <strong className={styles.statValue}>{derived ? String(derived.armorClass.value) : "—"}</strong>
          </div>
          <div {...rule({ category: "combat", title: "Ordem de combate" })} className={styles.statTile}>
            <span className={styles.statTileHead}><span className={styles.statIcon} aria-hidden="true"><GiWingfoot /></span><span className={styles.statLabel}>Iniciativa</span></span>
            <strong className={styles.statValue}>{derived ? <RollButton label={formatModifier(derived.initiative.value)} accessibleLabel="iniciativa" intent={intentFor("initiative", "dex", derived.initiative.value)} onRoll={onRoll} /> : "—"}</strong>
          </div>
          <div {...rule({ category: "movement", title: "Movimento e posição" })} className={styles.statTile}>
            <span className={styles.statTileHead}><span className={styles.statIcon} aria-hidden="true"><GiBoots /></span><span className={styles.statLabel}>Deslocamento</span></span>
            <strong className={styles.statValue}>{primarySpeed === undefined ? "—" : `${(Number(primarySpeed) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`}</strong>
          </div>
        </div>
      </header>
      {message ? <InlineStatus tone={message.includes("não") || message.includes("Não") ? "error" : "info"}>{message}</InlineStatus> : null}
      {staleDerived ? <InlineStatus tone="warning">Os valores derivados pertencem a outra revisão; atualize a ficha antes de rolar.</InlineStatus> : null}
      {hp.current === 0 ? <InlineStatus tone="error" assertive>PV zerados: resolva o estado de morte antes da próxima ação.</InlineStatus> : null}

      <Panel heading="Atributos" headingLevel={2} hint={rule({ category: "rules", title: "Valores E Modificadores De Habilidade" })}>
        <div className={styles.abilityGrid}>{ABILITIES.map((ability) => { const item = abilityMap.get(ability); return (
          <div {...rule({ category: "attributes", title: ABILITY_LABELS[ability].name, entityId: ability })} className={styles.ability} key={ability}>
            <span className={styles.abilityShort}>{ABILITY_LABELS[ability].short}</span>
            <VisuallyHidden>{ABILITY_LABELS[ability].name}</VisuallyHidden>
            <strong>{item ? <RollButton label={String(item.score.value)} accessibleLabel={ABILITY_LABELS[ability].name} intent={intentFor("ability", ability, item.modifier.value)} onRoll={onRoll} /> : "—"}</strong>
            <span className={styles.modifier}>{item ? formatModifier(item.modifier.value) : "—"}</span>
            {item ? <Provenance explanation={item.modifier} label={ABILITY_LABELS[ability].name} /> : null}
          </div>
        ); })}</div>
      </Panel>

      <Panel heading="Perícias" headingLevel={2} hint={rule({ category: "rules", title: "Testes De Habilidade" })} action={sortedSkills.length > SKILLS_COMPACT_COUNT ? <PanelLink label={skillsExpanded ? "Ver menos" : "Ver todas"} expanded={skillsExpanded} onClick={() => setSkillsExpanded((value) => !value)} /> : undefined}>
        {sortedSkills.length === 0 ? <p className={styles.muted}>Perícias derivadas ainda não estão disponíveis.</p> : (
          <div className={styles.skillGrid}>{visibleSkills.map((skill) => <SkillRow key={skill.skill} hint={rule({ category: "skills", title: SKILL_LABELS[skill.skill], entityId: skill.skill })} skill={skill.skill} modifier={skill.modifier.value} proficient={skill.proficient} expertise={skill.expertise} onRoll={onRoll} intent={intentFor("skill", skill.skill, skill.modifier.value)} />)}</div>
        )}
      </Panel>

      <section className={styles.splitGrid}>
        <Panel heading="Equipamento" headingLevel={2} action={character.inventory.length > ITEMS_COMPACT_COUNT ? <PanelLink label={inventoryExpanded ? "Ver menos" : "Ver todos"} expanded={inventoryExpanded} onClick={() => setInventoryExpanded((value) => !value)} /> : undefined}>
          {character.inventory.length === 0 ? <p className={styles.muted}>Nenhum item registrado.</p> : (
            <div className={styles.itemList}>{visibleInventory.map((item) => {
              const info = equipmentInfo?.(String(item.equipmentRef.entityId));
              const weight = info && info.weightGrams > 0 ? formatGrams(info.weightGrams * item.quantity) : undefined;
              const meta = [item.quantity > 1 ? `${item.quantity}×` : undefined, info ? EQUIPMENT_CATEGORY_LABELS[info.category] ?? info.category : undefined, weight].filter(Boolean).join(" · ");
              return (
                <button {...rule({ category: "equipment", title: item.customName || name("equipment", item.equipmentRef), entityId: String(item.equipmentRef.entityId) })} type="button" className={[styles.itemRow, item.equippedState === "equipped" ? styles.itemEquipped : ""].join(" ")} key={item.id} onClick={() => document.querySelector(`[data-item-id="${item.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                  <span className={styles.itemIcon} aria-hidden="true">{(info && CATEGORY_ICONS[info.category]) ?? <GiBackpack />}</span>
                  <span className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.customName || name("equipment", item.equipmentRef)}</span>
                    <span className={styles.itemSub}>{meta || EQUIPPED_STATE_LABELS[item.equippedState]}</span>
                  </span>
                  {item.equippedState === "equipped" ? <span className={styles.itemBadge}>Equipado</span> : <CaretRight className={styles.itemChevron} aria-hidden="true" />}
                </button>
              );
            })}</div>
          )}
        </Panel>
        <Panel heading="Magias" headingLevel={2} className={styles.spellPanel} hint={rule({ category: "rules", title: "Conjurando Uma Magia" })} action={spellOptions && source && canEdit ? <PanelLink label="Gerenciar" onClick={() => setManagingSpells(true)} /> : undefined}>
          {!source ? <p className={styles.muted}>Esta classe não conjura magias neste nível.</p> : spellEntries.length === 0 ? (
            <div className={styles.emptySpells}>
              <p className={styles.muted}>Nenhuma magia selecionada.</p>
              {spellOptions && canEdit ? <Button size="sm" variant="secondary" onClick={() => setManagingSpells(true)}>Escolher magias</Button> : null}
            </div>
          ) : (
            <div className={styles.spellColumns}>
              {([["Truques", cantripEntries, "Truques"], ["Magias", leveledEntries, "Magias Conhecidas E Preparadas"]] as const).map(([label, entries, ruleTitle]) => (
                <section key={label} className={styles.spellColumn} aria-label={label}>
                  <h3 {...rule({ category: "rules", title: ruleTitle })} className={styles.spellColumnTitle}>{label}<span>{entries.length}</span></h3>
                  {entries.length === 0 ? <p className={styles.muted}>{label === "Truques" ? "Nenhum truque." : "Nenhuma magia."}</p> : (
                    <ul className={styles.spellList}>{entries.map((entry) => {
                      const spellName = entry.option?.name ?? name("spell", entry.ref);
                      return (
                        <li {...rule({ category: "spell", title: spellName, entityId: String(entry.ref.entityId) })} className={styles.spellRow} key={`${entry.ref.entityId}-${entry.ability}`}>
                          <span className={[styles.spellIcon, styles[`school_${entry.option?.school ?? "none"}`] ?? ""].join(" ")} aria-hidden="true"><SpellIcon spellId={String(entry.ref.entityId)} fallback={<GiSparkles />} /></span>
                          <span className={styles.spellRowInfo}>
                            <span className={styles.spellRowName}>{spellName}</span>
                            <span className={styles.spellRowMeta}>{entry.option ? `${entry.option.level > 0 ? `${entry.option.level}º · ` : ""}${SPELL_SCHOOL_LABELS[entry.option.school] ?? entry.option.school}` : ABILITY_LABELS[entry.ability].short}</span>
                          </span>
                        </li>
                      );
                    })}</ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel heading="Resistências" headingLevel={2} hint={rule({ category: "rules", title: "Testes De Resistência" })}>
        <div className={styles.actionList}>{derived?.savingThrows.map((save) => <div {...rule({ category: "attributes", title: ABILITY_LABELS[save.ability].name, entityId: save.ability })} className={styles.actionRow} key={save.ability}><span className={[styles.dot, save.proficient ? styles.dotActive : ""].join(" ")} aria-label={save.proficient ? "proficiente" : "não proficiente"} /><span className={styles.actionName}>{ABILITY_LABELS[save.ability].name}</span><RollButton label={formatModifier(save.modifier.value)} accessibleLabel={`resistência de ${ABILITY_LABELS[save.ability].name} (${formatModifier(save.modifier.value)})`} intent={intentFor("saving-throw", save.ability, save.modifier.value)} onRoll={onRoll} /></div>) ?? <p className={styles.muted}>Resistências derivadas ainda não estão disponíveis.</p>}</div>
      </Panel>

      <Panel heading="Condições e morte" headingLevel={2}>
        <div className={styles.conditionLayout}>
          <div>
            <h3>Condições ativas</h3>
            {conditions.length === 0 ? <p className={styles.muted}>Nenhuma condição ativa.</p> : (
              <ul className={styles.conditionChips}>{conditions.map((condition) => (
                <li key={condition.id} className={styles.conditionChip}>
                  <span {...rule({ category: "condition", title: name("condition", condition.definitionRef) })}><Badge tone="warning">{name("condition", condition.definitionRef)}</Badge></span>
                  <span className={styles.conditionOrigin}>{formatConditionOrigin(condition.origin, name)}</span>
                  {canEdit ? <button type="button" className={styles.chipRemove} aria-label={`Remover ${name("condition", condition.definitionRef)}`} onClick={() => updatePatch({ conditions: conditions.filter((entry) => entry.id !== condition.id) })}><X aria-hidden="true" /></button> : null}
                </li>
              ))}</ul>
            )}
            {canEdit && conditionOptions && conditionOptions.length > 0 ? (
              <div className={styles.conditionAdd}>
                <select aria-label="Condição para adicionar" value={conditionToAdd} onChange={(event) => setConditionToAdd(event.target.value)}>
                  <option value="">Adicionar condição…</option>
                  {conditionOptions.filter((option) => !conditions.some((entry) => entry.definitionRef.entityId === option.ref.entityId)).map((option) => <option key={String(option.ref.entityId)} value={String(option.ref.entityId)}>{option.name}</option>)}
                </select>
                <Button size="sm" variant="secondary" disabled={!conditionToAdd} onClick={addCondition}>Adicionar</Button>
              </div>
            ) : null}
          </div>
          <div className={styles.deathSaves}>
            <h3 {...rule({ category: "combat", title: "Teste contra a morte" })}>Salvamentos contra morte</h3>
            <SaveMarks label="Sucessos" tone="success" count={deathSaves.successes} onChange={canEdit ? (next) => updatePatch({ deathSaves: { ...deathSaves, successes: next, stable: next >= 3 ? true : deathSaves.stable && next >= 3 } }) : undefined} />
            <SaveMarks label="Falhas" tone="failure" count={deathSaves.failures} onChange={canEdit ? (next) => updatePatch({ deathSaves: { ...deathSaves, failures: next, stable: false } }) : undefined} />
            <p className={styles.deathStatus}>{deathSaves.failures >= 3 ? "Morto." : deathSaves.stable || deathSaves.successes >= 3 ? "Estável." : hp.current === 0 ? "Morrendo — role um salvamento a cada turno." : "Consciente."}</p>
            {canEdit && (deathSaves.successes > 0 || deathSaves.failures > 0) ? <button type="button" className={styles.moreLink} onClick={() => updatePatch({ deathSaves: { successes: 0, failures: 0, stable: false } })}>Zerar marcas</button> : null}
          </div>
        </div>
      </Panel>

      <Panel heading="Sessão" headingLevel={2} action={character.inspiration ? <Badge tone="xp">Inspiração</Badge> : undefined}>
        <div className={styles.sessionList}><p {...rule({ category: "rules", title: "Bônus de proficiência" })}><span>Proficiência</span><strong>{derived ? formatModifier(derived.proficiencyBonus.value) : "—"}</strong></p><p {...rule({ category: "rules", title: "Teste passivo" })}><span>Percepção passiva</span><strong>{derived?.passivePerception.value ?? "—"}</strong></p><p><span>Experiência</span><strong>{valueOr(draft, "xp", character.xp).toLocaleString("pt-BR")} XP</strong></p></div>
        <label {...rule({ category: "background", title: "Inspiração" })} className={styles.checkRow}><input type="checkbox" checked={valueOr(draft, "inspiration", character.inspiration)} onChange={(event) => updatePatch({ inspiration: event.target.checked })} /> <span>Inspiração disponível</span></label>
      </Panel>

      {character.resources.length === 0 ? null : <Panel heading="Recursos" headingLevel={2}>
        <div className={styles.resourceList}>{character.resources.map((resource) => { const capacity = derived?.resourceCapacities.find((item) => item.definitionRef.entityId === resource.definitionRef.entityId); const total = capacity?.capacity.value; return <div className={styles.resourceRow} key={resource.id}><div><strong>{name("resource", resource.definitionRef)}</strong><Provenance explanation={capacity?.capacity} label={name("resource", resource.definitionRef)} /></div><span>{total === undefined ? "—" : `${Math.max(0, total - resource.spent)} / ${total}`}</span></div>; })}</div>
      </Panel>}

      <EditCharacterModal
        open={editing}
        onClose={() => setSheetView("quick")}
        value={(key, fallback) => valueOr(draft, key, fallback)}
        character={character}
        onPatch={updatePatch}
        portrait={portrait}
        portraitUrl={portraitUrl}
        fallbackSrc={classArtwork.src}
        hasCustomPortrait={Boolean(portraitAssetId)}
        canSave={Boolean(service && hasDraft)}
        onSave={() => void saveDraft()}
      >
        <section className={styles.editSection} aria-labelledby="edit-sources-title">
          <h3 id="edit-sources-title">Fontes e pendências</h3>
          <p className={styles.detailLine}><span>Livro de regras</span><strong>{RULESET_LABELS[character.rulesetRef.id] ?? formatRef(character.rulesetRef.id)}</strong></p>
          {character.pendingResolutions.length === 0 ? <p className={styles.muted}>Nenhuma resolução pendente.</p> : <ul className={styles.pendingList}>{character.pendingResolutions.map((pending, index) => <li key={`${pending.kind}-${index}`}>{pending.kind === "unresolved-rule" ? pending.description : pending.kind === "input-request" ? pending.reason : "Conjuração pendente"}</li>)}</ul>}
        </section>
      </EditCharacterModal>
      <PortraitModal open={viewingPortrait} onClose={() => setViewingPortrait(false)} src={heroImage.src} alt={portraitUrl ? `Retrato de ${displayName}` : heroImage.alt} name={displayName} />
      {spellOptions && source ? (
        <SpellManagerModal
          open={managingSpells}
          onClose={() => setManagingSpells(false)}
          options={spellOptions}
          selected={selectedSpellIds}
          onChange={updateSpells}
          cantripLimit={sourceClassId ? cantripsKnown(sourceClassId, sourceLevel) : undefined}
          leveledLimit={sourceClassId ? preparedSpellCount(sourceClassId, sourceLevel, sourceModifier) : undefined}
          leveledLabel={knownCaster ? "Magias conhecidas" : "Magias preparadas"}
        />
      ) : null}
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
