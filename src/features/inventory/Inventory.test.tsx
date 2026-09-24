import { describe, expect, it, vi } from "vitest";

import { fireEvent, keyDown, mount } from "@components/ui/testUtils";
import type { InventoryItem } from "@domain/contracts/character";
import { asGrams, type Currency } from "@domain/contracts/primitives";

import { Inventory } from "./Inventory";
import type { InventoryItemView } from "./types";

const currency: Currency = { cp: 12, sp: 3, ep: 0, gp: 7, pp: 0 };

function item(id: string, quantity: number, equippedState: InventoryItem["equippedState"] = "carried"): InventoryItemView {
  return {
    item: {
      id: id as InventoryItem["id"],
      equipmentRef: { rulesetId: "phb" as never, entityId: id as never },
      quantity,
      equippedState,
      notes: "",
    },
    name: id === "sword" ? "Espada longa" : "Corda de cânhamo",
    category: id === "sword" ? "weapon" : "adventuring-gear",
    unitWeightGrams: id === "sword" ? 1500 : 500,
    unitValueCp: id === "sword" ? 1500 : 100,
    properties: id === "sword" ? ["versatile"] : [],
  };
}

describe("Inventory", () => {
  it("rejects zero and fractional quantities while retaining an explicit error", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1)]} currency={currency} onIntent={onIntent} />);
    const quantity = container.querySelector('input[aria-label="Quantidade de Espada longa"]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(quantity, "0");
    await fireEvent(quantity, new Event("input", { bubbles: true }));
    expect(onIntent).not.toHaveBeenCalled();
    expect(container.textContent).toContain("inteiro maior que zero");
    setValue?.call(quantity, "1.5");
    await fireEvent(quantity, new Event("input", { bubbles: true }));
    expect(onIntent).not.toHaveBeenCalled();
    await unmount();
  });

  it("emits equip and unequip intents and keeps the equipped indicator visible", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1)]} currency={currency} onIntent={onIntent} />);
    const equip = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Equipar")) as HTMLButtonElement;
    await fireEvent(equip, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "equip", itemId: "sword" });
    expect(equip.getAttribute("aria-pressed")).toBe("false");
    await unmount();
  });

  it("shows the effect of removing an equipped instance and includes that context in the intent", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1, "equipped")]} currency={currency} onIntent={onIntent} />);
    expect(container.textContent).toContain("Equipado");
    const remove = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Remover")) as HTMLButtonElement;
    await fireEvent(remove, new MouseEvent("click", { bubbles: true }));
    expect(container.textContent).toContain("fará seus efeitos deixarem de contribuir");
    expect(onIntent).toHaveBeenCalledWith({ kind: "remove", itemId: "sword", equipped: true });
    await unmount();
  });

  it("shows Consumir only for eligible consumables and emits the dedicated intent", async () => {
    const onIntent = vi.fn();
    const potion = { ...item("potion", 2), consumable: { consumeOnUse: true, effectDescription: "recupera PV conforme a definição" } };
    const { container, unmount } = await mount(<Inventory items={[potion, item("sword", 1)]} currency={currency} onIntent={onIntent} />);
    const consume = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Consumir")) as HTMLButtonElement;
    expect(consume).toBeTruthy();
    await fireEvent(consume, new MouseEvent("click", { bubbles: true }));
    expect(onIntent).toHaveBeenCalledWith({ kind: "consume", itemId: potion.item.id, equipmentRef: potion.item.equipmentRef });
    expect(container.textContent).toContain("recupera PV conforme a definição");
    expect(Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.includes("Consumir"))).toHaveLength(1);
    await unmount();
  });

  it("preserves source order and stable row ids", async () => {
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1), item("rope", 2)]} currency={currency} />);
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    expect(rows.map((row) => row.getAttribute("data-item-id"))).toEqual(["sword", "rope"]);
    expect(rows[0]?.textContent).toContain("Espada longa");
    expect(rows[1]?.textContent).toContain("Corda de cânhamo");
    await unmount();
  });

  it("renders injected CA, active properties, proficiency and explanations without deriving them", async () => {
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1, "equipped")]} currency={currency} impact={{ armorClass: { value: 15, contributions: [{ sourceRef: { sourceId: "phb" as never, chapter: "teste" }, amount: 10, description: "base" }] }, properties: ["versatile"], weightGrams: asGrams(1500), encumbrance: undefined, explanations: [{ description: "Espada ativa concede o efeito." }], equipped: [{ item: item("sword", 1, "equipped").item, equipmentRef: { rulesetId: "phb" as never, entityId: "sword" as never }, category: "weapon", properties: ["versatile"], proficiency: { proficient: true, description: "Proficiência da ficha." } }] }} />);
    expect(container.textContent).toContain("15");
    expect(container.textContent).toContain("Versátil");
    expect(container.textContent).toContain("Proficiente");
    expect(container.textContent).toContain("Espada ativa concede o efeito.");
    await unmount();
  });

  it("keeps action controls keyboard reachable", async () => {
    const onIntent = vi.fn();
    const { container, unmount } = await mount(<Inventory items={[item("sword", 1)]} currency={currency} onIntent={onIntent} />);
    const button = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes("Equipar")) as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    await keyDown(button, "Enter");
    expect(button.getAttribute("aria-disabled")).toBeNull();
    await unmount();
  });

  it("renders empty, loading and error states", async () => {
    const empty = await mount(<Inventory items={[]} currency={currency} />);
    expect(empty.container.textContent).toContain("Inventário vazio");
    await empty.unmount();
    const loading = await mount(<Inventory items={[]} currency={currency} status="loading" />);
    expect(loading.container.textContent).toContain("Carregando inventário");
    await loading.unmount();
    const error = await mount(<Inventory items={[]} currency={currency} status="error" error={new Error("Falha de gravação")} />);
    expect(error.container.textContent).toContain("Falha de gravação");
    await error.unmount();
  });

  it("mostra a carga contra a capacidade e destaca em vermelho quando excede", async () => {
    const { container, rerender, unmount } = await mount(<Inventory items={[item("sword", 1)]} currency={currency} carrying={{ totalGrams: 1500, capacityGrams: 105000, encumberedGrams: 35000, strengthScore: 14 }} />);
    expect(container.textContent).toContain("1,5 kg");
    expect(container.textContent).toContain("105 kg");
    expect(container.querySelector('[role="meter"]')?.getAttribute("aria-valuetext")).toBe("1,5 kg de 105 kg");
    expect(container.textContent).not.toContain("Acima da capacidade");
    await rerender(<Inventory items={[item("sword", 1)]} currency={currency} carrying={{ totalGrams: 132500, capacityGrams: 105000, strengthScore: 14 }} />);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Acima da capacidade em 27,5 kg.");
    await unmount();
  });

  it("adiciona itens do catálogo pelo modal de busca", async () => {
    const onIntent = vi.fn();
    const catalog = [
      { equipmentRef: { rulesetId: "phb" as never, entityId: "hempen-rope" as never }, name: "Corda de cânhamo", category: "adventuring-gear", unitWeightGrams: 5000 },
      { equipmentRef: { rulesetId: "phb" as never, entityId: "longsword" as never }, name: "Espada longa", category: "weapon", unitWeightGrams: 1500 },
    ];
    const { container, unmount } = await mount(<Inventory items={[]} currency={currency} onIntent={onIntent} catalog={catalog} />);
    const open = [...container.querySelectorAll("button")].find((button) => button.textContent === "Adicionar item") as HTMLElement;
    open.click();
    await Promise.resolve();
    const search = document.querySelector('[role="dialog"] input[type="search"]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setValue?.call(search, "espada");
    await fireEvent(search, new Event("input", { bubbles: true }));
    const options = [...document.querySelectorAll('[role="dialog"] li button')];
    expect(options).toHaveLength(1);
    (options[0] as HTMLElement).click();
    await Promise.resolve();
    expect(onIntent).toHaveBeenCalledWith({ kind: "add", equipmentRef: catalog[1]!.equipmentRef, quantity: 1 });
    await unmount();
  });
});
