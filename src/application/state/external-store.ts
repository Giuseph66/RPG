import { useRef, useSyncExternalStore } from "react";

/** Estado observável compartilhado pelos stores de aplicação. */
export type StoreStatus = "idle" | "hydrating" | "clean" | "dirty" | "saving" | "error" | "conflict";

export interface StoreSnapshot<T> {
  readonly status: StoreStatus;
  /** `value` é o nome canônico; `data` facilita a leitura por consumidores de UI. */
  readonly value?: T;
  readonly data?: T;
  readonly selectedId?: string;
  readonly error?: unknown;
  readonly hasPendingChanges: boolean;
}

export type StoreListener = () => void;
export type SnapshotSelector<T, Selected> = (snapshot: StoreSnapshot<T>) => Selected;

/**
 * External store mínimo, com snapshot estável e assinatura explícita.
 * A classe não conhece React além do hook opcional exportado abaixo; isso permite
 * usar o mesmo store em testes, composição e outros consumidores observáveis.
 */
export class ExternalStore<T> {
  private readonly listeners = new Set<StoreListener>();
  private snapshot: StoreSnapshot<T>;

  constructor(initial: StoreSnapshot<T>) {
    this.snapshot = Object.freeze(initial);
  }

  getSnapshot = (): StoreSnapshot<T> => this.snapshot;

  subscribe = (listener: StoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Assina somente quando o valor selecionado muda. */
  subscribeSelector<Selected>(
    selector: SnapshotSelector<T, Selected>,
    listener: (selected: Selected, snapshot: StoreSnapshot<T>) => void,
    equality: (left: Selected, right: Selected) => boolean = Object.is,
  ): () => void {
    let previous = selector(this.snapshot);
    return this.subscribe(() => {
      const next = selector(this.snapshot);
      if (equality(previous, next)) return;
      previous = next;
      listener(next, this.snapshot);
    });
  }

  protected setSnapshot(next: StoreSnapshot<T>): void {
    if (Object.is(this.snapshot, next)) return;
    this.snapshot = Object.freeze(next);
    for (const listener of [...this.listeners]) listener();
  }

  protected publish(
    patch: Partial<StoreSnapshot<T>> & Pick<StoreSnapshot<T>, "status" | "hasPendingChanges">,
  ): void {
    const hasValue = Object.prototype.hasOwnProperty.call(patch, "value");
    const value = hasValue ? patch.value : this.snapshot.value;
    this.setSnapshot({
      ...this.snapshot,
      ...patch,
      ...(value === undefined ? { data: undefined } : { data: value }),
    });
  }
}

/** Hook pronto para UI-002 e features futuras. O selector evita renders amplos. */
export function useExternalStore<T, Selected = StoreSnapshot<T>>(
  store: ExternalStore<T>,
  selector: SnapshotSelector<T, Selected> = ((snapshot) => snapshot as unknown as Selected),
  equality: (left: Selected, right: Selected) => boolean = Object.is,
): Selected {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const selected = selector(snapshot);
  const previous = useRef(selected);
  if (!equality(previous.current, selected)) previous.current = selected;
  return previous.current;
}

export const useStore = useExternalStore;

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (ArrayBuffer.isView(value)) return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

export function immutable<T>(value: T): T {
  return deepFreeze(value);
}

/** Clona antes de congelar para nunca tornar mutável o objeto pertencente ao adapter. */
export function immutableSnapshot<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  try {
    return immutable(typeof structuredClone === "function" ? structuredClone(value) : value);
  } catch {
    return immutable(value);
  }
}
