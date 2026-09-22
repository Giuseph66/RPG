import { describe, expect, it } from "vitest";

import { STATIC_COMPENDIUM_ITEMS } from "@data/compendium";
import { buildCompendiumIndex, catalogItemsFromPacks, type CompendiumCatalogItem } from "@application/compendium";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";
import { PHB_FEATURE_DESCRIPTIONS } from "@data/correto/descricoes/features";

import { PHB_CANONICAL_DESCRIPTION_REGISTRY } from "./compendium-description-registry";
import { PHB_GEAR_ITEM_DESCRIPTIONS } from "./gear-items";
import { PHB_TOOL_ITEM_DESCRIPTIONS } from "./tool-items";
import { PHB_WEAPON_TABLE_DESCRIPTIONS } from "./weapon-table";
import { PHB_GEAR_TABLE_DESCRIPTIONS, PHB_GEAR_TABLE_UNMATCHED } from "./gear-table";
import { PHB_ADVENTURE_BACKED_TEXTS, PHB_COMBAT_BACKED_TEXTS, PHB_RULES_BACKED_TEXTS, PHB_RULES_WITHOUT_SOURCE } from "./rules-backed";

/** Tipos excluídos do pack porque as descrições do livro já os publicam (ver bootstrap). */
const EXCLUDED_PACK_TYPES = ["spell", "condition", "race", "subrace", "class", "subclass", "feature", "resource", "progression", "background", "feat"] as const;

type BookRuleDefinition = { readonly kind?: string; readonly id?: string; readonly text?: string; readonly sourceRefs: readonly { readonly sourceId: string }[] };
type EquipmentDefinitionView = { readonly id: string; readonly category?: string; readonly description?: string; readonly weightGrams?: unknown; readonly valueCp?: unknown; readonly tool?: unknown; readonly armor?: unknown; readonly weapon?: unknown };

const pack = await loadPhbPtBrLocal2017();
if (!pack.ok) throw new Error("Rule pack local indisponível para o teste.");

const packItems = catalogItemsFromPacks([pack.value]).filter((item) => !EXCLUDED_PACK_TYPES.includes(item.entityType as (typeof EXCLUDED_PACK_TYPES)[number]));
const allItems: readonly CompendiumCatalogItem[] = [...STATIC_COMPENDIUM_ITEMS, ...packItems];
const index = buildCompendiumIndex(allItems);
const definitionOf = (id: string, category: string) => allItems.find((item) => item.category === category && (item.definition as { id?: string }).id === id)?.definition as BookRuleDefinition | undefined;
const equipment = packItems.filter((item) => item.entityType === "equipment").map((item) => item.definition as unknown as EquipmentDefinitionView);
const equipmentById = new Map(equipment.map((entry) => [entry.id, entry]));

function expectBookText(id: string, category: string) {
  const definition = definitionOf(id, category);
  expect(definition, `card "${id}" ausente`).toBeDefined();
  expect(definition?.kind, `card "${id}" deveria usar texto do livro`).toBe("book-rule");
  expect((definition?.text ?? "").length, `card "${id}" com texto vazio`).toBeGreaterThan(200);
  expect(definition?.sourceRefs.every((ref) => ref.sourceId === "phb-ptbr-local-2017")).toBe(true);
}

describe("cobertura textual do compêndio", () => {
  it("não publica card de regra com texto vazio", () => {
    const empty = allItems.filter((item) => {
      const definition = item.definition as BookRuleDefinition;
      return definition.kind === "book-rule" && (definition.text ?? "").trim().length === 0;
    });
    expect(empty).toEqual([]);
  });

  it("descarta blocos de característica que são só cabeçalho órfão", () => {
    const orphans = ["war-domain.canalizar-divindade", "nature-domain.canalizar-divindade"];
    for (const id of orphans) {
      expect(PHB_FEATURE_DESCRIPTIONS.featureBlocks.some((block) => block.id === id), `fonte deveria conter ${id}`).toBe(true);
      expect(PHB_CANONICAL_DESCRIPTION_REGISTRY.some((entry) => entry.id === id), `${id} não deveria ser publicado`).toBe(false);
      expect(index.some((entry) => String(entry.ref.entityId) === id)).toBe(false);
    }
    expect(PHB_CANONICAL_DESCRIPTION_REGISTRY.filter((entry) => entry.category === "feature")).toHaveLength(490);
  });

  it("não publica card cujo texto termine no cabeçalho", () => {
    const headingOnly = allItems.filter((item) => {
      const definition = item.definition as BookRuleDefinition;
      return definition.kind === "book-rule" && /:$/.test((definition.text ?? "").trim());
    });
    expect(headingOnly).toEqual([]);
  });

  it("liga as regras de habilidade ao texto da fonte", () => {
    expect(PHB_RULES_BACKED_TEXTS.map((entry) => entry.id)).toEqual([
      "ability-modifier", "advantage-disadvantage", "proficiency-bonus", "ability-check",
      "contested-check", "passive-check", "group-check", "saving-throw",
    ]);
    for (const entry of PHB_RULES_BACKED_TEXTS) expectBookText(entry.id, "rules");
  });

  it("mantém d20-resolution como resumo enquanto a Introdução não for extraída", () => {
    expect(PHB_RULES_WITHOUT_SOURCE).toEqual(["d20-resolution"]);
    expect(definitionOf("d20-resolution", "rules")?.kind).toBeUndefined();
  });

  it("liga os nove cards de combate ao texto da fonte", () => {
    expect(PHB_COMBAT_BACKED_TEXTS).toHaveLength(9);
    for (const entry of PHB_COMBAT_BACKED_TEXTS) expectBookText(entry.id, "combat");
  });

  it("liga os sete cards de aventura ao texto da fonte e preserva adventure-scope", () => {
    expect(PHB_ADVENTURE_BACKED_TEXTS).toHaveLength(7);
    for (const entry of PHB_ADVENTURE_BACKED_TEXTS) expectBookText(entry.id, "adventure");
    expect(definitionOf("adventure-scope", "adventure")?.kind).toBeUndefined();
  });

  it("dá descrição da fonte aos equipamentos de aventura sem perder mecânica", () => {
    expect(PHB_GEAR_ITEM_DESCRIPTIONS).toHaveLength(66);
    for (const entry of PHB_GEAR_ITEM_DESCRIPTIONS) {
      const definition = equipmentById.get(entry.id);
      expect(definition, `equipamento "${entry.id}" ausente no pack`).toBeDefined();
      expect((definition?.description ?? "").length, `"${entry.id}" sem descrição`).toBeGreaterThan(20);
      expect(definition?.weightGrams, `"${entry.id}" perdeu peso`).toBeDefined();
      expect(definition?.valueCp, `"${entry.id}" perdeu valor`).toBeDefined();
    }
    expect(equipmentById.get("pouch")?.description).toContain("CAPACIDADE DE RECIPIENTES");
    expect(equipmentById.get("backpack")?.description).toContain("30 cm³/15 kg");
    expect(equipmentById.get("hempen-rope")?.description).toEqual(equipmentById.get("silk-rope")?.description);
  });

  it("dá a descrição da categoria correta às 39 ferramentas", () => {
    expect(PHB_TOOL_ITEM_DESCRIPTIONS).toHaveLength(39);
    const tools = equipment.filter((entry) => entry.category === "tool");
    expect(tools).toHaveLength(39);
    for (const entry of tools) {
      expect((entry.description ?? "").length, `"${entry.id}" sem descrição`).toBeGreaterThan(20);
      expect(entry.tool, `"${entry.id}" perdeu os dados de ferramenta`).toBeDefined();
    }
    expect(equipmentById.get("thieves-tools")?.description).toContain("desarmar armadilhas");
    expect(equipmentById.get("flute")?.description).toContain("Instrumento Musical");
    expect(equipmentById.get("dice-set")?.description).toContain("Kit de Jogo");
    expect(equipmentById.get("smith-tools")?.description).toEqual(equipmentById.get("artisan-tools")?.description);
  });

  it("dá a linha da tabela Armas às 37 armas, com a regra especial de lance e net", () => {
    expect(PHB_WEAPON_TABLE_DESCRIPTIONS).toHaveLength(37);
    const weapons = equipment.filter((entry) => entry.category === "weapon");
    expect(weapons).toHaveLength(37);
    for (const entry of weapons) {
      const description = entry.description ?? "";
      expect(description, `"${entry.id}" sem descrição`).toContain("Nome Preço Dano Peso Propriedades");
      expect(description, `"${entry.id}" sem grupo da tabela`).toMatch(/Armas (Simples|Marciais) (Corpo-a-Corpo|à Distância)/);
      expect(entry.weapon, `"${entry.id}" perdeu os dados de arma`).toBeDefined();
    }
    expect(equipmentById.get("quarterstaff")?.description).toContain("Bordão 2 pp 1d6 concussão 2 kg Versátil (1d8)");
    expect(equipmentById.get("lance")?.description).toContain("Lança de Montaria. Você tem desvantagem");
    expect(equipmentById.get("net")?.description).toContain("Rede. Uma criatura Grande ou menor");
  });

  it("dá a linha da tabela Equipamento aos itens sem prosa no livro", () => {
    expect(PHB_GEAR_TABLE_UNMATCHED).toEqual([]);
    expect(PHB_GEAR_TABLE_DESCRIPTIONS).toHaveLength(39);
    for (const entry of PHB_GEAR_TABLE_DESCRIPTIONS) {
      const definition = equipmentById.get(entry.id);
      expect(definition, `equipamento "${entry.id}" ausente no pack`).toBeDefined();
      expect(definition?.description, `"${entry.id}" sem linha da tabela`).toContain("Item Custo Peso");
    }
    expect(equipmentById.get("hourglass")?.description).toContain("Ampulheta 25 po 0,5 kg");
    // A prosa tem precedência sobre a linha da tabela quando o livro descreve o item.
    expect(equipmentById.get("torch")?.description).toContain("A tocha queima por 1 hora");
  });

  it("só deixa sem descrição o que o livro não descreve nem tabela", () => {
    const withoutDescription = equipment.filter((entry) => !entry.description);
    // Itens citados apenas dentro dos pacotes de equipamento, sem linha nem prosa própria.
    const packOnly = ["alms-box", "string", "sealing-wax", "sand-bag", "censer", "vestments", "ammunition"];
    const ids = withoutDescription.map((entry) => entry.id);
    for (const id of ids) {
      const isBackgroundGrant = (packItems.find((item) => (item.definition as { id?: string }).id === id)?.definition as { tags?: readonly string[] })?.tags?.includes("background-grant");
      expect(isBackgroundGrant || packOnly.includes(id), `"${id}" deveria ter descrição`).toBe(true);
    }
    expect(withoutDescription.length).toBeLessThanOrEqual(26);
  });

  it("preserva armaduras, escudo e armas especiais já integradas", () => {
    for (const id of ["padded-armor", "plate-armor", "shield"]) {
      expect(equipmentById.get(id)?.armor, `"${id}" perdeu os dados de armadura`).toBeDefined();
      expect((equipmentById.get(id)?.description ?? "").length).toBeGreaterThan(20);
    }
    for (const id of ["lance", "net"]) {
      expect(equipmentById.get(id)?.weapon, `"${id}" perdeu os dados de arma`).toBeDefined();
      expect((equipmentById.get(id)?.description ?? "").length).toBeGreaterThan(20);
    }
  });

  it("mantém armas e armaduras como subconjuntos de equipamento, sem ids duplicados", () => {
    expect(new Set(index.map((entry) => entry.key)).size).toBe(index.length);
    const equipmentEntries = index.filter((entry) => entry.category === "equipment");
    for (const tag of ["weapon", "armor"]) {
      const subset = equipmentEntries.filter((entry) => entry.tags.includes(tag));
      expect(subset.length, `nenhum equipamento com a tag "${tag}"`).toBeGreaterThan(0);
    }
  });

  it("encontra pela busca uma palavra que só existe nas novas descrições", () => {
    const searchable = index.filter((entry) => entry.category === "equipment");
    expect(searchable.some((entry) => String(entry.ref.entityId) === "healer-kit")).toBe(true);
    expect(equipmentById.get("healer-kit")?.description).toContain("estabilizar");
  });
});
