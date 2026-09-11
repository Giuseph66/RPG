import { describe, expect, it } from "vitest";

import { mount } from "../testUtils";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes value/min/max via ARIA and a visible current/max text", async () => {
    const { container, unmount } = await mount(
      <ProgressBar value={7} max={12} label="Pontos de vida" />,
    );
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute("aria-valuenow")).toBe("7");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("12");
    expect(bar.getAttribute("aria-label")).toBe("Pontos de vida");
    expect(container.textContent).toContain("7/12");
    await unmount();
  });

  it("shows temporary points separately from current/max", async () => {
    const { container, unmount } = await mount(
      <ProgressBar value={7} max={12} tempValue={3} label="Pontos de vida" />,
    );
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute("aria-valuetext")).toContain("temporário");
    expect(container.textContent).toContain("+3");
    await unmount();
  });

  it("clamps the displayed value within min/max", async () => {
    const { container, unmount } = await mount(
      <ProgressBar value={999} max={10} label="Recurso" />,
    );
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.getAttribute("aria-valuenow")).toBe("10");
    await unmount();
  });

  it("applies a tone class", async () => {
    const { container, unmount } = await mount(
      <ProgressBar value={1} max={4} tone="magic" label="Espaços de magia" />,
    );
    expect(container.innerHTML).toContain("magic");
    await unmount();
  });
});
