import { afterEach, describe, expect, it, vi } from "vitest";

import { click, fireEvent, mount } from "@components/ui/testUtils";
import type { CompendiumDetail } from "@application/compendium";

import { RuleLookupProvider, useRuleHint, type RuleLookup } from "./RuleLookup";

const detail = {
  key: "static:spell:bordao-mistico",
  ref: { kind: "static", rulesetId: "phb-ptbr-local-2017", entityId: "bordao-mistico", category: "spell" },
  ruleset: { id: "phb-ptbr-local-2017", version: "1.0.0" },
  category: "spell",
  title: "Bordão Místico",
  aliases: [],
  tags: [],
  searchText: "bordao mistico",
  summary: "A madeira de uma clava ou bordão é imbuída com o poder da natureza.",
  sourceRefs: [],
  definition: { id: "bordao-mistico", name: "Bordão Místico", description: "A madeira de uma clava ou bordão é imbuída com o poder da natureza." },
} as unknown as CompendiumDetail;

function Probe({ onClick }: { readonly onClick: () => void }) {
  const rule = useRuleHint();
  return <button type="button" {...rule({ category: "spell", title: "Bordão Místico" })} onClick={onClick}>Bordão</button>;
}

function pointer(type: string) {
  return new PointerEvent(type, { bubbles: true, button: 0, clientX: 10, clientY: 10 });
}

describe("RuleLookupProvider", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("abre a regra no toque longo e engole o clique seguinte", async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const lookup: RuleLookup = vi.fn(() => detail);
    const { container, unmount } = await mount(<RuleLookupProvider lookup={lookup}><Probe onClick={onClick} /></RuleLookupProvider>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.getAttribute("data-rule-hint")).toBe("Bordão Místico");
    await fireEvent(button, pointer("pointerdown"));
    vi.advanceTimersByTime(500);
    await fireEvent(button, pointer("pointerup"));
    await click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("poder da natureza");
    await unmount();
  });

  it("mantém o clique curto e não liga nada quando a regra não existe", async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const { container, rerender, unmount } = await mount(<RuleLookupProvider lookup={() => detail}><Probe onClick={onClick} /></RuleLookupProvider>);
    const button = container.querySelector("button") as HTMLButtonElement;
    await fireEvent(button, pointer("pointerdown"));
    vi.advanceTimersByTime(100);
    await fireEvent(button, pointer("pointerup"));
    await click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await rerender(<RuleLookupProvider lookup={() => undefined}><Probe onClick={onClick} /></RuleLookupProvider>);
    expect(container.querySelector("button")?.hasAttribute("data-rule-hint")).toBe(false);
    await unmount();
  });
});
