import { CHAT_PROVIDER, ChatRequestError, type ChatClient } from "@application/ports/chat";
import type { ChatCompletion, ChatModelMessage, ChatToolDefinition, ChatToolRequest } from "@application/ports/chat-agent";

interface GeminiPart {
  readonly text?: string;
  readonly thought?: boolean;
  readonly thoughtSignature?: string;
  readonly functionCall?: { readonly id?: string; readonly name: string; readonly args?: Record<string, unknown> };
  readonly functionResponse?: { readonly id: string; readonly name: string; readonly response: Record<string, unknown> };
}
interface GeminiContent { readonly role: "user" | "model"; readonly parts: readonly GeminiPart[] }
interface ErrorDetail { readonly "@type"?: string; readonly reason?: string; readonly retryDelay?: string; readonly violations?: readonly { readonly quotaId?: string; readonly quotaValue?: string; readonly quotaDimensions?: Readonly<Record<string, string>> }[] }

const REQUEST_TIMEOUT_MS = 300_000;
/** No answer, or no new data, for this long: give the turn to another model. */
const STALL_TIMEOUT_MS = 20_000;
/** The limit covers thinking plus answer, so a low cap would cut answers short. */
const MAX_OUTPUT_TOKENS = 32_768;
const DEFAULT_COOLDOWN_MS = 60_000;
/** Daily quota, billing and project problems: worth testing again only much later. */
const LONG_COOLDOWN_MS = 55 * 60_000;
/** Documented by Google for function calls whose original signature cannot be used. */
const SKIP_SIGNATURE = "skip_thought_signature_validator";
const BLOCKED_FINISH = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

/** Converts the neutral history into Gemini contents, keeping model turns exactly as received. */
function toContents(messages: readonly ChatModelMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  const textOnly = (content: GeminiContent) => content.parts.every((part) => part.text !== undefined && !part.thoughtSignature);
  const push = (content: GeminiContent) => {
    const last = contents.at(-1);
    if (last && last.role === content.role && textOnly(last) && textOnly(content)) contents[contents.length - 1] = { role: last.role, parts: [...last.parts, ...content.parts] };
    else contents.push(content);
  };
  const names = new Map<string, string>();
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    if (message.role === "system") continue;
    if (message.role === "tool") {
      // All results of one step must come back together, in the order of the calls.
      const parts: GeminiPart[] = [];
      while (messages[index]?.role === "tool") {
        const { tool_call_id: id = "", content } = messages[index++];
        parts.push({ functionResponse: { id, name: names.get(id) ?? "unknown", response: { result: content ?? "" } } });
      }
      index--;
      contents.push({ role: "user", parts });
      continue;
    }
    for (const call of message.tool_calls ?? []) names.set(call.id, call.function.name);
    if (message.role === "assistant" && message.tool_calls?.length) {
      contents.push({ role: "model", parts: Array.isArray(message.native) ? message.native as GeminiPart[] : message.tool_calls.map((call, position) => ({
        functionCall: { id: call.id, name: call.function.name, args: JSON.parse(call.function.arguments) }, ...(position === 0 ? { thoughtSignature: SKIP_SIGNATURE } : {}),
      })) });
      continue;
    }
    if (message.content?.trim()) push({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] });
  }
  if (contents[0]?.role === "model") contents.unshift({ role: "user", parts: [{ text: "(Continuação de uma conversa anterior.)" }] });
  return contents;
}

/** Signatures may not be portable between projects, so another key may refuse the ones in history. */
function withoutSignatures(contents: readonly GeminiContent[]): GeminiContent[] {
  return contents.map((content) => {
    if (content.role !== "model") return content;
    let first = true;
    return { ...content, parts: content.parts.map(({ thoughtSignature: _signature, ...part }) => {
      if (!part.functionCall || !first) return part;
      first = false;
      return { ...part, thoughtSignature: SKIP_SIGNATURE };
    }) };
  });
}

function requestBody(messages: readonly ChatModelMessage[], contents: readonly GeminiContent[], tools: readonly ChatToolDefinition[], forceText: boolean) {
  const system = messages.filter((message) => message.role === "system" && message.content).map((message) => message.content).join("\n\n");
  return JSON.stringify({
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(tools.length ? {
      tools: [{ functionDeclarations: tools.map(({ function: item }) => ({ name: item.name, description: item.description, parametersJsonSchema: item.parameters })) }],
      toolConfig: { functionCallingConfig: { mode: forceText ? "NONE" : "AUTO" } },
    } : {}),
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingConfig: { thinkingLevel: "low" } },
  });
}

async function readError(response: Response): Promise<{ status: string; message: string; details: readonly ErrorDetail[] }> {
  try {
    const raw = JSON.parse(await response.text());
    const error = (Array.isArray(raw) ? raw[0] : raw)?.error ?? {};
    return { status: String(error.status ?? ""), message: String(error.message ?? ""), details: Array.isArray(error.details) ? error.details : [] };
  } catch { return { status: "", message: "", details: [] }; }
}

/** Only failures that belong to the key itself may change its state in the shared pool. */
function toRequestError(code: number, error: Awaited<ReturnType<typeof readError>>): ChatRequestError {
  const detail = error.message ? ` Detalhe: ${error.message.slice(0, 300)}` : "";
  const reasons = error.details.map((item) => item.reason ?? "");
  if (reasons.includes("API_KEY_INVALID") || reasons.includes("API_KEY_EXPIRED") || code === 401) return new ChatRequestError("A chave do Gemini não é válida.", code, "invalid");
  if (reasons.some((reason) => /^API_KEY_(HTTP_REFERRER|IP_ADDRESS|ANDROID_APP|IOS_APP)_BLOCKED$/.test(reason))) return new ChatRequestError("A chave do Gemini não aceita pedidos deste endereço.", code, "unavailable");
  if (code === 403 && (/leaked|api key.*(blocked|suspended)/i.test(error.message) || reasons.includes("API_KEY_SERVICE_BLOCKED") || reasons.includes("CONSUMER_SUSPENDED"))) return new ChatRequestError("O Google bloqueou esta chave do Gemini.", code, "invalid");
  if (code === 403) return new ChatRequestError("O projeto desta chave não tem acesso ao Gemini. Confira a verificação e o faturamento no Google AI Studio." + detail, code, "cooldown", LONG_COOLDOWN_MS);
  if (code === 402) return new ChatRequestError("Os créditos do projeto no Gemini acabaram. Confira o faturamento no Google AI Studio." + detail, code, "cooldown", LONG_COOLDOWN_MS);
  if (code === 429) {
    const violations = error.details.flatMap((item) => item.violations ?? []);
    const day = violations.find((item) => /PerDay/i.test(item.quotaId ?? "")), violation = day ?? violations[0];
    const limit = Number(violations.find((item) => /Requests.*PerDay/i.test(item.quotaId ?? ""))?.quotaValue);
    const seconds = /^(\d+(?:\.\d+)?)s$/.exec(error.details.find((item) => item.retryDelay)?.retryDelay ?? "")?.[1];
    // Google's own delay reaches the renewal of a daily quota, so it is trusted unless it is too short for one.
    const delay = seconds ? Number(seconds) * 1000 : day ? LONG_COOLDOWN_MS : DEFAULT_COOLDOWN_MS;
    return new ChatRequestError(day ? "O limite diário do Gemini foi atingido." : "O limite de uso do Gemini foi atingido.", code, "cooldown", day ? Math.max(delay, LONG_COOLDOWN_MS) : delay, false, {
      period: day ? "day" : "minute", perModel: !violation || !!violation.quotaDimensions?.model || /PerModel/i.test(violation.quotaId ?? ""), ...(Number.isInteger(limit) && limit > 0 ? { dayLimit: limit } : {}),
    });
  }
  if (code === 400 && error.status === "FAILED_PRECONDITION") return new ChatRequestError("O plano gratuito do Gemini não está disponível nesta região para esta chave.", code, "unavailable");
  if (code === 503) return new ChatRequestError(`O Gemini está sobrecarregado no momento (503). Tente novamente em instantes.${detail}`, code, "transient");
  if (code === 408 || code >= 500) return new ChatRequestError(`O Gemini não conseguiu processar o pedido (${code}). Tente novamente em instantes.${detail}`, code, "transient");
  return new ChatRequestError(`O Gemini rejeitou a solicitação (${code}). Tente reduzir o contexto da conversa.${detail}`, code, "rejected");
}

/** Transport only: permissions and tool execution belong to the application. */
export function createGeminiClient(): ChatClient {
  return {
    async turn(apiKey, messages, tools, signal, onText, forceText = false, onUsage, model = CHAT_PROVIDER.model): Promise<ChatCompletion> {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS), stall = new AbortController();
      let stallTimer: ReturnType<typeof setTimeout> | undefined;
      const alive = () => { clearTimeout(stallTimer); stallTimer = setTimeout(() => stall.abort(), STALL_TIMEOUT_MS); };
      const stalled = () => new ChatRequestError("O Gemini demorou demais para responder.", 504, "transient");
      try {
      alive();
      const post = async (contents: readonly GeminiContent[]) => {
        try {
          return await fetch(`${CHAT_PROVIDER.baseUrl}/models/${model}:streamGenerateContent?alt=sse`, {
            method: "POST", credentials: "omit", redirect: "error",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: requestBody(messages, contents, tools, forceText),
            signal: AbortSignal.any([...(signal ? [signal] : []), timeout, stall.signal]),
          });
        } catch {
          signal?.throwIfAborted();
          if (stall.signal.aborted || timeout.aborted) throw stalled();
          throw new Error("Não foi possível acessar o Gemini. Verifique a conexão e tente novamente.");
        }
      };
      const contents = toContents(messages);
      let response = await post(contents);
      let failure = response.ok ? undefined : await readError(response);
      if (response.status === 400 && failure && /thought.?signature/i.test(failure.message)) {
        response = await post(withoutSignatures(contents));
        failure = response.ok ? undefined : await readError(response);
      }
      signal?.throwIfAborted();
      const now = Date.now();
      if (failure) {
        const error = toRequestError(response.status, failure);
        onUsage?.({ observedAt: now, limited: error.kind === "cooldown", ...(error.kind === "cooldown" ? { retryAt: now + error.retryAfterMs } : {}) });
        throw error;
      }
      onUsage?.({ observedAt: now, limited: false });
      if (!response.body) throw new Error("O Gemini não enviou uma resposta.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const native: GeminiPart[] = [], requests: ChatToolRequest[] = [];
      let pending = "", content = "", tokens = 0, finish = "", blocked = "";
      const event = (raw: string) => {
        const value = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!value) return;
        const data = JSON.parse(value);
        if (data.error) throw toRequestError(Number(data.error.code) || 500, { status: String(data.error.status ?? ""), message: String(data.error.message ?? ""), details: Array.isArray(data.error.details) ? data.error.details : [] });
        tokens = data.usageMetadata?.totalTokenCount ?? tokens;
        blocked = data.promptFeedback?.blockReason ?? blocked;
        const candidate = data.candidates?.[0];
        for (const part of (candidate?.content?.parts ?? []) as GeminiPart[]) {
          if (part.functionCall) {
            if (requests.length >= 16) throw new Error("O modelo pediu ferramentas demais de uma vez. Refine o pedido.");
            const id = part.functionCall.id || crypto.randomUUID(), args = JSON.stringify(part.functionCall.args ?? {});
            if (!part.functionCall.name) throw new Error("O provedor enviou uma ferramenta incompleta.");
            if (args.length > 20_000) throw new Error("Solicitação de ferramenta muito longa.");
            native.push({ ...part, functionCall: { ...part.functionCall, id } });
            requests.push({ id, type: "function", function: { name: part.functionCall.name, arguments: args } });
            continue;
          }
          const last = native.at(-1);
          const plain = (item?: GeminiPart) => item?.text !== undefined && !item.thought && !item.thoughtSignature && !item.functionCall;
          if (last && plain(last) && plain(part)) native[native.length - 1] = { text: last.text! + part.text! };
          else native.push(part);
          if (part.text && !part.thought) {
            content += part.text;
            if (content.length > 100_000) throw new Error("Resposta muito longa para o histórico.");
            onText?.(content);
          }
        }
        if (candidate?.finishReason) finish = candidate.finishReason;
      };
      try {
        while (true) {
          const { done, value } = await reader.read().catch((cause) => {
            signal?.throwIfAborted();
            if (stall.signal.aborted || timeout.aborted) throw stalled();
            throw new Error("A conexão com o Gemini foi interrompida. Você pode tentar novamente.", { cause });
          });
          alive();
          pending = (pending + decoder.decode(value, { stream: !done })).replace(/\r\n/g, "\n");
          let boundary: number;
          while ((boundary = pending.indexOf("\n\n")) >= 0) { event(pending.slice(0, boundary)); pending = pending.slice(boundary + 2); }
          if (pending.length > 1_000_000) throw new Error("Evento do provedor excedeu o limite.");
          if (done) { if (pending.trim()) event(pending); break; }
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      signal?.throwIfAborted();
      if (blocked || BLOCKED_FINISH.has(finish)) throw new Error("O Gemini bloqueou esta resposta pelas regras de segurança dele. Reformule o pedido.");
      if (!finish) throw new ChatRequestError("A conexão foi interrompida antes do fim da resposta. Você pode tentar novamente.", 503, "transient");
      const truncated = finish === "MAX_TOKENS" || finish === "CONTINUATION";
      // A call cut by the limit or malformed must never reach the application.
      if (!truncated && finish !== "STOP") throw new ChatRequestError("O Gemini não conseguiu concluir esta resposta. Tente novamente.", 502, "transient", 0, true);
      if (truncated && (requests.length || !content.trim())) throw new Error("O Gemini atingiu o limite de geração antes de concluir. Peça algo mais específico.");
      if (!content.trim() && !requests.length) throw new ChatRequestError("O modelo retornou uma resposta vazia.", 502, "transient", 0, true);
      return { content, tools: requests, tokens, truncated, ...(requests.length ? { native } : {}) };
      } finally { clearTimeout(stallTimer); }
    },
  };
}
