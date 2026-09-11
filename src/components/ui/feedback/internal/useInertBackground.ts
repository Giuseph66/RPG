import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Makes everything outside `containerRef`'s ancestor chain (up to
 * `document.body`) inert and hidden from assistive tech while `active`.
 *
 * This does not assume a portal or a known app-root id (this package
 * cannot edit `index.html`/`main.tsx`), so it walks up from the modal
 * node itself: at every level between the container and `document.body`,
 * it marks the *other* siblings at that level as `inert` +
 * `aria-hidden="true"`, and restores their previous state on cleanup.
 *
 * jsdom does not implement `inert` behavior (see focusUtils.ts), so this
 * only proves the attributes are present/removed correctly; it does not
 * prove browsers actually stop pointer/focus interaction with those
 * siblings — that part relies on the real `inert` spec in production and
 * is not exercised by these tests.
 */
export function useInertBackground(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const restoreFns: Array<() => void> = [];
    let node: HTMLElement | null = container;

    while (node && node !== document.body && node.parentElement) {
      const parent: HTMLElement = node.parentElement;
      const currentNode = node;

      Array.from(parent.children).forEach((sibling) => {
        if (sibling === currentNode || !(sibling instanceof HTMLElement)) {
          return;
        }

        const hadInert = sibling.hasAttribute("inert");
        const previousAriaHidden = sibling.getAttribute("aria-hidden");

        sibling.setAttribute("inert", "");
        sibling.setAttribute("aria-hidden", "true");

        restoreFns.push(() => {
          if (!hadInert) {
            sibling.removeAttribute("inert");
          }
          if (previousAriaHidden === null) {
            sibling.removeAttribute("aria-hidden");
          } else {
            sibling.setAttribute("aria-hidden", previousAriaHidden);
          }
        });
      });

      node = parent;
    }

    return () => {
      restoreFns.forEach((restore) => restore());
    };
  }, [active, containerRef]);
}
