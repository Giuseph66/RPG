/**
 * Descanso curto/longo com a linguagem do jogador (Livro do Jogador, cap. 8, p.188):
 * escolher Dados de Vida, ver o que cada descanso devolve e descansar.
 */
import { useState } from "react";
import { GiBed, GiCoffeeCup, GiHearts } from "react-icons/gi";

import { Button, InlineStatus } from "@components/ui";
import type { Character } from "@domain/contracts/character";
import type { RuleResult } from "@domain/contracts/rules";

import type { ActionCapability, ActionIntent, ActionRestInfo } from "./types";
import styles from "./actions.module.css";

export type RestKind = "short" | "long";

export interface RestOutcome {
  readonly tone: "success" | "warning" | "error";
  readonly message: string;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

function outcomeOf(result: RuleResult | void, kind: RestKind, before: Character, spentDice: number): RestOutcome {
  if (!result) return { tone: "success", message: kind === "short" ? "Descanso curto concluído." : "Descanso longo concluído." };
  if (result.status === "needsInput") return { tone: "warning", message: result.requests.map((request) => request.reason).join(" ") || "O descanso precisa de mais informações." };
  if (result.status !== "success") return { tone: "error", message: result.errors.map((error) => error.message).join(" ") || "Não foi possível descansar." };
  const healed = result.nextState.hp.current - before.hp.current;
  const parts = [kind === "short" ? "Descanso curto concluído" : "Descanso longo concluído"];
  if (healed > 0) parts.push(`${signed(healed)} PV${spentDice ? ` com ${spentDice} ${spentDice === 1 ? "Dado de Vida" : "Dados de Vida"}` : ""}`);
  else if (spentDice) parts.push(`${spentDice} ${spentDice === 1 ? "Dado de Vida gasto" : "Dados de Vida gastos"}, sem PV a recuperar`);
  return { tone: "success", message: `${parts.join(": ")}.` };
}

export function RestPanel({ character, info, capabilities, initialKind, onIntent, onDone }: {
  readonly character: Character;
  readonly info?: ActionRestInfo;
  readonly capabilities: readonly ActionCapability[];
  readonly initialKind: RestKind;
  readonly onIntent?: (intent: ActionIntent) => unknown;
  readonly onDone: (outcome: RestOutcome) => void;
}) {
  const [kind, setKind] = useState<RestKind>(initialKind);
  const [dice, setDice] = useState<Readonly<Record<string, number>>>({});
  const [ateAndDrank, setAteAndDrank] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const capability = capabilities.find((candidate) => candidate.id === `rest:${kind}`);
  const maxHp = info?.maxHitPoints;
  const current = character.hp.current;
  const con = info?.constitutionModifier ?? 0;
  const spentDice = Object.values(dice).reduce((sum, count) => sum + count, 0);
  const averageHeal = (info?.hitDice ?? []).reduce((sum, entry) => sum + (dice[entry.classId] ?? 0) * Math.max(0, (entry.faces + 1) / 2 + con), 0);
  const longBlocked = kind === "long" && current < 1;

  const setCount = (classId: string, next: number, available: number) => setDice((previous) => ({ ...previous, [classId]: Math.max(0, Math.min(available, next)) }));

  const rest = async () => {
    if (!capability || !onIntent || busy || longBlocked) return;
    setBusy(true);
    setError(undefined);
    const intent: ActionIntent = {
      commandId: capability.commandId,
      characterId: character.id,
      capabilityId: capability.id,
      kind: "rest",
      ...(kind === "short" && spentDice ? { hitDice: dice } : {}),
      ...(kind === "long" && info?.exhaustion ? { ateAndDrank } : {}),
    };
    try {
      const outcome = outcomeOf(await (onIntent(intent) as Promise<RuleResult | void> | RuleResult | void), kind, character, kind === "short" ? spentDice : 0);
      if (outcome.tone === "success") { setDice({}); onDone(outcome); }
      else setError(outcome.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível descansar.");
    } finally {
      setBusy(false);
    }
  };

  const hpPercent = maxHp ? Math.min(100, (Math.max(0, current) / maxHp) * 100) : 0;
  const shortExtras = [...(info?.spentPactSlots ? [`Espaços de Magia de Pacto (${info.spentPactSlots})`] : []), ...(info?.shortRecovers ?? [])];

  return <div className={styles.rest}>
    <div className={styles.restTabs} role="tablist" aria-label="Tipo de descanso">
      {(["short", "long"] as const).map((option) => <button key={option} type="button" role="tab" aria-selected={kind === option} className={styles.restTab} onClick={() => { setKind(option); setError(undefined); }}>
        {option === "short" ? <GiCoffeeCup aria-hidden="true" /> : <GiBed aria-hidden="true" />}
        <span><strong>{option === "short" ? "Descanso curto" : "Descanso longo"}</strong><small>{option === "short" ? "1 hora" : "8 horas"}</small></span>
      </button>)}
    </div>

    <div className={styles.restHp}>
      <span><GiHearts aria-hidden="true" /> Pontos de vida</span>
      <strong>{current}{maxHp ? ` / ${maxHp}` : ""}</strong>
      {maxHp ? <span className={styles.restHpBar} aria-hidden="true"><span style={{ width: `${hpPercent}%` }} /></span> : null}
    </div>

    {kind === "short" ? <>
      <section className={styles.restSection} aria-labelledby="rest-hit-dice-title">
        <h3 id="rest-hit-dice-title">Dados de Vida</h3>
        <p className={styles.muted}>Para cada dado gasto, role e some seu modificador de Constituição ({signed(con)}). Mínimo de 0 PV por dado.</p>
        {info?.hitDice.length ? <ul className={styles.hitDiceList}>{info.hitDice.map((entry) => {
          const count = dice[entry.classId] ?? 0;
          return <li key={entry.classId}>
            <span className={styles.hitDieBadge}>d{entry.faces}</span>
            <span className={styles.hitDieCopy}><strong>{entry.className}</strong><small>{entry.available} de {entry.total} disponíve{entry.available === 1 ? "l" : "is"}</small></span>
            <span className={styles.stepper}>
              <button type="button" aria-label={`Gastar um Dado de Vida de ${entry.className} a menos`} disabled={count === 0} onClick={() => setCount(entry.classId, count - 1, entry.available)}>−</button>
              <output aria-live="polite" aria-label={`Dados de Vida de ${entry.className} a gastar`}>{count}</output>
              <button type="button" aria-label={`Gastar mais um Dado de Vida de ${entry.className}`} disabled={count >= entry.available} onClick={() => setCount(entry.classId, count + 1, entry.available)}>+</button>
            </span>
          </li>;
        })}</ul> : <p className={styles.muted}>Dados de Vida indisponíveis para esta ficha.</p>}
        {spentDice ? <p className={styles.restEstimate}>Cura média ≈ {Math.floor(averageHeal)} PV{maxHp && current + averageHeal > maxHp ? ` (limitada ao máximo de ${maxHp})` : ""}.</p> : null}
      </section>
      <section className={styles.restSection} aria-labelledby="rest-short-extra-title">
        <h3 id="rest-short-extra-title">Também recupera</h3>
        {shortExtras.length ? <ul className={styles.restList}>{shortExtras.map((entry) => <li key={entry}>{entry}</li>)}</ul> : <p className={styles.muted}>Nenhum recurso gasto volta no descanso curto.</p>}
      </section>
    </> : <section className={styles.restSection} aria-labelledby="rest-long-title">
      <h3 id="rest-long-title">Ao acordar</h3>
      <ul className={styles.restList}>
        <li data-done={maxHp !== undefined && current >= maxHp}>{maxHp !== undefined && current < maxHp ? `Pontos de vida: ${current} → ${maxHp}` : "Pontos de vida já estão cheios"}</li>
        {character.hp.temp > 0 ? <li>Os {character.hp.temp} PV temporários acabam</li> : null}
        <li data-done={!info?.longRestHitDice}>{info?.longRestHitDice ? `Recupera ${info.longRestHitDice} ${info.longRestHitDice === 1 ? "Dado de Vida" : "Dados de Vida"} (até metade do total)` : "Nenhum Dado de Vida gasto"}</li>
        {info?.spentSpellSlots ? <li>Todos os espaços de magia gastos ({info.spentSpellSlots})</li> : null}
        {(info?.longRecovers ?? []).map((entry) => <li key={entry}>{entry}</li>)}
      </ul>
      {info?.exhaustion ? <label className={styles.restCheck}><input type="checkbox" checked={ateAndDrank} onChange={(event) => setAteAndDrank(event.target.checked)} /><span>Comeu e bebeu: reduz a exaustão em 1 nível (atual: {info.exhaustion})</span></label> : null}
      <p className={styles.muted}>Só um descanso longo a cada 24 horas. Interromper com 1 hora de atividade extenuante obriga a recomeçar.</p>
      {longBlocked ? <InlineStatus tone="warning">Com 0 PV não há benefício: é preciso ter ao menos 1 PV no início do descanso longo.</InlineStatus> : null}
    </section>}

    {error ? <InlineStatus tone="error" assertive>{error}</InlineStatus> : null}
    <div className={styles.restFooter}>
      <span className={styles.restSource}>Livro do Jogador, cap. 8, p. 188</span>
      <Button size="lg" busy={busy} disabled={!capability || !onIntent || busy || longBlocked} disabledReason={!capability ? "Descanso indisponível para esta ficha." : !onIntent ? "A ficha não está pronta para salvar." : longBlocked ? "É preciso ter ao menos 1 PV." : undefined} onClick={() => void rest()}>
        {kind === "short" ? (spentDice ? `Descansar e rolar ${spentDice} ${spentDice === 1 ? "dado" : "dados"}` : "Descansar sem gastar dados") : "Descansar 8 horas"}
      </Button>
    </div>
  </div>;
}
