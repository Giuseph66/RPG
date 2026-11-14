import { describe, expect, it } from "vitest";

import { createApplicationRuntime } from "@app/bootstrap";

describe("Regras · criaturas no runtime real", () => {
  it("o carregamento do catálogo publica as criaturas do livro como categoria pesquisável", async () => {
    const runtime = await createApplicationRuntime({ database: { name: "bootstrap-compendium-creatures" } });
    try {
      const service = runtime.registry.compendium.service;
      expect(service.search({ category: "creature" }).entries).toHaveLength(0);
      await runtime.registry.compendium.loadCatalog();
      const published = runtime.registry.creatures?.wildShape.listCatalog({});
      expect(published?.ok).toBe(true);
      const total = published?.ok ? published.value.length : 0;
      expect(total).toBeGreaterThan(50);
      // 6 criaturas existem só como texto do livro; as 25 repetidas não contam em dobro.
      expect(service.search({ category: "creature" }).entries).toHaveLength(total + 6);
      expect(service.getCategories().find((category) => category.id === "creature")).toMatchObject({ status: "available" });
      const wolves = service.search({ category: "creature", query: "lobo atroz" }).entries;
      expect(wolves[0]?.title.toLocaleLowerCase("pt-BR")).toBe("lobo atroz");
      const detail = service.getDetail(wolves[0]!.ref);
      expect(detail.ok && detail.value.definition).toMatchObject({ kind: "book-creature" });
      // O Livro do Jogador repete 25 dessas criaturas como texto: a busca não pode mostrar duas “Aranha Gigante”.
      const spiders = service.search({ query: "aranha gigante" }).entries.filter((entry) => entry.title.toLocaleLowerCase("pt-BR") === "aranha gigante");
      expect(spiders).toHaveLength(1);
      expect(spiders[0]!.category).toBe("creature");
      const spider = service.getDetail(spiders[0]!.ref);
      expect(spider.ok && spider.value.sourceRefs.some((ref) => ref.chapter === "Livro do Jogador · Apêndice D" && ref.printedPage === 305)).toBe(true);
      // As 6 que só existem no livro (ex.: Zumbi) continuam acessíveis, agora em Criaturas e não em Aventura.
      const zombie = service.search({ query: "zumbi" }).entries.find((entry) => entry.title === "Zumbi");
      expect(zombie).toMatchObject({ category: "creature", summary: "Morto-vivo médio, neutro e mau · CA 8 · PV 22" });
      expect(service.search({ category: "adventure" }).entries.some((entry) => entry.tags.includes("criatura"))).toBe(false);
      // Criaturas não vazam para as outras categorias.
      expect(service.search({ category: "attributes" }).entries).toHaveLength(6);
    } finally {
      runtime.services.character.dispose();
      runtime.services.settings.dispose();
      runtime.database.close();
    }
  });
});
