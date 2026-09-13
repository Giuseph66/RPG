import { type DiceHistoryEntry, type DiceRoll } from "@domain/contracts/dice";
import { type AppError, err, ok, type Result } from "@domain/contracts/errors";
import { type Command, type CommandReceipt, type RuleResult } from "@domain/contracts/rules";
import { type Clock } from "@application/ports/clock";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type DiceHistoryRepository } from "@application/ports/dice-history-repository";
import { type UnitOfWork } from "@application/ports/unit-of-work";
import { toJsonSnapshot, type SyncOutboxService } from "@application/sync";
import { type IdGenerator } from "@application/ports/id-generator";

export interface CharacterCommandServiceDependencies {
  readonly characterRepository: CharacterRepository;
  readonly diceHistoryRepository?: DiceHistoryRepository;
  readonly unitOfWork?: UnitOfWork;
  /** Outbox opcional: ausência preserva a composição local-only. */
  readonly syncOutbox?: SyncOutboxService;
  /** Necessário para mutações diretas do store publicarem operações próprias. */
  readonly idGenerator?: IdGenerator;
  readonly clock: Clock;
}

export type CharacterCommandOutcome =
  | { readonly result: RuleResult; readonly revision?: never }
  | { readonly result: RuleResult; readonly revision: import("@domain/contracts/versioning").Revision };

/** Persiste um RuleResult de sucesso com receipt e rolagens no mesmo UoW quando disponível. */
export class CharacterCommandService {
  constructor(private readonly dependencies: CharacterCommandServiceDependencies) {}

  async commit(
    command: Command,
    result: RuleResult,
    rolls: readonly DiceRoll[] = [],
  ): Promise<Result<CharacterCommandOutcome, AppError>> {
    if (result.status !== "success") return ok({ result });
    if (result.nextState.id !== command.characterId) {
      return err({ code: "validation-error", field: "characterId", message: "Resultado não pertence ao personagem do comando." });
    }
    const receipt: CommandReceipt = {
      commandId: command.commandId,
      characterId: command.characterId,
      resultStatus: "success",
      recordedAt: this.dependencies.clock.now(),
      diceRollIds: rolls.map((roll) => roll.id),
    };
    const save = async (context?: import("@application/ports/unit-of-work").TransactionContext) => {
      const saved = await this.dependencies.characterRepository.save(
        result.nextState,
        command.expectedRevision,
        receipt,
        context,
      );
      if (!saved.ok) return saved;
      if (this.dependencies.diceHistoryRepository) {
        for (const roll of rolls) {
          const appended = await this.dependencies.diceHistoryRepository.append(
            { roll, characterId: command.characterId } satisfies DiceHistoryEntry,
            context,
          );
          if (!appended.ok) return appended;
        }
      }
      if (this.dependencies.syncOutbox) {
        const createdAt = this.dependencies.clock.now();
        const queued = await this.dependencies.syncOutbox.enqueue({
          operationId: command.commandId,
          aggregateType: "character",
          aggregateId: command.characterId,
          mutation: "upsert",
          baseRevision: command.expectedRevision,
          payload: toJsonSnapshot({ ...result.nextState, revision: saved.value, updatedAt: createdAt }),
          createdAt,
        }, context);
        if (!queued.ok) return err(queued.error);
      }
      return saved;
    };
    const saved = this.dependencies.unitOfWork
      ? await this.dependencies.unitOfWork.run((context) => save(context))
      : await save();
    if (!saved.ok) return saved;
    return ok({ result, revision: saved.value });
  }
}
