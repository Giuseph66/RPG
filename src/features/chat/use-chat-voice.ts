import { useCallback, useEffect, useRef, useState } from "react";
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function useChatVoice(onText: (text: string) => void, onError: (text: string) => void) {
  const recognition = useRef<Recognition | undefined>(undefined);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(1);
  const restartSpeech = useRef<(() => void) | undefined>(undefined);
  const [reading, setReading] = useState<{ messageId: string; start: number; end: number }>();
  const speech = useRef<SpeechSynthesisUtterance | undefined>(undefined);
  const textHandler = useRef(onText), errorHandler = useRef(onError);
  textHandler.current = onText; errorHandler.current = onError;
  const available = typeof window !== "undefined" && Boolean((window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition);
  useEffect(() => () => { if (recognition.current) { recognition.current.onend = null; recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.abort(); } speech.current = undefined; restartSpeech.current = undefined; if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);
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
  function toggleListening() {
    if (listening) { recognition.current?.stop(); return; }
    const Constructor = (window as VoiceWindow).SpeechRecognition ?? (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) { errorHandler.current("Este navegador não oferece ditado por voz. Use o campo de texto."); return; }
    stopReading();
    const instance = new Constructor();
    instance.lang = "pt-BR"; instance.continuous = false; instance.interimResults = false;
    instance.onresult = (event) => { const phrase = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" "); textHandler.current(phrase); };
    instance.onerror = () => { setListening(false); errorHandler.current("Não foi possível usar o microfone. Confira a permissão do navegador."); };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    try { instance.start(); setListening(true); } catch { errorHandler.current("Não foi possível iniciar o ditado."); }
  }
  function readAloud(text: string, messageId: string) {
    if (!window.speechSynthesis) return;
    const wasSpeaking = speaking;
    stopReading();
    if (wasSpeaking) return;
    recognition.current?.stop();
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
  return { available, listening, speaking, reading, rate, changeRate, toggleListening, readAloud, stopReading, stop: () => recognition.current?.stop() };
}
