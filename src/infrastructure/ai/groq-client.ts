import { CHAT_PROVIDER, ChatRequestError, type ChatClient } from "@application/ports/chat";
import type { ChatCompletion, ChatToolRequest } from "@application/ports/chat-agent";

/** Transport only: permissions and tool execution belong to the application. */
export function createGroqClient(): ChatClient {
  return {
    async turn(apiKey, messages, tools, signal, onText): Promise<ChatCompletion> {
      let response: Response;
      try {
        response = await fetch(CHAT_PROVIDER.baseUrl + "/chat/completions", {
          method: "POST", credentials: "omit", redirect: "error",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ model: CHAT_PROVIDER.model, messages, stream: true, max_completion_tokens: 2048,
            ...(tools.length ? { tools, tool_choice: "auto", parallel_tool_calls: false } : {}) }),
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
        });
      } catch {
        signal?.throwIfAborted();
        throw new Error("Não foi possível acessar o GroqCloud. Verifique a conexão e tente novamente.");
      }
      if (!response.ok) {
        const retry = response.headers.get("Retry-After");
        const delay = retry ? (/^\d+(\.\d+)?$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 300_000;
        const message = response.status === 429 ? "O limite de uso do GroqCloud foi atingido. Aguarde a liberação da conta."
          : response.status === 401 ? "A chave GroqCloud não é válida."
          : response.status === 403 ? "A conta GroqCloud não permite este modelo ou recurso."
          : response.status === 402 ? "O GroqCloud solicita créditos. Confira o saldo da conta."
          : "O GroqCloud rejeitou a solicitação (" + response.status + "). Tente reduzir o contexto da conversa.";
        throw new ChatRequestError(message, response.status, Number.isFinite(delay) ? delay : 300_000);
      }
      if (!response.body) throw new Error("O GroqCloud não enviou uma resposta.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const calls = new Map<number, { id: string; name: string; arguments: string }>();
      let pending = "", content = "", tokens = 0, finished = false, truncated = false;
      const event = (raw: string) => {
        const value = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!value) return;
        if (value === "[DONE]") { finished = true; return; }
        const data = JSON.parse(value);
        if (data.error) throw new Error("O GroqCloud interrompeu a geração. Tente novamente.");
        tokens = data.usage?.total_tokens ?? data.x_groq?.usage?.total_tokens ?? tokens;
        const choice = data.choices?.[0];
        if (choice?.finish_reason) { finished = true; truncated = choice.finish_reason === "length"; }
        const delta = choice?.delta;
        if (typeof delta?.content === "string") {
          content += delta.content;
          if (content.length > 100_000) throw new Error("Resposta muito longa para o histórico.");
          onText?.(content);
        }
        for (const call of delta?.tool_calls ?? []) {
          if (!Number.isInteger(call.index) || call.index < 0 || call.index > 15) throw new Error("Chamada de ferramenta inválida.");
          const previous = calls.get(call.index) ?? { id: "", name: "", arguments: "" };
          previous.id += call.id ?? ""; previous.name += call.function?.name ?? ""; previous.arguments += call.function?.arguments ?? "";
          if (previous.arguments.length > 20_000) throw new Error("Solicitação de ferramenta muito longa.");
          calls.set(call.index, previous);
        }
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          pending += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
          let boundary: number;
          while ((boundary = pending.indexOf("\n\n")) >= 0) { event(pending.slice(0, boundary)); pending = pending.slice(boundary + 2); }
          if (pending.length > 200_000) throw new Error("Evento do provedor excedeu o limite.");
          if (done) { if (pending.trim()) event(pending); break; }
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      signal?.throwIfAborted();
      if (!finished) throw new Error("A conexão foi interrompida antes do fim da resposta. Você pode tentar novamente.");
      const requests: ChatToolRequest[] = [...calls.values()].map((call) => ({ id: call.id, type: "function", function: { name: call.name, arguments: call.arguments } }));
      if (requests.some((call) => !call.id || !call.function.name)) throw new Error("O provedor enviou uma ferramenta incompleta.");
      if (!content.trim() && !requests.length) throw new Error("O modelo retornou uma resposta vazia.");
      return { content, tools: requests, tokens, truncated };
    },
  };
}
