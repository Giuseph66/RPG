import { describe, expect, it } from "vitest";

import { asEntityId } from "@domain/contracts/ids";
import { isBeastDefinition, isCreatureStatBlock, suggestCreatureStatBlock, type CreatureStatBlock } from "./index";

describe("suggestCreatureStatBlock", () => {
  it("gera um perfil genérico provisório para NPC sem modelo humanoide médio", () => {
    const first = suggestCreatureStatBlock({
      id: asEntityId("npc.guard-provisional"), name: "Guarda da Ponte", creatureType: "humanoid", size: "medium", role: "master", catalog: [],
    });
    const second = suggestCreatureStatBlock({
      id: asEntityId("npc.guard-provisional"), name: "Guarda da Ponte", creatureType: "humanoid", size: "medium", role: "master", catalog: [],
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) return;
    expect(first.value.basedOn).toBeNull();
    expect(first.value.templateKind).toBe("generic-provisional");
    expect(first.value.requiresReview).toBe(true);
    expect(first.value.statBlock.abilityScores).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    expect(first.value.statBlock.challengeRating).toBeNull();
    expect(first.value.statBlock.sourceRefs).toEqual([]);
    expect(first.value.reasons.join(" ")).toContain("não estatísticas publicadas");
    expect(isCreatureStatBlock(first.value.statBlock)).toBe(true);
  });

  it("gera besta Imensa válida como rascunho, preservando o ND solicitado sem declarar balanceamento", () => {
    const suggestion = suggestCreatureStatBlock({
      id: asEntityId("beast.colossal-provisional"), name: "Baleia Colossal", creatureType: "beast", size: "gargantuan", role: "player-beast",
      challengeRating: { numerator: 4, denominator: 1 }, catalog: [],
    });

    expect(suggestion.ok).toBe(true);
    if (!suggestion.ok) return;
    expect(suggestion.value.templateKind).toBe("generic-provisional");
    expect(suggestion.value.statBlock.size).toBe("gargantuan");
    expect(suggestion.value.statBlock.challengeRating).toEqual({ numerator: 4, denominator: 1 });
    expect(suggestion.value.statBlock.hitPoints.average).toBeGreaterThan(0);
    expect(isBeastDefinition(suggestion.value.statBlock)).toBe(true);
    expect(suggestion.value.reasons.join(" ")).toContain("precisa ser arbitrado pelo mestre");
  });

  it("continua escolhendo o template publicado compatível quando existe", () => {
    const template: CreatureStatBlock = {
      id: asEntityId("beast.published-wolf"), name: "Lobo de Referência", creatureType: "beast", size: "medium", armorClass: 13,
      hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: 900 as never },
      abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
      challengeRating: { numerator: 1, denominator: 4 }, sourceRefs: [],
    };
    const suggestion = suggestCreatureStatBlock({
      id: asEntityId("beast.wolf-copy"), name: "Lobo Cinzento", creatureType: "beast", size: "medium", role: "player-beast", catalog: [template],
    });

    expect(suggestion.ok).toBe(true);
    if (!suggestion.ok) return;
    expect(suggestion.value.basedOn).toBe(template.id);
    expect(suggestion.value.templateKind).toBe("published-template");
    expect(suggestion.value.statBlock.abilityScores).toEqual(template.abilityScores);
  });

  it("rejeita fórmula de dano com face de dado fora do enum suportado", () => {
    const malformed: CreatureStatBlock = {
      id: asEntityId("beast.bad-attack"), name: "Besta Inválida", creatureType: "beast", size: "medium", armorClass: 10,
      hitPoints: { average: 4 }, speeds: {}, abilityScores: { str: 10, dex: 10, con: 10, int: 2, wis: 10, cha: 4 },
      challengeRating: { numerator: 0, denominator: 4 }, sourceRefs: [],
      actions: [{ id: "bite", name: "Mordida", description: "Ataque inválido", damage: [{ formula: { quantity: 1, faces: 999 as never }, damageType: "piercing" }] }],
    };
    expect(isCreatureStatBlock(malformed)).toBe(false);
  });

  it("valida marcadores explícitos de resolução manual em ação e parte de dano", () => {
    const marked: CreatureStatBlock = {
      id: asEntityId("beast.manual-effects"), name: "Besta", creatureType: "beast", size: "medium", armorClass: 10,
      hitPoints: { average: 4 }, speeds: { walkCm: 300 as never }, abilityScores: { str: 10, dex: 10, con: 10, int: 2, wis: 10, cha: 4 },
      challengeRating: { numerator: 0, denominator: 4 }, sourceRefs: [],
      actions: [
        { id: "bite", name: "Mordida", description: "Ataque", attackBonus: 2, damage: [{ formula: { quantity: 1, faces: 4 as never }, damageType: "piercing" }] },
        { id: "poison", name: "Veneno", description: "Exige salvaguarda", attackBonus: 2, damage: [{ formula: { quantity: 1, faces: 4 as never }, damageType: "poison", requiresManualResolution: true, note: "após falha no teste de resistência" }] },
        { id: "swallow", name: "Engolir", description: "Dano recorrente", requiresManualResolution: true, damage: [{ formula: { quantity: 2, faces: 4 as never }, damageType: "acid", requiresManualResolution: true, note: "no começo de cada turno" }] },
      ],
    };
    expect(isCreatureStatBlock(marked)).toBe(true);
    expect(isCreatureStatBlock({ ...marked, actions: [{ ...marked.actions![0]!, requiresManualResolution: false }] })).toBe(false);
    expect(isCreatureStatBlock({ ...marked, actions: [{ ...marked.actions![0]!, damage: [{ ...marked.actions![0]!.damage![0]!, requiresManualResolution: false }] }] })).toBe(false);
  });
});
