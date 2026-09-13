/**
 * Single source of truth for design tokens with real numeric/hex values.
 *
 * `tokens.css` mirrors these values as CSS custom properties on `:root`.
 * `src/styles/tokens.test.ts` parses `tokens.css` and asserts every value
 * here matches the declaration there, so the two files cannot silently
 * drift apart. Components should prefer importing `tokens` (the CSS
 * variable references) inside CSS Modules via `var(--color-primary)` etc.;
 * `tokens.ts` exists for tooling, tests and any TypeScript code that needs
 * the literal value (e.g. the contrast matrix).
 */

export const colorHex = {
  background: "#070a0b",
  surface: "#0c1113",
  surfaceElevated: "#11191c",
  surfaceWarm: "#17110d",
  primary: "#a97845",
  secondary: "#d0ab72",
  goldMuted: "#9b7951",
  hp: "#d10000",
  xp: "#829b5f",
  magic: "#7694c9",
  warning: "#d0ab72",
  danger: "#ef4444",
  text: "#f0e4d4",
  textMuted: "#b8aa9b",
  border: "#be905b",
  borderSoft: "rgba(190, 144, 91, 0.42)",
  focus: "#d0ab72",
  controlDisabled: "#786b5f",
  onPrimary: "#070a0b",
  onSecondary: "#070a0b",
  onHp: "#ffffff",
  onXp: "#070a0b",
  onMagic: "#070a0b",
  onWarning: "#070a0b",
  onDanger: "#070a0b",
  backdrop: "rgba(0, 0, 0, 0.78)",
} as const;

export type ColorToken = keyof typeof colorHex;

export const spacing = {
  none: "0px",
  xs: "0.25rem",
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  section: "3rem",
} as const;

export const radius = {
  control: "0.375rem",
  surface: "0.625rem",
  overlay: "0.875rem",
  pill: "999px",
} as const;

export const shadow = {
  none: "none",
  overlay: "0 20px 40px rgba(0, 0, 0, 0.72)",
  surface: "0 8px 24px rgba(0, 0, 0, 0.24)",
} as const;

export const typography = {
  display: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: "1.75rem",
    fontWeight: "700",
    lineHeight: "1.2",
  },
  heading: {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: "1.25rem",
    fontWeight: "600",
    lineHeight: "1.3",
  },
  body: {
    fontFamily: "'Alegreya', Georgia, serif",
    fontSize: "1rem",
    fontWeight: "400",
    lineHeight: "1.5",
  },
  label: {
    fontFamily: "'Alegreya', Georgia, serif",
    fontSize: "0.875rem",
    fontWeight: "600",
    lineHeight: "1.4",
  },
  numeric: {
    fontFamily: "'Alegreya', Georgia, serif",
    fontSize: "1.125rem",
    fontWeight: "600",
    lineHeight: "1.2",
    fontVariantNumeric: "tabular-nums",
  },
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  navigation: 20,
  floatingAction: 30,
  backdrop: 40,
  overlay: 50,
  overlayPopover: 60,
  toast: 70,
} as const;

export const size = {
  touchTarget: "44px",
  headerCompact: "96px",
  headerExpanded: "112px",
  navHeight: "64px",
  contentMeasure: "65ch",
} as const;

export const motion = {
  immediate: "0ms",
  feedback: "120ms",
  transition: "200ms",
  easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

/** CSS variable references, for TSX/JS that needs to read a token via `var(...)`. */
export const tokens = {
  color: Object.fromEntries(
    Object.keys(colorHex).map((key) => [
      key,
      `var(--color-${camelToKebab(key)})`,
    ]),
  ) as Record<ColorToken, string>,
  spacing: Object.fromEntries(
    Object.keys(spacing).map((key) => [key, `var(--spacing-${key})`]),
  ) as Record<keyof typeof spacing, string>,
  radius: Object.fromEntries(
    Object.keys(radius).map((key) => [key, `var(--radius-${key})`]),
  ) as Record<keyof typeof radius, string>,
  shadow: Object.fromEntries(
    Object.keys(shadow).map((key) => [key, `var(--shadow-${key})`]),
  ) as Record<keyof typeof shadow, string>,
  zIndex: Object.fromEntries(
    Object.keys(zIndex).map((key) => [key, `var(--z-${camelToKebab(key)})`]),
  ) as Record<keyof typeof zIndex, string>,
  size: Object.fromEntries(
    Object.keys(size).map((key) => [key, `var(--size-${camelToKebab(key)})`]),
  ) as Record<keyof typeof size, string>,
  motion: Object.fromEntries(
    Object.keys(motion).map((key) => [key, `var(--motion-${key})`]),
  ) as Record<keyof typeof motion, string>,
};

function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
