import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function token(name: string): string {
  const source = readFileSync("src/styles/tokens.css", "utf8");
  return source.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? "";
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const light = luminance(foreground); const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

describe("A11Y-001 contraste dos tokens", () => {
  it("mantém texto normal acima de 4.5:1 nas superfícies principais", () => {
    expect(contrast(token("--color-text"), token("--color-background"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--color-text"), token("--color-surface"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("--color-text-muted"), token("--color-background"))).toBeGreaterThanOrEqual(4.5);
  });

  it("mantém foco e estados essenciais discerníveis", () => {
    expect(contrast(token("--color-focus"), token("--color-background"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("--color-on-danger"), token("--color-danger"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("--color-on-primary"), token("--color-primary"))).toBeGreaterThanOrEqual(3);
  });
});

