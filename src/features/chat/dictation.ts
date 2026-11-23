/** Browser speech recognition kept open until the user decides it is over; silences never end it. */
interface RecognitionResult { readonly isFinal: boolean; readonly 0?: { readonly transcript: string } }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { readonly results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export type RecognitionConstructor = new () => Recognition;

export interface DictationState { readonly phase: "idle" | "listening" | "finishing"; readonly text: string; readonly interim: string; readonly startedAt: number }
export interface DictationHandlers {
  readonly onState: (state: DictationState) => void;
  /** `send` only when the user asked for it; every other ending leaves the text for review. */
  readonly onDone: (text: string, send: boolean) => void;
  readonly onError: (message: string) => void;
  readonly onNotice: (message: string) => void;
}

const IDLE: DictationState = { phase: "idle", text: "", interim: "", startedAt: 0 };
/** A forgotten microphone closes itself; normal pauses to think are far shorter. */
export const IDLE_LIMIT_MS = 60_000;
const FINISH_WAIT_MS = 1_500, RESTART_DELAY_MS = 150, QUICK_END_MS = 400, MAX_QUICK_ENDS = 5, MAX_TEXT = 12_000;
const ERRORS: Record<string, string> = {
  "not-allowed": "O microfone está bloqueado. Libere o acesso nas permissões do navegador para este site.",
  "service-not-allowed": "Este navegador bloqueou o ditado por voz. Use o campo de texto.",
  "audio-capture": "Nenhum microfone foi encontrado neste aparelho.",
  network: "A transcrição perdeu a conexão. O que já foi reconhecido ficou no campo de texto.",
  "language-not-supported": "Este navegador não transcreve português.",
};
const join = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean).join(" ");

export function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const source = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return source.SpeechRecognition ?? source.webkitSpeechRecognition;
}

export function createDictation(Constructor: RecognitionConstructor, handlers: DictationHandlers, android = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) {
  let state = IDLE;
  let current: Recognition | undefined;
  /** Text of earlier sessions; the open one is always rebuilt whole, so nothing repeats. */
  let kept = "", session = "", send = false, quickEnds = 0, sessionStart = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined, finishTimer: ReturnType<typeof setTimeout> | undefined, restartTimer: ReturnType<typeof setTimeout> | undefined;

  const set = (patch: Partial<DictationState>) => { state = { ...state, ...patch }; handlers.onState(state); };
  const release = () => {
    clearTimeout(idleTimer); clearTimeout(finishTimer); clearTimeout(restartTimer);
    if (current) { current.onresult = null; current.onerror = null; current.onend = null; try { current.abort(); } catch { /* already closed */ } }
    current = undefined;
  };
  const end = () => {
    const text = join(kept, session, state.interim).slice(0, MAX_TEXT), requested = send;
    release(); kept = ""; session = ""; send = false;
    state = IDLE; handlers.onState(state);
    handlers.onDone(text, requested && Boolean(text));
  };
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { handlers.onNotice("O microfone foi desligado após 1 minuto sem fala. Seu texto ficou no campo."); finish(false); }, IDLE_LIMIT_MS);
  };
  const open = () => {
    const instance = new Constructor();
    instance.lang = "pt-BR"; instance.interimResults = true;
    // Chrome on Android repeats earlier phrases in continuous mode; short sessions in a row avoid it.
    instance.continuous = !android;
    instance.onresult = (event) => {
      let final = "", interim = "";
      for (const result of Array.from(event.results)) {
        const phrase = result[0]?.transcript ?? "";
        if (result.isFinal) final = join(final, phrase); else interim = join(interim, phrase);
      }
      session = final; quickEnds = 0;
      armIdle();
      set({ text: join(kept, session), interim });
      if (state.text.length >= MAX_TEXT) finish(false);
    };
    instance.onerror = ({ error }) => {
      // Silence and our own restarts are part of a normal dictation.
      if (error === "no-speech" || error === "aborted") return;
      handlers.onError(ERRORS[error] ?? "Não foi possível usar o microfone. Confira a permissão do navegador.");
      send = false;
      end();
    };
    instance.onend = () => {
      if (state.phase === "finishing") { end(); return; }
      kept = join(kept, session, state.interim); session = "";
      set({ text: kept, interim: "" });
      quickEnds = Date.now() - sessionStart < QUICK_END_MS ? quickEnds + 1 : 0;
      if (quickEnds >= MAX_QUICK_ENDS) { handlers.onError("O navegador não manteve o microfone aberto. Tente novamente."); end(); return; }
      restartTimer = setTimeout(open, RESTART_DELAY_MS);
    };
    current = instance; sessionStart = Date.now();
    try { instance.start(); } catch { handlers.onError("Não foi possível iniciar o ditado."); send = false; end(); }
  };
  function finish(sendNow: boolean) {
    if (state.phase !== "listening") return;
    send = sendNow;
    clearTimeout(idleTimer); clearTimeout(restartTimer);
    set({ phase: "finishing" });
    // The last words may still be on their way; do not wait for them forever.
    finishTimer = setTimeout(end, FINISH_WAIT_MS);
    try { current?.stop(); } catch { end(); }
  }
  return {
    start() {
      if (state.phase !== "idle") return;
      kept = ""; session = ""; send = false; quickEnds = 0;
      set({ phase: "listening", text: "", interim: "", startedAt: Date.now() });
      armIdle();
      open();
    },
    finish,
    /** Drops everything that was said. */
    cancel() { release(); kept = ""; session = ""; send = false; state = IDLE; handlers.onState(state); },
  };
}
