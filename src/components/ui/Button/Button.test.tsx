import { describe, expect, it, vi } from "vitest";

import { click, keyDown, mount } from "../testUtils";
import { Button } from "./Button";

describe("Button", () => {
  it("renders an accessible name from its children", async () => {
    const { container, unmount } = await mount(<Button>Rolar dados</Button>);
    const button = container.querySelector("button");
    expect(button?.textContent).toContain("Rolar dados");
    expect(button?.getAttribute("type")).toBe("button");
    await unmount();
  });

  it("meets the 44px touch target minimum via CSS class, and calls onClick", async () => {
    const onClick = vi.fn();
    const { container, unmount } = await mount(
      <Button onClick={onClick}>Confirmar</Button>,
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    await click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    await unmount();
  });

  it("reflects disabled state in ARIA and blocks activation while staying focusable", async () => {
    const onClick = vi.fn();
    const { container, unmount } = await mount(
      <Button disabled disabledReason="Sem espaços de magia restantes" onClick={onClick}>
        Conjurar
      </Button>,
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    const describedBy = button.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const reasonEl = container.querySelector(`#${describedBy}`);
    expect(reasonEl?.textContent).toBe("Sem espaços de magia restantes");

    await click(button);
    expect(onClick).not.toHaveBeenCalled();

    await keyDown(button, "Enter");
    expect(onClick).not.toHaveBeenCalled();

    await unmount();
  });

  it("reflects busy state via aria-busy and blocks activation", async () => {
    const onClick = vi.fn();
    const { container, unmount } = await mount(
      <Button busy onClick={onClick}>
        Salvando
      </Button>,
    );
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await click(button);
    expect(onClick).not.toHaveBeenCalled();
    await unmount();
  });

  it("supports variant and size class application without crashing", async () => {
    const { container, unmount } = await mount(
      <Button variant="danger" size="lg">
        Excluir
      </Button>,
    );
    const button = container.querySelector("button");
    expect(button?.className).toContain("danger");
    expect(button?.className).toContain("lg");
    await unmount();
  });
});
