import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { VisuallyHidden } from "./VisuallyHidden";

describe("VisuallyHidden", () => {
  it("renders its text content in the DOM for assistive tech", async () => {
    const { container, unmount } = await mount(
      <VisuallyHidden>Carregando personagem</VisuallyHidden>,
    );
    expect(container.textContent).toBe("Carregando personagem");
    await unmount();
  });

  it("clips the element visually via CSS class instead of removing it", async () => {
    const { container, unmount } = await mount(
      <VisuallyHidden>Texto para leitor de tela</VisuallyHidden>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBeTruthy();
    expect(el.hidden).toBe(false);
    await unmount();
  });

  it("supports a custom element type", async () => {
    const { container, unmount } = await mount(
      <VisuallyHidden as="p">Nota</VisuallyHidden>,
    );
    expect(container.querySelector("p")).not.toBeNull();
    await unmount();
  });
});
