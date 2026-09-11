/**
 * Focus-trap/inert helpers shared by AppModal, BottomSheet, Drawer (modal)
 * and ContextMenu.
 *
 * Decision: jsdom 29.1.1 (the version pinned in this repo, see
 * node_modules/jsdom/package.json) does not implement `<dialog>` behavior
 * at all — `HTMLDialogElementImpl` is an empty subclass of
 * `HTMLElementImpl` with no `showModal`/`close`, and the `inert` IDL
 * property is not defined on elements either (verified directly against
 * the installed jsdom build; both are `undefined`). Relying on native
 * `<dialog>` or on `inert` actually preventing focus would make focus-trap
 * tests unable to run and unable to fail honestly. All overlay
 * mechanics here are therefore implemented manually: a `role="dialog"`
 * container, a JS keydown-based Tab cycle (this file + useFocusTrap), and
 * the `inert`/`aria-hidden` attributes are still set on background
 * siblings for real-browser correctness, even though jsdom will not
 * enforce them — tests assert the attribute, not the enforcement.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "details",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => el.getAttribute("aria-hidden") !== "true" && !el.hasAttribute("inert"));
}
