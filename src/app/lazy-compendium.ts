import type { CompendiumService } from "@application/compendium";

/**
 * Loads the book catalog only when the compendium surface is entered.
 * Keeping the import inside the loader is intentional: the static catalog is
 * content, not part of the application shell or character creation runtime.
 */
export function createLazyCompendiumLoader(service: CompendiumService): () => Promise<void> {
  let pending: Promise<void> | undefined;
  let loaded = false;

  return () => {
    if (loaded) return Promise.resolve();
    pending ??= import("@data/compendium/static")
      .then(({ STATIC_COMPENDIUM_ITEMS }) => {
        service.addItems(STATIC_COMPENDIUM_ITEMS);
        loaded = true;
      })
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  };
}
