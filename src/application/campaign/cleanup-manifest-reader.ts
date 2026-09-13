import { type AssetRepository } from "@application/ports/asset-repository";
import { type CampaignRepository } from "@application/ports/campaign-repository";
import { type CharacterRepository } from "@application/ports/character-repository";
import { type SessionRepository } from "@application/ports/session-repository";
import { type TransactionContext } from "@application/ports/unit-of-work";
import { type MembershipRepository } from "@application/membership/ports";
import { appError, err, ok, type AppError, type Result } from "@domain/contracts/errors";
import { type Uuid } from "@domain/contracts/ids";
import { asRevision } from "@domain/contracts/versioning";
import {
  type CampaignCleanupAsset,
  type CampaignCleanupManifest,
} from "@domain/contracts/cloud-sync";
import {
  type CampaignCleanupManifestReader,
} from "@application/sync/campaign-cleanup";

export interface LocalCampaignCleanupManifestReaderOptions {
  readonly campaigns: Pick<CampaignRepository, "get" | "listJournalEntries" | "listMaps">;
  readonly characters: Pick<CharacterRepository, "list">;
  readonly memberships: Pick<MembershipRepository, "listMemberships">;
  readonly sessions: Pick<SessionRepository, "list">;
  readonly assets: Pick<AssetRepository, "get">;
  /** Firebase UID when signed in, otherwise the stable local device account. */
  readonly ownerUid: string | (() => string);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function owner(options: LocalCampaignCleanupManifestReaderOptions): string {
  return typeof options.ownerUid === "function" ? options.ownerUid() : options.ownerUid;
}

function assetSha256(hash: string, ownerUid: string): Result<string, AppError> {
  // Hashes are captured synchronously: awaiting Web Crypto here would allow the
  // IndexedDB transaction context to autocommit before campaign deletion. Legacy
  // local-only records may carry the old short hash; they cannot be sent to cloud,
  // but remain deletable while signed out because the gated outbox discards them.
  if (/^[a-f0-9]{64}$/.test(hash) || ownerUid.startsWith("local-")) return ok(hash);
  return err(appError.storageUnavailable("Asset sem hash SHA-256; limpeza cloud será retomada após sua identificação."));
}

/**
 * Captures only local references belonging to one campaign. Every repository read receives
 * the caller's transaction context, so the manifest describes the same snapshot that the
 * subsequent campaign deletion removes.
 */
export function createLocalCampaignCleanupManifestReader(
  options: LocalCampaignCleanupManifestReaderOptions,
): CampaignCleanupManifestReader {
  return {
    async read(campaignId: Uuid, campaignRevision: number, context?: TransactionContext): Promise<Result<CampaignCleanupManifest, AppError>> {
      const [campaign, characters, journal, maps, memberships, sessions] = await Promise.all([
        options.campaigns.get(campaignId, context),
        options.characters.list({ campaignId }, context),
        options.campaigns.listJournalEntries(campaignId, context),
        options.campaigns.listMaps(campaignId, context),
        options.memberships.listMemberships(campaignId, context),
        options.sessions.list(campaignId, context),
      ]);
      if (!campaign.ok) return campaign;
      if (campaign.value.revision !== campaignRevision) {
        return err(appError.conflict(asRevision(campaignRevision), campaign.value.revision));
      }
      if (!characters.ok) return characters;
      if (!journal.ok) return journal;
      if (!maps.ok) return maps;
      if (!memberships.ok) return memberships;
      if (!sessions.ok) return sessions;

      const characterIds = uniqueStrings([
        ...campaign.value.characterIds,
        ...characters.value.map((character) => character.id),
      ]);
      const memberAccountIds = uniqueStrings(memberships.value.map((membership) => membership.accountId));
      const journalIds = uniqueStrings(journal.value.map((entry) => entry.id));
      const mapIds = uniqueStrings(maps.value.map((map) => map.id));
      const sessionIds = uniqueStrings(sessions.value.map((session) => session.id));
      const assetIds = uniqueStrings([
        ...maps.value.map((map) => map.assetId),
        ...characters.value.flatMap((character) => character.portraitAssetId ? [character.portraitAssetId] : []),
      ]);
      const assets: CampaignCleanupAsset[] = [];
      const cleanupOwner = owner(options);
      if (cleanupOwner.trim().length === 0) return err(appError.validation("ownerUid", "Dono da limpeza não pode ser vazio."));
      for (const assetId of assetIds) {
        const asset = await options.assets.get(assetId as Uuid, context);
        if (!asset.ok) return asset;
        const digest = assetSha256(asset.value.hash, cleanupOwner);
        if (!digest.ok) return digest;
        assets.push({
          assetId,
          ownerUid: cleanupOwner,
          campaignId,
          firestorePath: `assets/${assetId}`,
          storagePath: `campaigns/${campaignId}/assets/${assetId}`,
          sha256: digest.value,
        });
      }

      return ok({
        schemaVersion: 1,
        campaignId,
        campaignRevision: asRevision(campaignRevision),
        memberAccountIds,
        characterIds,
        journalIds,
        mapIds,
        sessionIds,
        assets,
      });
    },
  };
}
