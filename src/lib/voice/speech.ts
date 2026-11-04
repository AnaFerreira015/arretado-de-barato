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
  stop?(): void;
};
type Callbacks = {
  onText(text: string): void;
  onDraft?(text: string): void;
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
  let recording = false;
  let finishing = false;
  let saved = "";
  let partial = "";
  let restart: ReturnType<typeof setTimeout> | undefined;
  function stop() {
    generation++;
    recording = false;
    finishing = false;
    clearTimeout(restart);
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
  function deliver() {
    const text = [saved, partial].filter(Boolean).join(" ").trim();
    stop();
    if (text) callbacks.onText(text);
    else callbacks.onError("Não entendi a fala. Tente novamente ou digite.");
  }
  function listen() {
    if (disposed) return;
    stop();
    if (!Recognition) {
      callbacks.onError("Este navegador não oferece reconhecimento de voz. Continue digitando.");
      return;
    }
    saved = "";
    partial = "";
    recording = true;
    callbacks.onDraft?.("");
    const id = generation;
    function startSegment() {
      if (disposed || generation !== id || !recording) return;
      try {
        const segment = new Recognition!();
        recognition = segment;
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          if (disposed || generation !== id || recognition !== segment) return;
          partial = Array.from(event.results)
            .map((r) => r[0]?.transcript.trim() ?? "")
            .filter(Boolean)
            .join(" ");
          callbacks.onDraft?.([saved, partial].filter(Boolean).join(" "));
        };
        recognition.onerror = (event) => {
          if (disposed || generation !== id || recognition !== segment) return;
          if (event.error === "no-speech" && recording && !finishing) return;
          stop();
          callbacks.onError(
            event.error === "not-allowed" || event.error === "service-not-allowed"
              ? "Permissão de microfone negada. Continue digitando."
              : "A gravação foi interrompida pelo navegador. Confira o texto e tente novamente ou digite.",
          );
        };
        recognition.onend = () => {
          if (disposed || generation !== id || recognition !== segment) return;
          if (finishing) {
            deliver();
            return;
          }
          saved = [saved, partial].filter(Boolean).join(" ");
          partial = "";
          recognition = null;
          if (recording) restart = setTimeout(startSegment, 250);
        };
        recognition.start();
        callbacks.onState("listening");
      } catch {
        stop();
        callbacks.onError("Não foi possível continuar o microfone. Confira o texto ou digite.");
      }
    }
    startSegment();
  }
  function finish() {
    if (!recording || disposed || finishing) return;
    finishing = true;
    clearTimeout(restart);
    if (recognition?.stop) {
      try {
        recognition.stop();
      } catch {
        deliver();
      }
    } else deliver();
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
    finish,
    speak,
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}
export type SpeechController = ReturnType<typeof createSpeechController>;
