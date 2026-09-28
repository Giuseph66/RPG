import type { CreatureContent, CreatureGuess, CreatureKind, CreatureRecord, CreatureSighting } from "@domain/campaign/creatures";
import type { AppError, Result } from "@domain/contracts/errors";
import type { AccountId, EntityId, Uuid } from "@domain/contracts/ids";

/** Jogador ativo da campanha, identificado pelo personagem que ele joga. */
export interface JourneyPlayer {
  readonly accountId: AccountId;
  readonly name: string;
  readonly detail?: string;
}

export interface CreatureSheetTools {
  readonly availableCharacters?: readonly { readonly id: Uuid; readonly name: string }[];
  readonly onCreateSheet?: () => void;
  readonly onOpenSheet?: (id: Uuid) => void;
  readonly raceOptions?: readonly { readonly id: EntityId; readonly name: string }[];
  readonly classOptions?: readonly { readonly id: EntityId; readonly name: string }[];
  readonly onGenerateSheet?: (input: { readonly name: string; readonly raceId: EntityId; readonly classId: EntityId }) => Promise<Result<Uuid>>;
}

export interface CreatureBoardProps extends CreatureSheetTools {
  readonly creatures: readonly CreatureRecord[];
  readonly guesses?: readonly CreatureGuess[];
  readonly players?: readonly JourneyPlayer[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onCreate?: (content: CreatureContent) => Promise<Result<CreatureRecord, AppError>>;
  readonly onSave?: (creature: CreatureRecord) => Promise<Result<CreatureRecord, AppError>>;
  readonly onDelete?: (creature: CreatureRecord) => Promise<Result<void, AppError>>;
}

export interface GuessDraft {
  readonly kind?: CreatureKind;
  readonly name: string;
  readonly note: string;
  readonly fields?: CreatureGuess["fields"];
}

export interface PlayerCreatureBoardProps {
  readonly sightings: readonly CreatureSighting[];
  readonly guesses?: readonly CreatureGuess[];
  readonly loading?: boolean;
  readonly error?: string;
  readonly onSaveGuess?: (creatureId: Uuid, guess: GuessDraft) => Promise<Result<CreatureGuess, AppError>>;
}

export type CreatureFilter = "all" | CreatureKind;
