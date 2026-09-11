import { type Character } from "@domain/contracts/character";
import { type CharacterRepository } from "@application/ports/character-repository";

import { AggregateStore, type AggregateStoreOptions } from "@application/state/aggregate-store";

export class CharacterStore extends AggregateStore<Character> {
  constructor(repository: CharacterRepository, options: AggregateStoreOptions = {}) {
    super(repository, options);
  }
}

export function createCharacterStore(
  repository: CharacterRepository,
  options: AggregateStoreOptions = {},
): CharacterStore {
  return new CharacterStore(repository, options);
}

export const createCharacterStateStore = createCharacterStore;
