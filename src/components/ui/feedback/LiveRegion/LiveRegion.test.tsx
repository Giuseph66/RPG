import { describe, expect, it } from "vitest";

import { mount } from "../../testUtils";
import { LiveRegion } from "./LiveRegion";

describe("LiveRegion", () => {
  it("renders a polite, atomic status region with the message text", async () => {
    const { container, unmount } = await mount(<LiveRegion message="Rolagem: 14" />);
    const region = container.querySelector('[role="status"]') as HTMLElement;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(region.textContent).toBe("Rolagem: 14");
    await unmount();
  });

  it("updates in place on message change instead of mounting a new region", async () => {
    const { container, rerender, unmount } = await mount(
      <LiveRegion message="Rolagem: 14" />,
    );
    const regionBefore = container.querySelector('[role="status"]');
    await rerender(<LiveRegion message="Rolagem: 9" />);
    const regionAfter = container.querySelector('[role="status"]');
    expect(regionAfter).toBe(regionBefore);
    expect(regionAfter?.textContent).toBe("Rolagem: 9");
    await unmount();
  });

  it("is visually hidden but present in the DOM", async () => {
    const { container, unmount } = await mount(<LiveRegion message="Salvo" />);
    const region = container.querySelector('[role="status"]') as HTMLElement;
    expect(region.hidden).toBe(false);
    expect(region.className).toBeTruthy();
    await unmount();
  });
});
