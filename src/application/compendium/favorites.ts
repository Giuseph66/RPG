import type { CompendiumFavoriteRef, CompendiumFavoriteState, CompendiumIndexEntry } from "./types";
import { favoriteKey, referenceFromEntry } from "./types";

export class CompendiumFavorites {
  private readonly keys = new Set<string>();

  constructor(initial: readonly CompendiumFavoriteRef[] = []) {
    initial.forEach((ref) => this.keys.add(favoriteKey(ref)));
  }

  isFavorite(entry: CompendiumIndexEntry): boolean { return this.keys.has(favoriteKey(referenceFromEntry(entry))); }

  toggle(entry: CompendiumIndexEntry): boolean {
    const key = favoriteKey(referenceFromEntry(entry));
    if (this.keys.has(key)) { this.keys.delete(key); return false; }
    this.keys.add(key); return true;
  }

  add(ref: CompendiumFavoriteRef): void { this.keys.add(favoriteKey(ref)); }
  remove(ref: CompendiumFavoriteRef): void { this.keys.delete(favoriteKey(ref)); }

  list(index: readonly CompendiumIndexEntry[]): readonly CompendiumFavoriteState[] {
    const byKey = new Map(index.map((entry) => [entry.key, entry]));
    return [...this.keys].sort().map((key) => {
      const entry = byKey.get(key);
      const [ruleset, kindOrType, categoryOrId, ...rest] = key.split(":");
      const [rulesetId, rulesetVersion] = (ruleset ?? "@").split("@");
      const ref: CompendiumFavoriteRef = kindOrType === "static"
        ? { kind: "static", rulesetId: rulesetId as never, rulesetVersion: rulesetVersion as never, category: categoryOrId as never, entityId: rest.join(":") }
        : { rulesetId: rulesetId as never, rulesetVersion: rulesetVersion as never, entityType: kindOrType as never, entityId: [categoryOrId, ...rest].join(":") };
      return { ref, key, exists: entry !== undefined, entry };
    });
  }
}

export function favoriteFromEntry(entry: CompendiumIndexEntry): CompendiumFavoriteRef { return referenceFromEntry(entry); }
