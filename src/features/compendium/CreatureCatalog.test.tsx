import { describe, expect, it, vi } from "vitest";
import type { CreatureStatBlock } from "@domain/creatures";
import { fireEvent, mount } from "@components/ui/testUtils";
import { asCentimeters } from "@domain/contracts/primitives";
import { CreatureCatalog } from "./CreatureCatalog";

const beast: CreatureStatBlock = {
  id: "wolf" as CreatureStatBlock["id"], name: "Lobo de teste", creatureType: "beast", size: "medium", tags: [], armorClass: 12,
  hitPoints: { average: 8 }, speeds: { walkCm: asCentimeters(4000) }, abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  challengeRating: { numerator: 0, denominator: 4 }, sourceRefs: [{ sourceId: "test" as never, chapter: "Teste" }],
};
const { tags: _beastTags, ...beastWithoutTags } = beast;
const noRatingBeast: CreatureStatBlock = {
  ...beastWithoutTags, id: "eagle" as CreatureStatBlock["id"], name: "ÁGUIA", challengeRating: null,
};
const swarm: CreatureStatBlock = {
  ...beast, id: "swarm" as CreatureStatBlock["id"], name: "Enxame de teste", isSwarm: true, tags: ["swarm"], challengeRating: null,
};

describe("CreatureCatalog", () => {
  it("marca como vista só após ação deliberada, sem transformar a linha do catálogo em avistamento", async () => {
    const onMarkSeen = vi.fn().mockResolvedValue({ ok: true, value: {} });
    const { container, unmount } = await mount(<CreatureCatalog creatures={[beast]} characterName="Personagem de teste" onMarkSeen={onMarkSeen} />);
    expect(container.textContent).toContain("Ainda não registrada como vista");
    expect(onMarkSeen).not.toHaveBeenCalled();
    await fireEvent(container.querySelector('[aria-haspopup="dialog"]')!, new MouseEvent("click", { bubbles: true }));
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Marcar como vista");
    const mark = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Marcar como vista"))!;
    await fireEvent(mark, new MouseEvent("click", { bubbles: true }));
    expect(onMarkSeen).toHaveBeenCalledWith(beast);
    expect(container.textContent).toContain("registrada como vista");
    await unmount();
  });

  it("aceita ND ausente e tags omitidas, busca sem acentos e filtra somente formas elegíveis", async () => {
    const { container, unmount } = await mount(<CreatureCatalog creatures={[beast, noRatingBeast, swarm]} />);
    expect(container.textContent).toContain("ND — · CA 12 · PV 8");
    expect(container.textContent).toContain("Bestas");
    const search = container.querySelector("input") as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "aguia");
    await fireEvent(search, new Event("input", { bubbles: true }));
    expect(container.textContent).toContain("ÁGUIA");
    expect(container.textContent).not.toContain("Lobo de teste");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "");
    await fireEvent(search, new Event("input", { bubbles: true }));
    const filter = container.querySelector("select")!;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(filter, "beasts");
    await fireEvent(filter, new Event("change", { bubbles: true }));
    expect(container.textContent).not.toContain("Enxame de teste");
    await unmount();
  });
});
