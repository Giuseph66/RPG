import { type CharacterDraft, type Character } from "@domain/contracts/character";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { type Revision } from "@domain/contracts/versioning";
import { type CharacterRepository } from "@application/ports/character-repository";

import { CharacterStore, createCharacterStore } from "./store";
import { CharacterCommandService, type CharacterCommandServiceDependencies } from "./commands";

export interface CharacterApplicationServiceOptions {
  readonly repository: CharacterRepository;
  readonly debounceMs?: number;
  readonly commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">;
}

/** Fachada de aplicação usada pela UI; o repositório continua atrás do port. */
export class CharacterApplicationService {
  readonly store: CharacterStore;
  readonly commands?: CharacterCommandService;

  constructor(private readonly repository: CharacterRepository, debounceMs = 500, commandDependencies?: Omit<CharacterCommandServiceDependencies, "characterRepository">) {
    this.store = createCharacterStore(repository, { debounceMs });
    if (commandDependencies) this.commands = new CharacterCommandService({ ...commandDependencies, characterRepository: repository });
  }

  select(id: Uuid | undefined): Promise<Result<void, AppError>> {
    return this.store.select(id);
  }

  hydrate(id?: Uuid): Promise<Result<void, AppError>> {
    return id === undefined ? this.store.hydrate() : this.store.hydrate(id);
  }

  update(updater: (current: Character) => Character, immediate = false): Result<Character, AppError> {
    return this.store.update(updater, { immediate });
  }

  save(): ReturnType<CharacterStore["save"]> {
    return this.store.save();
  }

  retry(): ReturnType<CharacterStore["retry"]> {
    return this.store.retry();
  }

  flush(): ReturnType<CharacterStore["flush"]> {
    return this.store.flush();
  }

  loadDraft(id: Uuid): Promise<Result<CharacterDraft, AppError>> {
    return this.repository.getDraft(id);
  }

  saveDraft(draft: CharacterDraft): Promise<Result<CharacterDraft, AppError>> {
    return this.repository.saveDraft(draft);
  }

  deleteDraft(id: Uuid): Promise<Result<void, AppError>> {
    return this.repository.deleteDraft(id);
  }

  dispose(): void {
    this.store.dispose();
  }
}

export function createCharacterApplicationService(options: CharacterApplicationServiceOptions): CharacterApplicationService {
  return new CharacterApplicationService(options.repository, options.debounceMs, options.commandDependencies);
}

export type CharacterSaveResult = Result<Revision, AppError>;
