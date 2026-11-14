import { mergeCreatureBookEntries, type CompendiumCatalogItem, type CompendiumService } from "@application/compendium";

/**
 * Loads the book catalog only when the compendium surface is entered.
 * Keeping the import inside the loader is intentional: the static catalog is
 * content, not part of the application shell or character creation runtime.
 * `extraItems` entrega conteúdo que já vive em outro módulo (ex.: o catálogo de criaturas);
 * ele entra no índice junto com o catálogo do livro, na mesma carga única; criaturas que o livro
 * traz como texto e que já têm bloco estruturado não viram uma segunda entrada.
 */
export function createLazyCompendiumLoader(service: CompendiumService, extraItems?: () => readonly CompendiumCatalogItem[]): () => Promise<void> {
  let pending: Promise<void> | undefined;
  let loaded = false;

  return () => {
    if (loaded) return Promise.resolve();
    pending ??= import("@data/compendium/static")
      .then(({ STATIC_COMPENDIUM_ITEMS }) => {
        service.addItems(mergeCreatureBookEntries([...STATIC_COMPENDIUM_ITEMS, ...(extraItems?.() ?? [])]));
        loaded = true;
      })
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  };
}
