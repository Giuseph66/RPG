import { describe, expect, it } from "vitest";

import { asPackVersion, asRulesetId } from "@domain/contracts/ids";
import { isErr, isOk } from "@domain/contracts/errors";

import { loadRulePack, resolveRulesetRef } from "./load";
import { PHB_PTBR_LOCAL_2017_INPUT, loadPhbPtBrLocal2017 } from "./phb-ptbr-local-2017/index";

describe("loadRulePack", () => {
  it("carrega o pack local atual (catálogos de conteúdo vazios, mas válido)", () => {
    const result = loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
    expect(isOk(result)).toBe(true);
  });

  it("reporta corrupt-record quando há erro de forma (ex.: sourceRef de outro pack)", () => {
    // Injeta uma condição com sourceRef estrangeiro (forma de dado quebrada, não referência).
    const brokenInput = {
      ...PHB_PTBR_LOCAL_2017_INPUT,
      conditions: [
        {
          id: PHB_PTBR_LOCAL_2017_INPUT.progression.id,
          name: "Condição quebrada",
          tags: [],
          sourceRefs: [{ sourceId: asRulesetId("outro-pack"), chapter: "X" }],
          mechanicalEffects: [],
          stackingPolicy: "no-stack" as const,
          removalTriggers: [],
        },
      ],
    };
    const result = loadRulePack(brokenInput);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("corrupt-record");
    }
  });

  it("classifica schema incompatível como unsupported-schema", () => {
    const result = loadRulePack({
      ...PHB_PTBR_LOCAL_2017_INPUT,
      manifest: {
        ...PHB_PTBR_LOCAL_2017_INPUT.manifest,
        schemaCompatibility: { minSchemaVersion: 2, maxSchemaVersion: 3 },
      },
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("unsupported-schema");
      if (result.error.code === "unsupported-schema") {
        expect(result.error.foundVersion).toBe(1);
        expect(result.error.supportedRange).toEqual({ min: 2, max: 3 });
      }
    }
  });
});

describe("resolveRulesetRef", () => {
  it("resolve o pack quando id e version batem exatamente", () => {
    const loaded = loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
    expect(isOk(loaded)).toBe(true);
    if (!isOk(loaded)) return;

    const result = resolveRulesetRef([loaded.value], {
      id: asRulesetId("phb-ptbr-local-2017"),
      version: asPackVersion("1.0.0"),
    });
    expect(isOk(result)).toBe(true);
  });

  it("versão 1.0.1 (não carregada) -> missing-ruleset (nunca escolhe a mais próxima)", () => {
    const loaded = loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
    expect(isOk(loaded)).toBe(true);
    if (!isOk(loaded)) return;

    const result = resolveRulesetRef([loaded.value], {
      id: asRulesetId("phb-ptbr-local-2017"),
      version: asPackVersion("1.0.1"),
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("missing-ruleset");
    }
  });

  it("id de outro ruleset -> missing-ruleset", () => {
    const loaded = loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
    expect(isOk(loaded)).toBe(true);
    if (!isOk(loaded)) return;

    const result = resolveRulesetRef([loaded.value], {
      id: asRulesetId("outro-pack"),
      version: asPackVersion("1.0.0"),
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("missing-ruleset");
    }
  });
});
