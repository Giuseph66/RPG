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

  it("aceita ND ausente e tags omitidas, busca sem acentos e filtra bestas incluindo enxames", async () => {
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
    const filter = container.querySelector('[aria-label="Mostrar criaturas"]')!;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(filter, "beasts");
    await fireEvent(filter, new Event("change", { bubbles: true }));
    expect(container.textContent).toContain("Enxame de teste");
    await unmount();
  });

  it("mantém todos os tipos besta, inclusive enxames, no catálogo do druida e oculta gestão de vista no mestre", async () => {
    const dragon = { ...beast, id: "dragon" as CreatureStatBlock["id"], name: "Dragão de teste", creatureType: "dragon" as const };
    const { container, unmount } = await mount(<CreatureCatalog creatures={[beast, swarm, dragon]} beastsOnly showSightings={false} />);
    expect(container.textContent).toContain("Lobo de teste");
    expect(container.textContent).toContain("Enxame de teste");
    expect(container.textContent).not.toContain("Dragão de teste");
    expect(container.querySelector('[aria-label="Mostrar criaturas"]')).toBeNull();
    expect(container.querySelector('[aria-label="Tipo de criatura"]')).toBeNull();
    await fireEvent(container.querySelector('[aria-haspopup="dialog"]')!, new MouseEvent("click", { bubbles: true }));
    expect(container.querySelector('[role="dialog"]')?.textContent).not.toContain("Marcar como vista");
    await unmount();
  });

  it("filtra somente bestas vistas sem permitir selecionar outros tipos", async () => {
    const dragon = { ...beast, id: "dragon" as CreatureStatBlock["id"], name: "Dragão de teste", creatureType: "dragon" as const };
    const mounted = await mount(<CreatureCatalog creatures={[beast, swarm, dragon]} beastsOnly sightings={[{ beastRef: { rulesetId: "test" as never, entityId: beast.id }, firstSeenAt: "2026-01-01T00:00:00.000Z" } as never]} characterName="Druida" />);
    const filter = mounted.container.querySelector('[aria-label="Mostrar criaturas"]') as HTMLSelectElement;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(filter, "seen");
    await fireEvent(filter, new Event("change", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Lobo de teste");
    expect(mounted.container.textContent).not.toContain("Enxame de teste");
    expect(mounted.container.textContent).not.toContain("Dragão de teste");
    await mounted.unmount();
  });

  it("combina busca livre, tipo, tamanho, faixas de PV e CA e limpa os filtros", async () => {
    const dragon: CreatureStatBlock = { ...beast, id: "dragon" as CreatureStatBlock["id"], name: "Dragão de teste", creatureType: "dragon", size: "large", armorClass: 16, hitPoints: { average: 40 }, actions: [{ id: "breath", name: "Sopro", description: "Dano elemental" }] };
    const mounted = await mount(<CreatureCatalog creatures={[beast, dragon]} showSightings={false} />);
    const selects = mounted.container.querySelectorAll("select");
    const type = mounted.container.querySelector('[aria-label="Tipo de criatura"]') as HTMLSelectElement;
    const size = mounted.container.querySelector('[aria-label="Tamanho"]') as HTMLSelectElement;
    const setSelect = async (select: HTMLSelectElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, value);
      await fireEvent(select, new Event("change", { bubbles: true }));
    };
    const setNumber = async (input: HTMLInputElement, value: string) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
      await fireEvent(input, new Event("input", { bubbles: true }));
    };
    await setSelect(type, "dragon");
    await setSelect(size, "large");
    const ranges = mounted.container.querySelectorAll<HTMLInputElement>('input[type="number"]');
    await setNumber(ranges[0]!, "20");
    await setNumber(ranges[1]!, "45");
    await setNumber(ranges[2]!, "15");
    await setNumber(ranges[3]!, "17");
    expect(mounted.container.textContent).toContain("Dragão de teste");
    expect(mounted.container.textContent).not.toContain("Lobo de teste");

    await fireEvent([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Limpar filtros")!, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Lobo de teste");
    expect(mounted.container.textContent).toContain("Dragão de teste");
    expect(selects).toHaveLength(2);

    const search = mounted.container.querySelector('input:not([type="number"])') as HTMLInputElement;
    await setNumber(search, "elemental");
    expect(mounted.container.textContent).toContain("Dragão de teste");
    expect(mounted.container.textContent).not.toContain("Lobo de teste");
    await setNumber(search, "8");
    expect(mounted.container.textContent).toContain("Lobo de teste");
    expect(mounted.container.textContent).not.toContain("Dragão de teste");
    await fireEvent([...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Limpar filtros")!, new MouseEvent("click", { bubbles: true }));
    expect(mounted.container.textContent).toContain("Lobo de teste");
    await mounted.unmount();
  });
});
