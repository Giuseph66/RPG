/**
 * IndexedDbCharacterRepository. Autoridade: src/application/ports/character-repository.ts,
 * docs/criacao/08-PERSISTENCIA-LOCAL.md.
 */

import { type Uuid } from "@domain/contracts/ids";
import {
  CHARACTER_SCHEMA_VERSION,
  CHARACTER_DRAFT_SCHEMA_VERSION,
  type Character,
  type CharacterDraft,
  type CharacterSummary,
} from "@domain/contracts/character";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type CommandReceipt } from "@domain/contracts/rules";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type CharacterFilter, type CharacterRepository } from "@application/ports/character-repository";
import { type Clock } from "@application/ports/clock";
import { type TransactionContext } from "@application/ports/unit-of-work";

import { hasSchemaEnvelope, persistToRecovery, readValidated } from "./record-guards";
import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction, runTransactionOrContext } from "./transaction";

/** Forma mínima de `Campaign` suficiente para desvincular `characterIds` no delete de
 * personagem; a validação completa do contrato é responsabilidade de `IndexedDbCampaignRepository`. */
function isCampaignEnvelopeForUnlink(value: unknown): value is { readonly id: string; readonly revision: number; readonly characterIds: readonly string[] } {
  if (!hasSchemaEnvelope(value)) return false;
  return Array.isArray((value as Record<string, unknown>).characterIds);
}

const SUPPORTED_RANGE = { min: 1, max: CHARACTER_SCHEMA_VERSION };

function isCharacterEnvelope(value: unknown): value is Character {
  return hasSchemaEnvelope(value);
}

function checkSchemaVersion(record: { readonly schemaVersion: number }): AppError | undefined {
  if (record.schemaVersion > CHARACTER_SCHEMA_VERSION) {
    return appError.unsupportedSchema(record.schemaVersion, SUPPORTED_RANGE);
  }
  return undefined;
}

function toSummary(character: Character): CharacterSummary {
  const classSummary = character.classes.map((c) => ({ classId: c.classId, level: c.level }));
  const totalLevel = classSummary.reduce((sum, c) => sum + c.level, 0);
  return {
    id: character.id,
    name: character.name,
    raceRef: character.raceRef,
    classSummary,
    totalLevel,
    campaignId: character.campaignId,
    portraitAssetId: character.portraitAssetId,
    updatedAt: character.updatedAt,
    revision: character.revision,
  };
}

/** `CharacterDraft` não carrega revisão (documento de trabalho de dono único, ver
 * character.ts) — a validação mínima aqui checa apenas id + schemaVersion. */
function isDraftEnvelope(value: unknown): value is CharacterDraft {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.schemaVersion === "number";
}

function checkDraftSchemaVersion(record: { readonly schemaVersion: number }): AppError | undefined {
  return record.schemaVersion > CHARACTER_DRAFT_SCHEMA_VERSION
    ? appError.unsupportedSchema(record.schemaVersion, { min: 1, max: CHARACTER_DRAFT_SCHEMA_VERSION })
    : undefined;
}

export class IndexedDbCharacterRepository implements CharacterRepository {
  constructor(
    private readonly db: IDBDatabase,
    private readonly clock: Clock,
  ) {}

  async get(id: Uuid): Promise<Result<Character, AppError>> {
    const validated = await readValidated(
      this.db,
      STORE_NAMES.characters,
      id,
      this.clock.now(),
      isCharacterEnvelope,
      "character",
    );
    if (!validated.ok) return validated;
    const schemaError = checkSchemaVersion(validated.value);
    if (schemaError) return err(schemaError);
    return ok(validated.value);
  }

  async list(filter?: CharacterFilter, context?: TransactionContext): Promise<Result<readonly CharacterSummary[], AppError>> {
    const result = await runTransactionOrContext(this.db, [STORE_NAMES.characters], "readonly", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.characters);
      // Lemos a store inteira antes de aplicar o filtro para que registros corrompidos ou
      // de schema futuro nunca desapareçam por não possuírem a chave do índice.
      const raws: unknown[] = await requestToPromise(store.getAll());
      return ok(raws);
    });
    if (!result.ok) return result;

      const summaries: CharacterSummary[] = [];
      for (const [index, raw] of result.value.entries()) {
        if (!isCharacterEnvelope(raw)) {
          const id = recordId(raw, `characters:unknown:${index}`);
          await persistToRecovery(this.db, id, STORE_NAMES.characters, raw, this.clock.now());
          return err(appError.corruptRecord(id, undefined, id));
        }
        const schemaError = checkSchemaVersion(raw);
        if (schemaError) return err(schemaError);
        if (filter?.campaignId !== undefined && raw.campaignId !== filter.campaignId) continue;
        summaries.push(toSummary(raw));
      }
      return ok(summaries);
  }

  async save(
    character: Character,
    expectedRevision: Revision,
    commandReceipt?: CommandReceipt,
    context?: TransactionContext,
  ): Promise<Result<Revision, AppError>> {
    const now = this.clock.now();
    return runTransactionOrContext(
      this.db,
      [STORE_NAMES.characters, STORE_NAMES.commandReceipts],
      "readwrite",
      context,
      async (tx) => {
        const receiptsStore = tx.objectStore(STORE_NAMES.commandReceipts);

        if (commandReceipt) {
          const existingReceipt = await requestToPromise(receiptsStore.get(commandReceipt.commandId));
          if (existingReceipt !== undefined) {
            // Idempotência: comando já processado, devolve a revisão já gravada sem
            // reaplicar (docs/criacao/08-PERSISTENCIA-LOCAL.md, "recibo impede duplicação").
            const recorded = existingReceipt as CommandReceipt;
            if (typeof recorded.resultingRevision === "number") {
              return ok(asRevision(recorded.resultingRevision));
            }
            return err(
              appError.validation(
                "commandReceipt",
                "Recibo de comando já registrado sem revisão resultante associada.",
              ),
            );
          }
        }

        const store = tx.objectStore(STORE_NAMES.characters);
        const raw = await requestToPromise(store.get(character.id));

        let actualRevision: Revision;
        if (raw === undefined) {
          actualRevision = asRevision(0);
        } else if (!isCharacterEnvelope(raw)) {
          return err(appError.corruptRecord(character.id));
        } else {
          const schemaError = checkSchemaVersion(raw);
          if (schemaError) return err(schemaError);
          actualRevision = asRevision(raw.revision);
        }

        if (actualRevision !== expectedRevision) {
          return err(appError.conflict(expectedRevision, actualRevision));
        }

        const nextRevision = asRevision(expectedRevision + 1);
        const toStore: Character = { ...character, revision: nextRevision, updatedAt: now };
        await requestToPromise(store.put(toStore));

        if (commandReceipt) {
          await requestToPromise(receiptsStore.put({ ...commandReceipt, resultingRevision: nextRevision }));
        }

        return ok(nextRevision);
      },
    );
  }

  async delete(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    const now = this.clock.now();
    return runTransactionOrContext(
      this.db,
      [
        STORE_NAMES.characters,
        STORE_NAMES.campaigns,
        STORE_NAMES.drafts,
        STORE_NAMES.rolls,
        STORE_NAMES.commandReceipts,
        STORE_NAMES.assets,
        STORE_NAMES.maps,
      ],
      "readwrite",
      context,
      async (tx) => {
        const store = tx.objectStore(STORE_NAMES.characters);
        const raw = await requestToPromise(store.get(id));
        if (raw === undefined) return err(appError.notFound("character", id));
        if (!isCharacterEnvelope(raw)) return err(appError.corruptRecord(id));
        const schemaError = checkSchemaVersion(raw);
        if (schemaError) return err(schemaError);

        const actualRevision = asRevision(raw.revision);
        if (actualRevision !== expectedRevision) {
          return err(appError.conflict(expectedRevision, actualRevision));
        }

        // A relação é redundante (Character.campaignId e Campaign.characterIds). Varremos
        // as campanhas para também reparar uma inconsistência pré-existente em que o
        // personagem não carregava campaignId, mas ainda estava no elenco.
        const campaignsStore = tx.objectStore(STORE_NAMES.campaigns);
        const linkedCampaignId = raw.campaignId;
        const linkedCampaign = linkedCampaignId === undefined ? undefined : await requestToPromise(campaignsStore.get(linkedCampaignId));
        if (linkedCampaignId !== undefined && linkedCampaign !== undefined && !isCampaignEnvelopeForUnlink(linkedCampaign)) {
          return err(appError.corruptRecord(linkedCampaignId));
        }
        const rawCampaigns = await requestToPromise(campaignsStore.getAll());
        const campaignsToUpdate: { readonly raw: Record<string, unknown>; readonly characterIds: readonly string[] }[] = [];
        for (const candidate of rawCampaigns) {
          if (!isCampaignEnvelopeForUnlink(candidate)) continue;
          const campaign = candidate as Record<string, unknown> & { readonly characterIds: readonly string[] };
          if (campaign.characterIds.includes(id)) campaignsToUpdate.push({ raw: campaign, characterIds: campaign.characterIds });
        }
        for (const { raw: campaign, characterIds } of campaignsToUpdate) {
          await requestToPromise(
            campaignsStore.put({
              ...campaign,
              characterIds: characterIds.filter((characterId) => characterId !== id),
              revision: Number(campaign.revision) + 1,
              updatedAt: now,
            }),
          );
        }

        // Excluir o personagem também elimina seus registros derivados. Cada operação usa
        // o mesmo commit para não deixar histórico/recibo/rascunho apontando para um ID
        // que já não existe.
        await requestToPromise(tx.objectStore(STORE_NAMES.drafts).delete(id));
        const rolls = await requestToPromise(tx.objectStore(STORE_NAMES.rolls).index("characterId").getAll(id));
        for (const roll of rolls) {
          if (typeof roll === "object" && roll !== null && typeof (roll as { id?: unknown }).id === "string") {
            await requestToPromise(tx.objectStore(STORE_NAMES.rolls).delete((roll as { id: string }).id));
          }
        }
        const receipts = await requestToPromise(tx.objectStore(STORE_NAMES.commandReceipts).index("characterId").getAll(id));
        for (const receipt of receipts) {
          if (typeof receipt === "object" && receipt !== null && typeof (receipt as { commandId?: unknown }).commandId === "string") {
            await requestToPromise(tx.objectStore(STORE_NAMES.commandReceipts).delete((receipt as { commandId: string }).commandId));
          }
        }

        // Retrato é um asset próprio enquanto não houver outro personagem ou mapa usando-o.
        // Assets compartilhados permanecem para não quebrar os agregados restantes.
        const portraitAssetId = raw.portraitAssetId;
        if (portraitAssetId !== undefined) {
          const otherCharacters = await requestToPromise(store.getAll());
          const usedByOtherCharacter = otherCharacters.some((candidate) => {
            if (typeof candidate !== "object" || candidate === null) return false;
            const record = candidate as Record<string, unknown>;
            return record.id !== id && record.portraitAssetId === portraitAssetId;
          });
          const mapRecords = await requestToPromise(tx.objectStore(STORE_NAMES.maps).getAll());
          const usedByMap = mapRecords.some((candidate) => {
            if (typeof candidate !== "object" || candidate === null) return false;
            return (candidate as Record<string, unknown>).assetId === portraitAssetId;
          });
          if (!usedByOtherCharacter && !usedByMap) {
            await requestToPromise(tx.objectStore(STORE_NAMES.assets).delete(portraitAssetId));
          }
        }

        await requestToPromise(store.delete(id));
        return ok(undefined);
      },
    );
  }

  async getDraft(id: Uuid): Promise<Result<CharacterDraft, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.drafts], "readonly", async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.drafts).get(id));
      if (raw === undefined) return err(appError.notFound("character-draft", id));
      if (!isDraftEnvelope(raw)) return err(appError.corruptRecord(id));
      const schemaError = checkDraftSchemaVersion(raw);
      if (schemaError) return err(schemaError);
      return ok(raw);
    });
  }

  async saveDraft(draft: CharacterDraft): Promise<Result<CharacterDraft, AppError>> {
    const now = this.clock.now();
    return runTransaction(this.db, [STORE_NAMES.drafts], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.drafts);
      const existing = await requestToPromise(store.get(draft.id));
      if (existing !== undefined) {
        if (!isDraftEnvelope(existing)) return err(appError.corruptRecord(draft.id));
        const schemaError = checkDraftSchemaVersion(existing);
        if (schemaError) return err(schemaError);
      }
      const updated: CharacterDraft = { ...draft, updatedAt: now };
      await requestToPromise(store.put(updated));
      return ok(updated);
    });
  }

  async deleteDraft(id: Uuid): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.drafts], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.drafts);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("character-draft", id));
      if (!isDraftEnvelope(raw)) return err(appError.corruptRecord(id));
      const schemaError = checkDraftSchemaVersion(raw);
      if (schemaError) return err(schemaError);
      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }
}

function recordId(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return fallback;
}
