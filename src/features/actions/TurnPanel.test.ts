import { createElement } from "react";
import { describe, expect, it, beforeEach } from "vitest";
import { click, mount } from "@components/ui/testUtils";
import { readTurnActionBudget, spendTurnActionAfterSuccess, spendTurnActionBudget, TurnPanel } from "./TurnPanel";

const characterId = "00000000-0000-4000-8000-000000000037";
const key = `rpg.turn.${characterId}`;

describe("TurnPanel action budget bridge", () => {
  beforeEach(() => sessionStorage.clear());

  it("exposes only unspent action slots and reserves the exact slot after success", () => {
    sessionStorage.setItem(key, JSON.stringify({ round: 2, used: { action: false, bonus: true, reaction: false }, movedSquares: 0, dashed: false, effects: [] }));
    expect(readTurnActionBudget(characterId)?.availableActions).toEqual(["action", "reaction", "free"]);
    expect(spendTurnActionBudget(characterId, "action")).toBe(true);
    expect(readTurnActionBudget(characterId)?.availableActions).toEqual(["reaction", "free"]);
    expect(spendTurnActionBudget(characterId, "action")).toBe(false);
  });

  it("does not invent a budget when the TurnPanel has not been mounted", () => {
    expect(readTurnActionBudget(characterId)).toBeUndefined();
    expect(spendTurnActionBudget(characterId, "bonus-action")).toBe(false);
  });

  it("preserves the budget for rejected, needsInput, and failed commands", () => {
    sessionStorage.setItem(key, JSON.stringify({ round: 1, used: { action: false, bonus: false, reaction: false }, movedSquares: 0, dashed: false, effects: [] }));
    expect(spendTurnActionAfterSuccess(characterId, "action", "rejected")).toBe(false);
    expect(spendTurnActionAfterSuccess(characterId, "action", "needsInput")).toBe(false);
    expect(spendTurnActionAfterSuccess(characterId, "action", "error")).toBe(false);
    expect(readTurnActionBudget(characterId)?.availableActions).toEqual(["action", "bonus-action", "reaction", "free"]);
  });

  it("can reserve the bonus action chosen by the rules for a Moon druid", () => {
    sessionStorage.setItem(key, JSON.stringify({ round: 1, used: { action: true, bonus: false, reaction: false }, movedSquares: 0, dashed: false, effects: [] }));
    expect(spendTurnActionAfterSuccess(characterId, "bonus-action", "success")).toBe(true);
    expect(readTurnActionBudget(characterId)?.availableActions).toEqual(["reaction", "free"]);
  });

  it("preserves manual turn spending when no spell-review handler is connected", async () => {
    sessionStorage.setItem(key, JSON.stringify({ round: 1, used: { action: false, bonus: false, reaction: false }, movedSquares: 0, dashed: false, effects: [] }));
    const mounted = await mount(createElement(TurnPanel, { characterId }));
    const cast = [...mounted.container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Conjurar magia"));
    await click(cast as HTMLElement);
    const use = [...mounted.container.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Usar e escolher magia"));
    await click(use as HTMLElement);
    expect(readTurnActionBudget(characterId)?.availableActions).toEqual(["bonus-action", "reaction", "free"]);
    await mounted.unmount();
  });
});
