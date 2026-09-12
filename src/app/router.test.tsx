import { act } from "react";
import { describe, expect, it } from "vitest";

import { mount } from "@components/ui/testUtils";
import { createApplicationRuntime } from "./bootstrap";
import { AppRouter } from "./router";

describe("AppRouter", () => {
  it("keeps a deep utility route when mounted without an initial path", async () => {
    const originalUrl = window.location.href;
    window.history.replaceState({}, "", "/settings");

    try {
      const firstMount = await mount(<AppRouter navigate={() => undefined} />);
      expect(firstMount.container.textContent).toContain("Configurações");
      await firstMount.unmount();

      const reloadMount = await mount(<AppRouter navigate={() => undefined} />);
      expect(reloadMount.container.textContent).toContain("Configurações");
      expect(reloadMount.container.textContent).not.toContain("Abra sua mesa");
      await reloadMount.unmount();
    } finally {
      window.history.replaceState({}, "", originalUrl);
    }
  });

  it("wires compendium search and detail through the real route composition", async () => {
    const runtime = await createApplicationRuntime();
    const mounted = await mount(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const input = mounted.container.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      await act(async () => {
        setter?.call(input, "adaga");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(input.value).toBe("adaga");
      const result = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")]
        .find((button) => button.textContent?.includes("Adaga")) as HTMLButtonElement | undefined;
      expect(result).toBeDefined();
      await act(async () => result?.click());
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Adaga");
      expect(mounted.container.textContent).toContain("Fonte:");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });

  it("opens a static attribute detail with its local source", async () => {
    const runtime = await createApplicationRuntime();
    const mounted = await mount(<AppRouter initialPath="/compendium" navigate={() => undefined} registry={runtime.registry} diceOverlayController={runtime.diceOverlayController} />);
    try {
      const input = mounted.container.querySelector('input:not([type="checkbox"])') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      await act(async () => {
        setter?.call(input, "força");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const result = [...mounted.container.querySelectorAll("section[aria-labelledby=\"compendium-results-title\"] button")]
        .find((button) => button.textContent?.includes("Força")) as HTMLButtonElement | undefined;
      expect(result).toBeDefined();
      await act(async () => result?.click());
      expect(mounted.container.querySelector("#compendium-detail-title")?.textContent).toBe("Força");
      expect(mounted.container.textContent).toContain("Capítulo 1");
    } finally {
      await mounted.unmount();
      runtime.services.character.dispose();
      runtime.services.campaign.dispose();
      runtime.services.settings.dispose();
      runtime.services.dice.dispose();
      runtime.database.close();
    }
  });
});
