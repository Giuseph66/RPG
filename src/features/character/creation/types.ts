import type { Character, CharacterDraft } from "@domain/contracts/character";
import type { AppError, Result } from "@domain/contracts/errors";
import type { Revision } from "@domain/contracts/versioning";
import type { CharacterApplicationService } from "@application/character/service";
import type { CreationCatalogInput } from "@domain/character/creation";

/** Persistência de rascunho reaproveitada de CHAR-002; a criação nunca reimplementa storage. */
export type CreationDraftService = Pick<CharacterApplicationService, "saveDraft" | "deleteDraft">;

/**
 * `saveCharacter` não existe em `CharacterApplicationService` (ele só grava o agregado já
 * selecionado no store). Quem conecta o wizard fornece um adaptador fino sobre
 * `CharacterRepository.save`; o wizard nunca importa o port diretamente.
 */
export interface CreationWizardService extends CreationDraftService {
  readonly saveCharacter: (character: Character, expectedRevision: Revision) => Promise<Result<Revision, AppError>>;
}

export type CreationSaveStatus = "idle" | "saving-draft" | "draft-saved" | "confirming" | "confirmed" | "error";

export interface CharacterCreationWizardProps {
  /** O draft controla a UI; o chamador decide como/quando um novo draft é criado. */
  readonly draft: CharacterDraft;
  readonly catalog: CreationCatalogInput;
  readonly service?: CreationWizardService;
  readonly onDraftChange?: (draft: CharacterDraft) => void;
  readonly onCreated?: (character: Character, revision: Revision) => void;
  /** Chamado quando o usuário pede explicitamente para guardar o draft. */
  readonly onDraftSaved?: (draft: CharacterDraft) => void;
  readonly onCancel?: () => void;
}
