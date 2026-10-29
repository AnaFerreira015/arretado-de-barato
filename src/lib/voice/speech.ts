export type AudioState = "idle" | "listening" | "speaking";
export type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type Callbacks = {
  onText(text: string): void;
  onError(message: string): void;
  onState(state: AudioState): void;
};

export function createSpeechController(callbacks: Callbacks) {
  const host = globalThis as typeof globalThis & {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Recognition = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  const synth = host.speechSynthesis;
  let recognition: RecognitionLike | null = null;
  let generation = 0;
  let disposed = false;
  function stop() {
    generation++;
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* Already ended. */
      }
      recognition = null;
    }
    synth?.cancel();
    if (!disposed) callbacks.onState("idle");
  }
  function listen() {
    if (disposed) return;
    stop();
    if (!Recognition) {
      callbacks.onError("Este navegador não oferece reconhecimento de voz. Continue digitando.");
      return;
    }
    const id = generation;
    try {
      recognition = new Recognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        if (disposed || generation !== id) return;
        const text = event.results[0]?.[0]?.transcript.trim();
        stop();
        if (text) callbacks.onText(text);
        else callbacks.onError("Não entendi a fala. Tente novamente ou digite.");
      };
      recognition.onerror = (event) => {
        if (disposed || generation !== id) return;
        stop();
        callbacks.onError(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Permissão de microfone negada. Continue digitando."
            : "Não foi possível reconhecer a fala. Tente novamente ou digite.",
        );
      };
      recognition.onend = () => {
        if (!disposed && generation === id) stop();
      };
      recognition.start();
      callbacks.onState("listening");
    } catch {
      stop();
      callbacks.onError("Não foi possível iniciar o microfone. Continue digitando.");
    }
  }
  function speak(text: string) {
    if (disposed) return;
    stop();
    if (!synth || !host.SpeechSynthesisUtterance) {
      callbacks.onError("Leitura em voz alta indisponível. O texto continua na tela.");
      return;
    }
    const id = generation;
    const utterance = new host.SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    const voice = synth.getVoices().find((v) => /^pt[-_]BR$/i.test(v.lang));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (!disposed && generation === id) callbacks.onState("idle");
    };
    utterance.onerror = () => {
      if (!disposed && generation === id) {
        callbacks.onState("idle");
        callbacks.onError("A leitura foi interrompida. O texto continua na tela.");
      }
    };
    try {
      callbacks.onState("speaking");
      synth.speak(utterance);
    } catch {
      callbacks.onState("idle");
      callbacks.onError("Não foi possível ler em voz alta. O texto continua na tela.");
    }
  }
  return {
    canListen: !!Recognition,
    canSpeak: !!synth && !!host.SpeechSynthesisUtterance,
    listen,
    speak,
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}
export type SpeechController = ReturnType<typeof createSpeechController>;
