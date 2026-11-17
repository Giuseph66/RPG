import { useEffect, useRef, useState } from "react";
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
  const textHandler = useRef(onText), errorHandler = useRef(onError);
  textHandler.current = onText; errorHandler.current = onError;
  const available = typeof window !== "undefined" && Boolean((window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition);
  useEffect(() => () => { if (recognition.current) { recognition.current.onend = null; recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.abort(); } if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);
  function toggleListening() {
    if (listening) { recognition.current?.stop(); return; }
    const Constructor = (window as VoiceWindow).SpeechRecognition ?? (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) { errorHandler.current("Este navegador não oferece ditado por voz. Use o campo de texto."); return; }
    const instance = new Constructor();
    instance.lang = "pt-BR"; instance.continuous = false; instance.interimResults = false;
    instance.onresult = (event) => { const phrase = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" "); textHandler.current(phrase); };
    instance.onerror = () => { setListening(false); errorHandler.current("Não foi possível usar o microfone. Confira a permissão do navegador."); };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    try { instance.start(); setListening(true); } catch { errorHandler.current("Não foi possível iniciar o ditado."); }
  }
  function readAloud(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text.replace(/\[\d+\]/g, "")); utterance.lang = "pt-BR";
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  }
  return { available, listening, speaking, toggleListening, readAloud, stop: () => recognition.current?.stop() };
}
