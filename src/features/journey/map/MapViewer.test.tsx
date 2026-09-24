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

  it("uses the map coordinates on double click and keeps center placement available", async () => {
    const onAddMarker = vi.fn();
    const { container, unmount } = await mount(<MapViewer image={{ src: "map.png" }} markers={[]} onAddMarker={onAddMarker} />);
    const surface = container.querySelector('[role="application"]') as HTMLElement;
    const canvas = surface.firstElementChild as HTMLElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120, x: 10, y: 20, toJSON: () => ({}) } as DOMRect);
    await fireEvent(canvas, new MouseEvent("dblclick", { bubbles: true, clientX: 60, clientY: 95 }));
    expect(onAddMarker).toHaveBeenLastCalledWith({ x: 0.25, y: 0.75 });
    const center = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar local"))!;
    await fireEvent(center, new MouseEvent("click", { bubbles: true }));
    expect(onAddMarker).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5 });
    await unmount();
  });

  it("exposes marker management only through the callbacks provided by the master", async () => {
    const onMarkerEdit = vi.fn();
    const onMarkerRemove = vi.fn();
    const { container, unmount } = await mount(<MapViewer image={{ src: "map.png" }} markers={[markers[0]]} onMarkerEdit={onMarkerEdit} onMarkerRemove={onMarkerRemove} />);
    const edit = container.querySelector('[aria-label="Renomear local Aldeia"]') as HTMLButtonElement;
    const remove = container.querySelector('[aria-label="Remover local Aldeia"]') as HTMLButtonElement;
    await fireEvent(edit, new MouseEvent("click", { bubbles: true }));
    await fireEvent(remove, new MouseEvent("click", { bubbles: true }));
    expect(onMarkerEdit).toHaveBeenCalledWith("first");
    expect(onMarkerRemove).toHaveBeenCalledWith("first");
    await unmount();
  });

  it("keeps the marker list when the local image is unavailable", async () => {
    const { container, unmount } = await mount(<MapViewer markers={markers} />);
    expect(container.textContent).toContain("Este mapa não tem imagem");
    expect(container.textContent).toContain("Aldeia");
    await unmount();
  });
});
