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

export type DiceOverlaySource = "character" | "actions" | "journey" | "compendium" | "header" | "fab" | "contextual";

export interface DiceOverlayOpenOptions {
  readonly source?: DiceOverlaySource;
  readonly characterId?: Uuid;
  readonly purpose?: DicePurpose;
  readonly formula?: string;
}

export interface DiceOverlayState {
  readonly open: boolean;
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
  hydrate(): Promise<Result<DiceHistoryPage, AppError>>;
}

const DEFAULT_FORMULA = "1d20";

export function createDiceOverlayController(options: DiceOverlayControllerOptions): DiceOverlayController {
  const listeners = new Set<DiceOverlayListener>();
  const idGenerator = options.idGenerator ?? { uuid: () => asUuid(globalThis.crypto?.randomUUID?.() ?? fallbackUuid()) };
  const clock = options.clock ?? { now: () => asIsoTimestamp(new Date().toISOString()) };
  const initialFormula = options.initialFormula ?? DEFAULT_FORMULA;
  const initialParsed = parseDiceFormula(initialFormula);
  let state: DiceOverlayState = {
    open: false,
    purpose: "free",
    formula: initialFormula,
    mode: "normal",
    expression: initialParsed.ok ? initialParsed.value : undefined,
    history: [],
    status: "idle",
    announcement: "",
  };

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

  async function executeRoll(expressionOverride?: DiceExpression, metadataSource?: DiceRoll): Promise<Result<DiceRoll, AppError>> {
    const expressionResult = expressionOverride ? ok(expressionOverride) : expressionForRoll();
    if (!expressionResult.ok) {
      publish({ status: "error", validationError: expressionResult.error.message, persistenceError: undefined });
      return expressionResult;
    }
    publish({ status: "rolling", validationError: undefined, persistenceError: undefined });
    const result = (options.engine ?? rollExpression)(expressionResult.value, options.rng, {
      id: idGenerator.uuid(),
      timestamp: clock.now(),
      purpose: metadataSource?.purpose ?? state.purpose,
      characterId: metadataSource?.characterId ?? state.characterId,
    });
    if (!result.ok) {
      publish({ status: "error", validationError: result.error.message });
      return result;
    }
    const saveResult = await persist(result.value);
    if (!saveResult.ok) {
      publish({ status: "error", result: result.value, persistenceError: saveResult.error, announcement: announcementFor(result.value) });
      return ok(result.value);
    }
    publish({
      status: "idle",
      result: result.value,
      history: [result.value, ...state.history.filter((item) => item.id !== result.value.id)],
      announcement: announcementFor(result.value),
    });
    return result;
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
    close() { publish({ open: false }); },
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
    async hydrate() {
      publish({ status: "hydrating" });
      const page = await options.history.hydrate(state.characterId);
      if (!page.ok) {
        publish({ status: "error", persistenceError: page.error });
        return page;
      }
      const hydrated = page.value.entries.map((entry) => entry.roll);
      const known = new Set(hydrated.map((roll) => roll.id));
      publish({ status: "idle", history: [...state.history.filter((roll) => !known.has(roll.id)), ...hydrated] });
      return page;
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
