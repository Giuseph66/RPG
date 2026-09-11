import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { Input } from "./Input";

describe("Input", () => {
  it("associates a permanent visible label with the field", async () => {
    const { container, unmount } = await mount(
      <Input label="Nome do personagem" />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    const label = container.querySelector("label") as HTMLLabelElement;
    expect(label.textContent).toContain("Nome do personagem");
    expect(label.getAttribute("for")).toBe(input.id);
    await unmount();
  });

  it("associates hint and error text via aria-describedby and sets aria-invalid", async () => {
    const { container, unmount } = await mount(
      <Input
        label="Pontos de vida atuais"
        hint="Valor entre 0 e o máximo"
        error="Informe um número válido"
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ");
    expect(ids.length).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl?.textContent).toBe("Informe um número válido");
    await unmount();
  });

  it("never relies on placeholder as the only label", async () => {
    const { container, unmount } = await mount(
      <Input label="Apelido" placeholder="ex: Thalindra" />,
    );
    const label = container.querySelector("label");
    expect(label?.textContent).toContain("Apelido");
    await unmount();
  });
});
