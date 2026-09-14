import { describe, expect, it, vi } from "vitest";

import { fireEvent, keyDown, mount } from "@components/ui/testUtils";
import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts";
import { buildCompendiumIndex, favoriteKey } from "@application/compendium";
import type { CompendiumCatalogItem } from "@application/compendium";

import { Compendium } from "./index";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };
const item: CompendiumCatalogItem = { entityType: "spell", ruleset, summary: "Resumo", definition: { id: asEntityId("cura"), name: "Cura", tags: ["cura"], sourceRefs: [{ sourceId: ruleset.id, chapter: "Magia", printedPage: 12 }] } as never };
const entries = buildCompendiumIndex([item]);

describe("Compendium", () => {
  it("keeps the initial view focused without rendering result rows", async () => {
    const { container, unmount } = await mount(<Compendium entries={entries} filters={{ query: "" }} categories={[]} />);
    expect(container.querySelector('[aria-labelledby="compendium-results-title"]')).toBeNull();
    expect(container.textContent).toContain("Escolha uma categoria ou busque por nome, categoria ou tag.");
    expect(container.textContent).not.toContain("Cura");
    await unmount();
  });

  it("collapses and expands category tiles with an accessible control", async () => {
    const { container, unmount } = await mount(<Compendium entries={[]} filters={{ query: "" }} categories={[{ id: "spell", label: "Magia", status: "available" }]} />);
    const toggle = container.querySelector(".categoryToggle") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("#compendium-category-grid")).not.toBeNull();
    await fireEvent(toggle, new MouseEvent("click", { bubbles: true }));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("#compendium-category-grid")).toBeNull();
    expect(container.querySelector('[aria-label="Como consultar"]')).toBeNull();
    expect(toggle.getAttribute("aria-label")).toBe("Expandir categorias");
    await unmount();
  });

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

  it("clears an active category when pressed again", async () => {
    const onFiltersChange = vi.fn();
    const { container, unmount } = await mount(<Compendium entries={[]} filters={{ query: "", category: "spell" }} categories={[{ id: "spell", label: "Magia", status: "available" }]} onFiltersChange={onFiltersChange} />);
    const category = container.querySelector('[aria-labelledby="compendium-categories-title"] button') as HTMLButtonElement;
    await fireEvent(category, new MouseEvent("click", { bubbles: true }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ query: "", category: undefined });
    await unmount();
  });

  it("renders pending category, offline warning and orphan favorite", async () => {
    const orphan = { ref: { rulesetId: ruleset.id, rulesetVersion: ruleset.version, entityType: "spell" as const, entityId: "missing" }, key: favoriteKey({ rulesetId: ruleset.id, rulesetVersion: ruleset.version, entityType: "spell", entityId: "missing" }), exists: false };
    const { container, unmount } = await mount(<Compendium entries={[]} filters={{ query: "" }} offline={false} categories={[{ id: "rules", label: "Regras", status: "pending" }]} favorites={[orphan]} />);
    expect(container.textContent).toContain("Conhecimento offline indisponível");
    expect(container.textContent).toContain("Pendente");
    expect(container.textContent).toContain("Favoritos órfãos");
    await unmount();
  });

  it("opens selected result in an accessible dialog with source", async () => {
    const { container, unmount } = await mount(<Compendium entries={entries} filters={{ query: "" }} />);
    const result = container.querySelector('[aria-labelledby="compendium-results-title"] button') as HTMLButtonElement;
    await fireEvent(result, new MouseEvent("click", { bubbles: true }));
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Magia, p. 12");
    await unmount();
  });

  it("keeps modal header favorite control keyboard reachable", async () => {
    const onToggleFavorite = vi.fn();
    const { container, unmount } = await mount(<Compendium entries={entries} filters={{ query: "cura" }} onToggleFavorite={onToggleFavorite} />);
    const result = container.querySelector('[aria-labelledby="compendium-results-title"] button') as HTMLButtonElement;
    await fireEvent(result, new MouseEvent("click", { bubbles: true }));
    const button = container.querySelector('[aria-label="Favoritar"]') as HTMLButtonElement;
    button.focus();
    await keyDown(button, "Enter");
    await fireEvent(button, new MouseEvent("click", { bubbles: true }));
    expect(onToggleFavorite).toHaveBeenCalled();
    await unmount();
  });
});
