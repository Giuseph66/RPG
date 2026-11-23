// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRequestError, type ChatClient, type ChatCredential, type ChatMessage, type ChatRepository } from "@application/ports/chat";
import { ChatSheetUnavailableError, DEFAULT_CHAT_SCOPE, type ChatAgent, type ChatCompletion, type ChatModelMessage, type ChatScope } from "@application/ports/chat-agent";
import { createChatService } from "./service";

const scope = { ...DEFAULT_CHAT_SCOPE, memory: false };
const reply = (content: string): ChatCompletion => ({ content, tools: [], tokens: 1 });

function setup(ids: string[], answer: (key: string, call: number, messages: readonly ChatModelMessage[], model: string) => ChatCompletion, overrides: Partial<ChatRepository> = {}) {
  const keys: ChatCredential[] = ids.map((id, index) => ({ id, ownerUid: id, label: id, apiKey: "key-" + id, status: "active", cooldownUntil: 0, createdAt: index }));
  const messages: ChatMessage[] = [], used: string[] = [], models: string[] = [], states: unknown[][] = [];
  const repository = {
    listCredentials: async () => keys,
    setCredentialState: async (key: ChatCredential, status: ChatCredential["status"], cooldownUntil: number) => { states.push([key.id, status, cooldownUntil]); Object.assign(keys.find((item) => item.id === key.id)!, { status, cooldownUntil }); },
    getConversation: async () => ({ id: "c", title: "t", preview: "", updatedAt: 0, scope }),
    recentMessages: async () => [...messages],
    appendMessage: async (_uid: string, _id: string, role: ChatMessage["role"], content: string, metadata?: { id?: string }) => { messages.push({ id: metadata!.id!, role, content, createdAt: messages.length }); return metadata!.id!; },
    saveCredential: vi.fn(async () => {}),
    ...overrides,
  } as unknown as ChatRepository;
  const agent = { context: async () => ({ scope, text: "" }), tools: () => [{ type: "function", function: { name: "search_rules", description: "", parameters: {} } }], invoke: async () => ({ content: "regra" }) } as unknown as ChatAgent;
  let calls = 0;
  const client: ChatClient = { turn: async (apiKey, history, _tools, _signal, _onText, _force, _report, model) => { used.push(apiKey.slice(4)); models.push(model!); return answer(apiKey.slice(4), ++calls, history, model!); } };
  return { service: createChatService(repository, client, () => "u", agent), used, models, states, messages, repository, keys };
}
const fail = (kind: ChatRequestError["kind"], retryAfterMs?: number): never => { throw new ChatRequestError(kind, 0, kind, retryAfterMs); };

beforeEach(() => { vi.restoreAllMocks(); });

describe("pool de chaves do Oráculo", () => {
  it("coloca a chave limitada em espera e responde com a próxima", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("cooldown", 30_000) : reply("ok"));
    const usage = vi.fn();
    await test.service.send("u", "c", "oi", { onUsage: usage });
    expect(test.used).toEqual(["a", "b"]);
    expect(test.states).toEqual([["a", "cooldown", expect.any(Number)]]);
    expect(test.messages.at(-1)?.content).toBe("ok");
    expect(usage).toHaveBeenCalledWith(expect.objectContaining({ credentialId: "a", limited: true, cooldownUntil: expect.any(Number) }));
    await test.service.send("u", "c", "de novo");
    expect(test.used).toEqual(["a", "b", "b"]);
  });

  it("marca só a chave inválida", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("invalid") : reply("ok"));
    await test.service.send("u", "c", "oi");
    expect(test.states).toEqual([["a", "invalid", 0]]);
  });

  it("limita a espera ao que o Firestore aceita", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("cooldown", 86_400_000) : reply("ok"));
    await test.service.send("u", "c", "oi");
    expect(test.states[0][2]).toBeLessThan(Date.now() + 3_600_000);
  });

  it("continua na próxima chave mesmo sem conseguir gravar o estado", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("cooldown") : reply("ok"), { setCredentialState: async () => { throw new Error("permission-denied"); } });
    await test.service.send("u", "c", "oi");
    expect(test.messages.at(-1)?.content).toBe("ok");
  });

  it("não troca nem marca chaves quando o problema é o pedido", async () => {
    const test = setup(["a", "b"], () => fail("rejected"));
    await expect(test.service.send("u", "c", "oi")).rejects.toThrow("rejected");
    expect(test.used).toEqual(["a"]);
    expect(test.states).toEqual([]);
  });

  it("repete o pool com intervalo em falhas temporárias, sem marcar chaves", async () => {
    vi.useFakeTimers();
    try {
      const test = setup(["a", "b"], (_key, call) => call < 3 ? fail("transient") : reply("ok"));
      const sending = test.service.send("u", "c", "oi");
      await vi.runAllTimersAsync();
      await sending;
      expect(test.used).toEqual(["a", "b", "a"]);
      expect(test.states).toEqual([]);
    } finally { vi.useRealTimers(); }
  });

  it("desiste após três falhas temporárias no total", async () => {
    vi.useFakeTimers();
    try {
      const test = setup(["a", "b", "c", "d"], () => fail("transient"));
      const sending = expect(test.service.send("u", "c", "oi")).rejects.toThrow("transient");
      await vi.runAllTimersAsync();
      await sending;
      expect(test.used).toEqual(["a", "b", "c"]);
    } finally { vi.useRealTimers(); }
  });

  it("cancela durante o intervalo de repetição", async () => {
    const controller = new AbortController();
    const test = setup(["a"], () => { setTimeout(() => controller.abort(), 20); return fail("transient"); });
    await expect(test.service.send("u", "c", "oi", { signal: controller.signal })).rejects.toThrow();
    expect(test.used).toEqual(["a"]);
  });

  it("devolve ao modelo o turno original e todos os resultados, mesmo trocando de chave no meio", async () => {
    const native = [{ functionCall: { id: "1" }, thoughtSignature: "S" }];
    let history: readonly ChatModelMessage[] = [];
    const call = (id: string) => ({ id, type: "function" as const, function: { name: "search_rules", arguments: "{}" } });
    const test = setup(["a", "b"], (key, number, messages) => {
      if (number === 1) return { content: "", tools: [call("1"), call("2")], tokens: 1, native };
      if (key === "a") return fail("cooldown");
      history = [...messages];
      return reply("fim");
    });
    await test.service.send("u", "c", "oi");
    expect(test.used).toEqual(["a", "a", "b"]);
    expect(history.slice(-3)).toEqual([expect.objectContaining({ role: "assistant", native }), expect.objectContaining({ role: "tool", tool_call_id: "1" }), expect.objectContaining({ role: "tool", tool_call_id: "2" })]);
    expect(test.messages.at(-1)?.content).toBe("fim");
  });

  it("valida e oculta chaves", async () => {
    const test = setup(["a"], () => reply("ok"));
    await expect(test.service.saveCredential("u", "n", "gsk_" + "x".repeat(40))).rejects.toThrow(/outro serviço/);
    await expect(test.service.saveCredential("u", "n", "AIza com espaço no meio da chave")).rejects.toThrow(/válida/);
    await test.service.saveCredential("u", "n", "  AQ." + "x".repeat(40) + "\n");
    expect(test.repository.saveCredential).toHaveBeenCalledWith("u", "n", "AQ." + "x".repeat(40), undefined);
    await test.service.send("u", "c", "minha chave AIza" + "x".repeat(35) + " e AQ." + "y".repeat(40));
    expect(test.messages[0].content).toBe("minha chave [chave ocultada] e [chave ocultada]");
  });

  it("responde sem a ficha quando a vinculada à conversa deixou de ser acessível", async () => {
    let history: readonly ChatModelMessage[] = [], saved: { trace?: { notices?: readonly string[] } } | undefined;
    const pinned = { ...scope, characterId: "ficha", campaignId: "mesa" };
    const test = setup(["a"], (_key, _call, messages) => { history = [...messages]; return reply("ok"); }, { getConversation: async () => ({ id: "c", title: "t", preview: "", updatedAt: 0, scope: pinned }) });
    const append = test.repository.appendMessage;
    test.repository.appendMessage = async (uid, id, role, content, metadata) => { if (role === "assistant") saved = metadata; return append(uid, id, role, content, metadata); };
    const seen: ChatScope[] = [];
    test.service.agent.context = async (_uid, value) => { if (value.characterId) throw new ChatSheetUnavailableError("A ficha saiu."); seen.push(value); return { scope: value, text: "" }; };
    await test.service.send("u", "c", "oi");
    expect(test.messages.at(-1)?.content).toBe("ok");
    expect(seen.every((item) => !item.sheet && item.campaignId === "mesa")).toBe(true);
    expect(saved?.trace?.notices?.[0]).toMatch(/A ficha saiu\./);
    expect(history[0].content).toContain("não suponha dados dela");
  });

  it("continua recusando a conversa quando falta outra permissão", async () => {
    const test = setup(["a"], () => reply("ok"));
    test.service.agent.context = async () => { throw new Error("Você não tem acesso a esta campanha."); };
    await expect(test.service.send("u", "c", "oi")).rejects.toThrow("campanha");
    expect(test.used).toEqual([]);
  });

  const main = "gemini-4-hydrogen", second = "gemini-3.8-flash", third = "gemini-3.5-flash-lite";
  it("usa o modelo reserva na sobrecarga, com a mesma chave e até o fim da resposta", async () => {
    vi.useFakeTimers();
    try {
      let saved: { trace?: { model?: string; notices?: readonly string[] } } | undefined;
      const test = setup(["a"], (_key, number, _messages, model) => model === main ? fail("transient") : number === 2 ? { content: "", tools: [{ id: "1", type: "function", function: { name: "search_rules", arguments: "{}" } }], tokens: 1 } : reply("ok"));
      const append = test.repository.appendMessage;
      test.repository.appendMessage = async (uid, id, role, content, metadata) => { if (role === "assistant") saved = metadata; return append(uid, id, role, content, metadata); };
      const sending = test.service.send("u", "c", "oi");
      await vi.runAllTimersAsync();
      await sending;
      expect(test.models).toEqual([main, second, second]);
      expect(saved?.trace?.model).toBe(second);
      expect(saved?.trace?.notices?.join()).toContain("modelo reserva gemini-3.8-flash");
      const next = test.service.send("u", "c", "de novo");
      await vi.runAllTimersAsync();
      await next;
      expect(test.models[3]).toBe(main);
    } finally { vi.useRealTimers(); }
  });

  it("não marca a chave por limite ou recusa do modelo reserva e mostra a falha original", async () => {
    vi.useFakeTimers();
    try {
      const test = setup(["a"], (_key, _number, _messages, model) => fail(model === main ? "transient" : model === second ? "cooldown" : "rejected"));
      const sending = expect(test.service.send("u", "c", "oi")).rejects.toThrow("transient");
      await vi.runAllTimersAsync();
      await sending;
      expect(test.models).toEqual([main, second, third]);
      expect(test.states).toEqual([]);
    } finally { vi.useRealTimers(); }
  });
});
