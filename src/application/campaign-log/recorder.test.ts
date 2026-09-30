import { describe, expect, it, vi } from "vitest";

import { minimalCharacter } from "@domain/contracts/fixtures";
import type { CampaignLogEntry } from "@domain/contracts/campaign-log";
import type { Character } from "@domain/contracts/character";
import type { DiceRoll } from "@domain/contracts/dice";
import { asIsoTimestamp, asUuid } from "@domain/contracts/ids";

import { createCampaignLogRecorder } from "./recorder";

const campaignId = asUuid("44444444-4444-4444-8444-444444444444");
const linked: Character = { ...minimalCharacter, name: "Teste", campaignId, ownerUid: "player-1", hp: { current: 10, temp: 0 } };
const roll = { id: asUuid("11111111-1111-4111-8111-111111111111"), characterId: linked.id, expression: { quantity: 1, faces: 20, modifier: 0, mode: "normal" }, purpose: "initiative", timestamp: asIsoTimestamp("2026-09-29T20:00:00.000Z"), rawDice: [12], selectedIndexes: [0], discardedIndexes: [], subtotal: 12, modifier: 0, total: 12, rngVersion: "test" } as DiceRoll;

function setup(uid: string | null = "player-1", character: Character | undefined = linked) {
  const entries: CampaignLogEntry[] = [];
  const port = { append: vi.fn(async (entry: CampaignLogEntry) => { entries.push(entry); }), watch: vi.fn() };
  const recorder = createCampaignLogRecorder({
    port,
    actorUid: () => uid ?? undefined,
    loadCharacter: async () => character,
    conditionName: (id) => id,
    newId: () => "entry-1",
    now: () => asIsoTimestamp("2026-09-29T20:00:01.000Z"),
  });
  return { entries, port, recorder };
}

describe("createCampaignLogRecorder", () => {
  it("publica a iniciativa da ficha vinculada com o ID da rolagem", async () => {
    const { entries, recorder } = setup();
    await recorder.recordRoll(roll);
    expect(entries).toEqual([expect.objectContaining({ id: `roll-${roll.id}`, campaignId: String(campaignId), characterName: "Teste", actorUid: "player-1", byMaster: false, kind: "roll", summary: "Iniciativa: 12", rollTotal: 12 })]);
  });

  it("marca como do mestre o ajuste feito por outra conta", async () => {
    const { entries, recorder } = setup("master-1");
    await recorder.recordCharacterChange(linked, { ...linked, hp: { current: 4, temp: 0 } });
    expect(entries).toEqual([expect.objectContaining({ id: "entry-1", kind: "hit-points", summary: "PV 10 → 4", actorUid: "master-1", byMaster: true })]);
  });

  it("não publica sem conta, sem campanha ou sem mudança relevante", async () => {
    const signedOut = setup(null);
    await signedOut.recorder.recordRoll(roll);
    await signedOut.recorder.recordCharacterChange(linked, { ...linked, hp: { current: 1, temp: 0 } });
    const local = setup("player-1", { ...linked, campaignId: undefined });
    await local.recorder.recordRoll(roll);
    const unchanged = setup();
    await unchanged.recorder.recordCharacterChange(linked, { ...linked, name: "Outro" });
    expect([signedOut.port.append, local.port.append, unchanged.port.append].every((append) => append.mock.calls.length === 0)).toBe(true);
  });

  it("recusa do Firebase não derruba quem gravou a ficha", async () => {
    const { port, recorder } = setup();
    port.append.mockRejectedValueOnce(new Error("permission-denied"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(recorder.recordRoll(roll)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
