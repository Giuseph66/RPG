import type { Campaign, NpcRecord, Quest } from "@domain/contracts/campaign";
import { CAMPAIGN_SCHEMA_VERSION } from "@domain/contracts/campaign";
import { asRevision } from "@domain/contracts/versioning";

import { validateCampaignContent, validateNpcContent, validateQuestContent } from "./validation";
import type { CampaignDeletionPlan, CampaignDeletionRequest, CreateCampaignInput, JournalResult } from "./types";

export function createCampaign(input: CreateCampaignInput): JournalResult<Campaign> {
  const settings = {
    optionalRules: [...(input.optionalRules ?? [])],
    abilityGenerationMethod: input.abilityGenerationMethod ?? "standard-array",
    advancementMethod: input.advancementMethod ?? "milestone",
  } as const;
  const campaign: Campaign = {
    id: input.id,
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    revision: asRevision(0),
    name: input.name,
    description: input.description ?? "",
    rulesetRef: input.rulesetRef,
    characterIds: [...(input.characterIds ?? [])],
    sessionCounter: 0,
    npcs: [],
    quests: [],
    objectives: [],
    settings,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
  };
  const valid = validateCampaignContent(campaign);
  return valid.ok ? { ok: true, value: campaign } : valid;
}

export function updateCampaign(campaign: Campaign, patch: Partial<Pick<Campaign, "name" | "description" | "characterIds" | "objectives" | "settings">>): JournalResult<Campaign> {
  const next = { ...campaign, ...patch, characterIds: patch.characterIds ? [...patch.characterIds] : [...campaign.characterIds], objectives: patch.objectives ? [...patch.objectives] : [...campaign.objectives] };
  const valid = validateCampaignContent(next);
  return valid.ok ? { ok: true, value: next } : valid;
}

export function createQuest(input: Quest): JournalResult<Quest> {
  const valid = validateQuestContent(input);
  return valid.ok ? { ok: true, value: { ...input, linkedEntityIds: [...input.linkedEntityIds] } } : valid;
}

export function updateQuest(campaign: Campaign, questId: string, patch: Partial<Pick<Quest, "title" | "description" | "status" | "linkedEntityIds" | "updatedAt">>): JournalResult<Campaign> {
  const quest = campaign.quests.find((candidate) => String(candidate.id) === questId);
  if (!quest) return { ok: false, error: { code: "validation-error", field: "questId", message: "Missão não encontrada nesta campanha." } };
  const nextQuest = { ...quest, ...patch, linkedEntityIds: patch.linkedEntityIds ? [...patch.linkedEntityIds] : [...quest.linkedEntityIds] };
  const valid = validateQuestContent(nextQuest);
  if (!valid.ok) return valid;
  return { ok: true, value: { ...campaign, quests: campaign.quests.map((candidate) => candidate.id === quest.id ? nextQuest : candidate) } };
}

export function createNpc(input: NpcRecord): JournalResult<NpcRecord> {
  const valid = validateNpcContent(input);
  return valid.ok ? { ok: true, value: { ...input, linkedEntityIds: [...input.linkedEntityIds] } } : valid;
}

export function updateNpc(campaign: Campaign, npcId: string, patch: Partial<Pick<NpcRecord, "name" | "description" | "linkedEntityIds" | "characterRef" | "updatedAt">>): JournalResult<Campaign> {
  const npc = campaign.npcs.find((candidate) => String(candidate.id) === npcId);
  if (!npc) return { ok: false, error: { code: "validation-error", field: "npcId", message: "NPC não encontrado nesta campanha." } };
  const nextNpc = { ...npc, ...patch, linkedEntityIds: patch.linkedEntityIds ? [...patch.linkedEntityIds] : [...npc.linkedEntityIds] };
  const valid = validateNpcContent(nextNpc);
  if (!valid.ok) return valid;
  return { ok: true, value: { ...campaign, npcs: campaign.npcs.map((candidate) => candidate.id === npc.id ? nextNpc : candidate) } };
}

export function completeQuest(campaign: Campaign, questId: string, updatedAt: Quest["updatedAt"]): JournalResult<Campaign> {
  return updateQuest(campaign, questId, { status: "completed", updatedAt });
}

export function prepareCampaignDeletion(request: CampaignDeletionRequest): JournalResult<CampaignDeletionPlan> {
  if (!request.scope) return { ok: false, error: { code: "deletion-scope-required", field: "scope", message: "Escolha se a exclusão alcança a campanha e seu conteúdo." } };
  if (request.backupConfirmed !== true) return { ok: false, error: { code: "backup-confirmation-required", field: "backupConfirmed", message: "Confirme o backup ou a decisão de excluir sem backup." } };
  return { ok: true, value: { ...request, scope: request.scope, backupConfirmed: true } };
}

export const requestCampaignDeletion = prepareCampaignDeletion;
