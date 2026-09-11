/**
 * Shared test helpers for `src/components/ui/**` tests. No @testing-library
 * is available in this project (see package.json); tests mount components
 * with `react-dom/client` directly and drive them with real DOM events.
 */
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

// React's `act` warns unless the test environment declares itself capable
// of flushing effects synchronously. This project has no @testing-library
// setup file (see tests/setup.ts, owned by CORE-001) that would normally
// set this, so UI-001's own shared test helper does it instead.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Mounted {
  container: HTMLElement;
  root: Root;
  rerender: (node: ReactNode) => Promise<void>;
  unmount: () => Promise<void>;
}

export async function mount(node: ReactNode): Promise<Mounted> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(node);
  });

  return {
    container,
    root,
    rerender: async (next: ReactNode) => {
      await act(async () => {
        root.render(next);
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export async function fireEvent(target: EventTarget, event: Event): Promise<void> {
  await act(async () => {
    target.dispatchEvent(event);
  });
}

export function click(target: Element): Promise<void> {
  return fireEvent(
    target,
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
}

export function mouseDown(target: EventTarget): Promise<void> {
  return fireEvent(
    target,
    new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
  );
}

export function keyDown(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): Promise<void> {
  return fireEvent(
    target,
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
  );
}

export function focus(target: HTMLElement): Promise<void> {
  return act(async () => {
    target.focus();
  });
}
