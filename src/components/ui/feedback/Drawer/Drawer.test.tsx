import { useState } from "react";
import { describe, expect, it } from "vitest";

import { click, focus, keyDown, mount } from "../../testUtils";
import { Drawer } from "./Drawer";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir filtros</button>
      <Drawer open={open} title="Filtros" side="end" modal onClose={() => setOpen(false)}>
        <input aria-label="Busca" />
      </Drawer>
    </div>
  );
}

function NonModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir detalhe</button>
      <button>Outro controle da página</button>
      <Drawer
        open={open}
        title="Detalhe"
        side="end"
        modal={false}
        onClose={() => setOpen(false)}
      >
        <input aria-label="Nota" />
      </Drawer>
    </div>
  );
}

describe("Drawer", () => {
  it("modal=true traps focus and marks background inert", async () => {
    const { container, unmount } = await mount(<ModalHarness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);

    let node: HTMLElement | null = dialog;
    let foundInert = false;
    while (node && node !== document.body && node.parentElement) {
      const parent: HTMLElement = node.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling.getAttribute("inert") === "") {
          foundInert = true;
        }
      }
      node = parent;
    }
    expect(foundInert).toBe(true);
    await unmount();
  });

  it("modal=true closes on Escape and returns focus", async () => {
    const { container, unmount } = await mount(<ModalHarness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await focus(trigger);
    await click(trigger);
    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await unmount();
  });

  it("modal=false sets aria-modal=false and does not make the rest of the page inert", async () => {
    const { container, unmount } = await mount(<NonModalHarness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    const otherButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Outro controle da página",
    ) as HTMLButtonElement;
    expect(otherButton.hasAttribute("inert")).toBe(false);
    expect(otherButton.getAttribute("aria-hidden")).toBeNull();
    await unmount();
  });

  it("modal=false still closes on Escape", async () => {
    const { container, unmount } = await mount(<NonModalHarness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });
});
