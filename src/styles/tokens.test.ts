/// <reference types="node" />
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  colorHex,
  motion,
  radius,
  shadow,
  size,
  spacing,
  typography,
  zIndex,
} from "./tokens";

const currentFile = fileURLToPath(import.meta.url);
const cssPath = resolve(dirname(currentFile), "tokens.css");
const css = readFileSync(cssPath, "utf-8");

function cssValueOf(customProperty: string): string {
  const pattern = new RegExp(
    `${customProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*([^;]+);`,
  );
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Custom property ${customProperty} not found in tokens.css`);
  }
  return match[1].trim();
}

function toKebabCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

describe("tokens.css matches tokens.ts", () => {
  it.each(Object.entries(colorHex))("color.%s", (name, hex) => {
    expect(cssValueOf(`--color-${toKebabCase(name)}`).toLowerCase()).toBe(hex);
  });

  it.each(Object.entries(spacing))("spacing.%s", (name, value) => {
    expect(cssValueOf(`--spacing-${name}`)).toBe(value);
  });

  it.each(Object.entries(radius))("radius.%s", (name, value) => {
    expect(cssValueOf(`--radius-${name}`)).toBe(value);
  });

  it.each(Object.entries(shadow))("shadow.%s", (name, value) => {
    expect(cssValueOf(`--shadow-${name}`)).toBe(value);
  });

  it.each(Object.entries(zIndex))("zIndex.%s", (name, value) => {
    expect(cssValueOf(`--z-${toKebabCase(name)}`)).toBe(String(value));
  });

  it.each(Object.entries(size))("size.%s", (name, value) => {
    expect(cssValueOf(`--size-${toKebabCase(name)}`)).toBe(value);
  });

  it("motion.immediate/feedback/transition/easing", () => {
    expect(cssValueOf("--motion-immediate")).toBe(motion.immediate);
    expect(cssValueOf("--motion-feedback")).toBe(motion.feedback);
    expect(cssValueOf("--motion-transition")).toBe(motion.transition);
    expect(cssValueOf("--motion-easing")).toBe(motion.easing);
  });

  it("typography scale font sizes/weights/line-heights", () => {
    for (const key of Object.keys(typography) as Array<
      keyof typeof typography
    >) {
      const scale = typography[key];
      expect(cssValueOf(`--typography-${key}-font-size`)).toBe(
        scale.fontSize,
      );
      expect(cssValueOf(`--typography-${key}-font-weight`)).toBe(
        scale.fontWeight,
      );
      expect(cssValueOf(`--typography-${key}-line-height`)).toBe(
        scale.lineHeight,
      );
    }
  });

  it("numeric typography uses tabular figures", () => {
    expect(cssValueOf("--typography-numeric-font-variant-numeric")).toBe(
      "tabular-nums",
    );
    expect(typography.numeric.fontVariantNumeric).toBe("tabular-nums");
  });

  it("reduced motion zeroes feedback and transition durations", () => {
    const reducedMotionBlock = css.match(
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/,
    );
    expect(reducedMotionBlock).not.toBeNull();
    const block = reducedMotionBlock ? reducedMotionBlock[1] : "";
    expect(block).toMatch(/--motion-feedback:\s*0ms;/);
    expect(block).toMatch(/--motion-transition:\s*0ms;/);
  });
});
