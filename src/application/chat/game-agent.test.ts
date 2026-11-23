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

describe("criaturas da campanha no Oráculo", () => {
  const hidden = { id: "c1", campaignId: mesa, kind: "enemy", name: "Vampiro Oculto", appearance: "", race: "", description: "", hitPoints: "144", armorClass: "16", abilities: "", notes: "é o prefeito", reveals: [], updatedAt: "" };
  function creatureAgent(role: "master" | "player" | undefined) {
    const calls: string[] = [];
    const sightings = [{ id: "s1", creatureId: "c2", campaignId: mesa, accountId: "u", kind: "animal", revealed: { name: "Lobo Cinzento", hitPoints: "11" }, updatedAt: "" }];
    const test = createGameChatAgent({
      currentUid: () => "u", pack: { manifest }, repository: { campaignRole: async () => role }, loadCatalog: async () => {}, compendium: { search: () => ({ entries: [] }) },
      creatures: { listCreatures: async () => { calls.push("elenco"); return { ok: true, value: [hidden] }; }, listSightings: async (_id: string, account: string) => { calls.push("avistamentos:" + account); return { ok: true, value: sightings }; } },
    } as unknown as Parameters<typeof createGameChatAgent>[0]);
    return { test, calls };
  }
  const campaignScope = { ...DEFAULT_CHAT_SCOPE, sheet: false, campaignId: mesa };

  it("mestre vê o elenco inteiro, com fonte", async () => {
    const { test, calls } = creatureAgent("master");
    const result = await test.invoke("u", { ...campaignScope, master: true }, "search_creatures", { sortBy: "hitPoints" });
    expect(calls).toEqual(["elenco"]);
    expect(result.content).toContain("Vampiro Oculto");
    expect(result.sources).toMatchObject([{ kind: "campaign", title: "Vampiro Oculto", locator: expect.stringContaining("registro do mestre") }]);
  });

  it.each([["por nome", { query: "vampiro" }], ["por PV", { sortBy: "hitPoints" }], ["tudo da campanha", { origin: "campaign", detail: true }], ["filtro de PV", { minHitPoints: 100 }], ["melhor por ND", { topPerChallenge: true, sortBy: "hitPoints" }]])("jogador não descobre criatura oculta (%s)", async (_name, input) => {
    const { test, calls } = creatureAgent("player");
    const result = await test.invoke("u", campaignScope, "search_creatures", input);
    expect(calls).toEqual(["avistamentos:u"]);
    expect(JSON.stringify(result)).not.toMatch(/Vampiro|144|prefeito/);
    expect(result.content).toMatch(/de [01] criaturas visíveis/);
  });

  it("jogador vê o que lhe foi revelado", async () => {
    const result = await creatureAgent("player").test.invoke("u", campaignScope, "search_creatures", { sortBy: "hitPoints" });
    expect(result.content).toContain("Lobo Cinzento");
    expect(result.sources).toMatchObject([{ title: "Lobo Cinzento", locator: expect.stringContaining("revelado a você") }]);
  });

  it("mestre em conversa aberta como jogador não recebe o elenco privado", async () => {
    const { test, calls } = creatureAgent("master");
    const result = await test.invoke("u", { ...campaignScope, master: false }, "search_creatures", {});
    expect(calls).toEqual(["avistamentos:u"]);
    expect(result.content).not.toContain("Vampiro");
  });

  it("sem campanha na conversa ou fora dela, não consulta o elenco", async () => {
    const none = creatureAgent("master");
    await none.test.invoke("u", { ...DEFAULT_CHAT_SCOPE, sheet: false }, "search_creatures", {});
    await none.test.invoke("u", { ...campaignScope, campaign: false, master: true }, "search_creatures", {});
    expect(none.calls).toEqual([]);
    const outsider = creatureAgent(undefined);
    await expect(outsider.test.invoke("u", campaignScope, "search_creatures", {})).rejects.toThrow("campanha");
    expect(outsider.calls).toEqual([]);
  });
});
