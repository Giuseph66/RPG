import { describe, expect, it } from "vitest";

import { buildCompendiumIndex, catalogItemsFromPacks, createIndexEntry, searchCompendium } from "@application/compendium";
import type { CompendiumDetail } from "@application/compendium";
import { mount } from "@components/ui/testUtils";
import { loadPhbPtBrLocal2017 } from "@data/rulepacks/phb-ptbr-local-2017";

import { CompendiumDetailPanel } from "./index";

const pack = await loadPhbPtBrLocal2017();
if (!pack.ok) throw new Error(`Rule pack local indisponível: ${pack.error.message}`);
const equipmentItems = catalogItemsFromPacks([pack.value]).filter((item) => item.entityType === "equipment");

function detailOf(id: string): CompendiumDetail {
  const item = equipmentItems.find((candidate) => "id" in candidate.definition && String(candidate.definition.id) === id);
  if (!item) throw new Error(`Equipamento "${id}" ausente do compêndio.`);
  return { ...createIndexEntry(item), definition: item.definition };
}

async function textOf(id: string): Promise<string> {
  const { container, unmount } = await mount(<CompendiumDetailPanel detail={detailOf(id)} />);
  const text = container.textContent ?? "";
  await unmount();
  return text;
}

describe("card de equipamento no compêndio", () => {
  it("mostra custo e peso do foco arcano: cajado (5 po, 2 kg) além do texto do foco", async () => {
    const text = await textOf("arcane-focus-staff");
    expect(text).toContain("Foco arcano: cajado");
    expect(text).toContain("Custo5 po");
    expect(text).toContain("Peso2 kg");
    expect(text).toContain("Foco Arcano. Um foco arcano é um item especial");
  });

  it("mostra o foco druídico com o nome impresso e seus próprios custo e peso", async () => {
    expect(await textOf("druidic-focus-staff")).toMatch(/Foco druídico: cajado de madeira[\s\S]*Custo5 po[\s\S]*Peso2 kg/);
    expect(await textOf("druidic-focus-wand")).toMatch(/Foco druídico: varinha de teixo[\s\S]*Custo10 po[\s\S]*Peso0,5 kg/);
  });

  it("escreve o custo na moeda impressa: prata e cobre quando não é ouro inteiro", async () => {
    expect(await textOf("tinderbox")).toContain("Custo5 pp");
    expect(await textOf("bucket")).toContain("Custo5 pc");
    expect(await textOf("spyglass")).toContain("Custo1.000 po");
  });

  it("usa travessão no peso quando a tabela não traz peso", async () => {
    expect(await textOf("antitoxin")).toMatch(/Custo50 po[\s\S]*Peso–/);
  });

  it("não repete a linha crua da tabela como descrição", async () => {
    const text = await textOf("hourglass");
    expect(text).toContain("Custo25 po");
    expect(text).toContain("Peso0,5 kg");
    expect(text).not.toContain("EQUIPAMENTO Item Custo Peso");
  });

  it("achar cajado e varinha pela busca devolve os focos de equipamento", () => {
    const index = buildCompendiumIndex(equipmentItems);
    const titles = (query: string) => searchCompendium(index, { query }).entries.map((entry) => entry.title);
    expect(titles("cajado")).toEqual(expect.arrayContaining(["Foco arcano: cajado", "Foco druídico: cajado de madeira"]));
    expect(titles("varinha")).toEqual(expect.arrayContaining(["Foco arcano: varinha", "Foco druídico: varinha de teixo"]));
  });
});
