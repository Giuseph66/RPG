// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDictation, IDLE_LIMIT_MS, type DictationState, type RecognitionConstructor } from "./dictation";

const sessions: FakeRecognition[] = [];
class FakeRecognition {
  lang = ""; continuous = false; interimResults = false;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(); stop = vi.fn(() => { setTimeout(() => this.onend?.(), 10); }); abort = vi.fn();
  constructor() { sessions.push(this); }
  say(...parts: [string, boolean][]) { this.onresult?.({ results: parts.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })) }); }
}
function setup(android = false) {
  let state: DictationState | undefined;
  const done = vi.fn(), error = vi.fn(), notice = vi.fn();
  const dictation = createDictation(FakeRecognition as unknown as RecognitionConstructor, { onState: (value) => { state = value; }, onDone: done, onError: error, onNotice: notice }, android);
  return { dictation, done, error, notice, state: () => state! };
}
const last = () => sessions.at(-1)!;
beforeEach(() => { sessions.length = 0; vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

describe("ditado do Oráculo", () => {
  it("mostra o texto enquanto a pessoa fala", () => {
    const test = setup(); test.dictation.start();
    last().say(["qual a besta", false]);
    expect(test.state()).toMatchObject({ phase: "listening", text: "", interim: "qual a besta" });
    last().say(["qual a besta", true], ["com mais vida", false]);
    expect(test.state()).toMatchObject({ text: "qual a besta", interim: "com mais vida" });
    expect(last()).toMatchObject({ lang: "pt-BR", continuous: true, interimResults: true });
  });

  it("não encerra nas pausas: reabre e continua o mesmo texto, sem repetir", async () => {
    const test = setup(); test.dictation.start();
    last().say(["primeira parte", true]);
    await vi.advanceTimersByTimeAsync(5000);
    last().onerror?.({ error: "no-speech" }); last().onend?.();
    await vi.advanceTimersByTimeAsync(200);
    expect(sessions).toHaveLength(2);
    last().say(["segunda parte", true]);
    expect(test.state()).toMatchObject({ phase: "listening", text: "primeira parte segunda parte" });
    expect(test.done).not.toHaveBeenCalled();
  });

  it("revisar entrega o texto sem enviar; enviar espera as últimas palavras", async () => {
    const review = setup(); review.dictation.start(); last().say(["oi", true]);
    review.dictation.finish(false);
    await vi.advanceTimersByTimeAsync(20);
    expect(review.done).toHaveBeenCalledWith("oi", false);

    const send = setup(); send.dictation.start(); last().say(["qual a", false]);
    send.dictation.finish(true);
    expect(send.state().phase).toBe("finishing");
    last().say(["qual a regra", true]);
    await vi.advanceTimersByTimeAsync(20);
    expect(send.done).toHaveBeenCalledWith("qual a regra", true);
    expect(send.state().phase).toBe("idle");
  });

  it("não fica preso se o navegador não confirmar o fim e aproveita o trecho provisório", async () => {
    const test = setup(); test.dictation.start(); last().say(["texto parcial", false]);
    last().stop.mockImplementation(() => {});
    test.dictation.finish(true);
    await vi.advanceTimersByTimeAsync(1600);
    expect(test.done).toHaveBeenCalledWith("texto parcial", true);
  });

  it("não envia gravação vazia e descartar não entrega nada", async () => {
    const empty = setup(); empty.dictation.start(); empty.dictation.finish(true);
    await vi.advanceTimersByTimeAsync(20);
    expect(empty.done).toHaveBeenCalledWith("", false);
    const test = setup(); test.dictation.start(); last().say(["segredo", true]);
    test.dictation.cancel();
    await vi.advanceTimersByTimeAsync(5000);
    expect(test.done).not.toHaveBeenCalled();
    expect(last().abort).toHaveBeenCalled();
  });

  it("desliga o microfone esquecido sem perder nem enviar o texto", async () => {
    const test = setup(); test.dictation.start(); last().say(["guardado", true]);
    await vi.advanceTimersByTimeAsync(IDLE_LIMIT_MS + 50);
    expect(test.notice).toHaveBeenCalled();
    expect(test.done).toHaveBeenCalledWith("guardado", false);
  });

  it("explica o erro e preserva o que já foi dito", () => {
    const blocked = setup(); blocked.dictation.start(); last().onerror?.({ error: "not-allowed" });
    expect(blocked.error.mock.calls[0][0]).toMatch(/bloqueado/);
    const test = setup(); test.dictation.start(); last().say(["metade", true]); last().onerror?.({ error: "network" });
    expect(test.done).toHaveBeenCalledWith("metade", false);
  });

  it("desiste se o navegador fechar o microfone repetidamente", async () => {
    const test = setup(); test.dictation.start();
    for (let i = 0; i < 5; i++) { last().onend?.(); await vi.advanceTimersByTimeAsync(200); }
    expect(test.error).toHaveBeenCalledTimes(1);
    expect(test.state().phase).toBe("idle");
  });

  it("usa sessões curtas no Android, que repete frases no modo contínuo", () => {
    const test = setup(true); test.dictation.start();
    expect(last().continuous).toBe(false);
  });
});
