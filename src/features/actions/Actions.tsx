import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { AppModal, Button, InlineStatus, Input } from "@components/ui";
import { ArrowsClockwise, CaretRight, ClockCounterClockwise } from "@phosphor-icons/react";
import {
  GiBed,
  GiCoffeeCup,
  GiCrossedSwords,
  GiD4,
  GiD10,
  GiDiceEightFacesEight,
  GiDiceSixFacesSix,
  GiDiceTwentyFacesTwenty,
  GiFlame,
  GiSkills,
  GiSkullCrossedBones,
  GiSparkles,
  GiWingfoot,
} from "react-icons/gi";
import type { DicePurpose, DiceRoll } from "@domain/contracts/dice";
import type { Ability, DiceFaces, Skill } from "@domain/contracts/primitives";
import heroArt from "../../assets/art/textures/fundo-dado.webp";
import type { CastPreview } from "@domain/contracts/definitions/spell";
import type { RuleResult } from "@domain/contracts/rules";

import type { ActionAttackRoll, ActionCapability, ActionCapabilityKind, ActionCommitResult, ActionCost, ActionIntent, ActionPreview, ActionPreviewDetails, ActionRollDice, ActionSourceRef, ActionSpellRoll, ActionsProps } from "./types";
import { ABILITY_LABELS, SKILL_ABILITY, SKILL_LABELS } from "@features/character/sheet/mapping";
import styles from "./actions.module.css";

const KIND_LABELS: Record<ActionCapabilityKind, string> = {
  attack: "Ataque",
  damage: "Dano",
  spell: "Magia",
  resource: "Recurso",
  item: "Item utilizável",
  rest: "Descanso",
  concentration: "Concentração",
};

const KIND_SYMBOLS: Record<ActionCapabilityKind, string> = {
  attack: "⚔",
  damage: "✦",
  spell: "✧",
  resource: "◇",
  item: "▣",
  rest: "☾",
  concentration: "◈",
};

function isRuleResult(preview: ActionPreview): preview is RuleResult {
  return "status" in preview;
}

function castPreviewOf(preview: ActionPreview | undefined): CastPreview | undefined {
  if (!preview) return undefined;
  if (!isRuleResult(preview)) return preview;
  return preview.status === "needsInput" && preview.preview?.kind === "cast-spell" ? preview.preview.castPreview : undefined;
}

function sourceLabel(source: ActionSourceRef): string {
  if (typeof source !== "object" || source === null) return "Fonte não registrada";
  if ("chapter" in source) {
    const page = source.printedPage === undefined ? "" : `, p. ${source.printedPage}`;
    return `${source.chapter}${page}${source.section ? ` · ${source.section}` : ""}`;
  }
  return `${source.entityId} · ${source.rulesetId}`;
}

function effectLabel(kind: string): string {
  return ({
    "hp-changed": "Pontos de vida alterados",
    "resource-spent": "Recurso consumido",
    "spell-slot-spent": "Espaço de magia consumido",
    "inventory-changed": "Inventário alterado",
    "condition-applied": "Condição aplicada",
    "condition-removed": "Condição removida",
    "concentration-started": "Concentração iniciada",
    "concentration-ended": "Concentração encerrada",
    "death-save-recorded": "Salvamento contra morte registrado",
  } satisfies Record<string, string>)[kind] ?? kind;
}

function valueLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  if (value === undefined || value === null) return "—";
  return "Resultado registrado";
}

function previewDetails(preview: ActionPreview | undefined): ActionPreviewDetails {
  if (!preview) return { effects: [], explanations: [], pending: ["Prévia da regra ainda não foi fornecida."], blocked: [], sources: [] };
  if (isRuleResult(preview)) {
    if (preview.status === "success") {
      return {
        status: preview.status,
        effects: preview.effects.map((effect) => effectLabel(effect.kind)),
        explanations: preview.explanations.map((explanation) => valueLabel(explanation.value)),
        pending: [], blocked: [], sources: preview.sourceRefs ?? [],
      };
    }
    if (preview.status === "needsInput") {
      const cast = preview.preview?.kind === "cast-spell" ? preview.preview.castPreview : undefined;
      return {
        status: preview.status,
        effects: [],
        explanations: [],
        pending: [...preview.requests.map((request) => request.reason), ...(cast?.interventionsRequired.map((item) => item.reason) ?? [])],
        blocked: [],
        sources: preview.sourceRefs ?? [],
      };
    }
    return { status: preview.status, effects: [], explanations: [], pending: [], blocked: preview.errors.map((error) => error.message), sources: preview.sourceRefs ?? [] };
  }
  return {
    effects: [],
    explanations: [],
    pending: preview.interventionsRequired.map((item) => item.reason),
    blocked: [],
    sources: preview.sourceRefs ?? [],
  };
}

function previewCosts(preview: ActionPreview | undefined): readonly ActionCost[] {
  const cast = castPreviewOf(preview);
  if (!cast) return [];
  const costs: ActionCost[] = [{ label: "Tempo", value: `${cast.actionCost.kind}${cast.actionCost.amount === undefined ? "" : ` · ${cast.actionCost.amount} ${cast.actionCost.unit ?? "unidade(s)"}`}` }];
  if (cast.slotCost) costs.push({ label: "Espaço", value: `${cast.slotCost.slotLevel}º nível` });
  for (const cost of cast.resourceCosts) costs.push({ label: `Recurso ${cost.resourceRef.entityId}`, value: cost.amount });
  if (cast.componentsConsumed.length) costs.push({ label: "Componente consumido", value: cast.componentsConsumed.join(", ") });
  if (cast.concentrationReplaced) costs.push({ label: "Concentração", value: "substituição explícita" });
  return costs;
}

function lookupPreview(capability: ActionCapability, previews: ActionsProps["previews"]): ActionPreview | undefined {
  if (capability.preview) return capability.preview;
  if (!previews) return undefined;
  return previews instanceof Map ? previews.get(capability.id) : (previews as Readonly<Record<string, ActionPreview>>)[capability.id];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível carregar as capacidades.";
}

function statusLabel(status: ActionCapabilityStatusForRender): string {
  if (status === "blocked") return "Bloqueada";
  if (status === "pending") return "Pendente";
  if (status === "unsupported") return "Não suportada";
  return "Disponível";
}

type ActionCapabilityStatusForRender = "available" | "blocked" | "pending" | "unsupported";

function capabilityState(capability: ActionCapability, preview: ActionPreview | undefined, availableActions: readonly string[]): { readonly status: ActionCapabilityStatusForRender; readonly reasons: readonly string[]; readonly details: ActionPreviewDetails } {
  const details = previewDetails(preview);
  const reasons = [...(capability.blockedReason ? [capability.blockedReason] : []), ...(capability.pendingReasons ?? [])];
  if (capability.status === "unsupported") return { status: "unsupported", reasons: reasons.length ? reasons : ["Esta capacidade ainda não possui execução suportada."], details };
  if (capability.status === "blocked") return { status: "blocked", reasons: reasons.length ? reasons : ["A capacidade está bloqueada pelo estado recebido."], details };
  if (capability.status === "pending") return { status: "pending", reasons: reasons.length ? reasons : ["A capacidade aguarda uma decisão do resolvedor."], details };
  if (capability.actionCost && !availableActions.includes(capability.actionCost)) reasons.push(`Ação indisponível: ${capability.actionCost}.`);
  for (const cost of capability.costs ?? []) {
    if (cost.available === false || cost.remaining !== undefined && cost.remaining <= 0) reasons.push(`${cost.label} esgotado.`);
  }
  if (details.blocked.length) reasons.push(...details.blocked);
  if (details.pending.length) return { status: "pending", reasons: reasons.length ? reasons : details.pending, details };
  if (reasons.length) return { status: "blocked", reasons, details };
  return { status: "available", reasons: [], details };
}

function CostList({ costs }: { readonly costs?: readonly ActionCost[] }) {
  if (!costs?.length) return <p className={styles.muted}>Custo não informado pelo resolvedor.</p>;
  return <ul className={styles.costList}>{costs.map((cost, index) => <li key={`${cost.label}-${index}`}><span>{cost.label}</span><strong>{cost.value ?? (cost.remaining === undefined ? "—" : `${cost.remaining} restantes`)}</strong></li>)}</ul>;
}

function CapabilityCard({ capability, preview, state, selected, onSelect }: { readonly capability: ActionCapability; readonly preview?: ActionPreview; readonly state: ReturnType<typeof capabilityState>; readonly selected: boolean; readonly onSelect: () => void }) {
  const costs = capability.costs ?? previewCosts(preview);
  return <article className={[styles.capability, capability.kind === "concentration" ? styles.concentrationCard : "", selected ? styles.selected : "", state.status !== "available" ? styles[state.status] : ""].filter(Boolean).join(" ")}>
    <button className={styles.capabilityButton} type="button" aria-label={`Revisar capacidade: ${capability.label}`} aria-pressed={selected} onClick={onSelect}>
      <span className={styles.capabilityIcon} aria-hidden="true">{KIND_SYMBOLS[capability.kind]}</span>
      <span className={styles.capabilityCopy}>
        {capability.label.trim().toLocaleLowerCase() === KIND_LABELS[capability.kind].toLocaleLowerCase() ? null : <span className={styles.capabilityKind}>{KIND_LABELS[capability.kind]}</span>}
        <strong className={styles.capabilityTitle}>{capability.label}</strong>
        <span className={styles.capabilityDescription}>{capability.description ?? capability.effectSummary?.[0] ?? "Confira custos e efeitos antes de executar."}</span>
        <span className={styles.capabilityMeta}>{statusLabel(state.status)} · {costs.length ? `${costs.length} custo${costs.length === 1 ? "" : "s"}` : "custo pendente"}</span>
        <span className={styles.screenReaderOnly}>{selected ? "Em revisão" : "Revisar capacidade"}</span>
      </span>
      <span className={styles.capabilityChevron} aria-hidden="true">›</span>
    </button>
  </article>;
}

/** Quantidade digitada para dano/cura manual: entrada vazia ou inválida cai no `fallback` (o `inputDefault` da capacidade), nunca bloqueia a confirmação. */
function parseAmountInput(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === "") return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

/** CA do alvo digitada: sem valor explícito e válido (inteiro >= 0), devolve `undefined` — nunca inventa 0/10. */
function parseArmorClassInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isValidArmorClassInput(raw: string): boolean {
  return parseArmorClassInput(raw) !== undefined;
}

function ReviewPanel({ capability, preview, state, onConfirm, onCancel, submitting, alreadySubmitted, hasHandler, inputValue, onInputChange }: { readonly capability: ActionCapability; readonly preview?: ActionPreview; readonly state: ReturnType<typeof capabilityState>; readonly onConfirm: () => void; readonly onCancel: () => void; readonly submitting: boolean; readonly alreadySubmitted: boolean; readonly hasHandler: boolean; readonly inputValue: string; readonly onInputChange: (value: string) => void }) {
  const { details } = state;
  const missingRequiredInput = capability.inputKind === "target-armor-class" && !isValidArmorClassInput(inputValue);
  const disabledReason = !hasHandler ? "Nenhum dispatcher foi conectado." : state.status === "blocked" || state.status === "unsupported" ? state.reasons.join(" ") : state.status === "pending" ? state.reasons.join(" ") : alreadySubmitted ? "Este commandId já foi enviado; aguarde a reconciliação." : missingRequiredInput ? "Informe a CA do alvo para habilitar a confirmação." : undefined;
  const disabled = Boolean(disabledReason) || submitting;
  return <section className={styles.review} aria-labelledby="action-review-title">
    <div className={styles.reviewHeading}><div><p className={styles.eyebrow}>REVISÃO ANTES DO COMMIT</p><h2 id="action-review-title">{capability.label}</h2></div><Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button></div>
    {capability.description ? <p className={styles.description}>{capability.description}</p> : null}
    {capability.inputKind === "amount" ? <div className={styles.inputSection}><Input label="Quantidade" type="number" min={1} inputMode="numeric" value={inputValue} onChange={(event) => onInputChange(event.target.value)} hint={`Sem preenchimento, usa o valor padrão (${capability.inputDefault ?? 5}).`} /></div> : null}
    {capability.inputKind === "target-armor-class" ? <div className={styles.inputSection}><Input label="CA do alvo" type="number" min={0} inputMode="numeric" value={inputValue} onChange={(event) => onInputChange(event.target.value)} hint="Obrigatório: o motor não deriva a CA de um alvo desconhecido." /></div> : null}
    <div className={styles.reviewGrid}>
      <div><h3>Custo</h3><CostList costs={capability.costs ?? previewCosts(preview)} /></div>
      <div><h3>Efeito previsto</h3>{capability.effectSummary?.length ? <ul className={styles.detailList}>{capability.effectSummary.map((effect, index) => <li key={`${effect}-${index}`}>{effect}</li>)}</ul> : details.effects.length ? <ul className={styles.detailList}>{details.effects.map((effect, index) => <li key={`${effect}-${index}`}>{effect}</li>)}</ul> : <p className={styles.muted}>Nenhum efeito estruturado foi recebido.</p>}</div>
    </div>
    {details.explanations.length ? <div className={styles.explanations}><h3>Explicação</h3><ul className={styles.detailList}>{details.explanations.map((explanation, index) => <li key={`${explanation}-${index}`}>{explanation}</li>)}</ul></div> : null}
    {details.pending.length ? <InlineStatus tone="warning" assertive>{details.pending.join(" ")}</InlineStatus> : null}
    {state.reasons.length && state.status !== "available" ? <InlineStatus tone={state.status === "pending" ? "warning" : "error"} assertive>{state.reasons.join(" ")}</InlineStatus> : null}
    <div className={styles.provenance}><h3>Fonte</h3>{(capability.sourceRefs?.length || details.sources.length) ? <ul className={styles.detailList}>{[...(capability.sourceRefs ?? []), ...details.sources].filter((source): source is ActionSourceRef => Boolean(source)).map((source, index) => <li key={`${sourceLabel(source)}-${index}`}>{sourceLabel(source)}</li>)}</ul> : <p className={styles.muted}>Fonte não registrada.</p>}</div>
    <div className={styles.confirmRow}><Button size="lg" disabled={disabled} disabledReason={disabledReason} busy={submitting} onClick={onConfirm}>Confirmar execução</Button><span className={styles.commandHint}>Comando {String(capability.commandId)}</span></div>
  </section>;
}

function resultMessage(result: RuleResult): { readonly tone: "success" | "warning" | "error"; readonly message: string } {
  if (result.status === "success") return { tone: "success", message: "Execução aceita pelo dispatcher." };
  if (result.status === "needsInput") return { tone: "warning", message: result.requests.map((request) => request.reason).join(" ") || "A execução precisa de uma decisão adicional." };
  return { tone: "error", message: result.errors.map((error) => error.message).join(" ") || "O dispatcher rejeitou a execução." };
}

/** Uma prévia malformada não pode derrubar a página inteira: a revisão mostra um aviso no lugar. */
class ReviewBoundary extends Component<{ readonly children: ReactNode; readonly resetKey?: string }, { readonly failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  override componentDidCatch(error: unknown, info: ErrorInfo): void { console.error("Falha ao montar a revisão da ação", error, info.componentStack); }
  override componentDidUpdate(previous: { readonly resetKey?: string }): void {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  override render(): ReactNode {
    return this.state.failed ? <InlineStatus tone="error">Não foi possível montar a revisão desta ação. Escolha outra opção ou recarregue a página.</InlineStatus> : this.props.children;
  }
}

function LoadingState() {
  return <section className={styles.state} role="status" aria-live="polite"><span className={styles.stateMark} aria-hidden="true">◌</span><h1>Carregando capacidades</h1><p>Consultando ações disponíveis para a sessão.</p></section>;
}

// ------------------------------------------------------------------ dados

const QUICK_DICE: readonly { readonly faces: DiceFaces; readonly icon: ReactNode }[] = [
  { faces: 4, icon: <GiD4 /> },
  { faces: 6, icon: <GiDiceSixFacesSix /> },
  { faces: 8, icon: <GiDiceEightFacesEight /> },
  { faces: 20, icon: <GiDiceTwentyFacesTwenty /> },
  { faces: 100, icon: <GiD10 /> },
];

const DIE_ICONS: Partial<Record<number, ReactNode>> = Object.fromEntries(QUICK_DICE.map((die) => [die.faces, die.icon]));

const PURPOSE_LABELS: Readonly<Record<DicePurpose, string>> = {
  free: "Rolagem livre",
  attack: "Ataque",
  damage: "Dano",
  healing: "Cura",
  "saving-throw": "Teste de resistência",
  "skill-check": "Teste",
  initiative: "Iniciativa",
  "death-save": "Salvamento contra morte",
  "ability-score-generation": "Geração de atributos",
};

/** 20/1 natural num único d20 que contou no resultado. */
function criticalOf(roll: DiceRoll | undefined): "success" | "failure" | undefined {
  if (!roll || roll.expression.faces !== 20) return undefined;
  const kept = roll.selectedIndexes.length ? roll.selectedIndexes.map((index) => roll.rawDice[index]) : roll.rawDice;
  if (kept.length !== 1) return undefined;
  if (kept[0] === 20) return "success";
  if (kept[0] === 1) return "failure";
  return undefined;
}

function rollTitle(roll: DiceRoll): string {
  return roll.label ?? PURPOSE_LABELS[roll.purpose];
}

function rollFormula(roll: DiceRoll): string {
  const { quantity, faces, modifier } = roll.expression;
  const base = `${quantity > 1 ? quantity : ""}d${faces}`;
  return modifier ? `${base}${modifier > 0 ? "+" : "−"}${Math.abs(modifier)}` : base;
}

function rollTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Hoje, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`;
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

/** Painel com a moldura da ficha: bronze, cantos dourados e título Cinzel. */
function Panel({ id, title, tagline, action, children, className }: { readonly id: string; readonly title: string; readonly tagline?: string; readonly action?: ReactNode; readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className={[styles.panel, className ?? ""].filter(Boolean).join(" ")} aria-labelledby={id}>
      <span className={styles.cornerTl} aria-hidden="true" /><span className={styles.cornerTr} aria-hidden="true" /><span className={styles.cornerBl} aria-hidden="true" /><span className={styles.cornerBr} aria-hidden="true" />
      <div className={styles.panelHeader}>
        <h2 id={id} className={styles.panelTitle}>{title}</h2>
        {tagline || action ? <div className={styles.panelAside}>{tagline ? <span className={styles.panelTagline}>{tagline}</span> : null}{action}</div> : null}
      </div>
      <span className={styles.panelRule} aria-hidden="true" />
      {children}
    </section>
  );
}

function DicePanel({ dice }: { readonly dice?: ActionsProps["dice"] }) {
  const last = dice?.lastResult ?? dice?.history[0];
  const initialFaces = QUICK_DICE.some((die) => die.faces === last?.expression.faces) ? last!.expression.faces : 20;
  const [faces, setFaces] = useState<DiceFaces>(initialFaces);
  const critical = criticalOf(last);
  const canRoll = Boolean(dice?.roll);
  const roll = (next: DiceFaces) => {
    setFaces(next);
    dice?.roll?.({ faces: next, purpose: "free" });
  };
  return (
    <Panel id="actions-dice-title" title="Dados" tagline="Que a sorte te acompanhe." action={dice?.openTable ? <button type="button" className={styles.iconButton} aria-label="Abrir mesa de dados e histórico" onClick={dice.openTable}><ClockCounterClockwise aria-hidden="true" /></button> : undefined}>
      <div className={styles.diceLayout}>
        <div className={styles.lastResult} aria-live="polite">
          <span className={styles.lastLabel}>Último resultado</span>
          <strong className={styles.lastValue}>{dice?.rolling ? "…" : last ? last.total : "—"}</strong>
          <span className={[styles.lastOutcome, critical === "success" ? styles.outcomeSuccess : critical === "failure" ? styles.outcomeFailure : ""].join(" ")}>
            {dice?.rolling ? "Rolando…" : critical === "success" ? "Sucesso Crítico!" : critical === "failure" ? "Falha Crítica!" : last ? `${rollFormula(last)} · ${rollTitle(last)}` : "Nenhuma rolagem ainda"}
          </span>
        </div>
        <div className={styles.diceControls}>
          <div className={styles.dicePicker} role="group" aria-label="Rolar um dado">
            {QUICK_DICE.map((die) => (
              <button key={die.faces} type="button" className={[styles.dieButton, faces === die.faces ? styles.dieButtonActive : ""].join(" ")} aria-pressed={faces === die.faces} aria-label={`Rolar d${die.faces}`} disabled={!canRoll || dice?.rolling} onClick={() => roll(die.faces)}>
                <span className={styles.dieIcon} aria-hidden="true">{die.icon}</span>
                <span>d{die.faces}</span>
              </button>
            ))}
          </div>
          <button type="button" className={styles.rerollButton} disabled={!canRoll || dice?.rolling} onClick={() => roll(faces)}>
            <ArrowsClockwise aria-hidden="true" />{last ? "Rolar novamente" : `Rolar d${faces}`}
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------- ações rápidas

type QuickActionId = "attack" | "spells" | "skills" | "initiative" | "short-rest" | "long-rest";

const QUICK_ACTIONS: readonly { readonly id: QuickActionId; readonly title: string; readonly subtitle: string; readonly icon: ReactNode }[] = [
  { id: "attack", title: "Ataque", subtitle: "Role o ataque e dano", icon: <GiCrossedSwords /> },
  { id: "spells", title: "Magias", subtitle: "Conjure suas magias", icon: <GiFlame /> },
  { id: "skills", title: "Teste de perícia", subtitle: "Role um teste de atributo", icon: <GiSkills /> },
  { id: "initiative", title: "Iniciativa", subtitle: "Role a iniciativa do combate", icon: <GiWingfoot /> },
  { id: "short-rest", title: "Descanso curto", subtitle: "Recupere recursos", icon: <GiCoffeeCup /> },
  { id: "long-rest", title: "Descanso longo", subtitle: "Restaure seus pontos de vida", icon: <GiBed /> },
];

const ABILITY_ORDER: readonly Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

type TestTab = "skills" | "abilities" | "saves";

/** Perícias, atributos e resistências da ficha: tocar rola 1d20 + modificador na tela. */
function SkillTestModal({ open, onClose, derived, onRoll }: { readonly open: boolean; readonly onClose: () => void; readonly derived?: ActionsProps["derived"]; readonly onRoll?: (faces: DiceFaces, modifier: number, purpose: DicePurpose, label: string) => void }) {
  const [tab, setTab] = useState<TestTab>("skills");
  const rows: readonly { readonly key: string; readonly name: string; readonly meta: string; readonly modifier: number; readonly proficient: boolean; readonly purpose: DicePurpose; readonly label: string }[] = !derived ? [] : tab === "skills"
    ? [...derived.skills].sort((a, b) => SKILL_LABELS[a.skill].localeCompare(SKILL_LABELS[b.skill], "pt-BR")).map((skill) => ({ key: skill.skill, name: SKILL_LABELS[skill.skill], meta: ABILITY_LABELS[SKILL_ABILITY[skill.skill as Skill]].short, modifier: skill.modifier.value, proficient: skill.proficient, purpose: "skill-check" as const, label: `Teste de perícia (${SKILL_LABELS[skill.skill]})` }))
    : tab === "abilities"
      ? ABILITY_ORDER.flatMap((ability) => { const entry = derived.abilityScores.find((item) => item.ability === ability); return entry ? [{ key: ability, name: ABILITY_LABELS[ability].name, meta: `Valor ${entry.score.value}`, modifier: entry.modifier.value, proficient: false, purpose: "skill-check" as const, label: `Teste de ${ABILITY_LABELS[ability].name}` }] : []; })
      : ABILITY_ORDER.flatMap((ability) => { const entry = derived.savingThrows.find((item) => item.ability === ability); return entry ? [{ key: ability, name: ABILITY_LABELS[ability].name, meta: entry.proficient ? "Proficiente" : ABILITY_LABELS[ability].short, modifier: entry.modifier.value, proficient: entry.proficient, purpose: "saving-throw" as const, label: `Resistência de ${ABILITY_LABELS[ability].name}` }] : []; });
  return (
    <AppModal open={open} title="Teste de perícia" onClose={onClose} className={styles.actionModal}>
      <div className={styles.tabs} role="tablist" aria-label="Tipo de teste">
        {([["skills", "Perícias"], ["abilities", "Atributos"], ["saves", "Resistências"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={[styles.tab, tab === id ? styles.tabActive : ""].join(" ")} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {!derived ? <p className={styles.muted}>Os valores derivados da ficha ainda não estão disponíveis.</p> : (
        <div className={styles.testGrid}>
          {rows.map((row) => (
            <button key={row.key} type="button" className={styles.testRow} disabled={!onRoll} aria-label={`Rolar ${row.label} (${formatModifier(row.modifier)})`} onClick={() => { onRoll?.(20, row.modifier, row.purpose, row.label); onClose(); }}>
              <span className={[styles.testDot, row.proficient ? styles.testDotActive : ""].join(" ")} aria-hidden="true" />
              <span className={styles.testCopy}><strong>{row.name}</strong><small>{row.meta}</small></span>
              <span className={styles.testModifier}>{formatModifier(row.modifier)}</span>
            </button>
          ))}
        </div>
      )}
    </AppModal>
  );
}

// ------------------------------------------------------------- atividade

function ActivityPanel({ dice }: { readonly dice?: ActionsProps["dice"] }) {
  const [expanded, setExpanded] = useState(false);
  const history = dice?.history ?? [];
  const visible = history.slice(0, expanded ? 12 : 3);
  return (
    <Panel id="activity-title" title="Atividade recente" action={history.length > 3 ? <button type="button" className={styles.panelLink} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Ver menos" : "Ver todas"}<CaretRight aria-hidden="true" /></button> : undefined}>
      {visible.length === 0 ? <p className={styles.emptyActivity}>Suas rolagens aparecem aqui depois do primeiro lance.</p> : (
        <ol className={styles.activityList}>
          {visible.map((roll) => {
            const critical = criticalOf(roll);
            return (
              <li key={roll.id}>
                <button type="button" className={styles.activityRow} disabled={!dice?.openTable} onClick={dice?.openTable} aria-label={`${rollFormula(roll)} · ${rollTitle(roll)}: ${roll.total}${critical === "success" ? ", sucesso crítico" : critical === "failure" ? ", falha crítica" : ""}. Abrir histórico.`}>
                  <span className={[styles.activityDie, critical === "success" ? styles.activityDieCrit : critical === "failure" ? styles.activityDieFumble : ""].join(" ")} aria-hidden="true">{DIE_ICONS[roll.expression.faces] ?? <GiDiceTwentyFacesTwenty />}</span>
                  <span className={styles.activityCopy}>
                    <span className={styles.activityTitle}><strong>{rollFormula(roll)}</strong> · {rollTitle(roll)}</span>
                    <span className={styles.activityTime}>{rollTime(roll.timestamp)}</span>
                  </span>
                  <span className={styles.activityResult}>
                    <strong>{roll.total}</strong>
                    {critical ? <small className={critical === "success" ? styles.outcomeSuccess : styles.outcomeFailure}>{critical === "success" ? "Sucesso Crítico!" : "Falha Crítica!"}</small> : null}
                  </span>
                  <CaretRight className={styles.activityChevron} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------ rolagens

function diceText(dice: ActionRollDice): string {
  return `${dice.quantity}d${dice.faces}${dice.modifier ? `${dice.modifier > 0 ? "+" : "−"}${Math.abs(dice.modifier)}` : ""}`;
}

type RollFn = (faces: DiceFaces, modifier: number, purpose: DicePurpose, label: string, quantity?: number) => void;

/** Botões que rolam direto na tela: ataque (1d20 + bônus) e dano/cura com os dados da ficha. */
function RollChip({ label, detail, tone, onClick, disabled }: { readonly label: string; readonly detail: string; readonly tone?: "attack" | "damage" | "healing" | "save"; readonly onClick?: () => void; readonly disabled?: boolean }) {
  const className = [styles.rollChip, tone === "damage" ? styles.rollChipDamage : tone === "healing" ? styles.rollChipHealing : tone === "save" ? styles.rollChipSave : ""].join(" ");
  if (!onClick) return <span className={className}><small>{label}</small><strong>{detail}</strong></span>;
  return <button type="button" className={className} disabled={disabled} onClick={onClick} aria-label={`Rolar ${label} ${detail}`}><small>{label}</small><strong>{detail}</strong></button>;
}

function AttackRolls({ attacks, unequipped, roll }: { readonly attacks: readonly ActionAttackRoll[]; readonly unequipped: readonly string[]; readonly roll?: RollFn }) {
  const weapons = attacks.filter((attack) => attack.id !== "unarmed");
  return (
    <section className={styles.rollSection} aria-label="Rolar ataque">
      {weapons.length === 0 ? <p className={styles.rollHint}>Nenhuma arma equipada{unequipped.length ? `: ${unequipped.join(", ")} está no inventário — equipe na ficha para rolar o ataque com ela` : ""}.</p> : null}
      {attacks.map((attack) => (
        <div key={attack.id} className={styles.rollRow}>
          <span className={styles.rollName}><strong>{attack.name}</strong>{attack.damage?.typeLabel ? <small>Dano {attack.damage.typeLabel}</small> : attack.fixedDamage ? <small>{attack.fixedDamage}</small> : null}</span>
          <span className={styles.rollChips}>
            <RollChip label="Ataque" detail={formatModifier(attack.attackBonus)} tone="attack" onClick={roll ? () => roll(20, attack.attackBonus, "attack", `Ataque (${attack.name})`) : undefined} />
            {attack.damage ? <RollChip label="Dano" detail={diceText(attack.damage)} tone="damage" onClick={roll ? () => roll(attack.damage!.faces, attack.damage!.modifier, "damage", `Dano (${attack.name})`, attack.damage!.quantity) : undefined} /> : null}
          </span>
        </div>
      ))}
    </section>
  );
}

function SpellRolls({ spells, roll }: { readonly spells: readonly ActionSpellRoll[]; readonly roll?: RollFn }) {
  if (spells.length === 0) return <p className={styles.rollHint}>Escolha magias na ficha (Magias → Gerenciar) para rolá-las aqui.</p>;
  return (
    <section className={styles.rollSection} aria-label="Rolar magia">
      {spells.map((spell) => (
        <div key={spell.id} className={styles.rollRow}>
          <span className={styles.rollName}><strong>{spell.name}</strong><small>{spell.level === 0 ? "Truque" : `${spell.level}º círculo`}{spell.effect?.typeLabel ? ` · ${spell.effect.kind === "healing" ? "cura" : `dano ${spell.effect.typeLabel}`}` : ""}</small></span>
          <span className={styles.rollChips}>
            {spell.attackBonus !== undefined ? <RollChip label="Ataque" detail={formatModifier(spell.attackBonus)} tone="attack" onClick={roll ? () => roll(20, spell.attackBonus!, "attack", `Ataque mágico (${spell.name})`) : undefined} /> : null}
            {spell.saveDc !== undefined ? <RollChip label={`CD ${spell.saveAbility ?? ""}`.trim()} detail={String(spell.saveDc)} tone="save" /> : null}
            {spell.effect ? <RollChip label={spell.effect.kind === "healing" ? "Cura" : "Dano"} detail={diceText(spell.effect)} tone={spell.effect.kind} onClick={roll ? () => roll(spell.effect!.faces, spell.effect!.modifier, spell.effect!.kind === "healing" ? "healing" : "damage", `${spell.effect!.kind === "healing" ? "Cura" : "Dano"} (${spell.name})`, spell.effect!.quantity) : undefined} /> : null}
            {spell.attackBonus === undefined && spell.saveDc === undefined && !spell.effect ? <span className={styles.rollNone}>Sem rolagem</span> : null}
          </span>
        </div>
      ))}
    </section>
  );
}

// ------------------------------------------------------------- página

type CapabilityGroup = "attack" | "spells" | "rest";

const GROUP_TITLES: Readonly<Record<CapabilityGroup, string>> = { attack: "Ataque", spells: "Magias e recursos", rest: "Descanso" };

function groupOf(capability: ActionCapability): CapabilityGroup {
  if (capability.kind === "attack" || capability.kind === "damage" || capability.kind === "item") return "attack";
  if (capability.kind === "rest") return "rest";
  return "spells";
}

export function Actions({ character, derived, dice, capabilities = [], previews, availableActions = [], status = "idle", error, title = "Ações", onIntent, onCancel, onOpenConditions, attackRolls = [], unequippedWeapons = [], spellRolls = [] }: ActionsProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [openGroup, setOpenGroup] = useState<CapabilityGroup>();
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly tone: "success" | "warning" | "error" | "info"; readonly message: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const submittedCommands = useRef(new Set<string>());

  const selected = capabilities.find((capability) => capability.id === selectedId);
  const hydrate = dice?.hydrate;

  useEffect(() => {
    setSelectedId(undefined);
    setOpenGroup(undefined);
    setFeedback(undefined);
    setSubmitting(false);
    setInputValue("");
    submittedCommands.current.clear();
  }, [character?.id]);

  // Uma vez por personagem: o histórico salvo alimenta "Último resultado" e a atividade recente.
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;
  useEffect(() => { hydrateRef.current?.(); }, [character?.id]);

  // Reseta o input ao trocar de capacidade selecionada: dano/cura ganha o default (nunca vazio,
  // para nunca bloquear a confirmação); CA de alvo sempre começa vazia (nunca inventa um valor).
  useEffect(() => {
    setInputValue(selected?.inputKind === "amount" ? String(selected.inputDefault ?? 5) : "");
  }, [selectedId, selected?.inputKind, selected?.inputDefault]);

  if (status === "loading") return <LoadingState />;
  if (status === "error" || error) return <section className={styles.state} role="alert" aria-labelledby="actions-error-title"><span className={styles.stateMark} aria-hidden="true">!</span><h1 id="actions-error-title">As capacidades não puderam ser carregadas</h1><p>{formatError(error)}</p></section>;
  if (!character) return <section className={styles.state} aria-labelledby="actions-empty-title"><span className={styles.stateMark} aria-hidden="true">✦</span><h1 id="actions-empty-title">Nenhum personagem selecionado</h1><p>Selecione uma ficha para revisar ataques, magia, recursos, itens, descanso e concentração.</p></section>;

  const selectedPreview = selected ? lookupPreview(selected, previews) : undefined;
  const selectedState = selected ? capabilityState(selected, selectedPreview, availableActions) : undefined;
  const groupCapabilities = openGroup ? capabilities.filter((capability) => groupOf(capability) === openGroup) : [];

  const quickRoll = (faces: DiceFaces, modifier: number, purpose: DicePurpose, label: string, quantity?: number) => dice?.roll?.({ faces, modifier, purpose, label, ...(quantity && quantity > 1 ? { quantity } : {}) });

  const confirm = async () => {
    if (!selected || !selectedState || selectedState.status !== "available" || !onIntent || submittedCommands.current.has(String(selected.commandId))) return;
    if (selected.inputKind === "target-armor-class" && !isValidArmorClassInput(inputValue)) return;
    submittedCommands.current.add(String(selected.commandId));
    setSubmitting(true);
    setFeedback(undefined);
    const intent: ActionIntent = {
      commandId: selected.commandId,
      characterId: character.id,
      capabilityId: selected.id,
      kind: selected.kind,
      ...(selected.inputKind === "amount" ? { value: parseAmountInput(inputValue, selected.inputDefault ?? 5) } : {}),
      ...(selected.inputKind === "target-armor-class" ? { targetArmorClass: parseArmorClassInput(inputValue) } : {}),
    };
    try {
      const result: ActionCommitResult = onIntent(intent);
      const resolved = await result;
      if (resolved && "status" in resolved) setFeedback(resultMessage(resolved));
      else setFeedback({ tone: "success", message: "Intent enviado ao dispatcher." });
    } catch (cause) {
      setFeedback({ tone: "error", message: cause instanceof Error ? cause.message : "O commit falhou; nenhum estado local foi aplicado." });
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    if (!selected) return;
    onCancel?.({ capabilityId: selected.id, kind: selected.kind });
    setSelectedId(undefined);
    setFeedback(undefined);
  };

  const openQuickAction = (id: QuickActionId) => {
    setFeedback(undefined);
    if (id === "skills") { setSkillsOpen(true); return; }
    if (id === "initiative") {
      if (derived) quickRoll(20, derived.initiative.value, "initiative", "Iniciativa");
      else setFeedback({ tone: "warning", message: "A iniciativa ainda não foi calculada para esta ficha." });
      return;
    }
    if (id === "short-rest" || id === "long-rest") {
      setOpenGroup("rest");
      setSelectedId(capabilities.find((capability) => capability.id === `rest:${id === "short-rest" ? "short" : "long"}`)?.id);
      return;
    }
    setOpenGroup(id === "attack" ? "attack" : "spells");
    setSelectedId(undefined);
  };

  const closeGroup = () => {
    setOpenGroup(undefined);
    setSelectedId(undefined);
  };

  return <section className={styles.actions} aria-labelledby="actions-title">
    <header className={styles.hero}>
      <img className={styles.heroArt} src={heroArt} alt="" aria-hidden="true" />
      <span className={styles.heroFade} aria-hidden="true" />
      <span className={styles.cornerTl} aria-hidden="true" /><span className={styles.cornerTr} aria-hidden="true" /><span className={styles.cornerBl} aria-hidden="true" /><span className={styles.cornerBr} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <h1 id="actions-title">{title}</h1>
        <p className={styles.subtitle}>Grandes histórias nascem de pequenas decisões.</p>
        <span className={styles.heroDivider} aria-hidden="true"><span /><GiSparkles /><span /></span>
        <p className={styles.heroMotto}>Role. Aja. Narre.<br />Siga em frente.</p>
      </div>
    </header>
    {feedback && !openGroup ? <InlineStatus tone={feedback.tone} assertive>{feedback.message}</InlineStatus> : null}

    <DicePanel dice={dice} />

    <Panel id="quick-actions-title" title="Ações rápidas" tagline="Escolha sua próxima ação.">
      <div className={styles.quickGrid}>
        {QUICK_ACTIONS.map((action) => (
          <button key={action.id} type="button" className={styles.quickCard} onClick={() => openQuickAction(action.id)}>
            <span className={styles.quickIcon} aria-hidden="true">{action.icon}</span>
            <span className={styles.quickCopy}><strong>{action.title}</strong><span>{action.subtitle}</span></span>
            <CaretRight className={styles.quickChevron} aria-hidden="true" />
          </button>
        ))}
        <button type="button" className={[styles.quickCard, styles.quickWide].join(" ")} disabled={!onOpenConditions} onClick={onOpenConditions}>
          <span className={styles.quickIcon} aria-hidden="true"><GiSkullCrossedBones /></span>
          <span className={styles.quickCopy}><strong>Condições</strong><span>Gerencie condições e efeitos{character.conditions.length ? ` · ${character.conditions.length} ativa${character.conditions.length === 1 ? "" : "s"}` : ""}</span></span>
          <CaretRight className={styles.quickChevron} aria-hidden="true" />
        </button>
      </div>
    </Panel>

    <ActivityPanel dice={dice} />

    <SkillTestModal open={skillsOpen} onClose={() => setSkillsOpen(false)} derived={derived} onRoll={dice?.roll ? quickRoll : undefined} />

    <AppModal open={Boolean(openGroup)} title={openGroup ? GROUP_TITLES[openGroup] : "Ações"} onClose={closeGroup} className={styles.actionModal}>
      {feedback ? <InlineStatus tone={feedback.tone} assertive>{feedback.message}</InlineStatus> : null}
      {openGroup === "attack" ? <AttackRolls attacks={attackRolls} unequipped={unequippedWeapons} roll={dice?.roll ? quickRoll : undefined} /> : null}
      {openGroup === "spells" ? <SpellRolls spells={spellRolls} roll={dice?.roll ? quickRoll : undefined} /> : null}
      {openGroup !== "rest" && groupCapabilities.length ? <h3 className={styles.modalSubheading}>Aplicar na ficha</h3> : null}
      {groupCapabilities.length === 0 ? (openGroup === "rest" ? <p className={styles.muted}>Nenhum descanso disponível.</p> : null) : (
        <div className={styles.capabilityList}>{groupCapabilities.map((capability) => { const preview = lookupPreview(capability, previews); const state = capabilityState(capability, preview, availableActions); return <CapabilityCard key={capability.id} capability={capability} preview={preview} state={state} selected={selectedId === capability.id} onSelect={() => { setSelectedId(capability.id); setFeedback(undefined); }} />; })}</div>
      )}
      {selected && selectedState ? <ReviewBoundary resetKey={selected.id}><ReviewPanel capability={selected} preview={selectedPreview} state={selectedState} onConfirm={() => void confirm()} onCancel={cancel} submitting={submitting} alreadySubmitted={submittedCommands.current.has(String(selected.commandId))} hasHandler={Boolean(onIntent)} inputValue={inputValue} onInputChange={setInputValue} /></ReviewBoundary> : groupCapabilities.length ? <p className={styles.emptyReview}>Revisão aguardando seleção: escolha uma opção para conferir custo, efeitos e fonte.</p> : null}
    </AppModal>
  </section>;
}

export const ActionPage = Actions;
export type { ActionCapability, ActionCapabilityKind, ActionCommitResult, ActionIntent, ActionPreview, ActionPreviewDetails, ActionSourceRef, ActionsProps } from "./types";
