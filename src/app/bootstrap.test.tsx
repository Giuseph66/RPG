import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Bootstrap, createApplicationRuntime } from "@app/bootstrap";

describe("Bootstrap", () => {
  it("keeps the application landmark visible while local data opens", () => {
    const markup = renderToStaticMarkup(<Bootstrap initialPath="/" />);

    expect(markup).toContain('aria-label="Destinos principais"');
    expect(markup).toContain("Abrindo dados locais");
  });

  it("renders the initial route through the real shell after boot", async () => {
    const runtime = await createApplicationRuntime();
    try {
      const markup = renderToStaticMarkup(<Bootstrap runtime={runtime} initialPath="/compendium" />);

      expect(markup).toContain("Índice local");
      expect(markup).toContain('aria-current="page"');
      expect(markup).toContain("Compêndio");
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });
});
