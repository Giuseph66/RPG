import { describe, expect, it } from "vitest";

import { asAccountId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import {
  CREATURE_SCHEMA_VERSION,
  compareGuess,
  creatureFromLegacyNpc,
  playerView,
  projectSighting,
  revealFor,
  setRevealField,
  setRevealPresence,
  sightingId,
  validateCreatureContent,
  type CreatureRecord,
} from "./index";

const at = asIsoTimestamp("2026-09-28T12:00:00.000Z");
const tester = asAccountId("player-teste");
const ana = asAccountId("player-ana");

function wolf(): CreatureRecord {
  return {
    id: asUuid("00000000-0000-4000-8000-00000000c001"),
    campaignId: asUuid("00000000-0000-4000-8000-00000000ca01"),
    schemaVersion: CREATURE_SCHEMA_VERSION,
    revision: asRevision(1),
    kind: "enemy",
    name: "Lobo atroz",
    appearance: "Um vulto enorme entre as árvores",
    race: "Lobo atroz",
    description: "",
    hitPoints: "37",
    armorClass: "14",
    abilities: "Mordida derrubadora",
    notes: "Serve à bruxa do pântano",
    reveals: [],
    createdAt: at,
    updatedAt: at,
  };
}

describe("revelações de criaturas", () => {
  it("revela apenas a presença sem nenhum detalhe", () => {
    const creature = setRevealPresence(wolf(), [tester], true);
    const sighting = projectSighting(creature, revealFor(creature, tester)!, { createdAt: at, updatedAt: at }, asRevision(0));
    expect(sighting.id).toBe(sightingId(creature.id, tester));
    expect(sighting.kind).toBeUndefined();
    expect(sighting.revealed).toEqual({});
    expect(playerView(sighting)).toEqual({ title: "Presença desconhecida", titleIsGuess: false, kind: "unknown", kindIsGuess: false });
  });

  it("revela campos só para a conta escolhida e nunca as notas do mestre", () => {
    let creature = setRevealField(wolf(), [tester], "appearance", true);
    creature = setRevealField(creature, [tester], "kind", true);
    expect(revealFor(creature, ana)).toBeUndefined();
    const sighting = projectSighting(creature, revealFor(creature, tester)!, { createdAt: at, updatedAt: at }, asRevision(0));
    expect(sighting.kind).toBe("enemy");
    expect(sighting.revealed).toEqual({ appearance: "Um vulto enorme entre as árvores" });
    expect(JSON.stringify(sighting)).not.toContain("bruxa");
    expect(JSON.stringify(sighting)).not.toContain("37");
  });

  it("esconder a presença remove todos os campos daquela conta", () => {
    let creature = setRevealField(wolf(), [tester, ana], "hitPoints", true);
    creature = setRevealPresence(creature, [tester], false);
    expect(revealFor(creature, tester)).toBeUndefined();
    expect(revealFor(creature, ana)?.fields).toEqual(["hitPoints"]);
  });

  it("combina o que foi revelado com o palpite do jogador", () => {
    const creature = setRevealPresence(wolf(), [tester], true);
    const sighting = projectSighting(creature, revealFor(creature, tester)!, { createdAt: at, updatedAt: at }, asRevision(0));
    expect(playerView(sighting, { kind: "animal", name: "Lobo grande" })).toEqual({ title: "Lobo grande", titleIsGuess: true, kind: "animal", kindIsGuess: true });
  });

  it("migra NPCs antigos preservando ID e categoria", () => {
    const creature = creatureFromLegacyNpc({ id: asUuid("00000000-0000-4000-8000-00000000c002"), kind: "npc", name: "Mira", description: "Cartógrafa", linkedEntityIds: [], createdAt: at, updatedAt: at }, wolf().campaignId);
    expect(creature).toMatchObject({ id: "00000000-0000-4000-8000-00000000c002", kind: "npc", name: "Mira", description: "Cartógrafa", reveals: [], revision: 0 });
  });

  it("exige nome e respeita limites", () => {
    expect(validateCreatureContent({ ...wolf(), name: "  " }).ok).toBe(false);
    expect(validateCreatureContent({ ...wolf(), hitPoints: "x".repeat(41) }).ok).toBe(false);
    expect(validateCreatureContent(wolf())).toMatchObject({ ok: true });
  });

  describe("compareGuess", () => {
    const revealed = { kind: "enemy" as const, revealed: { name: "Lobo atroz", race: "Lobo atroz", hitPoints: "37 (5d10+10)", armorClass: "14", appearance: "Vulto enorme" } };

    it("só compara o que o mestre revelou e o jogador tentou adivinhar", () => {
      const rows = compareGuess(revealed, { kind: "enemy", name: "", note: "Quer caçar", fields: { hitPoints: "uns 30", abilities: "mordida" } });
      expect(rows.map((row) => [row.field, row.verdict])).toEqual([["kind", "match"], ["hitPoints", "close"]]);
    });

    it("classifica acerto, perto e diferente", () => {
      const rows = compareGuess(revealed, { kind: "animal", name: "lobo atroz", note: "", fields: { race: "Lobo", armorClass: "20", appearance: "Um vulto enorme" } });
      const by = Object.fromEntries(rows.map((row) => [row.field, row.verdict]));
      expect(by).toEqual({ kind: "differs", name: "match", race: "close", appearance: "close", armorClass: "differs" });
    });

    it("sem palpite ou sem revelação não compara nada", () => {
      expect(compareGuess(revealed, undefined)).toEqual([]);
      expect(compareGuess({ revealed: {} }, { kind: "enemy", name: "Lobo", note: "", fields: { hitPoints: "30" } })).toEqual([]);
    });
  });
});
