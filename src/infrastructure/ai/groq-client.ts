import { ChatRequestError, DEFAULT_CHAT_PREFERENCES, type ChatClient } from "@application/ports/chat";

const SYSTEM_PROMPT = "Você é o Oráculo da Mesa, assistente de RPG de mesa. Responda em português brasileiro. Ajude com regras, planejamento e ideias. Diferencie regras conhecidas de sugestões e diga quando não souber. Você só conhece os fatos enviados nesta conversa e no contexto atual; não invente lembranças de sessões anteriores. Não diga que alterou fichas, rolou dados ou executou ações no aplicativo. Não peça nem repita credenciais.";

export function createGroqClient(): ChatClient {
  async function request(baseUrl: string, endpoint: string, apiKey: string, body?: object, signal?: AbortSignal): Promise<Record<string, unknown>> {
    // As credenciais do pool só podem ser enviadas ao provedor configurado.
    if (baseUrl !== DEFAULT_CHAT_PREFERENCES.baseUrl) throw new Error("Endereço do GroqCloud inválido.");
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${apiKey}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
        credentials: "omit",
        redirect: "error",
      });
    } catch {
      signal?.throwIfAborted();
      throw new Error("Não foi possível acessar o GroqCloud. Verifique a conexão e tente novamente.");
    }
    const retry = response.headers.get("Retry-After");
    const retryAfterMs = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Number(retry) * 1_000 : Date.parse(retry) - Date.now()) : 300_000;
    if (!response.ok) {
      const message = response.status === 400 || response.status === 404 ? "O GroqCloud rejeitou o modelo ou a requisição. Confira o modelo em Configurações."
        : response.status === 403 ? "Sua conta GroqCloud não tem permissão para acessar este recurso ou modelo. Confira as permissões no console Groq."
        : response.status === 402 ? "O GroqCloud solicita créditos. Confira o saldo e o plano da sua conta."
        : `O GroqCloud respondeu ${response.status}.`;
      throw new ChatRequestError(message, response.status, Number.isFinite(retryAfterMs) ? retryAfterMs : 300_000);
    }
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("O GroqCloud retornou uma resposta inválida.");
    return data;
  }
  return {
    async listModels(baseUrl, apiKey, signal) {
      const data = await request(baseUrl, "/models", apiKey, undefined, signal);
      if (!Array.isArray(data.data)) throw new Error("O GroqCloud retornou uma lista de modelos inválida.");
      return [...new Set(data.data.flatMap((item: unknown) => item && typeof item === "object" && "id" in item && typeof item.id === "string" && (!("active" in item) || item.active !== false) ? [item.id] : []))].sort();
    },
    async complete(baseUrl, apiKey, model, messages, context, signal) {
      const data = await request(baseUrl, "/chat/completions", apiKey, { model, messages: [{ role: "system", content: `${SYSTEM_PROMPT}${context ? `\nContexto atual: ${context}` : ""}` }, ...messages.map(({ role, content }) => ({ role, content }))], stream: false, max_completion_tokens: 2048 }, signal);
      const message = (Array.isArray(data.choices) ? data.choices[0]?.message : undefined) as { content?: unknown } | undefined;
      if (typeof message?.content !== "string" || !message.content.trim()) throw new Error("O modelo retornou uma resposta vazia. Tente outro modelo em Configurações.");
      if (message.content.length > 100_000) throw new Error("A resposta excede o tamanho permitido para o histórico.");
      return message.content;
    },
  };
}
