import { useState } from "react";
import { describe, expect, it } from "vitest";

import { click, focus, keyDown, mount } from "../../testUtils";
import { BottomSheet } from "./BottomSheet";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Ajustar dados</button>
      <BottomSheet open={open} title="Ajustar recurso" onClose={() => setOpen(false)}>
        <input aria-label="Quantidade" />
      </BottomSheet>
    </div>
  );
}

describe("BottomSheet", () => {
  it("shares AppModal's contract: named dialog, aria-modal, initial focus inside", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await unmount();
  });

  it("always renders a visible text Fechar button, not only drag-to-dismiss", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const closeButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Fechar",
    );
    expect(closeButton).toBeDefined();
    await click(closeButton as HTMLButtonElement);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { container, unmount } = await mount(<Harness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await focus(trigger);
    await click(trigger);
    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await unmount();
  });
});
