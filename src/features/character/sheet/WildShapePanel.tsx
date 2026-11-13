import { useState } from "react";
import { Button, InlineStatus } from "@components/ui";
import type { Character, EquipmentDisposition } from "@domain/contracts/character";
import type { AppError, Result } from "@domain/contracts/errors";
import type { DefinitionRef } from "@domain/contracts/ids";
import type { EligibleBeastSuggestion } from "@domain/rules/wild-shape";
import type { AvailableAction } from "@domain/contracts/rules";
import type { CharacterCommandOutcome } from "@application/character/commands";
import { StatBlock } from "@components/creatures/StatBlock";
import styles from "./wild-shape-panel.module.css";

export interface WildShapePanelProps {
  readonly character: Character;
  readonly eligibleBeasts: readonly EligibleBeastSuggestion[];
  readonly catalogError?: string;
  readonly actionBudget?: { readonly tracked: boolean; readonly enterCost?: "action" | "bonus-action"; readonly exitCost?: "action" | "bonus-action"; readonly error?: string };
  readonly onEnter?: (beastRef: DefinitionRef, equipmentDisposition: EquipmentDisposition, actionCost?: "action" | "bonus-action") => Promise<Result<CharacterCommandOutcome, AppError>>;
  readonly onExit?: (actionCost?: "action" | "bonus-action") => Promise<Result<CharacterCommandOutcome, AppError>>;
  readonly onAdvanceTime?: (minutes: number) => Promise<Result<CharacterCommandOutcome, AppError>>;
}

const DISPOSITION_LABELS: Readonly<Record<EquipmentDisposition, string>> = {
  worn: "Continua vestido quando a forma comportar",
  dropped: "Cai no chão",
  stored: "Fica guardado no lugar",
  "merged-with-form": "Funde-se à forma",
};
const DISPOSITIONS: readonly EquipmentDisposition[] = ["worn", "dropped", "stored", "merged-with-form"];

function ruleMessage(outcome: CharacterCommandOutcome): string | undefined {
  if (outcome.result.status === "success") return undefined;
  if (outcome.result.status === "rejected") return outcome.result.errors[0]?.message ?? "A transformação foi recusada.";
  if (outcome.result.status === "needsInput") return outcome.result.requests[0]?.reason ?? "A transformação precisa de outra decisão.";
  return "A transformação não foi concluída.";
}

/** Controles de Forma Selvagem delegam limites e efeitos ao serviço de aplicação. */
export function WildShapePanel({ character, eligibleBeasts, catalogError, actionBudget, onEnter, onExit, onAdvanceTime }: WildShapePanelProps) {
  const [selectedId, setSelectedId] = useState("");
  const [disposition, setDisposition] = useState<EquipmentDisposition | "">("");
  const [busy, setBusy] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [message, setMessage] = useState<{ readonly tone: "success" | "error"; readonly text: string }>();
  const transformation = character.transformation;
  const available = eligibleBeasts;
  const selectedSuggestion = available.find(({ beast }) => String(beast.id) === selectedId);
  const selected = selectedSuggestion?.beast;

  const enter = async () => {
    if (!selected || !disposition || !onEnter || busy || (actionBudget?.tracked && !actionBudget.enterCost)) return;
    setBusy(true); setMessage(undefined);
    const ref: DefinitionRef = { rulesetId: character.rulesetRef.id, entityId: selected.id };
    try {
      const result = await onEnter(ref, disposition, actionBudget?.tracked ? actionBudget.enterCost : undefined);
      if (!result.ok) setMessage({ tone: "error", text: result.error.message });
      else {
        const failure = ruleMessage(result.value);
        setMessage(failure ? { tone: "error", text: failure } : { tone: "success", text: `Forma de ${selected.name} assumida.` });
      }
    } catch {
      setMessage({ tone: "error", text: "Não foi possível transformar. Tente novamente." });
    } finally { setBusy(false); }
  };

  const exit = async () => {
    if (!onExit || busy || (actionBudget?.tracked && !actionBudget.exitCost)) return;
    setBusy(true); setMessage(undefined);
    try {
      const result = await onExit(actionBudget?.tracked ? actionBudget.exitCost : undefined);
      if (!result.ok) setMessage({ tone: "error", text: result.error.message });
      else {
        const failure = ruleMessage(result.value);
        setMessage(failure ? { tone: "error", text: failure } : { tone: "success", text: "Forma original restaurada." });
      }
    } catch {
      setMessage({ tone: "error", text: "Não foi possível retornar à forma original. Tente novamente." });
    } finally { setBusy(false); }
  };

  const advanceTime = async (minutes: number) => {
    if (!onAdvanceTime || busy || !Number.isInteger(minutes) || minutes <= 0) return;
    setBusy(true); setMessage(undefined);
    try {
      const result = await onAdvanceTime(minutes);
      if (!result.ok) setMessage({ tone: "error", text: result.error.message });
      else if (result.value.result.status === "success") {
        const firstExplanation = result.value.result.explanations[0]?.value;
        setMessage({ tone: "success", text: typeof firstExplanation === "string" ? firstExplanation : "Tempo de jogo avançado." });
      } else setMessage({ tone: "error", text: ruleMessage(result.value) ?? "O tempo de jogo não avançou." });
    } catch {
      setMessage({ tone: "error", text: "Não foi possível avançar o tempo de jogo." });
    } finally { setBusy(false); }
  };

  const form = transformation?.formSnapshot;
  const originalHp = transformation?.originalSnapshot?.hp ?? character.hp;
  const originalMax = transformation?.originalMaximumHitPoints;
  const formMax = transformation?.formMaximumHitPoints;
  const elapsedMinutes = transformation?.elapsedMinutes ?? 0;
  const durationHours = transformation?.duration?.kind === "hours" ? transformation.duration.value : undefined;
  const durationMinutes = typeof durationHours === "number" && Number.isInteger(durationHours) && durationHours > 0
    ? durationHours * 60
    : undefined;
  const remainingMinutes = durationMinutes === undefined ? undefined : Math.max(0, durationMinutes - elapsedMinutes);
  const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
  const availableActionLabel = (cost: AvailableAction | undefined) => cost === "bonus-action" ? "ação bônus" : cost === "action" ? "ação" : "";
  const enterDisabled = !onEnter || !selected || !disposition || busy || (actionBudget?.tracked && !actionBudget.enterCost);
  const exitDisabled = !onExit || busy || (actionBudget?.tracked && !actionBudget.exitCost);

  return <section className={styles.panel} aria-labelledby="wild-shape-title">
    <header><div><p className={styles.eyebrow}>Personagem · Druida</p><h2 id="wild-shape-title">Forma Selvagem</h2><p>Escolha apenas uma besta que este personagem registrou como vista.</p></div>
      {transformation ? <span className={styles.active}>Transformado</span> : null}
    </header>
    {catalogError ? <InlineStatus tone="error" assertive>{catalogError}</InlineStatus> : null}
    {message ? <InlineStatus tone={message.tone} assertive={message.tone === "error"}>{message.text}</InlineStatus> : null}

    {transformation ? <div className={styles.formState}>
      {form ? <StatBlock creature={form} headingLevel={3} hiddenSpeeds={["flyCm", "swimCm"]} hitPointsOverride={formMax === undefined ? undefined : { current: transformation.formHp.current, maximum: formMax }} />
        : <InlineStatus tone="error" assertive>O snapshot da forma está ausente; a ficha foi preservada para revisão.</InlineStatus>}
      <dl className={styles.hpStorage}>
        <div><dt>PV da forma</dt><dd>{transformation.formHp.current}{formMax === undefined ? "" : ` / ${formMax}`}{transformation.formHp.temp > 0 ? ` + ${transformation.formHp.temp} temporários` : ""}</dd></div>
        <div><dt>PV originais guardados</dt><dd>{originalHp.current}{originalMax === undefined ? "" : ` / ${originalMax}`}{originalHp.temp > 0 ? ` + ${originalHp.temp} temporários` : ""}</dd></div>
      </dl>
      <div className={styles.timeControls} aria-label="Duração restante da forma">
        {remainingMinutes === undefined ? <p className={styles.hint}>A duração desta transformação não está registrada; revise o snapshot antes de avançar o tempo.</p> : <>
          <p><strong>Tempo de jogo restante:</strong> {formatMinutes(remainingMinutes)}</p>
          {onAdvanceTime ? <>
          <div className={styles.timeButtons}>
            <Button type="button" variant="secondary" disabled={busy || remainingMinutes === 0} busy={busy} onClick={() => void advanceTime(10)}>Avançar 10 min</Button>
            <Button type="button" variant="secondary" disabled={busy || remainingMinutes === 0} onClick={() => void advanceTime(60)}>Avançar 1 h</Button>
          </div>
          <form className={styles.customTime} onSubmit={(event) => { event.preventDefault(); const minutes = Number(customMinutes); void advanceTime(minutes); }}>
            <label htmlFor="wild-shape-minutes">Outro avanço (minutos de jogo)</label>
            <input id="wild-shape-minutes" type="number" min="1" step="1" inputMode="numeric" value={customMinutes} onChange={(event) => setCustomMinutes(event.currentTarget.value)} disabled={busy || remainingMinutes === 0} />
            <Button type="submit" variant="secondary" disabled={!customMinutes || Number(customMinutes) <= 0 || busy || remainingMinutes === 0}>Avançar tempo</Button>
          </form>
          </> : <p className={styles.hint}>A duração é controlada pelo tempo de jogo salvo na transformação.</p>}
        </>}
      </div>
      {actionBudget?.tracked ? <p className={styles.hint}>Custo para voltar: {availableActionLabel(actionBudget.exitCost) || "nenhuma ação bônus restante"}.</p> : null}
      {actionBudget?.error ? <InlineStatus tone="error">{actionBudget.error}</InlineStatus> : null}
      <Button type="button" variant="secondary" disabled={exitDisabled} busy={busy} onClick={() => void exit()}>Voltar à forma original</Button>
    </div> : <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void enter(); }}>
      <label><span>Besta vista</span><select value={selectedId} onChange={(event) => setSelectedId(event.currentTarget.value)} disabled={busy || available.length === 0}>
      <option value="">Escolha uma besta…</option>{available.map(({ beast }) => <option key={String(beast.id)} value={String(beast.id)}>{beast.name}</option>)}
      </select></label>
      <label><span>O que acontece com o equipamento?</span><select value={disposition} onChange={(event) => setDisposition(event.currentTarget.value as EquipmentDisposition | "")} disabled={busy}>
        <option value="">Escolha uma opção…</option>{DISPOSITIONS.map((option) => <option key={option} value={option}>{DISPOSITION_LABELS[option]}</option>)}
      </select></label>
      {available.length === 0 ? <p className={styles.hint}>Nenhuma besta registrada como vista. No Compêndio, abra uma besta e escolha “Marcar como vista”.</p> : null}
      {selected ? <StatBlock creature={selected} headingLevel={3} hiddenSpeeds={["flyCm", "swimCm"]} /> : null}
      {selectedSuggestion?.reasons.length ? <p className={styles.hint}>{selectedSuggestion.reasons.join(" ")}</p> : null}
      {selected?.speeds.flyCm !== undefined || selected?.speeds.swimCm !== undefined ? <p className={styles.hint}>Voo e natação não bloqueiam a escolha; esses deslocamentos ficam indisponíveis durante a forma.</p> : null}
      {actionBudget?.tracked ? <p className={styles.hint}>Custo da transformação: {availableActionLabel(actionBudget.enterCost) || "nenhuma ação disponível"}. A regra da ficha confirma o custo antes de salvar.</p> : <p className={styles.hint}>Custo normal: uma ação. O serviço de regras verifica opções de classe e o turno atual.</p>}
      {actionBudget?.error ? <InlineStatus tone="error">{actionBudget.error}</InlineStatus> : null}
      <Button type="submit" disabled={enterDisabled} busy={busy}>Transformar</Button>
    </form>}
  </section>;
}
