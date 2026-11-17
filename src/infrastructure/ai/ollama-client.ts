import { OllamaRequestError, type OllamaClient } from "@application/ports/chat";

const SYSTEM_PROMPT = "Você é o Oráculo da Mesa, assistente de RPG de mesa. Responda em português brasileiro. Ajude com regras, planejamento e ideias. Diferencie regras conhecidas de sugestões e diga quando não souber. Você só conhece os fatos enviados nesta conversa e no contexto atual; não invente lembranças de sessões anteriores. Não diga que alterou fichas, rolou dados ou executou ações no aplicativo. Não peça nem repita credenciais.";

export function createOllamaClient(): OllamaClient {
  async function request(baseUrl: string, endpoint: string, apiKey: string, body?: object, signal?: AbortSignal): Promise<Record<string, unknown>> {
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
      throw new Error("Não foi possível acessar o servidor Ollama. Verifique a conexão, a URL e se o servidor permite CORS para este site.");
    }
    const retry = response.headers.get("Retry-After");
    const retryAfterMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1_000 : Date.parse(retry) - Date.now()) : 300_000;
    if (!response.ok) throw new OllamaRequestError(response.status === 404 ? "Modelo ou endpoint não encontrado. Confira a URL e o modelo em Configurações." : `O servidor Ollama respondeu ${response.status}.`, response.status, Number.isFinite(retryAfterMs) ? retryAfterMs : 300_000);
    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") throw new Error("O servidor Ollama retornou uma resposta inválida.");
    return data;
  }
  return {
    async listModels(baseUrl, apiKey, signal) {
      const data = await request(baseUrl, "/api/tags", apiKey, undefined, signal);
      return Array.isArray(data.models) ? [...new Set(data.models.flatMap((item: unknown) => item && typeof item === "object" && "name" in item && typeof item.name === "string" ? [item.name] : []))] : [];
    },
    async complete(baseUrl, apiKey, model, messages, context, signal) {
      const data = await request(baseUrl, "/api/chat", apiKey, { model, messages: [{ role: "system", content: `${SYSTEM_PROMPT}${context ? `\nContexto atual: ${context}` : ""}` }, ...messages.map(({ role, content }) => ({ role, content }))], stream: false }, signal);
      const message = data.message as { content?: unknown } | undefined;
      if (typeof message?.content !== "string" || !message.content.trim()) throw new Error("O modelo retornou uma resposta vazia. Tente outro modelo em Configurações.");
      if (message.content.length > 100_000) throw new Error("A resposta excede o tamanho permitido para o histórico.");
      return message.content;
    },
  };
}
