import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("labels the wrapping landmark with the heading text", async () => {
    const { container, unmount } = await mount(
      <SectionCard heading="Atributos">
        <p>Conteúdo</p>
      </SectionCard>,
    );
    const section = container.querySelector("section") as HTMLElement;
    const labelledBy = section.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const heading = container.querySelector(`#${labelledBy}`);
    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent).toBe("Atributos");
    await unmount();
  });

  it("supports a configurable heading level", async () => {
    const { container, unmount } = await mount(
      <SectionCard heading="Perícias" headingLevel={3}>
        content
      </SectionCard>,
    );
    expect(container.querySelector("h3")?.textContent).toBe("Perícias");
    await unmount();
  });

  it("supports a custom semantic wrapper via `as`", async () => {
    const { container, unmount } = await mount(
      <SectionCard heading="Barra lateral" as="aside">
        content
      </SectionCard>,
    );
    expect(container.querySelector("aside")).not.toBeNull();
    await unmount();
  });

  it("renders an optional actions slot", async () => {
    const { container, unmount } = await mount(
      <SectionCard heading="Inventário" actions={<button>Adicionar</button>}>
        content
      </SectionCard>,
    );
    expect(container.querySelector("button")?.textContent).toBe("Adicionar");
    await unmount();
  });
});
