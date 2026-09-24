import { describe, expect, it } from "vitest";

import { catalogWeightGrams, PHB_EQUIPMENT_WEIGHT_GRAMS, PHB_EQUIPMENT_WITHOUT_PRINTED_WEIGHT } from "@data/correto/integracao/equipment-weights";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

/**
 * Itens sem linha impressa própria: concessões de antecedente, escolhas abstratas e itens
 * citados apenas dentro dos pacotes de equipamento. O livro não publica peso para eles.
 */
const WITHOUT_PRINTED_ROW = new Set([
  "artisan-tools", "musical-instrument", "ammunition", "holy-symbol",
  "alms-box", "string", "sealing-wax", "sand-bag", "censer", "vestments", "mess-kit",
]);

const pack = await loadPhbPtBrLocal2017();
if (!pack.ok) throw new Error(`Rule pack local indisponível: ${pack.error.message}`);
const equipment = [...pack.value.equipment.values()];

describe("pesos do equipamento", () => {
  it("segue exatamente a tabela impressa do Livro do Jogador", () => {
    const drift = equipment
      .map((definition) => ({ id: String(definition.id), repo: Number(definition.weightGrams), book: catalogWeightGrams(String(definition.id)) }))
      .filter((entry) => entry.book !== undefined && entry.book !== entry.repo)
      .map((entry) => `${entry.id}: ${entry.repo}g ≠ ${entry.book}g`);
    expect(drift).toEqual([]);
  });

  it("mapeia todo item que tem linha impressa", () => {
    const unmapped = equipment
      .filter((definition) => catalogWeightGrams(String(definition.id)) === undefined)
      .filter((definition) => !WITHOUT_PRINTED_ROW.has(String(definition.id)))
      .filter((definition) => !(definition.tags as readonly string[]).includes("background-grant"))
      .map((definition) => String(definition.id));
    expect(unmapped).toEqual([]);
  });

  it("registra quais itens a tabela deixa sem peso", () => {
    expect(PHB_EQUIPMENT_WEIGHT_GRAMS.size).toBeGreaterThanOrEqual(186);
    expect(PHB_EQUIPMENT_WITHOUT_PRINTED_WEIGHT).toContain("chalk");
    expect(PHB_EQUIPMENT_WITHOUT_PRINTED_WEIGHT).toContain("piton");
    // "–" na tabela vira 0 no catálogo, que é neutro na soma de carga.
    expect(catalogWeightGrams("chalk")).toBe(0);
    expect(PHB_EQUIPMENT_WEIGHT_GRAMS.get("chalk")).toBeNull();
  });

  it("usa os valores métricos impressos, não conversões do imperial", () => {
    const metric: readonly (readonly [string, number])[] = [
      ["pouch", 500], ["quiver", 500], ["hourglass", 500], ["harpoon", 2000], ["bucket", 1000],
      ["silk-rope", 2500], ["mirror-steel", 250], ["spellbook", 1500], ["nails", 2500],
      ["thieves-tools", 500], ["drum", 1500], ["net", 1500], ["blowgun", 500],
    ];
    for (const [id, grams] of metric) {
      expect(Number(pack.value.equipment.get(id as never)?.weightGrams), id).toBe(grams);
    }
  });
});

describe("concessões de antecedente", () => {
  it("herdam o peso impresso do objeto equivalente", () => {
    const weight = (id: string) => Number(pack.value.equipment.get(id as never)?.weightGrams);
    expect(weight("common-clothes")).toBe(weight("clothes-common"));
    expect(weight("common-clothes")).toBe(1500);
    expect(weight("travelers-clothes")).toBe(2000);
    expect(weight("winter-blanket")).toBe(1500);
    expect(weight("prayer-book")).toBe(2500);
    expect(weight("dead-colleague-letter")).toBe(0);
  });
});
