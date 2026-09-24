import { useEffect, useRef, useState } from "react";

import { Button, InlineStatus, Input } from "@components/ui";
import type { DiceRoll } from "@domain/contracts/dice";
import type { CastPreview } from "@domain/contracts/definitions/spell";
import type { RuleResult } from "@domain/contracts/rules";

import type { ActionCapability, ActionCapabilityKind, ActionCommitResult, ActionCost, ActionIntent, ActionPreview, ActionPreviewDetails, ActionSourceRef, ActionsDieFaces, ActionsProps } from "./types";
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

const DICE_FACES: readonly ActionsDieFaces[] = [4, 6, 8, 20, 100];

function isRuleResult(preview: ActionPreview): preview is RuleResult {
  return "status" in preview;
}

function castPreviewOf(preview: ActionPreview | undefined): CastPreview | undefined {
  if (!preview) return undefined;
  if (!isRuleResult(preview)) return preview;
  return preview.status === "needsInput" && preview.preview?.kind === "cast-spell" ? preview.preview.castPreview : undefined;
}

function sourceLabel(source: ActionSourceRef): string {
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
        pending: [], blocked: [], sources: preview.sourceRefs,
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
        sources: preview.sourceRefs,
      };
    }
    return { status: preview.status, effects: [], explanations: [], pending: [], blocked: preview.errors.map((error) => error.message), sources: preview.sourceRefs };
  }
  return {
    effects: [],
    explanations: [],
    pending: preview.interventionsRequired.map((item) => item.reason),
    blocked: [],
    sources: preview.sourceRefs,
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
    <div className={styles.provenance}><h3>Fonte</h3>{(capability.sourceRefs?.length || details.sources.length) ? <ul className={styles.detailList}>{[...(capability.sourceRefs ?? []), ...details.sources].map((source, index) => <li key={`${sourceLabel(source)}-${index}`}>{sourceLabel(source)}</li>)}</ul> : <p className={styles.muted}>Fonte não registrada.</p>}</div>
    <div className={styles.confirmRow}><Button size="lg" disabled={disabled} disabledReason={disabledReason} busy={submitting} onClick={onConfirm}>Confirmar execução</Button><span className={styles.commandHint}>Comando {String(capability.commandId)}</span></div>
  </section>;
}

function resultMessage(result: RuleResult): { readonly tone: "success" | "warning" | "error"; readonly message: string } {
  if (result.status === "success") return { tone: "success", message: "Execução aceita pelo dispatcher." };
  if (result.status === "needsInput") return { tone: "warning", message: result.requests.map((request) => request.reason).join(" ") || "A execução precisa de uma decisão adicional." };
  return { tone: "error", message: result.errors.map((error) => error.message).join(" ") || "O dispatcher rejeitou a execução." };
}

function LoadingState() {
  return <section className={styles.state} role="status" aria-live="polite"><span className={styles.stateMark} aria-hidden="true">◌</span><h1>Carregando capacidades</h1><p>Consultando ações disponíveis para a sessão.</p></section>;
}

function rollOutcome(roll: DiceRoll | undefined): string {
  if (!roll) return "Sua próxima história começa no próximo lance.";
  if (roll.expression.faces === 20 && roll.expression.quantity === 1) {
    if (roll.rawDice[0] === 20) return "Sucesso crítico!";
    if (roll.rawDice[0] === 1) return "Falha crítica.";
  }
  return `${roll.expression.quantity}d${roll.expression.faces} · rolagem registrada`;
}

export function Actions({ character, dice, capabilities = [], previews, availableActions = [], status = "idle", error, title = "Ações", onIntent, onCancel }: ActionsProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [feedback, setFeedback] = useState<{ readonly tone: "success" | "warning" | "error" | "info"; readonly message: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedDie, setSelectedDie] = useState<ActionsDieFaces>(20);
  const submittedCommands = useRef(new Set<string>());

  const selected = capabilities.find((capability) => capability.id === selectedId);

  useEffect(() => {
    setSelectedId(undefined);
    setFeedback(undefined);
    setSubmitting(false);
    setInputValue("");
    submittedCommands.current.clear();
  }, [character?.id]);

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
  const latestRoll = dice?.history[0];
  const recentRolls = dice?.history.slice(0, 3) ?? [];
  const criticalSuccess = latestRoll?.expression.faces === 20 && latestRoll.expression.quantity === 1 && latestRoll.rawDice[0] === 20;
  const criticalFailure = latestRoll?.expression.faces === 20 && latestRoll.expression.quantity === 1 && latestRoll.rawDice[0] === 1;

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

  return <section className={styles.actions} aria-labelledby="actions-title">
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>MESA DE COMANDO · {character.name || "PERSONAGEM"}</p>
        <h1 id="actions-title">{title}</h1>
        <p className={styles.subtitle}>Grandes histórias nascem de pequenas decisões.</p>
        <p className={styles.heroMotto}>ROLE. JÁ. NARE. SIGA EM FRENTE.</p>
      </div>
      <div className={styles.heroDie} aria-hidden="true"><svg viewBox="0 0 180 180"><path d="M90 10 158 50v80l-68 40-68-40V50L90 10Z"/><path d="M90 10v78m68-38L90 88l-68-38m68 38v82m0-82 68 42m-68-42-68 42"/><path d="m43 77 18-12 19 12-19 12-18-12Zm57-23 18-12 19 12-19 12-18-12Z"/><text x="90" y="119" textAnchor="middle">20</text></svg></div>
      <div className={styles.availability} aria-label="Disponibilidade de ações"><span>Ações disponíveis</span><strong>{availableActions.length ? availableActions.join(" · ") : "Nenhuma informada"}</strong></div>
    </header>
    {feedback ? <InlineStatus tone={feedback.tone} assertive>{feedback.message}</InlineStatus> : null}
    <section className={styles.dicePanel} aria-labelledby="dice-title">
      <div className={styles.panelHeading}><div><p className={styles.eyebrow}>QUE A SORTE TE ACOMPANHE</p><h2 id="dice-title">Dados</h2></div><span className={styles.diceMark} aria-hidden="true">✧</span></div>
      <div className={styles.diceLayout}>
        <div className={styles.lastRoll} aria-live="polite">
          <span className={styles.lastRollLabel}>Último resultado</span>
          <strong className={styles.rollValue}>{latestRoll?.total ?? "—"}</strong>
          <span className={[styles.rollOutcome, criticalSuccess ? styles.criticalSuccess : "", criticalFailure ? styles.criticalFailure : ""].filter(Boolean).join(" ")}>{rollOutcome(latestRoll)}</span>
        </div>
        <div className={styles.diceControls}>
          <div className={styles.diceChoices} role="group" aria-label="Escolha o dado">
            {DICE_FACES.map((faces) => <button key={faces} className={[styles.dieChoice, selectedDie === faces ? styles.selectedDie : ""].filter(Boolean).join(" ")} type="button" aria-pressed={selectedDie === faces} onClick={() => setSelectedDie(faces)}><span className={styles.dieGlyph} aria-hidden="true">{faces}</span><span>d{faces}</span></button>)}
          </div>
          <button className={styles.rollAgain} type="button" disabled={!dice || dice.busy} onClick={() => dice?.onRoll(selectedDie)}><span aria-hidden="true">↻</span>{latestRoll ? "Rolar novamente" : "Rolar dado"}</button>
        </div>
      </div>
    </section>
    <section className={styles.quickPanel} aria-labelledby="capabilities-title">
      <div className={styles.panelHeading}><div><p className={styles.eyebrow}>CAPACIDADES RESOLVIDAS</p><h2 id="capabilities-title">Ações rápidas</h2></div><span className={styles.count}>{capabilities.length}</span></div>
      <p className={styles.quickIntro}>Escolha uma ação para revisar custos, efeitos e pendências antes de confirmar.</p>
      {capabilities.length === 0 ? <p className={styles.muted}>Nenhuma capacidade foi fornecida pelo resolvedor.</p> : <div className={styles.capabilityList}>{capabilities.map((capability) => { const preview = lookupPreview(capability, previews); const state = capabilityState(capability, preview, availableActions); return <CapabilityCard key={capability.id} capability={capability} preview={preview} state={state} selected={selectedId === capability.id} onSelect={() => { setSelectedId(capability.id); setFeedback(undefined); }} />; })}</div>}
      {selected && selectedState ? <ReviewPanel capability={selected} preview={selectedPreview} state={selectedState} onConfirm={() => void confirm()} onCancel={cancel} submitting={submitting} alreadySubmitted={submittedCommands.current.has(String(selected.commandId))} hasHandler={Boolean(onIntent)} inputValue={inputValue} onInputChange={setInputValue} /> : <aside className={styles.emptyReview} aria-label="Revisão de capacidade"><span aria-hidden="true">◈</span><p>Selecione uma ação para conferir custo, efeitos e fonte antes de executar.</p></aside>}
    </section>
    <section className={styles.activityPanel} aria-labelledby="activity-title">
      <div className={styles.panelHeading}><div><p className={styles.eyebrow}>REGISTRO DA SESSÃO</p><h2 id="activity-title">Atividade recente</h2></div><span className={styles.activityCaption}>Últimas rolagens</span></div>
      {recentRolls.length ? <div className={styles.activityList}>{recentRolls.map((roll) => <article className={styles.activityItem} key={roll.id}><span className={styles.activityDie} aria-hidden="true">{roll.expression.faces}</span><div className={styles.activityCopy}><strong>{roll.expression.quantity}d{roll.expression.faces}</strong><span>{roll.rawDice.join(" + ") || "Rolagem registrada"}</span></div><strong className={styles.activityResult}>{roll.total}</strong></article>)}</div> : <p className={styles.emptyActivity}>Suas rolagens aparecem aqui depois do primeiro lance.</p>}
    </section>
  </section>;
}

export const ActionPage = Actions;
export type { ActionCapability, ActionCapabilityKind, ActionCommitResult, ActionIntent, ActionPreview, ActionPreviewDetails, ActionSourceRef, ActionsProps } from "./types";
