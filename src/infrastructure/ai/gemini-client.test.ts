// @vitest-environment node
/// <reference types="node" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_PROVIDER, ChatRequestError } from "@application/ports/chat";
import type { ChatModelMessage, ChatToolDefinition } from "@application/ports/chat-agent";
import { READ_TOOLS, WRITE_TOOLS } from "@application/chat/game-agent";
import { historyTool } from "@application/chat/service";
import { createGeminiClient } from "./gemini-client";

const tool: ChatToolDefinition = { type: "function", function: { name: "search_rules", description: "Busca", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } } };
const question: ChatModelMessage[] = [{ role: "system", content: "SYS" }, { role: "user", content: "oi" }];
type Body = { contents: { role: string; parts: Record<string, unknown>[] }[]; [key: string]: unknown };

/** Splits the stream in small byte chunks so events and UTF-8 characters cross boundaries. */
function sse(...events: unknown[]) {
  const bytes = new TextEncoder().encode(events.map((item) => `data: ${JSON.stringify(item)}\r\n\r\n`).join(""));
  return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
}
const chunk = (parts: unknown[], finishReason?: string) => ({ candidates: [{ content: { role: "model", parts }, ...(finishReason ? { finishReason } : {}) }], usageMetadata: { totalTokenCount: 42 } });
const failure = (code: number, status: string, details: unknown[] = [], message = "x") => new Response(JSON.stringify({ error: { code, status, message, details } }), { status: code });
function mock(...responses: Response[]) {
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, body: (index: number) => JSON.parse(String(fetchMock.mock.calls[index][1].body)) as Body };
}
afterEach(() => vi.unstubAllGlobals());

describe("gemini client", () => {
  it("transmite texto, ignora pensamentos e contabiliza tokens", async () => {
    const { fetchMock, body } = mock(sse(chunk([{ text: "segredo", thought: true }]), chunk([{ text: "Olá, " }]), chunk([{ text: "dragão 🐉" }]), chunk([{ text: "", thoughtSignature: "s" }], "STOP")));
    const partials: string[] = [], usage: unknown[] = [];
    const result = await createGeminiClient().turn("chave", question, [tool], undefined, (text) => partials.push(text), false, (value) => usage.push(value));
    expect(result).toEqual({ content: "Olá, dragão 🐉", tools: [], tokens: 42, truncated: false });
    expect(partials).toEqual(["Olá, ", "Olá, dragão 🐉"]);
    expect(usage).toEqual([expect.objectContaining({ limited: false })]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:streamGenerateContent?alt=sse");
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ "x-goog-api-key": "chave" });
    expect(body(0)).toMatchObject({ systemInstruction: { parts: [{ text: "SYS" }] }, contents: [{ role: "user", parts: [{ text: "oi" }] }], toolConfig: { functionCallingConfig: { mode: "AUTO" } }, tools: [{ functionDeclarations: [{ name: "search_rules", parametersJsonSchema: tool.function.parameters }] }], generationConfig: { thinkingConfig: { thinkingLevel: "low" } } });
  });

  it("devolve chamadas paralelas intactas e agrupa os resultados em um só turno", async () => {
    const { body } = mock(
      sse(chunk([{ functionCall: { id: "a", name: "search_rules", args: { query: "fogo" } }, thoughtSignature: "SIG" }, { functionCall: { name: "search_rules", args: { query: "gelo" } } }], "STOP")),
      sse(chunk([{ text: "ok" }], "STOP")));
    const client = createGeminiClient();
    const first = await client.turn("k", question, [tool]);
    expect(first.tools.map((call) => JSON.parse(call.function.arguments))).toEqual([{ query: "fogo" }, { query: "gelo" }]);
    const [a, b] = first.tools;
    expect(b.id).toBeTruthy();
    await client.turn("k", [...question, { role: "assistant", content: null, tool_calls: first.tools, native: first.native }, { role: "tool", tool_call_id: a.id, content: "R1" }, { role: "tool", tool_call_id: b.id, content: "R2" }], [tool], undefined, undefined, true);
    const second = body(1);
    expect(second.contents.map((item) => item.role)).toEqual(["user", "model", "user"]);
    expect(second.contents[1].parts).toEqual([{ functionCall: { id: "a", name: "search_rules", args: { query: "fogo" } }, thoughtSignature: "SIG" }, { functionCall: { id: b.id, name: "search_rules", args: { query: "gelo" } } }]);
    expect(second.contents[2].parts).toEqual([{ functionResponse: { id: "a", name: "search_rules", response: { result: "R1" } } }, { functionResponse: { id: b.id, name: "search_rules", response: { result: "R2" } } }]);
    expect(second).toMatchObject({ toolConfig: { functionCallingConfig: { mode: "NONE" } } });
  });

  it("refaz sem assinaturas quando a chave nova recusa as da anterior", async () => {
    const { fetchMock, body } = mock(failure(400, "INVALID_ARGUMENT", [], "Invalid thought_signature."), sse(chunk([{ text: "ok" }], "STOP")));
    await createGeminiClient().turn("k", [...question, { role: "assistant", content: null, tool_calls: [{ id: "a", type: "function", function: { name: "search_rules", arguments: "{}" } }], native: [{ text: "vou buscar" }, { functionCall: { id: "a", name: "search_rules", args: {} }, thoughtSignature: "OUTRA" }] }, { role: "tool", tool_call_id: "a", content: "R" }], [tool]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body(1).contents[1].parts).toEqual([{ text: "vou buscar" }, { functionCall: { id: "a", name: "search_rules", args: {} }, thoughtSignature: "skip_thought_signature_validator" }]);
  });

  it("une mensagens seguidas do mesmo autor e sempre começa pelo usuário", async () => {
    const { body } = mock(sse(chunk([{ text: "ok" }], "STOP")));
    await createGeminiClient().turn("k", [{ role: "assistant", content: "a" }, { role: "assistant", content: "b" }, { role: "user", content: "c" }], []);
    expect(body(0).contents.map((item) => [item.role, item.parts.length])).toEqual([["user", 1], ["model", 2], ["user", 1]]);
    expect(body(0)).not.toHaveProperty("tools");
    expect(body(0)).toMatchObject({ generationConfig: { thinkingConfig: { thinkingLevel: "low" } } });
  });

  const info = (reason: string) => [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason }];
  it.each([
    ["chave inválida", failure(400, "INVALID_ARGUMENT", info("API_KEY_INVALID")), "invalid", undefined],
    ["chave vazada", failure(403, "PERMISSION_DENIED", [], "Your API key was reported as leaked. Please use another API key."), "invalid", undefined],
    ["site bloqueado", failure(403, "PERMISSION_DENIED", info("API_KEY_HTTP_REFERRER_BLOCKED")), "unavailable", undefined],
    ["projeto restrito", failure(403, "PERMISSION_DENIED"), "cooldown", 3_300_000],
    ["sem créditos", failure(402, "RESOURCE_EXHAUSTED"), "cooldown", 3_300_000],
    ["limite por minuto", failure(429, "RESOURCE_EXHAUSTED", [{ retryDelay: "17.5s" }]), "cooldown", 17_500],
    ["limite sem prazo", failure(429, "RESOURCE_EXHAUSTED"), "cooldown", 60_000],
    ["limite diário", failure(429, "RESOURCE_EXHAUSTED", [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue: "20", quotaDimensions: { model: "gemini-4-hydrogen" } }] }, { retryDelay: "40998s" }]), "cooldown", 40_998_000],
    ["região", failure(400, "FAILED_PRECONDITION"), "unavailable", undefined],
    ["sobrecarga", failure(503, "UNAVAILABLE"), "transient", undefined],
    ["pedido malformado", failure(400, "INVALID_ARGUMENT"), "rejected", undefined],
    ["modelo inexistente", failure(404, "NOT_FOUND"), "rejected", undefined],
    ["corpo não JSON", new Response("<html>", { status: 502 }), "transient", undefined],
  ] as const)("classifica %s", async (_name, response, kind, delay) => {
    mock(response);
    const error = await createGeminiClient().turn("k", question, []).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ChatRequestError);
    expect(error).toMatchObject({ kind, ...(delay ? { retryAfterMs: delay } : {}) });
  });

  it.each([
    ["bloqueio do pedido", [{ promptFeedback: { blockReason: "SAFETY" } }], /segurança/],
    ["resposta cortada sem texto", [chunk([], "MAX_TOKENS")], /limite de geração/],
    ["fluxo sem fim", [chunk([{ text: "meio" }])], /interrompida/],
    ["ferramenta malformada", [chunk([], "MALFORMED_FUNCTION_CALL")], /não conseguiu/],
    ["erro no meio do fluxo", [chunk([{ text: "a" }]), { error: { code: 503, status: "UNAVAILABLE" } }], /sobrecarregado/],
  ] as const)("recusa %s", async (_name, events, message) => {
    mock(sse(...events));
    await expect(createGeminiClient().turn("k", question, [])).rejects.toThrow(message);
  });

  it("usa o modelo pedido e mostra código e detalhe da falha", async () => {
    const { fetchMock } = mock(failure(503, "UNAVAILABLE", [], "The model is overloaded."));
    await expect(createGeminiClient().turn("k", question, [], undefined, undefined, false, undefined, "gemini-3.8-flash")).rejects.toThrow(/503.*The model is overloaded/);
    expect(fetchMock.mock.calls[0][0]).toContain("/models/gemini-3.8-flash:");
  });

  it("desiste de uma resposta parada e libera o próximo modelo", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal("fetch", (_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("x", "AbortError")))));
      const result = expect(createGeminiClient().turn("k", question, [])).rejects.toMatchObject({ kind: "transient", status: 504 });
      await vi.advanceTimersByTimeAsync(12_500);
      await result;
    } finally { vi.useRealTimers(); }
  });

  it("lê do 429 o limite diário, o prazo e se vale só para o modelo", async () => {
    mock(failure(429, "RESOURCE_EXHAUSTED", [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier", quotaValue: "20", quotaDimensions: { model: "gemini-4-hydrogen" } }] }, { retryDelay: "40998s" }]), failure(429, "RESOURCE_EXHAUSTED", [{ violations: [{ quotaId: "TokensPerMinutePerProject", quotaValue: "9" }] }]));
    await expect(createGeminiClient().turn("k", question, [])).rejects.toMatchObject({ quota: { period: "day", perModel: true, dayLimit: 20 } });
    await expect(createGeminiClient().turn("k", question, [])).rejects.toMatchObject({ quota: { period: "minute", perModel: false } });
  });

  it("marca texto cortado pelo limite", async () => {
    mock(sse(chunk([{ text: "parcial" }], "MAX_TOKENS")));
    await expect(createGeminiClient().turn("k", question, [])).resolves.toMatchObject({ content: "parcial", truncated: true });
  });
});

/** Opt-in: node --env-file=.env.local node_modules/vitest/vitest.mjs run src/infrastructure/ai/gemini-client.test.ts */
describe.skipIf(!process.env.GEMINI_API_KEY)("gemini real", () => {
  it.each([CHAT_PROVIDER.model, ...CHAT_PROVIDER.fallbackModels])("%s usa uma ferramenta e responde com o resultado", async (model) => {
    const client = createGeminiClient(), key = process.env.GEMINI_API_KEY!;
    const messages: ChatModelMessage[] = [{ role: "system", content: "Sempre consulte search_rules antes de responder." }, { role: "user", content: "Quanto dano causa Bola de Fogo?" }];
    // The app's real declarations, so a schema refused by Google fails here.
    const tools = [...READ_TOOLS, ...WRITE_TOOLS, historyTool];
    const first = await client.turn(key, messages, tools, undefined, undefined, false, undefined, model);
    expect(first.tools.length).toBeGreaterThan(0);
    const second = await client.turn(key, [...messages, { role: "assistant", content: first.content || null, tool_calls: first.tools, native: first.native }, ...first.tools.map((call): ChatModelMessage => ({ role: "tool", tool_call_id: call.id, content: "Bola de Fogo: 8d6 de dano de fogo." }))], tools, undefined, undefined, true, undefined, model);
    expect(second.content).toContain("8d6");
  }, 120_000);
});
