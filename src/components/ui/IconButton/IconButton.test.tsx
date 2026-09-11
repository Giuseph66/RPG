import { describe, expect, it, vi } from "vitest";

import { click, mount } from "../testUtils";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("uses the required label as the accessible name and hides the icon", async () => {
    const { container, unmount } = await mount(
      <IconButton label="Fechar" icon={<span>x</span>} onClick={() => {}} />,
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Fechar");
    const iconWrapper = button.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper?.textContent).toBe("x");
    await unmount();
  });

  it("still fires onClick like a regular button", async () => {
    const onClick = vi.fn();
    const { container, unmount } = await mount(
      <IconButton label="Excluir item" icon={<span>-</span>} onClick={onClick} />,
    );
    await click(container.querySelector("button") as HTMLButtonElement);
    expect(onClick).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("propagates disabled state", async () => {
    const { container, unmount } = await mount(
      <IconButton label="Editar" icon={<span>e</span>} disabled />,
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await unmount();
  });
});
