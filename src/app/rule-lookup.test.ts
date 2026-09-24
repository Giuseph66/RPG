import { describe, expect, it } from "vitest";

import { createCompendiumService } from "@application/compendium";
import { STATIC_COMPENDIUM_ITEMS } from "@data/compendium";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

import { createRuleLookup } from "./rule-lookup";

const pack = await loadPhbPtBrLocal2017();
if (!pack.ok) throw new Error(pack.error.message);
const service = createCompendiumService({ packs: [pack.value], items: STATIC_COMPENDIUM_ITEMS, excludePackEntityTypes: ["spell", "condition", "race", "subrace", "class", "subclass", "feature", "resource", "progression", "background", "feat"] });
const lookup = createRuleLookup(service);

describe("createRuleLookup", () => {
  it("encontra regras da ficha por categoria e título, ignorando acentos", () => {
    expect(lookup({ category: "spell", title: "bordao mistico" })?.title).toBe("Bordão Místico");
    expect(lookup({ category: "skills", title: "Acrobacia" })?.title).toBe("Acrobacia");
    expect(lookup({ category: "condition", title: "Envenenado" })?.title).toBe("Envenenado");
    expect(lookup({ category: "race", title: "Humano" })?.title).toBe("Humano");
    expect(lookup({ category: "class", title: "Druida" })?.title).toBe("Druida");
    expect(lookup({ category: "combat", title: "Teste contra a morte" })).toBeDefined();
  });

  it("usa o id quando o título difere e devolve undefined sem correspondência", () => {
    expect(lookup({ category: "equipment", title: "Nome customizado", entityId: "flail" })?.title).toBe("Mangual");
    expect(lookup({ category: "spell", title: "Magia inexistente" })).toBeUndefined();
  });
});
