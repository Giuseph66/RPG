import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { asEntityId, asUuid } from "@domain/contracts/ids";

import { CONDITION_DEFINITIONS } from "@data/conditions";
import { applyCondition, removeCondition } from "./index";

const instance = (id: string, origin: "environment" = "environment") => ({ id: asUuid(id), definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("poisoned") }, origin: { kind: origin, description: "efeito de teste" } } as const);

describe("condition rules", () => {
  it("mantém duas instâncias envenenado e remove somente uma", () => {
    const definition = CONDITION_DEFINITIONS.find((entry) => entry.id === "poisoned")!;
    const first = applyCondition(minimalCharacter, instance("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), definition);
    expect(first.status).toBe("success");
    if (first.status === "success") {
      const second = applyCondition(first.nextState, instance("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), definition);
      expect(second.status).toBe("success");
      if (second.status === "success") {
        const removed = removeCondition(second.nextState, asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
        expect(removed.status).toBe("success");
        if (removed.status === "success") expect(removed.nextState.conditions).toHaveLength(1);
      }
    }
  });
});
