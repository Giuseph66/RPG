import { describe, expect, it } from "vitest";

import {
  AA_LARGE_TEXT_OR_COMPONENT,
  AA_NORMAL_TEXT,
  contrastRatio,
} from "./contrast";
import { colorHex } from "./tokens";

describe("contrastRatio", () => {
  it("is 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("is 1:1 for identical colors", () => {
    expect(contrastRatio("#140507", "#140507")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#111111", "#eeeeee")).toBeCloseTo(
      contrastRatio("#eeeeee", "#111111"),
      10,
    );
  });

  it("accepts 3-digit hex shorthand", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 1);
  });

  it("rejects invalid hex input", () => {
    expect(() => contrastRatio("not-a-color", "#fff")).toThrow();
  });
});

/**
 * Real token contrast matrix required by UI-001. Every pair below is a
 * combination that actually appears in a shipped component. Thresholds
 * follow WCAG 2.2: 4.5:1 for normal text, 3:1 for large text and for
 * essential UI components/graphical indicators. Do not relax a threshold
 * to make a pair pass — adjust `tokens.ts`/`tokens.css` instead.
 */
type Pair = {
  description: string;
  foreground: keyof typeof colorHex;
  background: keyof typeof colorHex;
  threshold: number;
};

const textPairs: Pair[] = [
  {
    description: "body text on background",
    foreground: "text",
    background: "background",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "body text on surface",
    foreground: "text",
    background: "surface",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "body text on elevated surface",
    foreground: "text",
    background: "surfaceElevated",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "muted text on background",
    foreground: "textMuted",
    background: "background",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "muted text on surface",
    foreground: "textMuted",
    background: "surface",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on primary action (Button primary)",
    foreground: "onPrimary",
    background: "primary",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on secondary action (Button secondary fill)",
    foreground: "onSecondary",
    background: "secondary",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on HP tone (Badge/ProgressBar hp)",
    foreground: "onHp",
    background: "hp",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on XP tone (Badge/ProgressBar xp)",
    foreground: "onXp",
    background: "xp",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on magic tone (Badge/ProgressBar magic)",
    foreground: "onMagic",
    background: "magic",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on warning tone (Badge/InlineStatus warning)",
    foreground: "onWarning",
    background: "warning",
    threshold: AA_NORMAL_TEXT,
  },
  {
    description: "text on danger tone (Badge/Button danger)",
    foreground: "onDanger",
    background: "danger",
    threshold: AA_NORMAL_TEXT,
  },
];

const focusPairs: Pair[] = [
  {
    description: "focus ring vs background",
    foreground: "focus",
    background: "background",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "focus ring vs surface",
    foreground: "focus",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "focus ring vs elevated surface",
    foreground: "focus",
    background: "surfaceElevated",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
];

const structuralPairs: Pair[] = [
  {
    description: "border vs surface",
    foreground: "border",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
];

const indicatorPairs: Pair[] = [
  {
    description: "hp indicator vs surface",
    foreground: "hp",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "xp indicator vs surface",
    foreground: "xp",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "magic indicator vs surface",
    foreground: "magic",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "warning indicator vs surface",
    foreground: "warning",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
  {
    description: "danger indicator vs surface",
    foreground: "danger",
    background: "surface",
    threshold: AA_LARGE_TEXT_OR_COMPONENT,
  },
];

const allPairs = [
  ...textPairs,
  ...focusPairs,
  ...structuralPairs,
  ...indicatorPairs,
];

describe("token contrast matrix", () => {
  it.each(allPairs)(
    "$description ($foreground/$background) >= $threshold:1",
    ({ foreground, background, threshold }) => {
      const ratio = contrastRatio(colorHex[foreground], colorHex[background]);
      expect(ratio).toBeGreaterThanOrEqual(threshold);
    },
  );

  it("hp and danger are distinct hues, not the same red reused", () => {
    expect(colorHex.hp).not.toBe(colorHex.danger);
    // Distinguishability also relies on text/icon per component, not
    // color alone (see docs/criacao/interface/estados-visuais.md).
  });
});
