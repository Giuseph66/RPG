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
const fail = (kind: ChatRequestError["kind"], retryAfterMs?: number): never => { throw new ChatRequestError(kind, kind === "cooldown" ? 429 : 0, kind, retryAfterMs); };

beforeEach(() => { vi.restoreAllMocks(); });

describe("pool de chaves do Oráculo", () => {
  const all = ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
  const [main, second, third] = all;
  it("troca de chave no limite de um modelo, sem pôr a chave inteira em espera", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("cooldown", 30_000) : reply("ok"));
    await test.service.send("u", "c", "oi");
    expect(test.used).toEqual(["a", "b"]);
    expect(test.models).toEqual([main, main]);
    expect(test.states).toEqual([]);
    await test.service.send("u", "c", "de novo");
    expect(test.used).toEqual(["a", "b", "b"]);
  });

  it("usa outro modelo com a mesma chave quando a cota do principal acaba", async () => {
    const test = setup(["a"], (_key, _call, _messages, model) => model === main ? fail("cooldown", 3_300_000) : reply("ok"));
    await test.service.send("u", "c", "oi");
    await test.service.send("u", "c", "de novo");
    expect(test.models).toEqual([main, second, second]);
    expect(test.states).toEqual([]);
  });

  it("põe a chave em espera só quando todos os modelos a limitaram", async () => {
    const test = setup(["a"], () => fail("cooldown", 30_000));
    const usage = vi.fn();
    await expect(test.service.send("u", "c", "oi", { onUsage: usage })).rejects.toThrow("cooldown");
    expect(test.models).toEqual(all);
    expect(test.states).toEqual([["a", "cooldown", expect.any(Number)]]);
    expect(usage).toHaveBeenCalledWith(expect.objectContaining({ credentialId: "a", limited: true }));
  });

  it("põe a chave sem créditos em espera na hora", async () => {
    const test = setup(["a", "b"], (key) => { if (key === "a") throw new ChatRequestError("créditos", 402, "cooldown", 3_300_000); return reply("ok"); });
    await test.service.send("u", "c", "oi");
    expect(test.used).toEqual(["a", "b"]);
    expect(test.states).toEqual([["a", "cooldown", expect.any(Number)]]);
  });

  it("volta aos modelos sobrecarregados se os reservas ficarem sem cota", async () => {
    vi.useFakeTimers();
    try {
      let first = true;
      const test = setup(["a"], (_key, _call, _messages, model) => model === main && first ? fail("transient") : model === main ? reply("principal") : first && model === second ? (first = false, reply("reserva")) : fail("cooldown"));
      await test.service.send("u", "c", "oi");
      await test.service.send("u", "c", "de novo");
      expect(test.messages.at(-1)?.content).toBe("principal");
      expect(test.states).toEqual([]);
    } finally { vi.useRealTimers(); }
  });

  it("marca só a chave inválida", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("invalid") : reply("ok"));
    await test.service.send("u", "c", "oi");
    expect(test.states).toEqual([["a", "invalid", 0]]);
  });

  it("limita a espera ao que o Firestore aceita", async () => {
    const test = setup(["a"], () => fail("cooldown", 86_400_000));
    await expect(test.service.send("u", "c", "oi")).rejects.toThrow();
    expect(test.states[0][2]).toBeLessThan(Date.now() + 3_600_000);
  });

  it("continua na próxima chave mesmo sem conseguir gravar o estado", async () => {
    const test = setup(["a", "b"], (key) => key === "a" ? fail("invalid") : reply("ok"), { setCredentialState: async () => { throw new Error("permission-denied"); } });
    await test.service.send("u", "c", "oi");
    expect(test.messages.at(-1)?.content).toBe("ok");
  });

  it("não troca nem marca chaves quando o problema é o pedido", async () => {
    const test = setup(["a", "b"], () => fail("rejected"));
    await expect(test.service.send("u", "c", "oi")).rejects.toThrow("rejected");
    expect(test.used).toEqual(["a"]);
    expect(test.states).toEqual([]);
  });

  it("espera e repete todos os modelos enquanto o Google está sobrecarregado", async () => {
    vi.useFakeTimers();
    try {
      const progress: string[] = [];
      const test = setup(["a", "b"], (_key, call) => call < 8 ? fail("transient") : reply("ok"));
      const sending = test.service.send("u", "c", "oi", { onProgress: (_text, trace) => progress.push(...trace.notices ?? []) });
      await vi.runAllTimersAsync();
      await sending;
      expect(test.models).toEqual([...all, main, second, third]);
      expect(new Set(test.used)).toEqual(new Set(["a"]));
      expect(progress.join()).toContain("Nova tentativa em");
      expect(test.states).toEqual([]);
    } finally { vi.useRealTimers(); }
  });

  it("desiste após quatro rodadas e diz o que cada modelo respondeu", async () => {
    vi.useFakeTimers();
    try {
      const test = setup(["a"], (_key, _call, _messages, model) => { throw new ChatRequestError("x", model === third ? 404 : 503, model === third ? "rejected" : "transient"); });
      const sending = expect(test.service.send("u", "c", "oi")).rejects.toThrow(/gemini-4-hydrogen \(503\).*gemini-3\.6-flash \(404\)/);
      await vi.runAllTimersAsync();
      await sending;
      expect(test.models.filter((model) => model === main)).toHaveLength(4);
      expect(test.models.filter((model) => model === third)).toHaveLength(1);
    } finally { vi.useRealTimers(); }
  });

  it("não gasta cota repetindo gerações inaproveitáveis", async () => {
    const test = setup(["a"], () => { throw new ChatRequestError("vazia", 502, "transient", 0, true); });
    await expect(test.service.send("u", "c", "oi")).rejects.toThrow("vazia");
    expect(test.models).toEqual([main, second]);
  });

  it("cancela durante o intervalo de repetição", async () => {
    const controller = new AbortController();
    const test = setup(["a"], () => { setTimeout(() => controller.abort(), 20); return fail("transient"); });
    await expect(test.service.send("u", "c", "oi", { signal: controller.signal })).rejects.toThrow();
    expect(test.models).toEqual(all);
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
      expect(test.models[3]).toBe(second);
      vi.advanceTimersByTime(6 * 60_000);
      const later = test.service.send("u", "c", "mais tarde");
      await vi.runAllTimersAsync();
      await later;
      expect(test.models[4]).toBe(main);
    } finally { vi.useRealTimers(); }
  });

  it("tenta as outras chaves no modelo reserva limitado, sem marcar nenhuma", async () => {
    const test = setup(["a", "b"], (key, _call, _messages, model) => model === main ? fail("transient") : key === "a" ? fail("cooldown") : reply("ok"));
    await test.service.send("u", "c", "oi");
    expect(test.used).toEqual(["a", "a", "b"]);
    expect(test.models).toEqual([main, second, second]);
    expect(test.states).toEqual([]);
  });
});
