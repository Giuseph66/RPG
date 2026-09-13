import { describe, expect, it } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import { type Character, type ResourceState } from "@domain/contracts/character";
import { asEntityId, asUuid } from "@domain/contracts/ids";

import { spendResource } from "./index";

const RESOURCE_ID = asUuid("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

function resource(overrides: Partial<ResourceState> = {}): ResourceState {
  return {
    id: RESOURCE_ID,
    definitionRef: { rulesetId: minimalCharacter.rulesetRef.id, entityId: asEntityId("second-wind") },
    ownerInstanceId: minimalCharacter.id,
    spent: 0,
    ...overrides,
  };
}

function character(overrides: Partial<Character> = {}): Character {
  return { ...minimalCharacter, resources: [resource()], ...overrides };
}

describe("spendResource", () => {
  it("gasta a quantidade pedida sem mutar o personagem recebido", () => {
    const char = character();
    const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount: 1, capacity: 2 });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.nextState.resources[0].spent).toBe(1);
      expect(result.effects).toEqual([
        { kind: "resource-spent", targetCharacterId: char.id, sourceRef: expect.anything(), payload: { resourceStateId: RESOURCE_ID, amount: 1, newSpent: 1 } },
      ]);
    }
    // Entrada original não é mutada.
    expect(char.resources[0].spent).toBe(0);
  });

  it("rejeita quando o recurso não existe/não está ligado ao personagem", () => {
    const char = character();
    const result = spendResource(char, { resourceStateId: asUuid("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), amount: 1, capacity: 2 });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("invalid-context");
    expect(char.resources[0].spent).toBe(0);
  });

  it("rejeita recurso de outro personagem sem alterar o estado", () => {
    const char = character({ resources: [resource({ ownerInstanceId: asUuid("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb") })] });
    const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount: 1, capacity: 2 });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("invalid-context");
    expect(char.resources[0].spent).toBe(0);
  });

  it("rejeita gasto corrompido ou acima da capacidade", () => {
    for (const spent of [-1, 1.5, 3]) {
      const char = character({ resources: [resource({ spent })] });
      const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount: 1, capacity: 2 });
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.errors[0].code).toBe("invalid-context");
    }
  });

  it("rejeita saldo insuficiente sem descontar nada", () => {
    const char = character({ resources: [resource({ spent: 2 })] });
    const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount: 1, capacity: 2 });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("insufficient-resource");
    expect(char.resources[0].spent).toBe(2);
  });

  it("rejeita quantidade não positiva sem descontar nada", () => {
    const char = character();
    for (const amount of [0, -1, 1.5, Number.NaN]) {
      const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount, capacity: 2 });
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.errors[0].code).toBe("invalid-command");
    }
    expect(char.resources[0].spent).toBe(0);
  });

  it("rejeita quando a capacidade não foi derivada (negativa/fracionária)", () => {
    const char = character();
    const result = spendResource(char, { resourceStateId: RESOURCE_ID, amount: 1, capacity: -1 });
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") expect(result.errors[0].code).toBe("invalid-context");
    expect(char.resources[0].spent).toBe(0);
  });
});
