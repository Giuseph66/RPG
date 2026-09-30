import { describeCharacterChange, describeRoll, type CampaignLogDraft } from "@domain/campaign/log";
import { CAMPAIGN_LOG_LIMITS, type CampaignLogEntry } from "@domain/contracts/campaign-log";
import type { Character } from "@domain/contracts/character";
import type { DiceRoll } from "@domain/contracts/dice";
import type { IsoTimestamp } from "@domain/contracts/ids";
import type { CampaignLogPort } from "@application/ports/campaign-log";

export interface CampaignLogRecorderOptions {
  readonly port: CampaignLogPort;
  /** Conta Firebase atual; sem sessão nada é publicado. */
  readonly actorUid: () => string | undefined;
  readonly loadCharacter: (id: string) => Promise<Character | undefined>;
  readonly conditionName: (entityId: string) => string;
  readonly newId: () => string;
  readonly now: () => IsoTimestamp;
}

export interface CampaignLogRecorder {
  recordRoll(roll: DiceRoll): Promise<void>;
  recordCharacterChange(previous: Character | undefined, next: Character): Promise<void>;
}

/** Publica no histórico da campanha as rolagens e mudanças de estado das fichas vinculadas. */
export function createCampaignLogRecorder(options: CampaignLogRecorderOptions): CampaignLogRecorder {
  const { port, actorUid, loadCharacter, conditionName, newId, now } = options;

  async function publish(character: Character, drafts: readonly CampaignLogDraft[], ids: readonly string[]): Promise<void> {
    const uid = actorUid();
    if (!uid || !character.campaignId || drafts.length === 0) return;
    const createdAt = now();
    await Promise.all(drafts.map(async (draft, index) => {
      const entry: CampaignLogEntry = {
        ...draft,
        id: ids[index] ?? newId(),
        campaignId: String(character.campaignId),
        characterId: String(character.id),
        characterName: (character.name || "Personagem sem nome").slice(0, CAMPAIGN_LOG_LIMITS.characterName),
        actorUid: uid,
        byMaster: character.ownerUid !== undefined && character.ownerUid !== uid,
        createdAt,
      };
      try {
        await port.append(entry);
      } catch (cause) {
        console.warn("[sync] Histórico da mesa não recebeu a entrada", { kind: entry.kind, campaignId: entry.campaignId, cause });
      }
    }));
  }

  return {
    async recordRoll(roll) {
      if (!roll.characterId || !actorUid()) return;
      const character = await loadCharacter(String(roll.characterId));
      // O ID da rolagem vira o ID da entrada: a mesma rolagem nunca aparece duas vezes.
      if (character) await publish(character, [describeRoll(roll)], [`roll-${roll.id}`]);
    },
    async recordCharacterChange(previous, next) {
      if (!actorUid() || !next.campaignId) return;
      const drafts = describeCharacterChange(previous, next, conditionName);
      await publish(next, drafts, drafts.map(() => newId()));
    },
  };
}
