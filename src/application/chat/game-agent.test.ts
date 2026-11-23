// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ChatSheetUnavailableError, DEFAULT_CHAT_SCOPE } from "@application/ports/chat-agent";
import { createGameChatAgent } from "./game-agent";

const sheetId = "11111111-1111-4111-8111-111111111111", mesa = "22222222-2222-4222-8222-222222222222", outra = "33333333-3333-4333-8333-333333333333";
const manifest = { id: "r", version: "1" };
function agent(sheet: { ownerUid?: string; campaignId?: string } | undefined, role?: "master" | "player") {
  const item = sheet && { id: sheetId, name: "Bruxo", rulesetRef: manifest, pendingResolutions: [], revision: 1, updatedAt: "", ...sheet };
  return createGameChatAgent({
    currentUid: () => "u", pack: { manifest }, repository: { campaignRole: async () => role },
    services: {
      character: { get: async () => item ? { ok: true, value: item } : { ok: false, error: { code: "not-found", message: "x" } }, store: { getSnapshot: () => ({ value: undefined }) } },
      campaign: { list: async () => ({ ok: true, value: [{ id: mesa, name: "Mesa" }] }), store: {} },
    },
    characters: { list: async () => ({ ok: true, value: item ? [item] : [] }) },
    campaigns: { get: async () => ({ ok: true, value: { id: mesa, name: "Mesa", rulesetRef: manifest, revision: 1 } }) },
  } as unknown as Parameters<typeof createGameChatAgent>[0]);
}
const scope = { ...DEFAULT_CHAT_SCOPE, characterId: sheetId };

describe("acesso do Oráculo à ficha", () => {
  it.each([
    ["própria", { ownerUid: "u" }, undefined, scope],
    ["criada neste aparelho antes do login", {}, undefined, scope],
    ["de jogador, para o mestre da campanha", { ownerUid: "outro", campaignId: mesa }, "master" as const, { ...scope, campaignId: mesa }],
  ])("permite a ficha %s", async (_name, sheet, role, value) => {
    const test = agent(sheet, role);
    await expect(test.context("u", value)).resolves.toBeTruthy();
    expect((await test.options("u")).characters).toHaveLength(1);
  });

  it.each([
    ["de outro jogador", { ownerUid: "outro", campaignId: mesa }, "player" as const],
    ["que saiu da campanha do mestre", { ownerUid: "outro" }, "master" as const],
    ["própria, movida para outra campanha", { ownerUid: "u", campaignId: outra }, "player" as const],
    ["removida", undefined, "master" as const],
  ])("não usa a ficha %s", async (_name, sheet, role) => {
    await expect(agent(sheet, role).context("u", { ...scope, campaignId: mesa })).rejects.toBeInstanceOf(ChatSheetUnavailableError);
  });
});
