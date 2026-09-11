import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { click, focus, mount } from "../../testUtils";
import { ConfirmModal } from "./ConfirmModal";

function Harness({
  onConfirm,
  destructive,
}: {
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Excluir personagem</button>
      <ConfirmModal
        open={open}
        title="Excluir personagem"
        targetName="Thalindra"
        description="Esta ação remove a ficha permanentemente."
        confirmLabel="Excluir Thalindra"
        destructive={destructive}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

describe("ConfirmModal", () => {
  it("names the target and describes the effect instead of generic OK/Cancel", async () => {
    const { container, unmount } = await mount(<Harness onConfirm={() => {}} />);
    await click(container.querySelector("button") as HTMLButtonElement);
    expect(container.textContent).toContain("Thalindra");
    expect(container.textContent).toContain("remove a ficha permanentemente");
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(container.querySelector(`#${descriptionId}`)?.textContent).toContain(
      "remove a ficha permanentemente",
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const confirmButton = buttons.find((b) => b.textContent === "Excluir Thalindra");
    expect(confirmButton).toBeDefined();
    expect(buttons.some((b) => b.textContent === "Cancelar")).toBe(true);
    await unmount();
  });

  it("focuses Cancelar first so destructive confirmation starts safe", async () => {
    const { container, unmount } = await mount(<Harness onConfirm={() => {}} destructive />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Cancelar",
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(cancelButton);
    await unmount();
  });

  it("uses the danger variant when destructive is true", async () => {
    const { container, unmount } = await mount(<Harness onConfirm={() => {}} destructive />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Excluir Thalindra",
    ) as HTMLButtonElement;
    expect(confirmButton.className).toContain("danger");
    await unmount();
  });

  it("calls onConfirm when the confirm action is activated", async () => {
    const onConfirm = vi.fn();
    const { container, unmount } = await mount(<Harness onConfirm={onConfirm} />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await focus(trigger);
    await click(trigger);
    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Excluir Thalindra",
    ) as HTMLButtonElement;
    await click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("cancel preserves state (closes without confirming)", async () => {
    const onConfirm = vi.fn();
    const { container, unmount } = await mount(<Harness onConfirm={onConfirm} />);
    await click(container.querySelector("button") as HTMLButtonElement);
    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Cancelar",
    ) as HTMLButtonElement;
    await click(cancelButton);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await unmount();
  });
});
