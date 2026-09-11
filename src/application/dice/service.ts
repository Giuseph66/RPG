import { type DiceHistoryEntry } from "@domain/contracts/dice";
import { type Uuid } from "@domain/contracts/ids";
import { type DiceHistoryRepository } from "@application/ports/dice-history-repository";

import { DiceHistoryStore, createDiceHistoryStore } from "./store";

export class DiceApplicationService {
  readonly store: DiceHistoryStore;

  constructor(repository: DiceHistoryRepository) { this.store = createDiceHistoryStore(repository); }
  hydrate(characterId?: Uuid): ReturnType<DiceHistoryStore["hydrate"]> { return this.store.hydrate(characterId); }
  append(entry: DiceHistoryEntry): ReturnType<DiceHistoryStore["append"]> { return this.store.append(entry); }
  retry(): ReturnType<DiceHistoryStore["retry"]> { return this.store.retry(); }
  clear(): ReturnType<DiceHistoryStore["clear"]> { return this.store.clear(); }
  flush(): ReturnType<DiceHistoryStore["flush"]> { return this.store.flush(); }
  dispose(): void { this.store.dispose(); }
}

export function createDiceApplicationService(repository: DiceHistoryRepository): DiceApplicationService {
  return new DiceApplicationService(repository);
}
