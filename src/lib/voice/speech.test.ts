import { afterEach, expect, it, vi } from "vitest";
import { createSpeechController, type RecognitionLike } from "./speech";

class Recognition {
  static latest: Recognition;
  lang = "";
  continuous = true;
  interimResults = true;
  onresult: RecognitionLike["onresult"] = null;
  onerror: RecognitionLike["onerror"] = null;
  onend: RecognitionLike["onend"] = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.latest = this;
  }
}
function setup() {
  vi.stubGlobal("SpeechRecognition", Recognition);
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  const callbacks = { onText: vi.fn(), onError: vi.fn(), onState: vi.fn() };
  return { controller: createSpeechController(callbacks), synth, callbacks };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("escuta contínua pt-BR e cancela fala antes de gravar", () => {
  const { controller, synth, callbacks } = setup();
  controller.listen();
  expect(Recognition.latest.lang).toBe("pt-BR");
  expect(Recognition.latest.continuous).toBe(true);
  expect(Recognition.latest.interimResults).toBe(true);
  expect(synth.cancel).toHaveBeenCalled();
  Recognition.latest.onresult?.({ results: [[{ transcript: "arroz" }]] });
  expect(callbacks.onText).not.toHaveBeenCalled();
  controller.finish();
  expect(callbacks.onText).toHaveBeenCalledWith("arroz");
});
it("interrompe microfone ao falar e ignora callbacks antigos", () => {
  const { controller, synth, callbacks } = setup();
  controller.listen();
  const stale = Recognition.latest.onresult;
  controller.speak("resultado");
  expect(Recognition.latest.abort).toHaveBeenCalled();
  stale?.({ results: [[{ transcript: "não processar" }]] });
  expect(callbacks.onText).not.toHaveBeenCalled();
  expect(synth.speak).toHaveBeenCalledTimes(1);
});
it("parada e saída não permitem eventos tardios", () => {
  const { controller, callbacks } = setup();
  controller.listen();
  const stale = Recognition.latest.onerror;
  controller.dispose();
  stale?.({ error: "network" });
  controller.listen();
  expect(callbacks.onError).not.toHaveBeenCalled();
});
it("permite texto quando microfone é negado ou não existe", () => {
  const { controller, callbacks } = setup();
  controller.listen();
  Recognition.latest.onerror?.({ error: "not-allowed" });
  expect(callbacks.onError).toHaveBeenCalledWith(expect.stringContaining("negada"));
  vi.stubGlobal("SpeechRecognition", undefined);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
  expect(createSpeechController(callbacks).canListen).toBe(false);
});

it("mantém fala acima de cinco segundos e reúne trechos após pausa sem enviar antes de terminar", () => {
  vi.useFakeTimers();
  const { controller, callbacks } = setup();
  controller.listen();
  Recognition.latest.onresult?.({ results: [[{ transcript: "quero leite" }]] });
  Recognition.latest.onend?.();
  vi.advanceTimersByTime(6000);
  Recognition.latest.onresult?.({ results: [[{ transcript: "de um litro em Maceió" }]] });
  expect(callbacks.onText).not.toHaveBeenCalled();
  controller.finish();
  expect(callbacks.onText).toHaveBeenCalledExactlyOnceWith("quero leite de um litro em Maceió");
});
it("cancelar durante pausa impede reinício e envio tardio", () => {
  vi.useFakeTimers();
  const { controller, callbacks } = setup();
  controller.listen();
  const first = Recognition.latest;
  first.onresult?.({ results: [[{ transcript: "arroz" }]] });
  first.onend?.();
  controller.stop();
  vi.advanceTimersByTime(1000);
  expect(Recognition.latest).toBe(first);
  expect(callbacks.onText).not.toHaveBeenCalled();
});
it("aguarda resultado final do navegador ao enviar áudio", () => {
  const { controller, callbacks } = setup();
  controller.listen();
  const rec = Recognition.latest as Recognition & { stop?: () => void };
  rec.stop = vi.fn();
  controller.finish();
  expect(callbacks.onText).not.toHaveBeenCalled();
  rec.onresult?.({ results: [[{ transcript: "gasolina em Maceió" }]] });
  rec.onend?.();
  expect(callbacks.onText).toHaveBeenCalledExactlyOnceWith("gasolina em Maceió");
});
