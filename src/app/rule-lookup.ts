/**
 * Índice título → entrada do compêndio para abrir regras a partir da ficha
 * (toque longo). A busca ignora caixa e acentos; `entityId` desempata quando o
 * título impresso difere do nome exibido.
 */
import type { CompendiumCategoryId, CompendiumDetail, CompendiumIndexEntry, CompendiumService } from "@application/compendium";
import type { RuleLookup } from "@features/compendium";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function createRuleLookup(service: CompendiumService): RuleLookup {
  let byTitle: Map<string, CompendiumIndexEntry> | undefined;
  let byId: Map<string, CompendiumIndexEntry> | undefined;
  const details = new Map<string, CompendiumDetail | null>();

  let indexedCount = -1;
  const build = () => {
    const index = service.getIndex();
    indexedCount = index.length;
    byTitle = new Map();
    byId = new Map();
    for (const entry of index) {
      const titleKey = `${entry.category}|${normalize(entry.title)}`;
      if (!byTitle.has(titleKey)) byTitle.set(titleKey, entry);
      const idKey = `${entry.category}|${entry.ref.entityId}`;
      if (!byId.has(idKey)) byId.set(idKey, entry);
    }
  };

  return ({ category, title, entityId }) => {
    // O catálogo do livro pode chegar depois (carga sob demanda): reindexa quando o total muda.
    if (!byTitle || !byId || service.getIndex().length !== indexedCount) { build(); details.clear(); }
    const entry = byTitle!.get(`${category}|${normalize(title)}`) ?? (entityId ? byId!.get(`${category}|${entityId}`) : undefined);
    if (!entry) return undefined;
    const cached = details.get(entry.key);
    if (cached !== undefined) return cached ?? undefined;
    const detail = service.getDetail(entry.ref);
    details.set(entry.key, detail.ok ? detail.value : null);
    return detail.ok ? detail.value : undefined;
  };
}

export type { CompendiumCategoryId };
