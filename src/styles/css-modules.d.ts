/**
 * Ambient module declaration for CSS Modules (`*.module.css`), which Vite
 * supports natively without any extra dependency. Lives under
 * `src/styles/**` (UI-001 ownership) but, as an ambient `declare module`
 * with no top-level import/export, applies to the whole TypeScript
 * program — including `src/components/ui/**`, which relies on it.
 */
declare module "*.module.css" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
