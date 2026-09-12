import type { Campaign, JournalEntry, NpcRecord, Quest } from "@domain/contracts/campaign";
import { type JournalDomainError, type JournalEntryInput, type JournalEntryPatch, type JournalResult } from "./types";

function validation(field: string, message: string): JournalDomainError {
  return { code: "validation-error", field, message };
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => character !== "\n" && character !== "\t" && character.charCodeAt(0) < 32);
}

function validateText(value: string, field: string, required: boolean): JournalDomainError | undefined {
  if (typeof value !== "string" || (required && value.trim().length === 0)) return validation(field, required ? "O campo é obrigatório." : "O campo deve ser texto.");
  if (containsControlCharacter(value)) return validation(field, "O texto contém caracteres de controle inválidos.");
  return undefined;
}

function uniqueIds(ids: readonly string[], field: "linkedEntityIds"): JournalDomainError | undefined {
  if (new Set(ids).size !== ids.length) return validation(field, "Referências duplicadas não são permitidas.");
  if (ids.some((id) => typeof id !== "string" || id.trim().length === 0)) return validation(field, "As referências devem ter IDs não vazios.");
  return undefined;
}

export function validateJournalEntryInput(input: JournalEntryInput): JournalResult<JournalEntryInput> {
  const titleError = validateText(input.title, "title", true);
  if (titleError) return { ok: false, error: titleError };
  const bodyError = validateText(input.body, "body", false);
  if (bodyError) return { ok: false, error: bodyError };
  if (input.sessionNumber !== undefined && (!Number.isInteger(input.sessionNumber) || input.sessionNumber < 1)) return { ok: false, error: validation("sessionNumber", "A sessão deve ser um inteiro maior que zero.") };
  if (input.linkedEntityIds !== undefined && !Array.isArray(input.linkedEntityIds)) return { ok: false, error: validation("linkedEntityIds", "Os vínculos devem ser uma lista de IDs.") };
  if (input.tags !== undefined && !Array.isArray(input.tags)) return { ok: false, error: validation("tags", "As tags devem ser uma lista de textos.") };
  const ids = input.linkedEntityIds ?? [];
  const idError = uniqueIds(ids.map(String), "linkedEntityIds");
  if (idError) return { ok: false, error: idError };
  if ((input.tags ?? []).some((tag) => typeof tag !== "string" || tag.trim().length === 0)) return { ok: false, error: validation("tags", "Tags não podem ser vazias.") };
  return { ok: true, value: { ...input, linkedEntityIds: [...ids], tags: [...(input.tags ?? [])] } };
}

export function validateJournalEntryPatch(patch: JournalEntryPatch): JournalResult<JournalEntryPatch> {
  if (patch.title !== undefined) { const error = validateText(patch.title, "title", true); if (error) return { ok: false, error }; }
  if (patch.body !== undefined) { const error = validateText(patch.body, "body", false); if (error) return { ok: false, error }; }
  if (patch.sessionNumber !== undefined && (!Number.isInteger(patch.sessionNumber) || patch.sessionNumber < 1)) return { ok: false, error: validation("sessionNumber", "A sessão deve ser um inteiro maior que zero.") };
  if (patch.linkedEntityIds !== undefined && !Array.isArray(patch.linkedEntityIds)) return { ok: false, error: validation("linkedEntityIds", "Os vínculos devem ser uma lista de IDs.") };
  if (patch.tags !== undefined && !Array.isArray(patch.tags)) return { ok: false, error: validation("tags", "As tags devem ser uma lista de textos.") };
  const idError = patch.linkedEntityIds === undefined ? undefined : uniqueIds(patch.linkedEntityIds.map(String), "linkedEntityIds");
  if (idError) return { ok: false, error: idError };
  if (patch.tags?.some((tag) => typeof tag !== "string" || tag.trim().length === 0)) return { ok: false, error: validation("tags", "Tags não podem ser vazias.") };
  return { ok: true, value: patch };
}

export function validateCampaignContent(campaign: Pick<Campaign, "name" | "description" | "characterIds" | "objectives">): JournalResult<typeof campaign> {
  const nameError = validateText(campaign.name, "name", true);
  if (nameError) return { ok: false, error: nameError };
  const descriptionError = validateText(campaign.description, "description", false);
  if (descriptionError) return { ok: false, error: descriptionError };
  if (!Array.isArray(campaign.characterIds)) return { ok: false, error: validation("characterIds", "Personagens devem ser uma lista de IDs.") };
  if (!Array.isArray(campaign.objectives)) return { ok: false, error: validation("objectives", "Objetivos devem ser uma lista de textos.") };
  if (new Set(campaign.characterIds.map(String)).size !== campaign.characterIds.length) return { ok: false, error: validation("characterIds", "Personagens duplicados não são permitidos.") };
  if (campaign.objectives.some((objective) => typeof objective !== "string")) return { ok: false, error: validation("objectives", "Objetivos devem ser textos.") };
  return { ok: true, value: campaign };
}

export function validateQuestContent(quest: Pick<Quest, "title" | "description">): JournalResult<typeof quest> {
  const titleError = validateText(quest.title, "title", true);
  if (titleError) return { ok: false, error: titleError };
  const descriptionError = validateText(quest.description, "description", false);
  return descriptionError ? { ok: false, error: descriptionError } : { ok: true, value: quest };
}

export function validateNpcContent(npc: Pick<NpcRecord, "name" | "description">): JournalResult<typeof npc> {
  const nameError = validateText(npc.name, "name", true);
  if (nameError) return { ok: false, error: nameError };
  const descriptionError = validateText(npc.description, "description", false);
  return descriptionError ? { ok: false, error: descriptionError } : { ok: true, value: npc };
}

export function isPlainText(value: string): boolean {
  return !containsControlCharacter(value);
}
