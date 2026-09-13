/**
 * CampaignRepository. Autoridade: dados/schemas.md, 08-PERSISTENCIA-LOCAL.md.
 * `importAtomic` cobre o par Asset+Map citado em 08-PERSISTENCIA-LOCAL.md ("Map pins pertencem
 * ao agregado de mapa"): gravar o asset e o registro de mapa em uma única transação.
 */

import { type Uuid } from "@domain/contracts/ids";
import {
  type Asset,
  type Campaign,
  type JournalEntry,
  type MapPin,
  type MapRecord,
  type NpcRecord,
  type Quest,
} from "@domain/contracts/campaign";
import { type AppError, type Result } from "@domain/contracts/errors";
import { type Revision } from "@domain/contracts/versioning";
import { type TransactionContext } from "./unit-of-work";

export interface CampaignFilter {
  readonly includeArchived?: boolean;
}

export interface CampaignRepository {
  get(id: Uuid, context?: TransactionContext): Promise<Result<Campaign, AppError>>;
  list(filter?: CampaignFilter): Promise<Result<readonly Campaign[], AppError>>;
  save(campaign: Campaign, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;
  delete(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;
  /** Remove campanha e todo conteúdo vinculado em uma única transação. */
  deleteCampaignAndContent(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;

  getJournalEntry(id: Uuid, context?: TransactionContext): Promise<Result<JournalEntry, AppError>>;
  listJournalEntries(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly JournalEntry[], AppError>>;
  saveJournalEntry(entry: JournalEntry, context?: TransactionContext): Promise<Result<JournalEntry, AppError>>;
  deleteJournalEntry(id: Uuid, context?: TransactionContext): Promise<Result<void, AppError>>;

  getMap(id: Uuid, context?: TransactionContext): Promise<Result<MapRecord, AppError>>;
  listMaps(campaignId: Uuid, context?: TransactionContext): Promise<Result<readonly MapRecord[], AppError>>;
  saveMap(map: MapRecord, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;
  deleteMap(id: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;

  addMapPin(mapId: Uuid, pin: MapPin, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;
  updateMapPin(mapId: Uuid, pin: MapPin, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;
  removeMapPin(mapId: Uuid, pinId: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Revision, AppError>>;

  /** A revisão esperada é da campanha, que é o agregado dono da missão. */
  saveQuest(campaignId: Uuid, quest: Quest, expectedRevision: Revision, context?: TransactionContext): Promise<Result<Quest, AppError>>;
  deleteQuest(campaignId: Uuid, questId: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;

  saveNpc(campaignId: Uuid, npc: NpcRecord, expectedRevision: Revision, context?: TransactionContext): Promise<Result<NpcRecord, AppError>>;
  deleteNpc(campaignId: Uuid, npcId: Uuid, expectedRevision: Revision, context?: TransactionContext): Promise<Result<void, AppError>>;

  /** Falha em asset ou mapa aborta os dois (dados/persistencia.md, "commit único"). */
  importAtomic(input: {
    readonly map: MapRecord;
    readonly asset: Asset;
  }, context?: TransactionContext): Promise<Result<{ readonly map: MapRecord; readonly asset: Asset }, AppError>>;
}
