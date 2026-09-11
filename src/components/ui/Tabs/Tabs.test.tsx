import { describe, expect, it } from "vitest";

import { focus, keyDown, mount } from "../testUtils";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "attrs", label: "Atributos", panel: <p>Painel de atributos</p> },
  { id: "skills", label: "Perícias", panel: <p>Painel de perícias</p> },
  { id: "inv", label: "Inventário", panel: <p>Painel de inventário</p> },
];

describe("Tabs", () => {
  it("renders tablist/tab/tabpanel roles with aria-selected", async () => {
    const { container, unmount } = await mount(<Tabs label="Seções da ficha" tabs={tabs} />);
    const tablist = container.querySelector('[role="tablist"]') as HTMLElement;
    expect(tablist.getAttribute("aria-label")).toBe("Seções da ficha");
    const tabButtons = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabButtons).toHaveLength(3);
    expect(tabButtons[0].getAttribute("aria-selected")).toBe("true");
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("false");
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
    expect(panels).toHaveLength(3);
    await unmount();
  });

  it("moves focus and selection with ArrowRight/ArrowLeft using roving tabindex", async () => {
    const { container, unmount } = await mount(<Tabs label="Seções" tabs={tabs} />);
    const tabButtons = Array.from(
      container.querySelectorAll('[role="tab"]'),
    ) as HTMLButtonElement[];

    await focus(tabButtons[0]);
    await keyDown(tabButtons[0], "ArrowRight");

    expect(document.activeElement).toBe(tabButtons[1]);
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("true");
    expect(tabButtons[1].tabIndex).toBe(0);
    expect(tabButtons[0].tabIndex).toBe(-1);

    await keyDown(tabButtons[1], "ArrowLeft");
    expect(document.activeElement).toBe(tabButtons[0]);
    expect(tabButtons[0].getAttribute("aria-selected")).toBe("true");

    await unmount();
  });

  it("Home/End jump to first/last enabled tab", async () => {
    const { container, unmount } = await mount(<Tabs label="Seções" tabs={tabs} />);
    const tabButtons = Array.from(
      container.querySelectorAll('[role="tab"]'),
    ) as HTMLButtonElement[];
    await focus(tabButtons[0]);
    await keyDown(tabButtons[0], "End");
    expect(document.activeElement).toBe(tabButtons[2]);
    await keyDown(tabButtons[2], "Home");
    expect(document.activeElement).toBe(tabButtons[0]);
    await unmount();
  });

  it("skips disabled tabs when navigating", async () => {
    const withDisabled = [
      tabs[0],
      { ...tabs[1], disabled: true },
      tabs[2],
    ];
    const { container, unmount } = await mount(
      <Tabs label="Seções" tabs={withDisabled} />,
    );
    const tabButtons = Array.from(
      container.querySelectorAll('[role="tab"]'),
    ) as HTMLButtonElement[];
    await focus(tabButtons[0]);
    await keyDown(tabButtons[0], "ArrowRight");
    expect(document.activeElement).toBe(tabButtons[2]);
    await unmount();
  });

  it("supports a controlled activeId", async () => {
    const { container, unmount } = await mount(
      <Tabs label="Seções" tabs={tabs} activeId="skills" onChange={() => {}} />,
    );
    const tabButtons = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("true");
    await unmount();
  });

  it("falls back to the first enabled tab when defaultActiveId is invalid or disabled", async () => {
    const withDisabled = [
      { ...tabs[0], disabled: true },
      tabs[1],
      tabs[2],
    ];
    const { container, unmount } = await mount(
      <Tabs label="Seções" tabs={withDisabled} defaultActiveId="missing" />,
    );
    const tabButtons = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabButtons[0].getAttribute("aria-selected")).toBe("false");
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("true");
    await unmount();

    const secondMount = await mount(
      <Tabs label="Seções" tabs={withDisabled} defaultActiveId="attrs" />,
    );
    const secondButtons = Array.from(
      secondMount.container.querySelectorAll('[role="tab"]'),
    );
    expect(secondButtons[1].getAttribute("aria-selected")).toBe("true");
    await secondMount.unmount();
  });

  it("falls back to the first enabled tab when controlled activeId is invalid or disabled", async () => {
    const withDisabled = [
      tabs[0],
      { ...tabs[1], disabled: true },
      tabs[2],
    ];
    const { container, unmount } = await mount(
      <Tabs label="Seções" tabs={withDisabled} activeId="skills" />,
    );
    const tabButtons = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabButtons[0].getAttribute("aria-selected")).toBe("true");
    expect(tabButtons[1].getAttribute("aria-selected")).toBe("false");
    await unmount();

    const secondMount = await mount(
      <Tabs label="Seções" tabs={withDisabled} activeId="missing" />,
    );
    const secondButtons = Array.from(
      secondMount.container.querySelectorAll('[role="tab"]'),
    );
    expect(secondButtons[0].getAttribute("aria-selected")).toBe("true");
    await secondMount.unmount();
  });
});
