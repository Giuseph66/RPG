import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { Select } from "./Select";

describe("Select", () => {
  it("associates a permanent visible label and renders options", async () => {
    const { container, unmount } = await mount(
      <Select
        label="Classe"
        options={[
          { value: "guerreiro", label: "Guerreiro" },
          { value: "mago", label: "Mago" },
        ]}
      />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    const label = container.querySelector("label") as HTMLLabelElement;
    expect(label.textContent).toContain("Classe");
    expect(label.getAttribute("for")).toBe(select.id);
    expect(select.querySelectorAll("option").length).toBe(2);
    await unmount();
  });

  it("reflects error via aria-invalid and associates the error text", async () => {
    const { container, unmount } = await mount(
      <Select
        label="Raça"
        error="Selecione uma raça"
        options={[{ value: "humano", label: "Humano" }]}
      />,
    );
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.getAttribute("aria-invalid")).toBe("true");
    const describedBy = select.getAttribute("aria-describedby") ?? "";
    expect(container.querySelector(`#${describedBy}`)?.textContent).toBe(
      "Selecione uma raça",
    );
    await unmount();
  });

  it("allows children to override flat options for optgroup use", async () => {
    const { container, unmount } = await mount(
      <Select label="Item">
        <optgroup label="Armas">
          <option value="espada">Espada</option>
        </optgroup>
      </Select>,
    );
    expect(container.querySelector("optgroup")).not.toBeNull();
    await unmount();
  });
});
