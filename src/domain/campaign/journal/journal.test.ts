import { describe, expect, it } from "vitest";

import { asPackVersion, asRevision, asRulesetId, asUuid } from "@domain/contracts";

import {
  checkJournalRevision,
  completeQuest,
  createCampaign,
  createJournalDraft,
  createJournalEntry,
  createNpc,
  createQuest,
  draftFromJournalEntry,
  markDraftConflict,
  prepareCampaignDeletion,
  resolveJournalLinks,
  updateJournalDraft,
  updateJournalEntry,
} from "./index";
import type { JournalResult } from "./index";

const campaignId = asUuid("00000000-0000-4000-8000-000000000001");
const entryId = asUuid("00000000-0000-4000-8000-000000000002");
const questId = asUuid("00000000-0000-4000-8000-000000000003");
const npcId = asUuid("00000000-0000-4000-8000-000000000004");
const timestamp = "2026-01-01T00:00:00.000Z" as never;
const rulesetRef = { id: asRulesetId("phb"), version: asPackVersion("1.0.0") };

function entry(body = "Resumo da sessão") {
  return valueOf(createJournalEntry({ id: entryId, campaignId, title: "Sessão um", body, linkedEntityIds: [npcId], tags: ["início"], createdAt: timestamp }));
}

function valueOf<T>(result: JournalResult<T>): T { if (!result.ok) throw new Error(result.error.message); return result.value; }

describe("campaign journal domain", () => {
  it("creates, edits and reloads a draft without interpreting text as markup", () => {
    const original = entry("<b>texto local</b>");
    const draft = createJournalDraft(campaignId, original);
    const changed = updateJournalDraft({ draft, status: "clean" }, { body: "<script>alert(1)</script>" });
    expect(changed.draft.body).toContain("<script>");
    expect(draftFromJournalEntry(original).title).toBe("Sessão um");
    expect(valueOf(updateJournalEntry(original, { title: "Sessão atualizada" }))).toMatchObject({ body: "<b>texto local</b>" });
  });

  it("marks absent links explicitly and detects concurrent revisions", () => {
    const statuses = resolveJournalLinks({ linkedEntityIds: [npcId, questId] }, new Map([[String(npcId), { label: "Guarda", kind: "npc" }]]));
    expect(statuses).toEqual([{ id: npcId, exists: true, label: "Guarda", kind: "npc" }, { id: questId, exists: false }]);
    expect(checkJournalRevision(asRevision(1), asRevision(2))).toMatchObject({ ok: false, error: { code: "conflict" } });
    expect(markDraftConflict({ draft: createJournalDraft(campaignId), status: "dirty" }).status).toBe("conflict");
  });

  it("requires an explicit deletion scope and backup decision", () => {
    expect(prepareCampaignDeletion({ campaignId })).toMatchObject({ ok: false, error: { code: "deletion-scope-required" } });
    expect(prepareCampaignDeletion({ campaignId, scope: "campaign-and-content" })).toMatchObject({ ok: false, error: { code: "backup-confirmation-required" } });
    expect(prepareCampaignDeletion({ campaignId, scope: "campaign-and-content", backupConfirmed: true })).toMatchObject({ ok: true, value: { scope: "campaign-and-content", backupConfirmed: true } });
  });

  it("keeps quest completion as narrative state without XP side effects", () => {
    const campaign = valueOf(createCampaign({ id: campaignId, name: "Costa", rulesetRef, createdAt: timestamp }));
    const quest = valueOf(createQuest({ id: questId, title: "Encontrar a ponte", description: "Localizar a ponte", status: "active", linkedEntityIds: [], createdAt: timestamp, updatedAt: timestamp }));
    const npc = valueOf(createNpc({ id: npcId, name: "Guarda", description: "Vigia o portão", linkedEntityIds: [], createdAt: timestamp, updatedAt: timestamp }));
    const withRecords = { ...campaign, quests: [quest], npcs: [npc] };
    const completed = valueOf(completeQuest(withRecords, String(questId), timestamp));
    expect(completed.quests[0].status).toBe("completed");
    expect(completed).not.toHaveProperty("xp");
  });

  it("rejects malformed journal content", () => {
    expect(createJournalEntry({ id: entryId, campaignId, title: "", body: "texto", createdAt: timestamp })).toMatchObject({ ok: false, error: { code: "validation-error", field: "title" } });
    expect(createJournalEntry({ id: entryId, campaignId, title: "Título", body: "inválido\u0000", createdAt: timestamp })).toMatchObject({ ok: false, error: { code: "validation-error", field: "body" } });
    expect(createJournalEntry({ id: entryId, campaignId, title: "Título", body: "ok", tags: "quebrado" as never, createdAt: timestamp })).toMatchObject({ ok: false, error: { code: "validation-error", field: "tags" } });
  });
});
