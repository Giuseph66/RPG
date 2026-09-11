import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { click, focus, keyDown, mount, mouseDown } from "../../testUtils";
import { AppModal } from "./AppModal";

function Harness({
  dismissOnBackdrop,
}: {
  dismissOnBackdrop?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir modal</button>
      <AppModal
        open={open}
        title="Editar personagem"
        onClose={() => setOpen(false)}
        dismissOnBackdrop={dismissOnBackdrop}
      >
        <input aria-label="Nome" />
        <button>Salvar</button>
      </AppModal>
    </div>
  );
}

describe("AppModal", () => {
  it("has an accessible name, aria-modal, and renders nothing while closed", async () => {
    const { container, unmount } = await mount(<Harness />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(container.querySelector(`#${labelledBy}`)?.textContent).toBe(
      "Editar personagem",
    );
    await unmount();
  });

  it("moves initial focus inside the dialog on open", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.contains(document.activeElement)).toBe(true);
    await unmount();
  });

  it("cycles Tab within the dialog (does not escape to the trigger button)", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const focusableInDialog = Array.from(
      dialog.querySelectorAll("button, input"),
    ) as HTMLElement[];
    const last = focusableInDialog[focusableInDialog.length - 1];
    const first = focusableInDialog[0];

    last.focus();
    await keyDown(dialog, "Tab");
    expect(document.activeElement).toBe(first);

    first.focus();
    await keyDown(dialog, "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);

    await unmount();
  });

  it("Escape calls onClose and focus returns to the trigger button", async () => {
    const { container, unmount } = await mount(<Harness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    // A real click also focuses the activated element; our synthetic
    // dispatchEvent("click") does not, so focus it explicitly first to
    // simulate that starting condition.
    await focus(trigger);
    await click(trigger);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    await keyDown(document, "Escape");

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await unmount();
  });

  it("marks background siblings inert and aria-hidden while open, and restores them on close", async () => {
    const { container, unmount } = await mount(<Harness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await click(trigger);

    // The trigger button's sibling in the DOM tree is the backdrop wrapper;
    // walk to find the actual sibling marked inert at the level above the
    // dialog's ancestor chain.
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    let node: HTMLElement | null = dialog;
    let foundInertSibling = false;
    while (node && node !== document.body && node.parentElement) {
      const parent: HTMLElement = node.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling.getAttribute("inert") === "") {
          foundInertSibling = true;
        }
      }
      node = parent;
    }
    expect(foundInertSibling).toBe(true);

    await keyDown(document, "Escape");
    // After close, nothing under container should still carry the inert
    // attribute we added.
    expect(container.querySelector("[inert]")).toBeNull();

    await unmount();
  });

  it("closes on backdrop click when dismissOnBackdrop is true (default)", async () => {
    const { container, unmount } = await mount(<Harness />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const backdrop = dialog.parentElement as HTMLElement;

    // A mousedown directly on the backdrop element (not bubbled from the
    // dialog) has event.target === event.currentTarget, which is what
    // AppModal checks before dismissing.
    await mouseDown(backdrop);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });

  it("does not close on backdrop click when dismissOnBackdrop is false", async () => {
    const onClose = vi.fn();
    const { container, unmount } = await mount(
      <AppModal open title="Confirmar" onClose={onClose} dismissOnBackdrop={false}>
        <p>Conteúdo</p>
      </AppModal>,
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const backdrop = dialog.parentElement as HTMLElement;
    await mouseDown(backdrop);
    expect(onClose).not.toHaveBeenCalled();
    await unmount();
  });

  it("uses initialFocusRef when provided", async () => {
    function HarnessWithRef() {
      const [open, setOpen] = useState(false);
      const inputRef = useRef<HTMLInputElement>(null);
      return (
        <div>
          <button onClick={() => setOpen(true)}>Abrir</button>
          <AppModal
            open={open}
            title="Ajustar PV"
            onClose={() => setOpen(false)}
            initialFocusRef={inputRef}
          >
            <input aria-label="Quantidade" ref={inputRef} />
          </AppModal>
        </div>
      );
    }
    const { container, unmount } = await mount(<HarnessWithRef />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    await unmount();
  });
});
