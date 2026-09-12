import { describe, expect, it } from "vitest";

import { asEntityId, asRulesetId } from "@domain/contracts/ids";
import { isErr, isOk } from "@domain/contracts/errors";

import { loadRulePack } from "./load";
import { resolveSpell } from "./lookup";
import { PHB_PTBR_LOCAL_2017_INPUT } from "./phb-ptbr-local-2017/index";

function loadedPack() {
  const result = loadRulePack(PHB_PTBR_LOCAL_2017_INPUT);
  if (!isOk(result)) {
    throw new Error("Fixture do pack local deveria carregar com sucesso.");
  }
  return result.value;
}

describe("resolveSpell", () => {
  it("id inexistente -> not-found", () => {
    const pack = loadedPack();
    const result = resolveSpell(pack, { rulesetId: asRulesetId("phb-ptbr-local-2017"), entityId: asEntityId("spell-not-in-catalog") });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("not-found");
    }
  });

  it("ref de outro rulesetId -> missing-ruleset", () => {
    const pack = loadedPack();
    const result = resolveSpell(pack, { rulesetId: asRulesetId("outro-pack"), entityId: asEntityId("fireball") });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("missing-ruleset");
    }
  });
});
