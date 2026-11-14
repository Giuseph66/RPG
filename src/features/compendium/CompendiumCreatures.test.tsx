import { useState } from "react";
import { describe, expect, it } from "vitest";

import { catalogItemsFromCreatureStatBlocks, createCompendiumService, type CompendiumCategory, type CompendiumDetail } from "@application/compendium";
import { click, mount } from "@components/ui/testUtils";
import { asEntityId, asPackVersion, asRulesetId } from "@domain/contracts/ids";
import { asCentimeters } from "@domain/contracts/primitives";
import type { CreatureStatBlock } from "@domain/creatures";

import { Compendium } from "./Compendium";

const ruleset = { id: asRulesetId("local-pack"), version: asPackVersion("1.0.0") };
const wolf: CreatureStatBlock = {
  id: asEntityId("lobo"), name: "Lobo", creatureType: "beast", size: "medium", armorClass: 13, hitPoints: { average: 11, hitDice: "2d8+2" }, speeds: { walkCm: asCentimeters(1200) },
  abilityScores: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }, challengeRating: { numerator: 1, denominator: 4 },
  traits: [{ id: "faro", name: "Faro apurado", description: "Vantagem em testes de Percepção baseados no olfato." }], sourceRefs: [{ sourceId: ruleset.id, chapter: "Apêndice A", printedPage: 317 }],
};
const service = createCompendiumService({ items: catalogItemsFromCreatureStatBlocks([wolf], ruleset) });
const categories: readonly CompendiumCategory[] = [{ id: "creature", label: "Criaturas", status: "available" }];

/** Faz o que a rota faz: resolve o detalhe completo (com a definição) quando uma entrada é escolhida. */
function Harness() {
  const [selected, setSelected] = useState<CompendiumDetail>();
  return <Compendium entries={service.search({ category: "creature" }).entries} filters={{ query: "", category: "creature" }} categories={categories} selected={selected} onSelect={(entry) => { const detail = service.getDetail(entry.ref); if (detail.ok) setSelected(detail.value); }} />;
}

describe("Compendium · categoria Criaturas", () => {
  it("mostra a categoria, filtra criaturas e abre o bloco estatístico completo", async () => {
    const { container, unmount } = await mount(<Harness />);
    const categoryButton = [...container.querySelectorAll("section[aria-labelledby='compendium-categories-title'] button")].find((button) => button.textContent?.includes("Criaturas"))!;
    expect(categoryButton).toBeTruthy();
    const result = [...container.querySelectorAll("section[aria-labelledby='compendium-results-title'] button[aria-haspopup='dialog']")].find((button) => button.textContent?.includes("Lobo"))!;
    // A lista traz o resumo da criatura para escolher sem abrir cada uma.
    expect(result.textContent).toContain("Criatura · Besta · Média · ND 1/4 · CA 13 · PV 11");
    await click(result);
    const dialog = document.body.querySelector("[role='dialog']")!;
    expect(dialog.querySelector("h2")?.textContent).toBe("Criatura");
    expect(dialog.querySelector("article[aria-label='Bloco estatístico: Lobo']")).toBeTruthy();
    expect(dialog.textContent).toContain("Faro apurado");
    expect(dialog.textContent).toContain("2d8+2");
    await unmount();
  });
});
