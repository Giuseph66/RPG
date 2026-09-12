import type { JournalEntry } from "@domain/contracts/campaign";

import { validateJournalEntryInput, validateJournalEntryPatch } from "./validation";
import type { JournalDraft, JournalDraftState, JournalEntryInput, JournalEntryPatch, JournalLinkStatus, JournalResult } from "./types";
import type { Revision } from "@domain/contracts/versioning";

export function createJournalEntry(input: JournalEntryInput): JournalResult<JournalEntry> {
  const valid = validateJournalEntryInput(input);
  if (!valid.ok) return valid;
  return { ok: true, value: { ...valid.value, linkedEntityIds: [...(valid.value.linkedEntityIds ?? [])], tags: [...(valid.value.tags ?? [])], updatedAt: valid.value.updatedAt ?? valid.value.createdAt } };
}

export function updateJournalEntry(entry: JournalEntry, patch: JournalEntryPatch): JournalResult<JournalEntry> {
  const valid = validateJournalEntryPatch(patch);
  if (!valid.ok) return valid;
  const next = { ...entry, ...valid.value, linkedEntityIds: valid.value.linkedEntityIds ? [...valid.value.linkedEntityIds] : [...entry.linkedEntityIds], tags: valid.value.tags ? [...valid.value.tags] : [...entry.tags] };
  return { ok: true, value: next };
}

export function draftFromJournalEntry(entry: JournalEntry): JournalDraft {
  return { campaignId: entry.campaignId, entryId: entry.id, title: entry.title, body: entry.body, sessionNumber: entry.sessionNumber, gameDate: entry.gameDate, linkedEntityIds: [...entry.linkedEntityIds], tags: [...entry.tags] };
}

export function createJournalDraft(campaignId: JournalEntry["campaignId"], entry?: JournalEntry): JournalDraft {
  return entry ? draftFromJournalEntry(entry) : { campaignId, title: "", body: "", linkedEntityIds: [], tags: [] };
}

export function updateJournalDraft(state: JournalDraftState, patch: Partial<JournalDraft>): JournalDraftState {
  return { ...state, draft: { ...state.draft, ...patch, linkedEntityIds: patch.linkedEntityIds ? [...patch.linkedEntityIds] : [...state.draft.linkedEntityIds], tags: patch.tags ? [...patch.tags] : [...state.draft.tags] }, status: "dirty", error: undefined };
}

export function markDraftSaving(state: JournalDraftState): JournalDraftState { return { ...state, status: "saving", error: undefined }; }
export function markDraftSaved(state: JournalDraftState, saved: JournalEntry): JournalDraftState { return { ...state, draft: draftFromJournalEntry(saved), status: "saved", error: undefined }; }
export function markDraftError(state: JournalDraftState, message: string): JournalDraftState { return { ...state, status: "error", error: message }; }
export function markDraftConflict(state: JournalDraftState, message = "O registro mudou em outra aba."): JournalDraftState { return { ...state, status: "conflict", error: message }; }

export function checkJournalRevision(expectedRevision: Revision, actualRevision: Revision): JournalResult<void> {
  return expectedRevision === actualRevision ? { ok: true, value: undefined } : { ok: false, error: { code: "conflict", field: "revision", expectedRevision, actualRevision, message: "O registro mudou em outra aba; recarregue antes de salvar." } };
}

export function resolveJournalLinks(entry: Pick<JournalEntry, "linkedEntityIds">, known: ReadonlyMap<string, Pick<JournalLinkStatus, "label" | "kind">>): readonly JournalLinkStatus[] {
  return entry.linkedEntityIds.map((id) => { const linked = known.get(String(id)); return linked ? { id, exists: true, ...linked } : { id, exists: false }; });
}

export function validateJournalDraft(draft: JournalDraft): JournalResult<JournalDraft> {
  const valid = validateJournalEntryInput({ id: draft.entryId ?? ("draft" as never), campaignId: draft.campaignId, title: draft.title, body: draft.body, sessionNumber: draft.sessionNumber, gameDate: draft.gameDate, linkedEntityIds: draft.linkedEntityIds, tags: draft.tags, createdAt: "1970-01-01T00:00:00.000Z" as never });
  return valid.ok ? { ok: true, value: draft } : valid;
}
