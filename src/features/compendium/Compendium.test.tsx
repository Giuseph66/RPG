import { describe, expect, it, vi } from "vitest";

import { fireEvent, keyDown, mount } from "@components/ui/testUtils";
import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts";
import { buildCompendiumIndex, favoriteKey } from "@application/compendium";
import type { CompendiumCatalogItem } from "@application/compendium";

import { Compendium, CompendiumDetailPanel } from "./index";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };
const item: CompendiumCatalogItem = { entityType: "spell", ruleset, summary: "Resumo", definition: { id: asEntityId("cura"), name: "Cura", tags: ["cura"], sourceRefs: [{ sourceId: ruleset.id, chapter: "Magia", printedPage: 12 }] } as never };
const entries = buildCompendiumIndex([item]);

describe("Compendium", () => {
  it("keeps search filters through selection and exposes source detail", async () => {
    const onFiltersChange = vi.fn();
    const onSelect = vi.fn();
    const { container, unmount } = await mount(<Compendium entries={entries} filters={{ query: "cura" }} categories={[{ id: "spell", label: "Magia", status: "available" }]} onFiltersChange={onFiltersChange} onSelect={onSelect} />);
    const result = container.querySelector('[aria-labelledby="compendium-results-title"] button') as HTMLButtonElement;
    await fireEvent(result, new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(entries[0]);
    expect(container.textContent).toContain("1 encontrado");
    await unmount();
  });

  it("renders pending category, offline state and orphan favorite", async () => {
    const orphan = { ref: { rulesetId: ruleset.id, rulesetVersion: ruleset.version, entityType: "spell" as const, entityId: "missing" }, key: favoriteKey({ rulesetId: ruleset.id, rulesetVersion: ruleset.version, entityType: "spell", entityId: "missing" }), exists: false };
    const { container, unmount } = await mount(<Compendium entries={[]} filters={{ query: "" }} categories={[{ id: "rules", label: "Regras", status: "pending" }]} favorites={[orphan]} />);
    expect(container.textContent).toContain("Offline disponível");
    expect(container.textContent).toContain("Pendente");
    expect(container.textContent).toContain("Favoritos órfãos");
    await unmount();
  });

  it("keeps detail controls keyboard reachable", async () => {
    const detail = { ...entries[0]!, definition: item.definition };
    const onToggleFavorite = vi.fn();
    const { container, unmount } = await mount(<CompendiumDetailPanel detail={detail} onToggleFavorite={onToggleFavorite} />);
    const button = container.querySelector("button") as HTMLButtonElement;
    button.focus();
    await keyDown(button, "Enter");
    await fireEvent(button, new MouseEvent("click", { bubbles: true }));
    expect(onToggleFavorite).toHaveBeenCalled();
    await unmount();
  });
});
