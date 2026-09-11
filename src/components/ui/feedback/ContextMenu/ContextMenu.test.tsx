import { describe, expect, it, vi } from "vitest";

import { click, keyDown, mount, mouseDown } from "../../testUtils";
import { ContextMenu } from "./ContextMenu";

const items = [
  { id: "edit", label: "Editar", onSelect: vi.fn() },
  { id: "duplicate", label: "Duplicar", onSelect: vi.fn() },
  { id: "delete", label: "Excluir", onSelect: vi.fn() },
];

describe("ContextMenu", () => {
  it("opens via a visible button, not only right-click/long-press", async () => {
    const { container, unmount } = await mount(
      <ContextMenu label="Mais ações" items={items} />,
    );
    const trigger = container.querySelector("button") as HTMLButtonElement;
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="menu"]')).not.toBeNull();
    await unmount();
  });

  it("uses menu/menuitem roles and focuses the first item on open", async () => {
    const { container, unmount } = await mount(
      <ContextMenu label="Mais ações" items={items} />,
    );
    await click(container.querySelector("button") as HTMLButtonElement);
    const menuItems = Array.from(
      container.querySelectorAll('[role="menuitem"]'),
    ) as HTMLButtonElement[];
    expect(menuItems).toHaveLength(3);
    expect(document.activeElement).toBe(menuItems[0]);
    await unmount();
  });

  it("ArrowDown/ArrowUp move focus among menu items", async () => {
    const { container, unmount } = await mount(
      <ContextMenu label="Mais ações" items={items} />,
    );
    await click(container.querySelector("button") as HTMLButtonElement);
    const menuItems = Array.from(
      container.querySelectorAll('[role="menuitem"]'),
    ) as HTMLButtonElement[];

    await keyDown(menuItems[0], "ArrowDown");
    expect(document.activeElement).toBe(menuItems[1]);
    await keyDown(menuItems[1], "ArrowUp");
    expect(document.activeElement).toBe(menuItems[0]);
    await unmount();
  });

  it("selecting an item calls onSelect, closes the menu and returns focus to the trigger", async () => {
    const onSelect = vi.fn();
    const localItems = [{ id: "a", label: "Ação", onSelect }];
    const { container, unmount } = await mount(
      <ContextMenu label="Mais ações" items={localItems} />,
    );
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await click(trigger);
    const menuItem = container.querySelector('[role="menuitem"]') as HTMLButtonElement;
    await click(menuItem);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await unmount();
  });

  it("closes on Escape and on outside click", async () => {
    const { container, unmount } = await mount(
      <ContextMenu label="Mais ações" items={items} />,
    );
    await click(container.querySelector("button") as HTMLButtonElement);
    await keyDown(document, "Escape");
    expect(container.querySelector('[role="menu"]')).toBeNull();

    await click(container.querySelector("button") as HTMLButtonElement);
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    await mouseDown(outside);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    outside.remove();

    await unmount();
  });
});
