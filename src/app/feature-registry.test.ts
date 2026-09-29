import { describe, expect, it, vi } from "vitest";

import type { ApplicationServices } from "@application/state";
import { createCompendiumService } from "@application/compendium";
import { asEntityId, asRulesetId } from "@domain/contracts/ids";

import { createFeatureRegistry } from "./feature-registry";

function services(): ApplicationServices {
  return {
    character: { select: vi.fn(async () => ({ ok: true as const, value: undefined })), retry: vi.fn(async () => ({ ok: true as const, value: undefined })) } as unknown as ApplicationServices["character"],
    campaign: {} as ApplicationServices["campaign"],
    settings: {} as ApplicationServices["settings"],
    dice: {} as ApplicationServices["dice"],
  };
}

const catalog = createCompendiumService({ items: [{ entityType: "spell", ruleset: { id: asRulesetId("smoke-pack"), version: "1.0.0" as never }, definition: { id: asEntityId("smoke-spell"), name: "Magia smoke", tags: ["teste"], sourceRefs: [{ sourceId: asRulesetId("smoke-pack"), chapter: "Teste", printedPage: 1 }] } as never }] });

describe("feature registry", () => {
  it("preserva exports públicos e injeta serviços/read models reais", () => {
    const characterServices = services();
    const actionDispatcher = vi.fn();
    const registry = createFeatureRegistry({ services: characterServices, compendiumService: catalog, actionDispatcher });

    expect(registry.destinations).toEqual(["character", "actions", "journey", "compendium"]);
    expect("components" in registry.character).toBe(false);
    expect("component" in registry.actions).toBe(false);
    expect("component" in registry.inventory).toBe(false);
    expect("components" in registry.journey).toBe(false);
    expect("component" in registry.compendium).toBe(false);
    expect(registry.compendium.bindProps({ filters: { query: "smoke" } }).entries[0]?.title).toBe("Magia smoke");
    expect(registry.compendium.bindProps({}).categories?.length).toBeGreaterThan(0);
    expect(registry.actions.bindProps({}).onIntent).toBe(actionDispatcher);
  });

  it("esconde fichas de elenco das listas gerais e as entrega só em listAll", async () => {
    const summary = (id: string, castSheet?: true) => ({ id, name: id, classSummary: [], totalLevel: 1, updatedAt: "2026-01-01T00:00:00.000Z", revision: 1, ...(castSheet ? { castSheet } : {}) }) as never;
    const listCharacters = vi.fn(async () => ({ ok: true as const, value: [summary("jogador"), summary("lobo", true)] }));
    const registry = createFeatureRegistry({ services: services(), compendiumService: catalog, listCharacters });
    const general = await registry.character.list!();
    const all = await registry.character.listAll!();
    expect(general.ok && general.value.map((item) => item.id)).toEqual(["jogador"]);
    expect(all.ok && all.value.map((item) => item.id)).toEqual(["jogador", "lobo"]);
  });

  it("liga seleção/retry ao serviço injetado sem esconder dispatcher pendente", () => {
    const injected = services();
    const registry = createFeatureRegistry({ services: injected, compendiumService: catalog });
    const onSelect = vi.fn();
    const props = registry.character.bindSelectionProps({ onSelect });

    props.onSelect?.("character-1" as never);
    props.onRetry?.();
    expect(injected.character.select).toHaveBeenCalledWith("character-1");
    expect(onSelect).toHaveBeenCalledWith("character-1");
    expect(injected.character.retry).toHaveBeenCalledOnce();
    expect(registry.actions.pendingDependencies).toContain("ActionDispatcher (dispatcher de comandos CORE-002 pendente)");
    expect(registry.inventory.pendingDependencies).toContain("InventoryDispatcher (comandos de inventário pendentes)");
    expect(registry.dice.pendingDependencies).toContain("DiceOverlayController (overlay global pendente)");
    expect(registry.journey.pendingDependencies).not.toContain("Map/asset read model e callbacks de mapa devem ser fornecidos pela composição da Jornada");
  });
});
