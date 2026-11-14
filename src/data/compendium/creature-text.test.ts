import { describe, expect, it } from "vitest";

import { STATIC_COMPENDIUM_ITEMS } from "./static";

const creatureTexts = STATIC_COMPENDIUM_ITEMS.flatMap((item) => item.category === "creature" && "kind" in item.definition && item.definition.kind === "book-rule" ? [item.definition] : []);

describe("criaturas do Livro do Jogador só com texto", () => {
  it("existem 31, todas na categoria Criaturas e nenhuma em Aventura", () => {
    expect(creatureTexts).toHaveLength(31);
    expect(STATIC_COMPENDIUM_ITEMS.some((item) => item.category === "adventure" && "tags" in item.definition && item.definition.tags.includes("criatura"))).toBe(false);
  });

  it("separa as linhas de estatística e junta os atributos em uma só", () => {
    const paragraphs = creatureTexts.find((definition) => definition.name === "Diabrete")!.text.split("\n\n");
    expect(paragraphs[0]).toBe("Corruptor miúdo (diabo, metamorfo), leal e mau");
    expect(paragraphs).toContain("Classe de Armadura 13");
    expect(paragraphs).toContain("Pontos de Vida 10 (3d4 + 3)");
    expect(paragraphs.find((line) => line.startsWith("Deslocamento"))).toContain("voo 12 m");
    expect(paragraphs).toContain("Atributos: FOR 6 (–2) · DES 17 (+3) · CON 13 (+1) · INT 11 (+0) · SAB 12 (+1) · CAR 14 (+2)");
    expect(paragraphs.find((line) => line.startsWith("Sentidos"))).toContain("Percepção passiva 11");
    expect(paragraphs).toContain("Nível de Desafio 1 (200 XP)");
    // Traços e ações vêm depois, cada um no seu parágrafo.
    expect(paragraphs[paragraphs.indexOf("Nível de Desafio 1 (200 XP)") + 1]).toMatch(/^Metamorfo\./);
    expect(paragraphs).toContain("AÇÕES");
  });

  it("todas ganham o cabeçalho organizado, sem siglas de atributo soltas como subtítulo", () => {
    for (const definition of creatureTexts) {
      const paragraphs = definition.text.split("\n\n");
      expect(paragraphs.some((line) => line.startsWith("Atributos: FOR ")), definition.name).toBe(true);
      expect(paragraphs.filter((line) => /^(FOR|DES|CON|INT|SAB|CAR)$/.test(line)), definition.name).toHaveLength(0);
    }
  });
});
