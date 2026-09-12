import { describe, expect, it, vi } from "vitest";

import { fireEvent, keyDown, mount } from "@components/ui/testUtils";

import { MapViewer } from "./MapViewer";

const markers = [
  { id: "first", normalizedX: 0.2, normalizedY: 0.3, label: "Aldeia", noteIds: [], iconToken: "•" },
  { id: "second", normalizedX: 0.8, normalizedY: 0.6, label: "Ruínas", noteIds: [], iconToken: "✦" },
] as const;

describe("MapViewer", () => {
  it("offers an accessible alternate marker list and synchronizes selection", async () => {
    const onMarkerSelect = vi.fn();
    const { container, unmount } = await mount(<MapViewer map={{ id: "map", name: "Costa", assetId: "asset" }} image={{ src: "map.png", alt: "Costa desenhada" }} markers={markers} onMarkerSelect={onMarkerSelect} />);
    const listButton = Array.from(container.querySelectorAll("aside button")).find((button) => button.textContent?.includes("Ruínas")) as HTMLButtonElement;
    await fireEvent(listButton, new MouseEvent("click", { bubbles: true }));
    expect(onMarkerSelect).toHaveBeenCalledWith("second");
    expect(container.querySelectorAll('button[aria-label^="Local:"]')).toHaveLength(2);
    await unmount();
  });

  it("supports keyboard zoom, pan and reset controls", async () => {
    const onViewportChange = vi.fn();
    const { container, unmount } = await mount(<MapViewer image={{ src: "map.png" }} markers={[]} onViewportChange={onViewportChange} />);
    const surface = container.querySelector('[role="application"]') as HTMLElement;
    await keyDown(surface, "+");
    await keyDown(surface, "ArrowRight");
    expect(onViewportChange).toHaveBeenCalled();
    expect(container.textContent).toContain("125%");
    await keyDown(surface, "Home");
    expect(container.textContent).toContain("100%");
    await unmount();
  });

  it("keeps the marker list when the local image is unavailable", async () => {
    const { container, unmount } = await mount(<MapViewer markers={markers} />);
    expect(container.textContent).toContain("Este mapa não tem imagem");
    expect(container.textContent).toContain("Aldeia");
    await unmount();
  });
});
