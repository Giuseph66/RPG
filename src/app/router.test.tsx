import { describe, expect, it } from "vitest";

import { mount } from "@components/ui/testUtils";
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
});
