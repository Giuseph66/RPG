import { useSyncExternalStore } from "react";

import { type DiceApplicationService } from "@application/dice";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { type DiceHistoryPage } from "@application/ports/dice-history-repository";
import { type DiceExpression, type DiceMode, type DicePurpose, type DiceRoll, type RandomSource } from "@domain/contracts/dice";
import { type DiceFaces } from "@domain/contracts/primitives";
import { type AppError, err, ok, type Result } from "@domain/contracts/errors";
import { asIsoTimestamp, asUuid, type Uuid } from "@domain/contracts/ids";
import { formatDiceFormula, parseDiceFormula } from "@domain/dice";
import { rollExpression } from "@domain/dice";
import { buildRollFromValues, type RollMeta } from "@domain/dice/roll";

export type DiceOverlaySource = "character" | "actions" | "journey" | "compendium" | "header" | "fab" | "contextual";

export interface DiceOverlayOpenOptions {
  readonly source?: DiceOverlaySource;
  readonly characterId?: Uuid;
  readonly purpose?: DicePurpose;
  readonly formula?: string;
}

/** Rolagem rápida disparada fora do modal (ex.: painel de Dados em Ações). */
export interface QuickRollRequest {
  readonly expression: DiceExpression;
  readonly purpose?: DicePurpose;
  readonly label?: string;
  readonly characterId?: Uuid;
}

export interface DiceOverlayState {
  readonly open: boolean;
  /**
   * `true` enquanto uma rolagem rápida está na tela sem o modal: o palco 3D cobre
   * a tela, o dado cai e fica visível por alguns segundos depois de parar.
   */
  readonly quick: boolean;
  readonly source?: DiceOverlaySource;
  readonly characterId?: Uuid;
  readonly purpose: DicePurpose;
  readonly formula: string;
  readonly mode: DiceMode;
  readonly expression?: DiceExpression;
  readonly result?: DiceRoll;
  readonly history: readonly DiceRoll[];
  readonly status: "idle" | "hydrating" | "rolling" | "saving" | "error";
  readonly validationError?: string;
  readonly persistenceError?: AppError;
  readonly announcement: string;
  /**
   * `true` enquanto o controller espera os dados 3D assentarem. O número ainda
   * não existe: quem decide é a física, via `onPhysicsResult`. O
   * `PhysicalDiceStage` observa este flag para saber quando largar os dados.
   */
  readonly awaitingPhysics: boolean;
  /** Expressão e metadados guardados entre o clique e o dado parar. */
  readonly pendingExpression?: DiceExpression;
  readonly pendingMeta?: RollMeta;
}

export interface DiceOverlayListener { (): void; }

export type DiceHistoryService = Pick<DiceApplicationService, "hydrate" | "append">;

export interface DiceOverlayControllerOptions {
  readonly history: DiceHistoryService;
  readonly rng: RandomSource;
  /** Injectable seam for deterministic application tests; production defaults to DICE-001. */
  readonly engine?: typeof rollExpression;
  readonly idGenerator?: Pick<IdGenerator, "uuid">;
  readonly clock?: Pick<Clock, "now">;
  readonly initialFormula?: string;
}

export interface DiceOverlayController {
  readonly getSnapshot: () => DiceOverlayState;
  readonly subscribe: (listener: DiceOverlayListener) => () => void;
  open(options?: DiceOverlayOpenOptions): void;
  close(): void;
  setFormula(formula: string): void;
  setQuantity(quantity: number): void;
  setFaces(faces: DiceFaces): void;
  setModifier(modifier: number): void;
  setMode(mode: DiceMode): void;
  roll(): Promise<Result<DiceRoll, AppError>>;
  reroll(roll?: DiceRoll): Promise<Result<DiceRoll, AppError>>;
  /** Rola sem abrir o modal: o dado cai direto na tela (ou pelo RNG, sem mesa 3D). */
  quickRoll(request: QuickRollRequest): Promise<Result<DiceRoll, AppError>>;
  /** Tira da tela o dado da rolagem rápida. */
  endQuick(): void;
  /** Carrega o histórico salvo; com `characterId`, passa a olhar as rolagens desse personagem. */
  hydrate(characterId?: Uuid): Promise<Result<DiceHistoryPage, AppError>>;
  /**
   * Liga/desliga o modo físico. Só o `PhysicalDiceStage` sabe se a mesa 3D
   * existe de verdade (WebGL pode falhar, `prefers-reduced-motion` pode estar
   * ligado), então é ele quem avisa. Começa `false`: sem aviso explícito o
   * controller usa o RNG, que é o caminho que sempre responde.
   */
  setPhysicsAvailable(available: boolean): void;
  /**
   * Chamado pelo `PhysicalDiceStage` quando todos os dados pararam. `values`
   * são as faces lidas por `lerDado()`, uma por dado. Monta o `DiceRoll` com
   * `buildRollFromValues`, persiste e publica.
   */
  onPhysicsResult(values: readonly number[]): Promise<void>;
  /**
   * A mesa existe mas não dá conta desta rolagem — tipicamente quando a
   * política de performance limita quantos dados podem cair e a expressão pede
   * mais. Fecha a rolagem pendente pelo RNG na hora, sem esperar o watchdog.
   */
  declinePhysics(): void;
}

/**
 * Teto de espera pela física antes de cair no RNG. A mesa desiste de esperar o
 * dado assentar em ~4 s (`maxRollSeconds`); o dobro disso cobre carga de asset
 * e reprodução sem deixar o botão girando para sempre se o canvas morrer no
 * meio (contexto WebGL perdido, aba suspensa).
 */
const PHYSICS_TIMEOUT_MS = 12_000;

const DEFAULT_FORMULA = "1d20";
/** Quanto a mesa pode sumir (recriação) antes de a rolagem em voo cair no RNG. */
const PHYSICS_REMOUNT_GRACE_MS = 500;

export function createDiceOverlayController(options: DiceOverlayControllerOptions): DiceOverlayController {
  const listeners = new Set<DiceOverlayListener>();
  const idGenerator = options.idGenerator ?? { uuid: () => asUuid(globalThis.crypto?.randomUUID?.() ?? fallbackUuid()) };
  const clock = options.clock ?? { now: () => asIsoTimestamp(new Date().toISOString()) };
  const initialFormula = options.initialFormula ?? DEFAULT_FORMULA;
  const initialParsed = parseDiceFormula(initialFormula);
  let state: DiceOverlayState = {
    open: false,
    quick: false,
    purpose: "free",
    formula: initialFormula,
    mode: "normal",
    expression: initialParsed.ok ? initialParsed.value : undefined,
    history: [],
    status: "idle",
    announcement: "",
    awaitingPhysics: false,
  };

  /** Só vira `true` quando o palco 3D confirma que montou a mesa. */
  let physicsAvailable = false;
  /** Quem espera a mesa montar para decidir entre física e RNG (primeira rolagem rápida). */
  let physicsWaiters: Array<(available: boolean) => void> = [];
  /** Adia a desistência da física quando a mesa some só pela recriação. */
  let declineTimer: ReturnType<typeof setTimeout> | null = null;

  /** A mesa monta de forma assíncrona (chunk three.js + WebGL); espera um pouco antes de cair no RNG. */
  function waitForPhysics(timeoutMs: number): Promise<boolean> {
    if (physicsAvailable) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        physicsWaiters = physicsWaiters.filter((waiter) => waiter !== done);
        resolve(physicsAvailable);
      }, timeoutMs);
      const done = (available: boolean) => { clearTimeout(timer); resolve(available); };
      physicsWaiters.push(done);
    });
  }
  /** Resolve a Promise de `roll()` quando a física devolve o resultado. */
  let pendingResolve: ((result: Result<DiceRoll, AppError>) => void) | null = null;
  let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

  function publish(patch: Partial<DiceOverlayState>) {
    state = Object.freeze({ ...state, ...patch });
    for (const listener of [...listeners]) listener();
  }

  function expressionForRoll(): Result<DiceExpression, AppError> {
    const parsed = parseDiceFormula(state.formula);
    if (!parsed.ok) return parsed;
    const expression = { ...parsed.value, mode: state.mode };
    return ok(expression);
  }

  async function persist(roll: DiceRoll): Promise<Result<void, AppError>> {
    publish({ status: "saving", persistenceError: undefined });
    return options.history.append({ roll, characterId: roll.characterId });
  }

  function metaFor(metadataSource?: Pick<DiceRoll, "purpose" | "characterId" | "label">): RollMeta {
    const label = metadataSource?.label;
    return {
      id: idGenerator.uuid(),
      timestamp: clock.now(),
      purpose: metadataSource?.purpose ?? state.purpose,
      characterId: metadataSource?.characterId ?? state.characterId,
      ...(label ? { label } : {}),
    };
  }

  /** Publica o desfecho de um `DiceRoll` já montado (por RNG ou pela física). */
  async function settle(roll: DiceRoll): Promise<Result<DiceRoll, AppError>> {
    const saveResult = await persist(roll);
    if (!saveResult.ok) {
      publish({ status: "error", awaitingPhysics: false, result: roll, persistenceError: saveResult.error, announcement: announcementFor(roll) });
      return ok(roll);
    }
    publish({
      status: "idle",
      awaitingPhysics: false,
      result: roll,
      history: [roll, ...state.history.filter((item) => item.id !== roll.id)],
      announcement: announcementFor(roll),
    });
    return ok(roll);
  }

  /** Encerra a espera pela física sem deixar timer nem Promise pendurados. */
  function clearPending(): void {
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    pendingResolve = null;
  }

  async function executeRollWithRng(expressionOverride?: DiceExpression, metadataSource?: Pick<DiceRoll, "purpose" | "characterId" | "label">): Promise<Result<DiceRoll, AppError>> {
    const expressionResult = expressionOverride ? ok(expressionOverride) : expressionForRoll();
    if (!expressionResult.ok) {
      publish({ status: "error", awaitingPhysics: false, validationError: expressionResult.error.message, persistenceError: undefined });
      return expressionResult;
    }
    publish({ status: "rolling", awaitingPhysics: false, validationError: undefined, persistenceError: undefined });
    const result = (options.engine ?? rollExpression)(expressionResult.value, options.rng, metaFor(metadataSource));
    if (!result.ok) {
      publish({ status: "error", awaitingPhysics: false, validationError: result.error.message });
      return result;
    }
    return settle(result.value);
  }

  /**
   * Abre a rolagem e devolve uma Promise que só resolve quando o dado 3D parar
   * — o número vem da face que ficou para cima, não do RNG. Se a física não
   * responder dentro de `PHYSICS_TIMEOUT_MS`, cai no RNG para o botão não
   * ficar girando indefinidamente.
   */
  function executeRollWithPhysics(expressionOverride?: DiceExpression, metadataSource?: Pick<DiceRoll, "purpose" | "characterId" | "label">): Promise<Result<DiceRoll, AppError>> {
    const expressionResult = expressionOverride ? ok(expressionOverride) : expressionForRoll();
    if (!expressionResult.ok) {
      publish({ status: "error", awaitingPhysics: false, validationError: expressionResult.error.message, persistenceError: undefined });
      return Promise.resolve(expressionResult);
    }
    // Uma rolagem física já em voo é abandonada: o clique novo manda na mesa.
    pendingResolve?.(err({ code: "validation-error", field: "roll", message: "Rolagem substituída por outra." }));
    clearPending();

    publish({
      status: "rolling",
      awaitingPhysics: true,
      pendingExpression: expressionResult.value,
      pendingMeta: metaFor(metadataSource),
      // O número da rolagem anterior sai de cena: enquanto o dado rola não
      // existe resultado, e deixá-lo na tela contradiz o ponto do fluxo.
      result: undefined,
      validationError: undefined,
      persistenceError: undefined,
    });

    return new Promise<Result<DiceRoll, AppError>>((resolve) => {
      pendingResolve = resolve;
      pendingTimeout = setTimeout(() => {
        pendingTimeout = null;
        if (pendingResolve !== resolve) return;
        pendingResolve = null;
        // A mesa não respondeu (contexto perdido, aba suspensa): o RNG fecha a
        // rolagem para o usuário não ficar preso num botão ocupado.
        void executeRollWithRng(expressionResult.value, metadataSource).then(resolve);
      }, PHYSICS_TIMEOUT_MS);
    });
  }

  function executeRoll(expressionOverride?: DiceExpression, metadataSource?: Pick<DiceRoll, "purpose" | "characterId" | "label">): Promise<Result<DiceRoll, AppError>> {
    return physicsAvailable
      ? executeRollWithPhysics(expressionOverride, metadataSource)
      : executeRollWithRng(expressionOverride, metadataSource);
  }

  const controller: DiceOverlayController = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open(openOptions = {}) {
      const formula = openOptions.formula ?? state.formula;
      const parsed = parseDiceFormula(formula);
      publish({
        open: true,
        source: openOptions.source,
        characterId: openOptions.characterId,
        purpose: openOptions.purpose ?? "free",
        formula,
        mode: "normal",
        expression: parsed.ok ? { ...parsed.value, mode: "normal" } : undefined,
        validationError: undefined,
        persistenceError: undefined,
        status: "idle",
        announcement: "",
      });
      void controller.hydrate();
    },
    close() {
      // Fechar no meio da queda cancela a rolagem: nada é persistido, senão o
      // histórico ganharia um resultado que o usuário nunca chegou a ver.
      if (pendingResolve) {
        pendingResolve(err({ code: "validation-error", field: "roll", message: "Rolagem cancelada." }));
        clearPending();
      }
      publish({ open: false, quick: false, awaitingPhysics: false, pendingExpression: undefined, pendingMeta: undefined, status: "idle" });
    },
    async quickRoll(request) {
      const metadata = { purpose: request.purpose ?? "free", characterId: request.characterId ?? state.characterId, ...(request.label ? { label: request.label } : {}) };
      publish({ quick: true, validationError: undefined, persistenceError: undefined });
      // Primeira rolagem rápida: a mesa ainda está montando. Sem ela, o RNG decide na hora.
      if (!physicsAvailable) await waitForPhysics(2_500);
      return executeRoll(request.expression, metadata);
    },
    endQuick() {
      if (!state.quick) return;
      if (!state.open && pendingResolve) {
        pendingResolve(err({ code: "validation-error", field: "roll", message: "Rolagem cancelada." }));
        clearPending();
      }
      publish({ quick: false, ...(state.open ? {} : { awaitingPhysics: false, pendingExpression: undefined, pendingMeta: undefined }) });
    },
    setFormula(formula) {
      const parsed = parseDiceFormula(formula);
      publish({
        formula,
        expression: parsed.ok ? { ...parsed.value, mode: state.mode } : undefined,
        validationError: parsed.ok ? undefined : parsed.error.message,
        persistenceError: undefined,
        status: parsed.ok ? "idle" : "error",
      });
    },
    setQuantity(quantity) {
      updateExpression({ quantity });
    },
    setFaces(faces) {
      updateExpression({ faces });
    },
    setModifier(modifier) {
      updateExpression({ modifier });
    },
    setMode(mode) {
      const expression = state.expression ? { ...state.expression, mode } : undefined;
      publish({ mode, expression, validationError: undefined, status: "idle" });
    },
    roll: executeRoll,
    reroll(roll = state.result) {
      if (!roll) return Promise.resolve(err({ code: "validation-error", field: "result", message: "Faça uma rolagem antes de rolar novamente." }));
      return executeRoll(roll.expression, roll);
    },
    async hydrate(characterId) {
      if (characterId !== undefined && characterId !== state.characterId) publish({ characterId });
      // `open()` dispara a hidratação, que pode terminar com uma rolagem já em
      // curso — e uma rolagem física fica no ar por segundos. Publicar o status
      // do histórico por cima apagaria o "rolando" com os dados ainda caindo.
      const rolando = () => state.status === "rolling" || state.status === "saving" || state.awaitingPhysics;
      if (!rolando()) publish({ status: "hydrating" });
      const page = await options.history.hydrate(state.characterId);
      if (!page.ok) {
        publish(rolando() ? { persistenceError: page.error } : { status: "error", persistenceError: page.error });
        return page;
      }
      const hydrated = page.value.entries.map((entry) => entry.roll);
      const known = new Set(hydrated.map((roll) => roll.id));
      const history = [...state.history.filter((roll) => !known.has(roll.id)), ...hydrated];
      publish(rolando() ? { history } : { status: "idle", history });
      return page;
    },
    setPhysicsAvailable(available) {
      physicsAvailable = available;
      const waiters = physicsWaiters;
      physicsWaiters = [];
      waiters.forEach((waiter) => waiter(available));
      if (declineTimer !== null) { clearTimeout(declineTimer); declineTimer = null; }
      // A mesa morreu com uma rolagem em voo (contexto WebGL perdido, overlay
      // trocando de variante): fecha pelo RNG. Espera um instante antes, porque
      // a mesa também some por um quadro quando é recriada (resize, troca de modo).
      if (!available && pendingResolve) {
        declineTimer = setTimeout(() => {
          declineTimer = null;
          if (!physicsAvailable && pendingResolve) controller.declinePhysics();
        }, PHYSICS_REMOUNT_GRACE_MS);
      }
    },
    declinePhysics() {
      const expr = state.pendingExpression;
      const meta = state.pendingMeta;
      const resolve = pendingResolve;
      if (!expr || !resolve) return;
      clearPending();
      publish({ pendingExpression: undefined, pendingMeta: undefined });
      // Mantém propósito e rótulo da rolagem original ("Teste de perícia (…)").
      void executeRollWithRng(expr, meta).then(resolve);
    },
    async onPhysicsResult(values) {
      const expr = state.pendingExpression;
      const meta = state.pendingMeta;
      const resolve = pendingResolve;
      // Sem rolagem em aberto não há o que fechar — resultado atrasado de uma
      // rolagem já cancelada ou substituída chega aqui e deve ser ignorado.
      if (!expr || !meta || !resolve) return;
      clearPending();

      const result = buildRollFromValues(expr, [...values], meta);
      if (!result.ok) {
        publish({ status: "error", awaitingPhysics: false, pendingExpression: undefined, pendingMeta: undefined, validationError: result.error.message });
        resolve(result);
        return;
      }
      const settled = await settle(result.value);
      publish({ pendingExpression: undefined, pendingMeta: undefined });
      resolve(settled);
    },
  };

  function updateExpression(patch: Partial<DiceExpression>): void {
    const parsed = parseDiceFormula(state.formula);
    const base = parsed.ok ? parsed.value : { quantity: 1, faces: 20 as DiceFaces, modifier: 0, mode: "normal" as const };
    const next = { ...base, ...patch, mode: state.mode };
    controller.setFormula(formatDiceFormula(next));
  }

  return controller;
}

export function useDiceOverlay(controller: DiceOverlayController): DiceOverlayState {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
}

function announcementFor(roll: DiceRoll): string {
  const faces = roll.rawDice.join(", ");
  return `Rolagem ${roll.expression.quantity}d${roll.expression.faces}: dados ${faces}; total ${roll.total}.`;
}

let fallbackUuidCounter = 0;

function fallbackUuid(): string {
  fallbackUuidCounter += 1;
  return `00000000-0000-4000-8000-${fallbackUuidCounter.toString(16).padStart(12, "0")}`;
}
