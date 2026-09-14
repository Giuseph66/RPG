import { type Clock } from "@application/ports/clock";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type OutboxRepository } from "@application/ports/outbox-repository";
import { createPendingSyncOperation, toJsonSnapshot } from "@application/sync";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asCommandId, type AccountId } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";

export interface PublishLocalCharactersOptions {
  readonly characters: CharacterRepository;
  readonly outbox: OutboxRepository;
  readonly ownerUid: AccountId;
  readonly clock: Clock;
}

/**
 * Migra fichas privadas criadas antes do login para a fila da conta escolhida.
 * O ID estável torna cliques repetidos em "Salvar perfil" idempotentes.
 */
export async function publishLocalCharacters(options: PublishLocalCharactersOptions): Promise<Result<number, AppError>> {
  const listed = await options.characters.list();
  if (!listed.ok) return listed;
  console.info("[sync] Fichas locais encontradas para publicação", { total: listed.value.length });

  let published = 0;
  for (const summary of listed.value) {
    const operationId = asCommandId(`character-backfill:${options.ownerUid}:${summary.id}`);
    const existing = await options.outbox.get(operationId);
    if (existing.ok) {
      console.info("[sync] Ficha já possui operação na fila", { characterId: String(summary.id), status: existing.value.status });
      continue;
    }
    if (existing.error.code !== "not-found") return existing;

    const character = await options.characters.get(summary.id);
    if (!character.ok) return character;
    const payload = toJsonSnapshot(character.value);
    if (payload === undefined) return err(appError.validation("character", "A ficha local contém dados que não podem ser sincronizados."));

    const operation = createPendingSyncOperation({
      operationId,
      aggregateType: "character",
      aggregateId: character.value.id,
      mutation: "upsert",
      baseRevision: asRevision(0),
      scope: character.value.campaignId === undefined ? { ownerUid: options.ownerUid } : { campaignId: character.value.campaignId },
      payload,
      createdAt: options.clock.now(),
    });
    if (!operation.ok) return operation;
    console.info("[sync] Enfileirando ficha local", {
      characterId: String(character.value.id),
      revision: character.value.revision,
      destination: character.value.campaignId === undefined ? "private-character" : "campaign-character",
    });
    const queued = await options.outbox.enqueue(operation.value);
    if (!queued.ok) return queued;
    console.info("[sync] Ficha entrou na fila", { characterId: String(character.value.id) });
    published += 1;
  }
  return ok(published);
}
