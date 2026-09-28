import { describe, expect, it, vi } from "vitest";

import { fireEvent, mount } from "@components/ui/testUtils";
import { CREATURE_SCHEMA_VERSION, type CreatureRecord, type CreatureSighting } from "@domain/campaign/creatures";
import { ok } from "@domain/contracts/errors";
import { asAccountId, asIsoTimestamp, asUuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

import { CreatureBoard, PlayerCreatureBoard } from "./index";

const at = asIsoTimestamp("2026-09-28T12:00:00.000Z");
const tester = asAccountId("player-teste");
const ana = asAccountId("player-ana");
const players = [{ accountId: tester, name: "Teste" }, { accountId: ana, name: "Ana" }];
const creature: CreatureRecord = {
  id: asUuid("00000000-0000-4000-8000-00000000c001"),
  campaignId: asUuid("00000000-0000-4000-8000-00000000ca01"),
  schemaVersion: CREATURE_SCHEMA_VERSION,
  revision: asRevision(1),
  kind: "enemy",
  name: "Lobo atroz",
  appearance: "Um vulto enorme",
  race: "",
  description: "",
  hitPoints: "37",
  armorClass: "",
  abilities: "",
  notes: "Serve à bruxa",
  reveals: [],
  createdAt: at,
  updatedAt: at,
};

const click = (element: Element) => fireEvent(element, new MouseEvent("click", { bubbles: true }));
const byText = (root: ParentNode, selector: string, text: string) => [...root.querySelectorAll(selector)].find((item) => item.textContent?.includes(text))!;

describe("CreatureBoard (mestre)", () => {
  it("mostra criaturas em grade e revela um campo só para o jogador em foco", async () => {
    const onSave = vi.fn(async (next: CreatureRecord) => ok({ ...next, revision: asRevision(next.revision + 1) }));
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} players={players} onSave={onSave} />);
    expect(container.querySelectorAll("ul > li > button[data-kind='enemy']")).toHaveLength(1);
    await click(byText(container, "button", "Lobo atroz"));
    await click(byText(document.body, "button[role='radio']", "Teste"));
    await click(document.body.querySelector("button[aria-label='Revelar aparência para Teste']")!);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reveals: [{ accountId: tester, fields: ["appearance"] }] }));
    // Campos vazios não podem ser revelados, e as notas do mestre não têm olho.
    expect(document.body.querySelector("button[aria-label='Revelar raça ou espécie para Teste']")?.hasAttribute("disabled")).toBe(true);
    expect(document.body.querySelector("button[aria-label*='notas']")).toBeNull();
    await unmount();
  });

  it("revela a presença para todos os jogadores de uma vez", async () => {
    const onSave = vi.fn(async (next: CreatureRecord) => ok(next));
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature]} players={players} onSave={onSave} />);
    await click(byText(container, "button", "Lobo atroz"));
    await click(byText(document.body, "button", "Presença oculta"));
    expect(onSave.mock.calls[0]![0].reveals).toEqual([{ accountId: ana, fields: [] }, { accountId: tester, fields: [] }]);
    await unmount();
  });

  it("filtra por categoria, inclusive animais e não categorizados", async () => {
    const owl = { ...creature, id: asUuid("00000000-0000-4000-8000-00000000c002"), kind: "animal" as const, name: "Coruja" };
    const { container, unmount } = await mount(<CreatureBoard creatures={[creature, owl]} players={players} />);
    await click(byText(container, "button[aria-pressed]", "Animais"));
    expect(container.textContent).toContain("Coruja");
    expect(container.textContent).not.toContain("Lobo atroz");
    await unmount();
  });
});

describe("PlayerCreatureBoard (jogador)", () => {
  const sighting: CreatureSighting = { id: `${creature.id}__${tester}`, campaignId: creature.campaignId, creatureId: creature.id, accountId: tester, schemaVersion: CREATURE_SCHEMA_VERSION, revision: asRevision(1), revealed: { appearance: "Um vulto enorme" }, createdAt: at, updatedAt: at };

  it("mostra só o que foi revelado e envia o palpite do jogador", async () => {
    const onSaveGuess = vi.fn(async () => ok({} as never));
    const { container, unmount } = await mount(<PlayerCreatureBoard sightings={[sighting]} onSaveGuess={onSaveGuess} />);
    expect(container.textContent).toContain("Presença desconhecida");
    expect(container.textContent).toContain("Não categorizado");
    expect(container.textContent).not.toContain("37");
    await click(byText(container, "button", "Presença desconhecida"));
    const dialog = document.body.querySelector("[role='dialog']")!;
    await click(byText(dialog, "button[aria-pressed]", "Ameaça"));
    // A aparência já foi revelada: vira fato, não pergunta. PV ainda pode ser suposto.
    expect(dialog.textContent).not.toContain("Aparência que você imagina");
    const hp = [...dialog.querySelectorAll("label")].find((label) => label.textContent?.includes("Pontos de vida estimados"))!.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(hp, "uns 30");
    await fireEvent(hp, new Event("input", { bubbles: true }));
    await click(byText(dialog, "button[type='submit']", "Guardar palpite"));
    expect(onSaveGuess).toHaveBeenCalledWith(creature.id, { kind: "enemy", name: "", note: "", fields: { hitPoints: "uns 30" } });
    await unmount();
  });
});
