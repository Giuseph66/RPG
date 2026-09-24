import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { click, fireEvent, mount } from "@components/ui/testUtils";
import type { MapWorkspaceProps } from "./MapWorkspace";
import { MapWorkspace } from "./MapWorkspace";

const campaignId = "campaign" as never;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MapWorkspace", () => {
  it("keeps a single import action while the atlas is empty", async () => {
    const listMaps = vi.fn().mockResolvedValue({ ok: true, value: [] }) as unknown as MapWorkspaceProps["listMaps"];
    const { container, unmount } = await mount(<MapWorkspace campaignId={campaignId} canManage listMaps={listMaps} />);

    await act(async () => { await Promise.resolve(); });
    expect(container.textContent).toContain("Nenhum mapa nesta campanha");
    expect([...container.querySelectorAll("button")].map((button) => button.textContent?.trim())).toEqual(["Escolher imagem"]);
    await unmount();
  });

  it("shows a retry action instead of treating a loading error as an empty atlas", async () => {
    const listMaps = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "unavailable", message: "Atlas indisponível" } })
      .mockResolvedValueOnce({ ok: true, value: [] }) as unknown as MapWorkspaceProps["listMaps"];
    const { container, unmount } = await mount(<MapWorkspace campaignId={campaignId} canManage listMaps={listMaps} />);

    await act(async () => { await Promise.resolve(); });
    expect(container.textContent).toContain("Atlas indisponível");
    expect(container.textContent).toContain("Não foi possível carregar os mapas");
    const retry = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Tentar novamente"));
    expect(retry).toBeDefined();
    await click(retry!);
    await act(async () => { await Promise.resolve(); });
    expect(container.textContent).toContain("Nenhum mapa nesta campanha");
    expect(listMaps).toHaveBeenCalledTimes(2);
    await unmount();
  });

  it("validates and imports a local image into the selected campaign", async () => {
    vi.stubGlobal("Image", class {
      readonly naturalWidth = 640;
      readonly naturalHeight = 360;
      set src(_value: string) {}
      async decode() {}
    });
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)) } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:map-fixture");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    const map = { id: "map", name: "Costa das Brumas", assetId: "asset", pins: [], revision: 0 } as never;
    const asset = { id: "asset", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), width: 640, height: 360 } as never;
    const listMaps = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: [] })
      .mockResolvedValueOnce({ ok: true, value: [map] }) as unknown as MapWorkspaceProps["listMaps"];
    const importMap = vi.fn().mockResolvedValue({ ok: true, value: { map, asset } }) as unknown as NonNullable<MapWorkspaceProps["importMap"]>;
    const getAsset = vi.fn().mockResolvedValue({ ok: true, value: asset }) as unknown as NonNullable<MapWorkspaceProps["getAsset"]>;
    const { container, unmount } = await mount(<MapWorkspace campaignId={campaignId} canManage listMaps={listMaps} importMap={importMap} getAsset={getAsset} />);
    const imageInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(imageInput, "files", { configurable: true, value: [new File([new Uint8Array([1, 2, 3])], "atlas.png", { type: "image/png" })] });
    await fireEvent(imageInput, new Event("change", { bubbles: true }));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(importMap).toHaveBeenCalledWith(expect.objectContaining({ campaignId, name: "atlas", mediaType: "image/png", width: 640, height: 360, originalName: "atlas.png", hash: "0".repeat(64) }));
    expect(container.textContent).toContain("Costa das Brumas");
    expect(container.textContent).toContain("640 × 360 px");
    await unmount();
  });

  it("saves a named point at the chosen map coordinates", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:map-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const map = { id: "map", name: "Costa das Brumas", assetId: "asset", pins: [], revision: 0 } as never;
    const asset = { id: "asset", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), width: 640, height: 360 } as never;
    const pin = { id: "pin", normalizedX: 0.5, normalizedY: 0.5, label: "Entrada do templo", noteIds: [] } as never;
    const listMaps = vi.fn().mockResolvedValue({ ok: true, value: [map] }) as unknown as MapWorkspaceProps["listMaps"];
    const getAsset = vi.fn().mockResolvedValue({ ok: true, value: asset }) as unknown as NonNullable<MapWorkspaceProps["getAsset"]>;
    const addPin = vi.fn().mockResolvedValue({ ok: true, value: { pin, revision: 1 } }) as unknown as NonNullable<MapWorkspaceProps["addPin"]>;
    const { container, unmount } = await mount(<MapWorkspace campaignId={campaignId} canManage listMaps={listMaps} getAsset={getAsset} addPin={addPin} />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const add = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Adicionar local"));
    expect(add).toBeDefined();
    await click(add!);
    const name = container.querySelector('input[maxlength="80"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Entrada do templo");
    await fireEvent(name, new Event("input", { bubbles: true }));
    const save = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Salvar local"));
    await click(save!);

    expect(addPin).toHaveBeenCalledWith(expect.objectContaining({ mapId: "map", x: 0.5, y: 0.5, label: "Entrada do templo", expectedRevision: 0 }));
    expect(container.querySelector('[aria-label="Local: Entrada do templo"]')).not.toBeNull();
    expect(container.textContent).toContain("Local “Entrada do templo” marcado no mapa.");
    await unmount();
  });

  it("renames and removes a map point with optimistic revision updates", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:map-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const pin = { id: "pin", normalizedX: 0.2, normalizedY: 0.3, label: "Ruínas", noteIds: [], iconToken: "pin" } as never;
    const map = { id: "map", name: "Costa das Brumas", assetId: "asset", pins: [pin], revision: 0 } as never;
    const asset = { id: "asset", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]), width: 640, height: 360 } as never;
    const listMaps = vi.fn().mockResolvedValue({ ok: true, value: [map] }) as unknown as MapWorkspaceProps["listMaps"];
    const getAsset = vi.fn().mockResolvedValue({ ok: true, value: asset }) as unknown as NonNullable<MapWorkspaceProps["getAsset"]>;
    const updatePin = vi.fn().mockResolvedValue({ ok: true, value: 1 }) as unknown as NonNullable<MapWorkspaceProps["updatePin"]>;
    const removePin = vi.fn().mockResolvedValue({ ok: true, value: 2 }) as unknown as NonNullable<MapWorkspaceProps["removePin"]>;
    const { container, unmount } = await mount(<MapWorkspace campaignId={campaignId} canManage listMaps={listMaps} getAsset={getAsset} updatePin={updatePin} removePin={removePin} />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const edit = container.querySelector('[aria-label="Renomear local Ruínas"]') as HTMLButtonElement;
    await click(edit);
    const name = container.querySelector('input[maxlength="80"]') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Entrada norte");
    await fireEvent(name, new Event("input", { bubbles: true }));
    await click([...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Salvar alterações"))!);
    expect(updatePin).toHaveBeenCalledWith("map", expect.objectContaining({ label: "Entrada norte" }), 0);
    expect(container.querySelector('[aria-label="Renomear local Entrada norte"]')).not.toBeNull();

    await click(container.querySelector('[aria-label="Remover local Entrada norte"]') as HTMLButtonElement);
    expect(window.confirm).toHaveBeenCalledWith('Remover o local “Entrada norte” deste mapa?');
    expect(removePin).toHaveBeenCalledWith("map", "pin", 1);
    expect(container.textContent).toContain("Nenhum local marcado ainda.");
    await unmount();
  });
});
