/**
 * Pure WCAG 2.x contrast utilities. No DOM, no dependency on tokens —
 * this file only knows how to compare two hex colors.
 */

export type HexColor = string;

const HEX_PATTERN_SHORT = /^#?[0-9a-fA-F]{3}$/;
const HEX_PATTERN_LONG = /^#?[0-9a-fA-F]{6}$/;

function hexToRgb(hex: HexColor): [number, number, number] {
  const normalized = hex.trim();
  let full: string;

  if (HEX_PATTERN_SHORT.test(normalized)) {
    const digits = normalized.replace("#", "");
    full = digits
      .split("")
      .map((digit) => digit + digit)
      .join("");
  } else if (HEX_PATTERN_LONG.test(normalized)) {
    full = normalized.replace("#", "");
  } else {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  const intValue = parseInt(full, 16);
  return [(intValue >> 16) & 255, (intValue >> 8) & 255, intValue & 255];
}

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a color, in the 0 (black) – 1 (white) range. */
export function relativeLuminance(hex: HexColor): number {
  const [r, g, b] = hexToRgb(hex);
  const [rLinear, gLinear, bLinear] = [
    channelToLinear(r),
    channelToLinear(g),
    channelToLinear(b),
  ];
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * WCAG contrast ratio between two colors, from 1 (no contrast) to 21
 * (black on white). Order of arguments does not matter.
 */
export function contrastRatio(hexA: HexColor, hexB: HexColor): number {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG 2.x AA threshold for normal-sized text (below 18pt / 14pt bold). */
export const AA_NORMAL_TEXT = 4.5;

/** WCAG 2.x AA threshold for large text and for essential UI components/graphics. */
export const AA_LARGE_TEXT_OR_COMPONENT = 3;

export function meetsContrast(
  hexA: HexColor,
  hexB: HexColor,
  threshold: number,
): boolean {
  return contrastRatio(hexA, hexB) >= threshold;
}
