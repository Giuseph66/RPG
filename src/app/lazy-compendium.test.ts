import { describe, expect, it } from "vitest";

import { createCompendiumService } from "@application/compendium";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";

import { createLazyCompendiumLoader } from "./lazy-compendium";

describe("lazy compendium catalog", () => {
  it("loads the static catalog once and keeps the service identity", async () => {
    const service = createCompendiumService({ items: [{ entityType: "spell", ruleset: { id: asRulesetId("smoke-pack"), version: "1.0.0" as never }, definition: { id: asEntityId("smoke-spell"), name: "Magia smoke", tags: [], sourceRefs: [] } as never }] });
    const loader = createLazyCompendiumLoader(service);
    const first = loader();
    const second = loader();
    expect(second).toBe(first);
    await Promise.all([first, second]);
    const count = service.getIndex().length;
    await loader();
    expect(service.getIndex()).toHaveLength(count);
    expect(service.search({ query: "atributo" }).entries.length).toBeGreaterThan(0);
  });
});
