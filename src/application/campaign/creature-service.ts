/**
 * Criaturas da jornada (NPCs, ameaças, animais e não categorizados).
 *
 * O registro completo fica em `campaigns/{id}/creatures` e só o mestre o lê. Cada gravação
 * recalcula, na mesma transação local, as projeções por jogador (`sightings`) — o único
 * dado de criatura que um jogador recebe — e as envia pela outbox. Jogadores respondem com
 * palpites próprios (`guesses`), que o mestre lê.
 */

import {
  CREATURE_SCHEMA_VERSION,
  creatureFromLegacyNpc,
  projectSighting,
  sameSightingContent,
  sightingId,
  validateCreatureContent,
  validateGuessContent,
  type CreatureContent,
  type CreatureGuess,
  type CreatureKind,
  type CreatureRecord,
  type CreatureSighting,
} from "@domain/campaign/creatures";
import { type NpcRecord } from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type AccountId, type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type Clock } from "@application/ports/clock";
import { type IdGenerator } from "@application/ports/id-generator";
import { type JourneyVisibilityKind, type JourneyVisibilityRepository } from "@application/ports/journey-visibility-repository";
import { type TransactionContext, type UnitOfWork } from "@application/ports/unit-of-work";
import { toJsonSnapshot, type SyncOutboxService } from "@application/sync";

export interface CreatureServiceOptions {
  readonly repository: JourneyVisibilityRepository;
  readonly unitOfWork?: UnitOfWork;
  readonly syncOutbox?: SyncOutboxService;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export interface GuessInput {
  readonly campaignId: Uuid;
  readonly creatureId: Uuid;
  readonly accountId: AccountId;
  readonly kind?: CreatureKind;
  readonly name: string;
  readonly note: string;
  readonly fields?: CreatureGuess["fields"];
}

export interface CreatureService {
  listCreatures(campaignId: Uuid): Promise<Result<readonly CreatureRecord[], AppError>>;
  create(campaignId: Uuid, content: CreatureContent): Promise<Result<CreatureRecord, AppError>>;
  /** Salva conteúdo e revelações; as projeções dos jogadores acompanham a gravação. */
  save(creature: CreatureRecord): Promise<Result<CreatureRecord, AppError>>;
  delete(creature: CreatureRecord): Promise<Result<void, AppError>>;
  /** Avistamentos da campanha; com `accountId`, só os daquela conta. */
  listSightings(campaignId: Uuid, accountId?: AccountId): Promise<Result<readonly CreatureSighting[], AppError>>;
  listGuesses(campaignId: Uuid, accountId?: AccountId): Promise<Result<readonly CreatureGuess[], AppError>>;
  saveGuess(input: GuessInput): Promise<Result<CreatureGuess, AppError>>;
  /** Move `Campaign.npcs` antigos para registros privados do mestre. Devolve quantos foram criados. */
  importLegacyNpcs(campaignId: Uuid, npcs: readonly NpcRecord[]): Promise<Result<number, AppError>>;
}

export function createCreatureService(options: CreatureServiceOptions): CreatureService {
  const { repository, unitOfWork, syncOutbox, clock, idGenerator } = options;

  function run<T>(fn: (context?: TransactionContext) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
    return unitOfWork ? unitOfWork.run((context) => fn(context)) : fn();
  }

  async function enqueue(kind: JourneyVisibilityKind, campaignId: Uuid, id: string, baseRevision: Revision, payload: unknown, context?: TransactionContext): Promise<Result<void, AppError>> {
    if (!syncOutbox) return ok(undefined);
    const snapshot = payload === undefined ? undefined : toJsonSnapshot(payload);
    if (payload !== undefined && snapshot === undefined) return err(appError.validation(kind, "Registro da jornada contém dados não serializáveis."));
    const queued = await syncOutbox.enqueue({
      operationId: idGenerator.commandId(),
      aggregateType: kind,
      aggregateId: id as Uuid,
      mutation: payload === undefined ? "delete" : "upsert",
      baseRevision,
      scope: { campaignId },
      ...(snapshot === undefined ? {} : { payload: snapshot }),
      createdAt: clock.now(),
    }, context);
    return queued.ok ? ok(undefined) : err(queued.error);
  }

  /** Reescreve só as projeções que mudaram e remove as de quem deixou de ver a criatura. */
  async function syncSightings(creature: CreatureRecord, context?: TransactionContext): Promise<Result<void, AppError>> {
    const listed = await repository.list("sighting", creature.campaignId, context);
    if (!listed.ok) return listed;
    const existing = new Map(listed.value.filter((item) => item.creatureId === creature.id).map((item) => [item.accountId as string, item]));
    const now = clock.now();
    for (const reveal of creature.reveals) {
      const previous = existing.get(reveal.accountId);
      existing.delete(reveal.accountId);
      const base = previous?.revision ?? asRevision(0);
      const projected = projectSighting(creature, reveal, { createdAt: previous?.createdAt ?? now, updatedAt: now }, base);
      if (previous && sameSightingContent(previous, projected)) continue;
      const saved = await repository.save("sighting", projected, base, context);
      if (!saved.ok) return saved;
      const queued = await enqueue("sighting", creature.campaignId, saved.value.id, base, saved.value, context);
      if (!queued.ok) return queued;
    }
    for (const stale of existing.values()) {
      const removed = await repository.delete("sighting", stale.id, stale.revision, context);
      if (!removed.ok) return removed;
      const queued = await enqueue("sighting", creature.campaignId, stale.id, stale.revision, undefined, context);
      if (!queued.ok) return queued;
    }
    return ok(undefined);
  }

  async function persist(creature: CreatureRecord, context?: TransactionContext): Promise<Result<CreatureRecord, AppError>> {
    const base = creature.revision;
    const saved = await repository.save("creature", creature, base, context);
    if (!saved.ok) return saved;
    const queued = await enqueue("creature", creature.campaignId, creature.id, base, saved.value, context);
    if (!queued.ok) return queued;
    const projections = await syncSightings(saved.value, context);
    return projections.ok ? saved : projections;
  }

  function content(creature: CreatureRecord): CreatureContent {
    return { kind: creature.kind, name: creature.name, appearance: creature.appearance, race: creature.race, description: creature.description, hitPoints: creature.hitPoints, armorClass: creature.armorClass, abilities: creature.abilities, notes: creature.notes, ...(creature.characterRef ? { characterRef: creature.characterRef } : {}) };
  }

  return {
    listCreatures: (campaignId) => repository.list("creature", campaignId),

    async create(campaignId, input) {
      const valid = validateCreatureContent(input);
      if (!valid.ok) return valid;
      const now = clock.now();
      const creature: CreatureRecord = {
        ...valid.value,
        id: idGenerator.uuid(),
        campaignId,
        schemaVersion: CREATURE_SCHEMA_VERSION,
        revision: asRevision(0),
        reveals: [],
        createdAt: now,
        updatedAt: now,
      };
      return run((context) => persist(creature, context));
    },

    async save(creature) {
      const valid = validateCreatureContent(content(creature));
      if (!valid.ok) return valid;
      const { characterRef: _dropped, ...withoutRef } = creature;
      return run((context) => persist({ ...withoutRef, ...valid.value }, context));
    },

    async delete(creature) {
      return run(async (context) => {
        const sightings = await repository.list("sighting", creature.campaignId, context);
        if (!sightings.ok) return sightings;
        for (const sighting of sightings.value.filter((item) => item.creatureId === creature.id)) {
          const removed = await repository.delete("sighting", sighting.id, sighting.revision, context);
          if (!removed.ok) return removed;
          const queued = await enqueue("sighting", creature.campaignId, sighting.id, sighting.revision, undefined, context);
          if (!queued.ok) return queued;
        }
        const guesses = await repository.list("guess", creature.campaignId, context);
        if (!guesses.ok) return guesses;
        for (const guess of guesses.value.filter((item) => item.creatureId === creature.id)) {
          const removed = await repository.delete("guess", guess.id, guess.revision, context);
          if (!removed.ok) return removed;
          const queued = await enqueue("guess", creature.campaignId, guess.id, guess.revision, undefined, context);
          if (!queued.ok) return queued;
        }
        const removed = await repository.delete("creature", creature.id, creature.revision, context);
        if (!removed.ok) return removed;
        return enqueue("creature", creature.campaignId, creature.id, creature.revision, undefined, context);
      });
    },

    async listSightings(campaignId, accountId) {
      const listed = await repository.list("sighting", campaignId);
      return listed.ok && accountId ? ok(listed.value.filter((item) => item.accountId === accountId)) : listed;
    },

    async listGuesses(campaignId, accountId) {
      const listed = await repository.list("guess", campaignId);
      return listed.ok && accountId ? ok(listed.value.filter((item) => item.accountId === accountId)) : listed;
    },

    async saveGuess(input) {
      const valid = validateGuessContent(input);
      if (!valid.ok) return valid;
      const id = sightingId(input.creatureId, input.accountId);
      return run(async (context) => {
        const current = await repository.get("guess", id, context);
        if (!current.ok) return current;
        const now = clock.now();
        const base = current.value?.revision ?? asRevision(0);
        const guess: CreatureGuess = {
          id,
          campaignId: input.campaignId,
          creatureId: input.creatureId,
          accountId: input.accountId,
          schemaVersion: CREATURE_SCHEMA_VERSION,
          revision: base,
          ...(valid.value.kind ? { kind: valid.value.kind } : {}),
          name: valid.value.name,
          note: valid.value.note,
          ...(valid.value.fields ? { fields: valid.value.fields } : {}),
          createdAt: current.value?.createdAt ?? now,
          updatedAt: now,
        };
        const saved = await repository.save("guess", guess, base, context);
        if (!saved.ok) return saved;
        const queued = await enqueue("guess", input.campaignId, id, base, saved.value, context);
        return queued.ok ? saved : queued;
      });
    },

    async importLegacyNpcs(campaignId, npcs) {
      if (npcs.length === 0) return ok(0);
      return run(async (context) => {
        const listed = await repository.list("creature", campaignId, context);
        if (!listed.ok) return listed;
        const known = new Set(listed.value.map((item) => item.id as string));
        let created = 0;
        for (const npc of npcs) {
          if (known.has(npc.id)) continue;
          const persisted = await persist(creatureFromLegacyNpc(npc, campaignId), context);
          if (!persisted.ok) return persisted;
          created += 1;
        }
        return ok(created);
      });
    },
  };
}
