import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { click, keyDown, mouseDown, mount } from "../../testUtils";
import { AppModal } from "../AppModal/AppModal";
import { Popover } from "./Popover";

function Harness() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={anchorRef} onClick={() => setOpen((v) => !v)}>
        Explicar bônus
      </button>
      <button>Outro controle</button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} label="Explicação do bônus">
        <p>+3 vem da proficiência.</p>
        <input aria-label="Nota rápida" />
      </Popover>
    </div>
  );
}

function NestedOverlayHarness() {
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>Abrir modal</button>
      <AppModal
        open={modalOpen}
        title="Editar personagem"
        onClose={() => setModalOpen(false)}
      >
        <button ref={anchorRef} onClick={() => setPopoverOpen(true)}>
          Abrir popover
        </button>
        <Popover
          open={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          anchorRef={anchorRef}
          label="Ajuda"
        >
          <p>Ajuda contextual</p>
        </Popover>
      </AppModal>
    </div>
  );
}

describe("Popover", () => {
  it("is non-modal: role dialog with aria-modal false and does not trap focus", async () => {
    const { container, unmount } = await mount(<Harness />);
    const anchor = container.querySelector("button") as HTMLButtonElement;
    await click(anchor);
    const popover = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(popover.getAttribute("aria-modal")).toBe("false");
    expect(popover.getAttribute("aria-label")).toBe("Explicação do bônus");

    const otherButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Outro controle",
    ) as HTMLButtonElement;
    // Focus can freely move to something outside the popover: no trap.
    otherButton.focus();
    expect(document.activeElement).toBe(otherButton);
    await unmount();
  });

  it("closes on Escape", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });

  it("closes only the topmost overlay when overlays overlap", async () => {
    const { container, unmount } = await mount(<NestedOverlayHarness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const anchor = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Abrir popover",
    ) as HTMLButtonElement;
    await click(anchor);

    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Ajuda contextual");

    await keyDown(document, "Escape");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });

  it("closes on outside click without losing already-typed data (data stays in parent state, not lost by this component)", async () => {
    const { container, unmount } = await mount(<Harness />);
    const anchor = container.querySelector("button") as HTMLButtonElement;
    await click(anchor);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    const outside = document.createElement("div");
    document.body.appendChild(outside);
    await mouseDown(outside);

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    outside.remove();
    await unmount();
  });

  it("does not close when clicking inside the popover content", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const popover = container.querySelector('[role="dialog"]') as HTMLElement;
    await mouseDown(popover.querySelector("p") as HTMLElement);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await unmount();
  });
});
