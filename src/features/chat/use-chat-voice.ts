import { useCallback, useEffect, useRef, useState } from "react";
import { createDictation, recognitionConstructor, type DictationState } from "./dictation";

const IDLE: DictationState = { phase: "idle", text: "", interim: "", startedAt: 0 };
export function useChatVoice(onDictation: (text: string, send: boolean) => void, onError: (text: string) => void, onNotice: (text: string) => void) {
  const dictationRef = useRef<ReturnType<typeof createDictation> | undefined>(undefined);
  const [dictation, setDictation] = useState<DictationState>(IDLE);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(1);
  const restartSpeech = useRef<(() => void) | undefined>(undefined);
  const [reading, setReading] = useState<{ messageId: string; start: number; end: number }>();
  const speech = useRef<SpeechSynthesisUtterance | undefined>(undefined);
  const textHandler = useRef(onDictation), errorHandler = useRef(onError), noticeHandler = useRef(onNotice);
  textHandler.current = onDictation; errorHandler.current = onError; noticeHandler.current = onNotice;
  const available = Boolean(recognitionConstructor());
  useEffect(() => () => { dictationRef.current?.cancel(); speech.current = undefined; restartSpeech.current = undefined; if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);
  useEffect(() => {
    // A hidden tab must not keep listening; what was said stays for review.
    const hide = () => { if (document.hidden) dictationRef.current?.finish(false); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const stopReading = useCallback(() => {
    speech.current = undefined;
    restartSpeech.current = undefined;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setReading(undefined);
  }, []);
  function changeRate(value: number) {
    if (![.75, 1, 1.25, 1.5, 2].includes(value)) return;
    rateRef.current = value;
    setRate(value);
    const resume = restartSpeech.current;
    if (speech.current && resume) {
      speech.current = undefined;
      window.speechSynthesis.cancel();
      resume();
    }
  }
  function startDictation() {
    const Constructor = recognitionConstructor();
    if (!Constructor) { errorHandler.current("Este navegador não oferece ditado por voz. Use o campo de texto."); return; }
    stopReading();
    dictationRef.current = createDictation(Constructor, {
      onState: setDictation,
      onDone: (text, send) => textHandler.current(text, send),
      onError: (message) => errorHandler.current(message),
      onNotice: (message) => noticeHandler.current(message),
    });
    dictationRef.current.start();
  }
  const finishDictation = useCallback((send: boolean) => dictationRef.current?.finish(send), []);
  const cancelDictation = useCallback(() => dictationRef.current?.cancel(), []);
  function readAloud(text: string, messageId: string) {
    if (!window.speechSynthesis) return;
    const wasSpeaking = speaking;
    stopReading();
    if (wasSpeaking) return;
    dictationRef.current?.finish(false);
    // Preserve character offsets so the spoken range still maps to the formatted answer.
    const spoken = text.replace(/\[\d+\]/g, (citation) => " ".repeat(citation.length)).replace(/[*`#]/g, " ");
    const chunks = typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter("pt-BR", { granularity: "sentence" }).segment(spoken), (item) => ({ text: item.segment, start: item.index }))
      : Array.from(spoken.matchAll(/[^\n]+/g), (item) => ({ text: item[0], start: item.index! }));
    const parts = chunks.filter((item) => item.text.trim());
    if (!parts.length) return;
    const speak = (index: number, offset = 0) => {
      const part = parts[index];
      let position = offset;
      const utterance = new SpeechSynthesisUtterance(part.text.slice(offset));
      utterance.lang = "pt-BR";
      utterance.rate = rateRef.current;
      speech.current = utterance;
      restartSpeech.current = () => speak(index, position);
      utterance.onstart = () => {
        if (speech.current === utterance) setReading({ messageId, start: part.start + offset, end: part.start + part.text.length });
      };
      utterance.onboundary = (event) => {
        if (speech.current !== utterance || !Number.isFinite(event.charIndex)) return;
        const tail = part.text.slice(offset + event.charIndex);
        const word = /\S+/.exec(tail);
        if (!word) return;
        position = offset + event.charIndex + word.index;
        const start = part.start + position;
        const length = event.charLength > 0 ? event.charLength : word[0].length;
        setReading({ messageId, start, end: Math.min(part.start + part.text.length, start + length) });
      };
      utterance.onend = () => {
        if (speech.current !== utterance) return;
        if (index + 1 < parts.length) speak(index + 1);
        else stopReading();
      };
      utterance.onerror = () => { if (speech.current === utterance) stopReading(); };
      try { window.speechSynthesis.speak(utterance); }
      catch { stopReading(); errorHandler.current("Não foi possível iniciar a leitura em voz alta."); }
    };
    setSpeaking(true);
    speak(0);
  }
  return { available, dictation, listening: dictation.phase !== "idle", startDictation, cancelDictation, finishDictation, speaking, reading, rate, changeRate, readAloud, stopReading };
}
