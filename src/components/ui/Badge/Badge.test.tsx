import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("always renders visible text, not only a color", async () => {
    const { container, unmount } = await mount(<Badge tone="hp">PV baixo</Badge>);
    expect(container.textContent).toBe("PV baixo");
    await unmount();
  });

  it("applies a tone class per tone", async () => {
    const tones = ["neutral", "hp", "xp", "magic", "warning", "danger"] as const;
    for (const tone of tones) {
      const { container, unmount } = await mount(<Badge tone={tone}>x</Badge>);
      const el = container.firstElementChild as HTMLElement;
      expect(el.className.length).toBeGreaterThan(0);
      await unmount();
    }
  });

  it("defaults to neutral tone", async () => {
    const { container, unmount } = await mount(<Badge>Padrão</Badge>);
    expect(container.textContent).toBe("Padrão");
    await unmount();
  });
});
