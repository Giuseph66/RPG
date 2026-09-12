/**
 * IndexedDbCampaignRepository. Autoridade: src/application/ports/campaign-repository.ts,
 * docs/criacao/08-PERSISTENCIA-LOCAL.md.
 *
 * Decisões de infraestrutura:
 * - `journalEntries` não tem CAS (08-PERSISTENCIA-LOCAL.md não pede revisão para diário);
 *   `save`/`delete` operam por id direto, `updatedAt` sempre via Clock.
 * - `saveQuest`/`saveNpc`/`deleteQuest`/`deleteNpc` operam dentro do agregado `Campaign`
 *   e verificam a revisão esperada na mesma transação de leitura/escrita.
 * - `MapRecord`/`Asset` não têm `schemaVersion` no contrato — `unsupported-schema` não se
 *   aplica a eles (ver record-guards.ts).
 */

import { type Uuid } from "@domain/contracts/ids";
import {
  CAMPAIGN_SCHEMA_VERSION,
  type Asset,
  type Campaign,
  type JournalEntry,
  type MapPin,
  type MapRecord,
  type NpcRecord,
  type Quest,
} from "@domain/contracts/campaign";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import { type CampaignFilter, type CampaignRepository } from "@application/ports/campaign-repository";
import { type Clock } from "@application/ports/clock";
import { type TransactionContext } from "@application/ports/unit-of-work";

import { hasIdAndRevision, hasSchemaEnvelope, isValidAssetShape, persistToRecovery, readValidated } from "./record-guards";
import { STORE_NAMES } from "./schema";
import { requestToPromise, runTransaction, runTransactionOrContext } from "./transaction";

const CAMPAIGN_SUPPORTED_RANGE = { min: 1, max: CAMPAIGN_SCHEMA_VERSION };

function isCampaignEnvelope(value: unknown): value is Campaign {
  return hasSchemaEnvelope(value);
}

function checkCampaignSchemaVersion(record: { readonly schemaVersion: number }): AppError | undefined {
  if (record.schemaVersion > CAMPAIGN_SCHEMA_VERSION) {
    return appError.unsupportedSchema(record.schemaVersion, CAMPAIGN_SUPPORTED_RANGE);
  }
  return undefined;
}

function isMapEnvelope(value: unknown): value is MapRecord {
  if (!hasIdAndRevision(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.campaignId === "string" && Array.isArray(record.pins);
}

function isJournalEntryShape(value: unknown): value is JournalEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.campaignId === "string";
}

function isValidMapForImport(value: MapRecord): boolean {
  return (
    typeof value.id === "string" &&
    typeof value.campaignId === "string" &&
    typeof value.assetId === "string" &&
    Array.isArray(value.pins) &&
    Number.isInteger(value.revision) &&
    value.revision >= 0
  );
}

export class IndexedDbCampaignRepository implements CampaignRepository {
  constructor(
    private readonly db: IDBDatabase,
    private readonly clock: Clock,
  ) {}

  // -------------------------------------------------------------------------
  // Campaign
  // -------------------------------------------------------------------------

  async get(id: Uuid): Promise<Result<Campaign, AppError>> {
    const validated = await readValidated(
      this.db,
      STORE_NAMES.campaigns,
      id,
      this.clock.now(),
      isCampaignEnvelope,
      "campaign",
    );
    if (!validated.ok) return validated;
    const schemaError = checkCampaignSchemaVersion(validated.value);
    if (schemaError) return err(schemaError);
    return ok(validated.value);
  }

  async list(_filter?: CampaignFilter): Promise<Result<readonly Campaign[], AppError>> {
    const result = await runTransaction(this.db, [STORE_NAMES.campaigns], "readonly", async (tx) => {
      const raws = await requestToPromise(tx.objectStore(STORE_NAMES.campaigns).getAll());
      return ok(raws as unknown[]);
    });
    if (!result.ok) return result;
    const campaigns: Campaign[] = [];
    for (const [index, raw] of result.value.entries()) {
      if (!isCampaignEnvelope(raw)) {
        const id = recordId(raw, `campaigns:unknown:${index}`);
        await persistToRecovery(this.db, id, STORE_NAMES.campaigns, raw, this.clock.now());
        return err(appError.corruptRecord(id, undefined, id));
      }
      const schemaError = checkCampaignSchemaVersion(raw);
      if (schemaError) return err(schemaError);
      campaigns.push(raw);
    }
    return ok(campaigns);
  }

  async save(campaign: Campaign, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    const now = this.clock.now();
    return runTransaction(this.db, [STORE_NAMES.campaigns], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.campaigns);
      const raw = await requestToPromise(store.get(campaign.id));

      let actualRevision: Revision;
      if (raw === undefined) {
        actualRevision = asRevision(0);
      } else if (!isCampaignEnvelope(raw)) {
        return err(appError.corruptRecord(campaign.id));
      } else {
        const schemaError = checkCampaignSchemaVersion(raw);
        if (schemaError) return err(schemaError);
        actualRevision = asRevision(raw.revision);
      }

      if (actualRevision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, actualRevision));
      }

      const nextRevision = asRevision(expectedRevision + 1);
      const toStore: Campaign = { ...campaign, revision: nextRevision, updatedAt: now };
      await requestToPromise(store.put(toStore));
      return ok(nextRevision);
    });
  }

  async delete(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.campaigns], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.campaigns);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("campaign", id));
      if (!isCampaignEnvelope(raw)) return err(appError.corruptRecord(id));
      const schemaError = checkCampaignSchemaVersion(raw);
      if (schemaError) return err(schemaError);

      const actualRevision = asRevision(raw.revision);
      if (actualRevision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, actualRevision));
      }

      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }

  /**
   * Remove campanha, diário, mapas e assets que ficaram sem referência em uma única
   * transação. Todas as leituras e validações acontecem antes do primeiro delete para que
   * um registro inválido também deixe o agregado inteiro intacto.
   */
  async deleteCampaignAndContent(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return runTransaction(
      this.db,
      [STORE_NAMES.campaigns, STORE_NAMES.journalEntries, STORE_NAMES.maps, STORE_NAMES.assets],
      "readwrite",
      async (tx) => {
        const campaigns = tx.objectStore(STORE_NAMES.campaigns);
        const rawCampaign = await requestToPromise(campaigns.get(id));
        if (rawCampaign === undefined) return err(appError.notFound("campaign", id));
        if (!isCampaignEnvelope(rawCampaign)) return err(appError.corruptRecord(id));
        const schemaError = checkCampaignSchemaVersion(rawCampaign);
        if (schemaError) return err(schemaError);
        if (asRevision(rawCampaign.revision) !== expectedRevision) {
          return err(appError.conflict(expectedRevision, asRevision(rawCampaign.revision)));
        }

        const journalStore = tx.objectStore(STORE_NAMES.journalEntries);
        const rawJournalEntries = await requestToPromise(journalStore.index("campaignId").getAll(id));
        for (const raw of rawJournalEntries) {
          if (!isJournalEntryShape(raw)) return err(appError.corruptRecord(id));
        }

        const mapsStore = tx.objectStore(STORE_NAMES.maps);
        const rawMaps = await requestToPromise(mapsStore.index("campaignId").getAll(id));
        for (const raw of rawMaps) {
          if (!isMapEnvelope(raw) || typeof (raw as MapRecord).assetId !== "string") {
            return err(appError.corruptRecord(id));
          }
        }

        const allRawMaps = await requestToPromise(mapsStore.getAll());
        const deletedMapIds = new Set(rawMaps.map((raw) => (raw as MapRecord).id));
        const deletedAssetIds = new Set(rawMaps.map((raw) => (raw as MapRecord).assetId));
        const retainedAssetIds = new Set<string>();
        for (const raw of allRawMaps) {
          if (!isMapEnvelope(raw) || typeof (raw as MapRecord).assetId !== "string") {
            return err(appError.corruptRecord(id));
          }
          if (!deletedMapIds.has((raw as MapRecord).id)) retainedAssetIds.add((raw as MapRecord).assetId);
        }

        // Só assets pertencentes exclusivamente aos mapas removidos são órfãos; um asset
        // compartilhado por outro mapa precisa sobreviver à exclusão desta campanha.
        for (const raw of rawJournalEntries) await requestToPromise(journalStore.delete((raw as JournalEntry).id));
        for (const raw of rawMaps) await requestToPromise(mapsStore.delete((raw as MapRecord).id));
        for (const assetId of deletedAssetIds) {
          if (!retainedAssetIds.has(assetId)) {
            await requestToPromise(tx.objectStore(STORE_NAMES.assets).delete(assetId));
          }
        }
        await requestToPromise(campaigns.delete(id));
        return ok(undefined);
      },
    );
  }

  // -------------------------------------------------------------------------
  // Journal (sem CAS)
  // -------------------------------------------------------------------------

  async getJournalEntry(id: Uuid): Promise<Result<JournalEntry, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.journalEntries], "readonly", async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.journalEntries).get(id));
      if (raw === undefined) return err(appError.notFound("journal-entry", id));
      if (!isJournalEntryShape(raw)) return err(appError.corruptRecord(id));
      return ok(raw);
    });
  }

  async listJournalEntries(campaignId: Uuid): Promise<Result<readonly JournalEntry[], AppError>> {
    const result = await runTransaction(this.db, [STORE_NAMES.journalEntries], "readonly", async (tx) => {
      const raws = await requestToPromise(tx.objectStore(STORE_NAMES.journalEntries).getAll());
      return ok(raws as unknown[]);
    });
    if (!result.ok) return result;
    const entries: JournalEntry[] = [];
    for (const [index, raw] of result.value.entries()) {
      if (!isJournalEntryShape(raw)) {
        const id = recordId(raw, `journalEntries:unknown:${index}`);
        await persistToRecovery(this.db, id, STORE_NAMES.journalEntries, raw, this.clock.now());
        return err(appError.corruptRecord(id, undefined, id));
      }
      if (raw.campaignId !== campaignId) continue;
      entries.push(raw);
    }
    return ok(entries);
  }

  async saveJournalEntry(entry: JournalEntry): Promise<Result<JournalEntry, AppError>> {
    const now = this.clock.now();
    return runTransaction(this.db, [STORE_NAMES.journalEntries], "readwrite", async (tx) => {
      const updated: JournalEntry = { ...entry, updatedAt: now };
      await requestToPromise(tx.objectStore(STORE_NAMES.journalEntries).put(updated));
      return ok(updated);
    });
  }

  async deleteJournalEntry(id: Uuid): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.journalEntries], "readwrite", async (tx) => {
      const raw = await requestToPromise(tx.objectStore(STORE_NAMES.journalEntries).get(id));
      if (raw === undefined) return err(appError.notFound("journal-entry", id));
      if (!isJournalEntryShape(raw)) return err(appError.corruptRecord(id));
      await requestToPromise(tx.objectStore(STORE_NAMES.journalEntries).delete(id));
      return ok(undefined);
    });
  }

  // -------------------------------------------------------------------------
  // Maps (CAS)
  // -------------------------------------------------------------------------

  async getMap(id: Uuid): Promise<Result<MapRecord, AppError>> {
    const validated = await readValidated(this.db, STORE_NAMES.maps, id, this.clock.now(), isMapEnvelope, "map");
    return validated;
  }

  async listMaps(campaignId: Uuid): Promise<Result<readonly MapRecord[], AppError>> {
    const result = await runTransaction(this.db, [STORE_NAMES.maps], "readonly", async (tx) => {
      const raws = await requestToPromise(tx.objectStore(STORE_NAMES.maps).getAll());
      return ok(raws as unknown[]);
    });
    if (!result.ok) return result;
    for (const [index, raw] of result.value.entries()) {
      if (!isMapEnvelope(raw)) {
        const id = recordId(raw, `maps:unknown:${index}`);
        await persistToRecovery(this.db, id, STORE_NAMES.maps, raw, this.clock.now());
        return err(appError.corruptRecord(id, undefined, id));
      }
      if (raw.campaignId !== campaignId) continue;
    }
    return ok(result.value as MapRecord[]);
  }

  async saveMap(map: MapRecord, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.maps], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.maps);
      const raw = await requestToPromise(store.get(map.id));

      let actualRevision: Revision;
      if (raw === undefined) {
        actualRevision = asRevision(0);
      } else if (!isMapEnvelope(raw)) {
        return err(appError.corruptRecord(map.id));
      } else {
        actualRevision = asRevision(raw.revision);
      }

      if (actualRevision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, actualRevision));
      }

      const nextRevision = asRevision(expectedRevision + 1);
      const toStore: MapRecord = { ...map, revision: nextRevision };
      await requestToPromise(store.put(toStore));
      return ok(nextRevision);
    });
  }

  async deleteMap(id: Uuid, expectedRevision: Revision): Promise<Result<void, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.maps], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.maps);
      const raw = await requestToPromise(store.get(id));
      if (raw === undefined) return err(appError.notFound("map", id));
      if (!isMapEnvelope(raw)) return err(appError.corruptRecord(id));

      const actualRevision = asRevision(raw.revision);
      if (actualRevision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, actualRevision));
      }

      await requestToPromise(store.delete(id));
      return ok(undefined);
    });
  }

  private async mutateMapPins(
    mapId: Uuid,
    expectedRevision: Revision,
    mutate: (pins: readonly MapPin[]) => Result<readonly MapPin[], AppError>,
  ): Promise<Result<Revision, AppError>> {
    return runTransaction(this.db, [STORE_NAMES.maps], "readwrite", async (tx) => {
      const store = tx.objectStore(STORE_NAMES.maps);
      const raw = await requestToPromise(store.get(mapId));
      if (raw === undefined) return err(appError.notFound("map", mapId));
      if (!isMapEnvelope(raw)) return err(appError.corruptRecord(mapId));

      const actualRevision = asRevision(raw.revision);
      if (actualRevision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, actualRevision));
      }

      const mutated = mutate(raw.pins);
      if (!mutated.ok) return mutated;

      const nextRevision = asRevision(expectedRevision + 1);
      const toStore: MapRecord = { ...raw, pins: mutated.value, revision: nextRevision };
      await requestToPromise(store.put(toStore));
      return ok(nextRevision);
    });
  }

  async addMapPin(mapId: Uuid, pin: MapPin, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.mutateMapPins(mapId, expectedRevision, (pins) => ok([...pins, pin]));
  }

  async updateMapPin(mapId: Uuid, pin: MapPin, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.mutateMapPins(mapId, expectedRevision, (pins) => {
      const index = pins.findIndex((p) => p.id === pin.id);
      if (index < 0) return err(appError.notFound("map-pin", pin.id));
      const next = pins.slice();
      next[index] = pin;
      return ok(next);
    });
  }

  async removeMapPin(mapId: Uuid, pinId: Uuid, expectedRevision: Revision): Promise<Result<Revision, AppError>> {
    return this.mutateMapPins(mapId, expectedRevision, (pins) => {
      if (!pins.some((p) => p.id === pinId)) return err(appError.notFound("map-pin", pinId));
      return ok(pins.filter((p) => p.id !== pinId));
    });
  }

  // -------------------------------------------------------------------------
  // Quests / NPCs (dentro do agregado Campaign, com CAS da campanha)
  // -------------------------------------------------------------------------

  private async mutateCampaign<TResult>(
    campaignId: Uuid,
    expectedRevision: Revision,
    mutate: (campaign: Campaign) => Result<{ readonly campaign: Campaign; readonly value: TResult }, AppError>,
    context?: TransactionContext,
  ): Promise<Result<TResult, AppError>> {
    const now = this.clock.now();
    return runTransactionOrContext(this.db, [STORE_NAMES.campaigns], "readwrite", context, async (tx) => {
      const store = tx.objectStore(STORE_NAMES.campaigns);
      const raw = await requestToPromise(store.get(campaignId));
      if (raw === undefined) return err(appError.notFound("campaign", campaignId));
      if (!isCampaignEnvelope(raw)) return err(appError.corruptRecord(campaignId));
      const schemaError = checkCampaignSchemaVersion(raw);
      if (schemaError) return err(schemaError);
      if (asRevision(raw.revision) !== expectedRevision) {
        return err(appError.conflict(expectedRevision, asRevision(raw.revision)));
      }

      const mutated = mutate(raw);
      if (!mutated.ok) return mutated;

      const nextRevision = asRevision(raw.revision + 1);
      const toStore: Campaign = { ...mutated.value.campaign, revision: nextRevision, updatedAt: now };
      await requestToPromise(store.put(toStore));
      return ok(mutated.value.value);
    });
  }

  async saveQuest(campaignId: Uuid, quest: Quest, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Quest, AppError>> {
    return this.mutateCampaign(campaignId, expectedRevision, (campaign) => {
      const index = campaign.quests.findIndex((q) => q.id === quest.id);
      const quests = index >= 0 ? campaign.quests.map((q, i) => (i === index ? quest : q)) : [...campaign.quests, quest];
      return ok({ campaign: { ...campaign, quests }, value: quest });
    }, context);
  }

  async deleteQuest(campaignId: Uuid, questId: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    return this.mutateCampaign(campaignId, expectedRevision, (campaign) => {
      if (!campaign.quests.some((q) => q.id === questId)) {
        return err(appError.notFound("quest", questId));
      }
      const quests = campaign.quests.filter((q) => q.id !== questId);
      return ok({ campaign: { ...campaign, quests }, value: undefined });
    }, context);
  }

  async saveNpc(campaignId: Uuid, npc: NpcRecord, expectedRevision: Revision, context?: TransactionContext): Promise<Result<NpcRecord, AppError>> {
    return this.mutateCampaign(campaignId, expectedRevision, (campaign) => {
      const index = campaign.npcs.findIndex((n) => n.id === npc.id);
      const npcs = index >= 0 ? campaign.npcs.map((n, i) => (i === index ? npc : n)) : [...campaign.npcs, npc];
      return ok({ campaign: { ...campaign, npcs }, value: npc });
    }, context);
  }

  async deleteNpc(campaignId: Uuid, npcId: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>> {
    return this.mutateCampaign(campaignId, expectedRevision, (campaign) => {
      if (!campaign.npcs.some((n) => n.id === npcId)) {
        return err(appError.notFound("npc", npcId));
      }
      const npcs = campaign.npcs.filter((n) => n.id !== npcId);
      return ok({ campaign: { ...campaign, npcs }, value: undefined });
    }, context);
  }

  // -------------------------------------------------------------------------
  // Import atômico (Asset + Map)
  // -------------------------------------------------------------------------

  async importAtomic(input: {
    readonly map: MapRecord;
    readonly asset: Asset;
  }): Promise<Result<{ readonly map: MapRecord; readonly asset: Asset }, AppError>> {
    if (!isValidAssetShape(input.asset)) {
      return err(appError.validation("asset", "Asset inválido para importação atômica."));
    }
    if (!isValidMapForImport(input.map)) {
      return err(appError.validation("map", "Mapa inválido para importação atômica."));
    }

    return runTransaction(this.db, [STORE_NAMES.assets, STORE_NAMES.maps], "readwrite", async (tx) => {
      await requestToPromise(tx.objectStore(STORE_NAMES.assets).put(input.asset));
      await requestToPromise(tx.objectStore(STORE_NAMES.maps).put(input.map));
      return ok({ map: input.map, asset: input.asset });
    });
  }
}

function recordId(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return fallback;
}
