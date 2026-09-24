import { describe, expect, it, vi } from "vitest";

import { click, mount } from "@components/ui/testUtils";
import type { DiceRoll } from "@domain/contracts/dice";

import { DiceHistory } from "./DiceHistory";

const roll = (overrides: Partial<DiceRoll>): DiceRoll => ({
  id: "11111111-1111-4111-8111-111111111111" as DiceRoll["id"],
  expression: { quantity: 1, faces: 20, modifier: 0, mode: "normal" },
  purpose: "free",
  timestamp: new Date().toISOString() as DiceRoll["timestamp"],
  rawDice: [9],
  selectedIndexes: [0],
  discardedIndexes: [],
  subtotal: 9,
  modifier: 0,
  total: 9,
  rngVersion: "test",
  ...overrides,
});

describe("DiceHistory", () => {
  it("mostra total, dados, vantagem descartada e 20 natural destacado", async () => {
    const onReroll = vi.fn();
    const advantage = roll({ id: "22222222-2222-4222-8222-222222222222" as DiceRoll["id"], expression: { quantity: 1, faces: 20, modifier: 3, mode: "advantage" }, purpose: "skill-check", rawDice: [20, 7], selectedIndexes: [0], discardedIndexes: [1], subtotal: 20, modifier: 3, total: 23 });
    const { container, unmount } = await mount(<DiceHistory entries={[advantage]} onReroll={onReroll} />);
    expect(container.textContent).toContain("23");
    expect(container.textContent).toContain("Vantagem");
    expect(container.textContent).toContain("Perícia");
    const dice = [...container.querySelectorAll('[aria-label^="Dados"] > span')];
    expect(dice[0]?.className).toContain("historyDieCrit");
    expect(dice[1]?.className).toContain("historyDieDiscarded");
    await click(container.querySelector('button[aria-label^="Rolar novamente"]') as HTMLElement);
    expect(onReroll).toHaveBeenCalledWith(advantage);
    await unmount();
  });

  it("explica quando ainda não há rolagens", async () => {
    const { container, unmount } = await mount(<DiceHistory entries={[]} onReroll={vi.fn()} />);
    expect(container.textContent).toContain("Nenhuma rolagem salva ainda.");
    await unmount();
  });
});
