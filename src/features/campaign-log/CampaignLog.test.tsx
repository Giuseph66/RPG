import { describe, expect, it } from "vitest";

import type { CampaignLogEntry } from "@domain/contracts/campaign-log";
import { asIsoTimestamp } from "@domain/contracts/ids";
import { click, mount } from "@components/ui/testUtils";

import { CampaignLog, initiativeOrder } from "./CampaignLog";

const entry = (patch: Partial<CampaignLogEntry>): CampaignLogEntry => ({
  id: "e1",
  campaignId: "c1",
  characterId: "a",
  characterName: "Aria",
  actorUid: "u1",
  byMaster: false,
  kind: "roll",
  summary: "Iniciativa: 12",
  createdAt: asIsoTimestamp("2026-09-29T20:00:00.000Z"),
  ...patch,
});

const entries: readonly CampaignLogEntry[] = [
  entry({ id: "e4", characterId: "b", characterName: "Borin", kind: "hit-points", summary: "PV 10 → 6", detail: "4 de dano", byMaster: true, createdAt: asIsoTimestamp("2026-09-29T20:03:00.000Z") }),
  entry({ id: "e3", characterId: "b", characterName: "Borin", summary: "Iniciativa: 18", rollPurpose: "initiative", rollTotal: 18, createdAt: asIsoTimestamp("2026-09-29T20:02:00.000Z") }),
  entry({ id: "e2", summary: "Iniciativa: 12", rollPurpose: "initiative", rollTotal: 12, createdAt: asIsoTimestamp("2026-09-29T20:01:00.000Z") }),
  entry({ id: "e1", summary: "Iniciativa: 3", rollPurpose: "initiative", rollTotal: 3 }),
];

describe("CampaignLog", () => {
  it("ordena a iniciativa pela rolagem mais recente de cada personagem", () => {
    expect(initiativeOrder(entries).map((item) => [item.characterName, item.rollTotal])).toEqual([["Borin", 18], ["Aria", 12]]);
  });

  it("mostra as entradas, quem ajustou e filtra por personagem", async () => {
    const mounted = await mount(<CampaignLog entries={entries} status="ready" />);
    const items = () => [...mounted.container.querySelectorAll("ol[aria-live] > li")].map((item) => item.textContent ?? "");
    expect(items()).toHaveLength(4);
    expect(items()[0]).toContain("pelo mestre");
    expect(items()[0]).toContain("4 de dano");
    expect(mounted.container.querySelector('[aria-label="Ordem de iniciativa"]')?.textContent).toContain("18 Borin");
    await click([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Aria") as HTMLElement);
    expect(items()).toHaveLength(2);
    expect(items().every((text) => text.includes("Aria"))).toBe(true);
    await mounted.unmount();
  });

  it("explica o vazio e o erro", async () => {
    const empty = await mount(<CampaignLog entries={[]} status="ready" />);
    expect(empty.container.textContent).toContain("Nada registrado ainda");
    await empty.unmount();
    const failed = await mount(<CampaignLog entries={[]} status="error" />);
    expect(failed.container.textContent).toContain("Não foi possível abrir o histórico da mesa.");
    await failed.unmount();
  });
});
