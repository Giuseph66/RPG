import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AppModal, LiveRegion, Tabs } from "@components/ui";
import { MapViewer } from "@features/journey/map";
import { click, focus, keyDown, mount } from "@components/ui/testUtils";
import { AppShell } from "@components/layout/AppShell";
import { matchRoute } from "@app/routes";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return <div><button onClick={() => setOpen(true)}>Acionar</button><AppModal open={open} title="Editar personagem" onClose={() => setOpen(false)}><button>Salvar</button></AppModal></div>;
}

describe("A11Y-001 contratos transversais", () => {
  it("deixa o skip link receber o primeiro Tab no mount e foca o título após navegação", async () => {
    const { container, rerender, unmount } = await mount(<AppShell route={matchRoute("/")} navigate={() => undefined} />);
    const title = container.querySelector("main h1");
    const skipLink = container.querySelector(".skip-link") as HTMLAnchorElement;

    expect(document.activeElement).not.toBe(title);
    await focus(document.body);
    await keyDown(document.body, "Tab");
    const firstTabStop = Array.from(container.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]"))
      .filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0)[0];
    expect(firstTabStop).toBe(skipLink);
    if (!firstTabStop) throw new Error("AppShell rendered no keyboard tab stop");
    await focus(firstTabStop);
    expect(document.activeElement).toBe(skipLink);
    await rerender(<AppShell route={matchRoute("/character")} navigate={() => undefined} />);
    const navigatedTitle = container.querySelector("main h1") as HTMLElement | null;
    expect(navigatedTitle?.tabIndex).toBe(-1);
    expect(navigatedTitle).toBe(document.activeElement);
    await unmount();
  });

  it("mantém nome, modalidade, foco inicial, contenção e retorno do AppModal", async () => {
    const { container, unmount } = await mount(<ModalHarness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    await focus(trigger);
    await click(trigger);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(container.querySelector(`#${dialog.getAttribute("aria-labelledby")}`)?.textContent).toBe("Editar personagem");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await focus(dialog.querySelector("button") as HTMLElement);
    await keyDown(dialog, "Tab");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await keyDown(document, "Escape");
    expect(document.activeElement).toBe(trigger);
    await unmount();
  });

  it("usa anúncio único e tablist semântica com navegação por teclado", async () => {
    const { container, rerender, unmount } = await mount(<div><LiveRegion message="Rolagem: 14" /><Tabs label="Seções da ficha" tabs={[{ id: "one", label: "Estado", panel: <p>PV</p> }, { id: "two", label: "Inventário", panel: <p>Itens</p> }]} /></div>);
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
    expect(tablist.getAttribute("aria-label")).toBe("Seções da ficha");
    const tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    await focus(tabs[0]);
    await keyDown(tabs[0], "ArrowRight");
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    await rerender(<div><LiveRegion message="Rolagem: 9" /><Tabs label="Seções da ficha" tabs={[{ id: "one", label: "Estado", panel: <p>PV</p> }, { id: "two", label: "Inventário", panel: <p>Itens</p> }]} activeId="two" /></div>);
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    await unmount();
  });

  it("oferece mapa focável, alternativa em lista e controles sem hover", async () => {
    const changes: { readonly zoom: number }[] = [];
    const { container, unmount } = await mount(<MapViewer map={{ id: "map", name: "Mapa longo", assetId: "asset" }} image={{ src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", alt: "Mapa da torre" }} markers={[{ id: "marker-1", label: "Entrada principal", x: 0.2, y: 0.3, iconToken: "•" }]} onViewportChange={(viewport) => changes.push({ zoom: viewport.zoom })} />);
    const surface = container.querySelector('[role="application"]') as HTMLElement;
    expect(surface.getAttribute("aria-label")).toContain("setas");
    expect(container.querySelector('img[alt="Mapa da torre"]')).not.toBeNull();
    expect(Array.from(container.querySelectorAll("aside button")).some((button) => button.textContent?.includes("Entrada principal"))).toBe(true);
    await focus(surface);
    await keyDown(surface, "+");
    expect(container.textContent).toContain("125%");
    expect(changes.at(-1)?.zoom).toBe(1.25);
    await unmount();
  });
});
