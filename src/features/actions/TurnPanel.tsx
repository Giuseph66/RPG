/**
 * Economia de ações do turno (Livro do Jogador, cap. 9, "Seu Turno" e "Ações em Combate",
 * p.194–195): uma ação, uma ação bônus, uma reação e o deslocamento. O estado do turno é
 * da mesa, não da ficha: fica só nesta aba (sessionStorage) e zera em "Novo turno".
 */
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  GiBootPrints,
  GiCrossedAxes,
  GiCrossedSwords,
  GiHood,
  GiHourglass,
  GiMagnifyingGlass,
  GiOpenChest,
  GiReturnArrow,
  GiRunningShoe,
  GiShakingHands,
  GiShieldReflect,
  GiSpellBook,
  GiSprint,
  GiSwordClash,
} from "react-icons/gi";

import styles from "./actions.module.css";

type Slot = "action" | "bonus" | "reaction";

interface TurnState {
  readonly round: number;
  readonly used: Readonly<Record<Slot, boolean>>;
  readonly movedSquares: number;
  readonly dashed: boolean;
  /** Efeitos que duram até o próximo turno (Esquivar, Desengajar…). */
  readonly effects: readonly string[];
}

const FRESH: TurnState = { round: 1, used: { action: false, bonus: false, reaction: false }, movedSquares: 0, dashed: false, effects: [] };

type TurnActionId = "attack" | "cast" | "dash" | "disengage" | "dodge" | "help" | "hide" | "ready" | "search" | "use-object" | "two-weapon" | "opportunity";

interface TurnAction {
  readonly id: TurnActionId;
  readonly name: string;
  readonly slot: Slot;
  readonly icon: ReactNode;
  readonly summary: string;
  /** Efeito exibido até o próximo turno. */
  readonly effect?: string;
}

const TURN_ACTIONS: readonly TurnAction[] = [
  { id: "attack", name: "Atacar", slot: "action", icon: <GiCrossedSwords />, summary: "Um ataque corpo a corpo ou à distância. Ataque Adicional e afins permitem mais de um ataque com esta ação." },
  { id: "cast", name: "Conjurar magia", slot: "action", icon: <GiSpellBook />, summary: "Magias com tempo de conjuração de 1 ação. Magias de ação bônus ou reação usam esses espaços do turno." },
  { id: "dash", name: "Disparada", slot: "action", icon: <GiSprint />, summary: "Ganha deslocamento adicional igual ao seu deslocamento (já com modificadores) neste turno." },
  { id: "disengage", name: "Desengajar", slot: "action", icon: <GiRunningShoe />, summary: "Seu movimento não provoca ataques de oportunidade pelo resto do turno.", effect: "Desengajado" },
  { id: "dodge", name: "Esquivar", slot: "action", icon: <GiShieldReflect />, summary: "Até o início do seu próximo turno, ataques contra você têm desvantagem se você puder ver o atacante, e você tem vantagem em testes de Destreza. Perde o benefício se ficar incapacitado ou com deslocamento 0.", effect: "Esquivando" },
  { id: "help", name: "Ajudar", slot: "action", icon: <GiShakingHands />, summary: "Um aliado tem vantagem no próximo teste de habilidade da tarefa, ou no primeiro ataque contra um alvo a até 1,5 m de você, antes do seu próximo turno." },
  { id: "hide", name: "Esconder", slot: "action", icon: <GiHood />, summary: "Faça um teste de Destreza (Furtividade) para se esconder." },
  { id: "ready", name: "Preparar", slot: "action", icon: <GiHourglass />, summary: "Escolha um gatilho perceptível e uma ação (ou mover-se); quando acontecer, use sua reação para agir. Magia preparada exige concentração.", effect: "Ação preparada" },
  { id: "search", name: "Procurar", slot: "action", icon: <GiMagnifyingGlass />, summary: "Concentre-se em encontrar algo: teste de Sabedoria (Percepção) ou Inteligência (Investigação)." },
  { id: "use-object", name: "Usar objeto", slot: "action", icon: <GiOpenChest />, summary: "Para objetos que exigem sua ação, ou para interagir com mais de um objeto no turno." },
  { id: "two-weapon", name: "Ataque com duas armas", slot: "bonus", icon: <GiCrossedAxes />, summary: "Depois de atacar com uma arma leve de corpo a corpo, ataque com outra arma leve na outra mão. Não some o modificador de habilidade ao dano (a menos que seja negativo)." },
  { id: "opportunity", name: "Ataque de oportunidade", slot: "reaction", icon: <GiSwordClash />, summary: "Quando uma criatura hostil que você vê sai do seu alcance, faça um ataque corpo a corpo contra ela." },
];

const SLOT_LABEL: Record<Slot, string> = { action: "Ação", bonus: "Ação bônus", reaction: "Reação" };
const SQUARE_CM = 150;

function storageKey(characterId: string): string {
  return `rpg.turn.${characterId}`;
}

function readTurn(characterId: string): TurnState {
  try {
    const raw = sessionStorage.getItem(storageKey(characterId));
    if (!raw) return FRESH;
    const parsed = JSON.parse(raw) as Partial<TurnState>;
    return { ...FRESH, ...parsed, used: { ...FRESH.used, ...parsed.used } };
  } catch {
    return FRESH;
  }
}

function formatMeters(cm: number): string {
  return `${(cm / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`;
}

export function TurnPanel({ characterId, walkSpeedCm, speedPenaltyCm = 0, overCapacity = false, onAttack, onCast, onSkillCheck }: {
  readonly characterId: string;
  readonly walkSpeedCm?: number;
  readonly speedPenaltyCm?: number;
  readonly overCapacity?: boolean;
  readonly onAttack?: () => void;
  readonly onCast?: () => void;
  readonly onSkillCheck?: (skill: "stealth" | "perception" | "investigation") => void;
}) {
  const [turn, setTurn] = useState<TurnState>(() => readTurn(characterId));
  const [selectedId, setSelectedId] = useState<TurnActionId>();

  useEffect(() => { setTurn(readTurn(characterId)); setSelectedId(undefined); }, [characterId]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey(characterId), JSON.stringify(turn)); } catch { /* sem armazenamento: o turno vive só na memória */ }
  }, [characterId, turn]);

  const baseSpeed = walkSpeedCm === undefined ? undefined : overCapacity ? Math.min(walkSpeedCm, SQUARE_CM) : Math.max(0, walkSpeedCm - speedPenaltyCm);
  const squares = baseSpeed === undefined ? 0 : Math.floor(baseSpeed / SQUARE_CM) * (turn.dashed ? 2 : 1);
  const moved = Math.min(turn.movedSquares, squares);
  const selected = TURN_ACTIONS.find((action) => action.id === selectedId);

  const toggleSlot = (slot: Slot) => setTurn((current) => ({ ...current, used: { ...current.used, [slot]: !current.used[slot] } }));
  const newTurn = () => { setTurn((current) => ({ ...FRESH, round: current.round + 1 })); setSelectedId(undefined); };
  const resetCombat = () => { setTurn(FRESH); setSelectedId(undefined); };

  const perform = (action: TurnAction) => {
    setTurn((current) => ({
      ...current,
      used: { ...current.used, [action.slot]: true },
      dashed: current.dashed || action.id === "dash",
      effects: action.effect && !current.effects.includes(action.effect) ? [...current.effects, action.effect] : current.effects,
    }));
    if (action.id === "attack" || action.id === "two-weapon" || action.id === "opportunity") onAttack?.();
    if (action.id === "cast") onCast?.();
    if (action.id === "hide") onSkillCheck?.("stealth");
    setSelectedId(undefined);
  };

  return <div className={styles.turn}>
    <div className={styles.turnHead}>
      <span className={styles.turnRound}>Rodada <strong>{turn.round}</strong></span>
      <span className={styles.turnButtons}>
        <button type="button" className={styles.panelLink} onClick={resetCombat}>Fim do combate</button>
        <button type="button" className={styles.turnNew} onClick={newTurn}><GiReturnArrow aria-hidden="true" /> Novo turno</button>
      </span>
    </div>

    <div className={styles.turnSlots}>
      {(["action", "bonus", "reaction"] as const).map((slot) => <button key={slot} type="button" className={styles.turnSlot} data-slot={slot} aria-pressed={turn.used[slot]} onClick={() => toggleSlot(slot)}>
        <span className={styles.turnGem} aria-hidden="true" />
        <span><strong>{SLOT_LABEL[slot]}</strong><small>{turn.used[slot] ? "Usada" : "Disponível"}</small></span>
      </button>)}
    </div>

    <div className={styles.turnMove}>
      <div className={styles.turnMoveHead}>
        <span><GiBootPrints aria-hidden="true" /> Movimento</span>
        {baseSpeed === undefined ? <small>Deslocamento indisponível</small> : <small>
          Restam <strong>{formatMeters((squares - moved) * SQUARE_CM)}</strong> de {formatMeters(squares * SQUARE_CM)}
          {turn.dashed ? " · disparada" : ""}
          {overCapacity ? " · acima da capacidade" : speedPenaltyCm ? ` · sobrecarga −${formatMeters(speedPenaltyCm)}` : ""}
        </small>}
      </div>
      {squares > 0 ? <div className={styles.turnSquares} role="group" aria-label="Quadrados de 1,5 m percorridos">
        {Array.from({ length: squares }, (_, index) => <button key={index} type="button" data-moved={index < moved} aria-label={`Mover até ${formatMeters((index + 1) * SQUARE_CM)}`} aria-pressed={index < moved} onClick={() => setTurn((current) => ({ ...current, movedSquares: current.movedSquares === index + 1 ? index : index + 1 }))} />)}
      </div> : null}
    </div>

    {turn.effects.length ? <div className={styles.turnEffects} aria-label="Efeitos até o próximo turno">{turn.effects.map((effect) => <span key={effect}>{effect}</span>)}</div> : null}

    <ul className={styles.turnActions} aria-label="Ações de combate">
      {TURN_ACTIONS.map((action) => <li key={action.id}>
        <button type="button" className={styles.turnAction} data-slot={action.slot} aria-pressed={selectedId === action.id} disabled={turn.used[action.slot] && selectedId !== action.id} onClick={() => setSelectedId((current) => current === action.id ? undefined : action.id)}>
          <span aria-hidden="true">{action.icon}</span>
          <span><strong>{action.name}</strong>{action.slot !== "action" ? <small>{SLOT_LABEL[action.slot]}</small> : null}</span>
        </button>
      </li>)}
    </ul>

    {selected ? <div className={styles.turnDetail} aria-live="polite">
      <p><strong>{selected.name}</strong> · {SLOT_LABEL[selected.slot]}</p>
      <p>{selected.summary}</p>
      <div className={styles.turnDetailActions}>
        {selected.id === "search" && onSkillCheck ? <>
          <button type="button" className={styles.turnUse} disabled={turn.used.action} onClick={() => { onSkillCheck("perception"); perform(selected); }}>Percepção</button>
          <button type="button" className={styles.turnUse} disabled={turn.used.action} onClick={() => { onSkillCheck("investigation"); perform(selected); }}>Investigação</button>
        </> : <button type="button" className={styles.turnUse} disabled={turn.used[selected.slot]} onClick={() => perform(selected)}>
          {selected.id === "attack" || selected.id === "two-weapon" || selected.id === "opportunity" ? "Usar e rolar ataque" : selected.id === "cast" ? "Usar e escolher magia" : selected.id === "hide" ? "Usar e rolar Furtividade" : `Usar ${SLOT_LABEL[selected.slot].toLowerCase()}`}
        </button>}
      </div>
      <p className={styles.turnSource}>Livro do Jogador, cap. 9, p. 194–195</p>
    </div> : <p className={styles.muted}>Toque numa ação para ver a regra e marcá-la no turno. Toque nos marcadores para liberar ou gastar manualmente.</p>}
  </div>;
}
