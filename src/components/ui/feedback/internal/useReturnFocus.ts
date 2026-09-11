import { useLayoutEffect, useRef } from "react";

/**
 * Remembers whatever had focus when `active` became true, and restores
 * focus to it when `active` becomes false OR the component unmounts while
 * still active (the effect cleanup covers both cases).
 *
 * Uses `useLayoutEffect`, not `useEffect`: it must capture
 * `document.activeElement` *before* the modal's own "move focus inside"
 * layout effect runs and changes it. Layout effects run in declaration
 * order within a component, and always before passive effects, so this
 * hook must be invoked ahead of that one (see useModalBehavior.ts).
 */
export function useReturnFocus(active: boolean): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!active) return undefined;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    return () => {
      const target = previouslyFocused.current;
      if (target && document.contains(target)) {
        target.focus();
      }
    };
  }, [active]);
}
