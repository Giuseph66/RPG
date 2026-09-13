/**
 * Fake em memória do port `CampaignRepository` (`@application/ports/campaign-repository`),
 * usado pelos testes dos três dispatchers deste diretório. Mesmo espírito do fake inline de
 * `CharacterRepository` em `character/inventory-dispatcher.test.ts`, mas extraído para um
 * arquivo próprio porque o port de campanha é maior (agrega campanha, diário e mapas) e é
 * reutilizado por `campaign-dispatcher.test.ts`, `campaign-record-dispatcher.test.ts` e
 * `journal-dispatcher.test.ts`. Não é um `*.test.ts`: não contém asserções, só o fake e um
 * pequeno inspetor de estado para as suítes montarem os próprios cenários.
 */

import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { asRevision, type Revision } from "@domain/contracts/versioning";
import {
  type Asset,
  type Campaign,
  type JournalEntry,
  type MapPin,
  type MapRecord,
  type NpcRecord,
  type Quest,
} from "@domain/contracts/campaign";
import { type CampaignFilter, type CampaignRepository } from "@application/ports/campaign-repository";
import { type TransactionContext } from "@application/ports/unit-of-work";

export interface FakeCampaignRepositoryHandle {
  readonly repository: CampaignRepository;
  readonly getCampaign: (id: Uuid) => Campaign | undefined;
  readonly getJournalEntries: () => readonly JournalEntry[];
  readonly getMaps: () => readonly MapRecord[];
  readonly getSaveCount: () => number;
}

export function createFakeCampaignRepository(seed: readonly Campaign[] = []): FakeCampaignRepositoryHandle {
  const campaigns = new Map<Uuid, Campaign>(seed.map((campaign) => [campaign.id, campaign]));
  const journalEntries = new Map<Uuid, JournalEntry>();
  const maps = new Map<Uuid, MapRecord>();
  let saveCount = 0;

  const repository: CampaignRepository = {
    get: async (id, _context?: TransactionContext) => {
      const found = campaigns.get(id);
      return found ? ok(found) : err(appError.notFound("campaign", id));
    },
    list: async (_filter?: CampaignFilter) => ok([...campaigns.values()]),
    save: async (campaign, expectedRevision, _context?: TransactionContext): Promise<Result<Revision, AppError>> => {
      const existing = campaigns.get(campaign.id);
      if (existing === undefined) {
        if (expectedRevision !== 0) return err(appError.conflict(expectedRevision, asRevision(0)));
        saveCount += 1;
        campaigns.set(campaign.id, { ...campaign, revision: expectedRevision });
        return ok(expectedRevision);
      }
      if (existing.revision !== expectedRevision) {
        return err(appError.conflict(expectedRevision, existing.revision));
      }
      saveCount += 1;
      const nextRevision = asRevision(existing.revision + 1);
      campaigns.set(campaign.id, { ...campaign, revision: nextRevision });
      return ok(nextRevision);
    },
    delete: async (id, expectedRevision, _context?: TransactionContext) => {
      const existing = campaigns.get(id);
      if (!existing) return err(appError.notFound("campaign", id));
      if (existing.revision !== expectedRevision) return err(appError.conflict(expectedRevision, existing.revision));
      campaigns.delete(id);
      return ok(undefined);
    },
    deleteCampaignAndContent: async (id, expectedRevision, _context?: TransactionContext) => {
      const existing = campaigns.get(id);
      if (!existing) return err(appError.notFound("campaign", id));
      if (existing.revision !== expectedRevision) return err(appError.conflict(expectedRevision, existing.revision));
      const journalIds = [...journalEntries.values()].filter((entry) => entry.campaignId === id).map((entry) => entry.id);
      const mapIds = [...maps.values()].filter((map) => map.campaignId === id).map((map) => map.id);
      campaigns.delete(id);
      journalIds.forEach((entryId) => journalEntries.delete(entryId));
      mapIds.forEach((mapId) => maps.delete(mapId));
      return ok(undefined);
    },

    getJournalEntry: async (id, _context?: TransactionContext) => {
      const found = journalEntries.get(id);
      return found ? ok(found) : err(appError.notFound("journal-entry", id));
    },
    listJournalEntries: async (campaignId, _context?: TransactionContext) => ok([...journalEntries.values()].filter((entry) => entry.campaignId === campaignId)),
    saveJournalEntry: async (entry, _context?: TransactionContext) => {
      journalEntries.set(entry.id, entry);
      return ok(entry);
    },
    deleteJournalEntry: async (id, _context?: TransactionContext) => {
      journalEntries.delete(id);
      return ok(undefined);
    },

    getMap: async (id, _context?: TransactionContext) => {
      const found = maps.get(id);
      return found ? ok(found) : err(appError.notFound("map", id));
    },
    listMaps: async (campaignId, _context?: TransactionContext) => ok([...maps.values()].filter((map) => map.campaignId === campaignId)),
    saveMap: async (map, expectedRevision, _context?: TransactionContext) => {
      const existing = maps.get(map.id);
      if (existing !== undefined && existing.revision !== expectedRevision) return err(appError.conflict(expectedRevision, existing.revision));
      const nextRevision = existing === undefined ? expectedRevision : asRevision(existing.revision + 1);
      maps.set(map.id, { ...map, revision: nextRevision });
      return ok(nextRevision);
    },
    deleteMap: async (id, expectedRevision, _context?: TransactionContext) => {
      const existing = maps.get(id);
      if (!existing) return err(appError.notFound("map", id));
      if (existing.revision !== expectedRevision) return err(appError.conflict(expectedRevision, existing.revision));
      maps.delete(id);
      return ok(undefined);
    },

    addMapPin: async (mapId: Uuid, _pin: MapPin, expectedRevision: Revision, _context?: TransactionContext) => {
      const existing = maps.get(mapId);
      if (!existing) return err(appError.notFound("map", mapId));
      return ok(expectedRevision);
    },
    updateMapPin: async (mapId: Uuid, _pin: MapPin, expectedRevision: Revision, _context?: TransactionContext) => {
      const existing = maps.get(mapId);
      if (!existing) return err(appError.notFound("map", mapId));
      return ok(expectedRevision);
    },
    removeMapPin: async (mapId: Uuid, _pinId: Uuid, expectedRevision: Revision, _context?: TransactionContext) => {
      const existing = maps.get(mapId);
      if (!existing) return err(appError.notFound("map", mapId));
      return ok(expectedRevision);
    },

    saveQuest: async (campaignId: Uuid, quest: Quest, expectedRevision: Revision, _context?: TransactionContext) => {
      const campaign = campaigns.get(campaignId);
      if (!campaign) return err(appError.notFound("campaign", campaignId));
      if (campaign.revision !== expectedRevision) return err(appError.conflict(expectedRevision, campaign.revision));
      campaigns.set(campaignId, { ...campaign, quests: campaign.quests.some((item) => item.id === quest.id) ? campaign.quests.map((item) => item.id === quest.id ? quest : item) : [...campaign.quests, quest], revision: asRevision(expectedRevision + 1) });
      return ok(quest);
    },
    deleteQuest: async (campaignId: Uuid, questId: Uuid, expectedRevision: Revision, _context?: TransactionContext) => {
      const campaign = campaigns.get(campaignId);
      if (!campaign) return err(appError.notFound("campaign", campaignId));
      if (campaign.revision !== expectedRevision) return err(appError.conflict(expectedRevision, campaign.revision));
      if (!campaign.quests.some((item) => item.id === questId)) return err(appError.notFound("quest", questId));
      campaigns.set(campaignId, { ...campaign, quests: campaign.quests.filter((item) => item.id !== questId), revision: asRevision(expectedRevision + 1) });
      return ok(undefined);
    },
    saveNpc: async (campaignId: Uuid, npc: NpcRecord, expectedRevision: Revision, _context?: TransactionContext) => {
      const campaign = campaigns.get(campaignId);
      if (!campaign) return err(appError.notFound("campaign", campaignId));
      if (campaign.revision !== expectedRevision) return err(appError.conflict(expectedRevision, campaign.revision));
      campaigns.set(campaignId, { ...campaign, npcs: campaign.npcs.some((item) => item.id === npc.id) ? campaign.npcs.map((item) => item.id === npc.id ? npc : item) : [...campaign.npcs, npc], revision: asRevision(expectedRevision + 1) });
      return ok(npc);
    },
    deleteNpc: async (campaignId: Uuid, npcId: Uuid, expectedRevision: Revision, _context?: TransactionContext) => {
      const campaign = campaigns.get(campaignId);
      if (!campaign) return err(appError.notFound("campaign", campaignId));
      if (campaign.revision !== expectedRevision) return err(appError.conflict(expectedRevision, campaign.revision));
      if (!campaign.npcs.some((item) => item.id === npcId)) return err(appError.notFound("npc", npcId));
      campaigns.set(campaignId, { ...campaign, npcs: campaign.npcs.filter((item) => item.id !== npcId), revision: asRevision(expectedRevision + 1) });
      return ok(undefined);
    },

    importAtomic: async (input: { readonly map: MapRecord; readonly asset: Asset }, _context?: TransactionContext) => {
      maps.set(input.map.id, input.map);
      return ok(input);
    },
  };

  return {
    repository,
    getCampaign: (id) => campaigns.get(id),
    getJournalEntries: () => [...journalEntries.values()],
    getMaps: () => [...maps.values()],
    getSaveCount: () => saveCount,
  };
}
