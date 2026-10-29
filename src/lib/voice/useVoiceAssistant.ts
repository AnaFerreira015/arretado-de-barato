import { useEffect, useRef, useState } from "react";
import { searchProducts, type SearchResponse } from "@/lib/economiza/api.functions";
import type { SaleRecord, SearchPage } from "@/lib/economiza/adapter";
import { validateDescricao, validateProductQuery, type ProductQuery } from "@/lib/economiza/validation";
import { prefsStore } from "@/lib/store";
import { interpretVoice } from "./ai.functions";
import { aiIntentSchema, type InterpretResponse } from "./ai.schema";
import { parseCommand, parseProduct, parseSize, normalize, type ProductIntent } from "./intent";
import { describeRecord, rankVoiceRecords } from "./results";
import { createSpeechController, type AudioState, type SpeechController } from "./speech";
import { canonicalMunicipio, guidedNumber, newDraft, promptFor, queryFor, type Draft, type Stage } from "./flow";

type Services = {
  search(args: { data: { query: ProductQuery; demo: boolean } }): Promise<SearchResponse>;
  interpret(args: { data: { text: string } }): Promise<InterpretResponse>;
  locate(): Promise<{ lat: number; lng: number }>;
};
function locate(): ReturnType<Services["locate"]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("unavailable")); return; }
    navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), reject,
      { timeout: 12000, maximumAge: 120000, enableHighAccuracy: false });
  });
}
const defaults: Services = { search: searchProducts, interpret: interpretVoice, locate };
type Confirmed = { query: ProductQuery; intent: ProductIntent; demo: boolean };
type State = {
  draft: Draft; stage: Stage; busy: "search" | "more" | "ai" | "location" | null;
  message: string; error: string | null; transcript: string; aiAttempts: number;
  audio: AudioState; spoken: boolean; canListen: boolean; canSpeak: boolean;
  items: SaleRecord[]; meta: SearchPage | null; examined: number; selected: number;
  confirmed: Confirmed | null; resultDemo: boolean;
};
const initial = (): State => ({ draft: newDraft(), stage: "product", busy: null, message: promptFor("product", newDraft()), error: null,
  transcript: "", aiAttempts: 0, audio: "idle", spoken: false, canListen: false, canSpeak: false,
  items: [], meta: null, examined: 0, selected: 0, confirmed: null, resultDemo: false });

export function useVoiceAssistant(overrides: Partial<Services> = {}) {
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const services = useRef({ ...defaults, ...overrides }); services.current = { ...defaults, ...overrides };
  const speech = useRef<SpeechController | null>(null);
  const request = useRef(0);
  const narration = useRef(state.message);
  const answerRef = useRef<(text: string) => Promise<void>>(async () => {});
  function update(patch: Partial<State>) {
    current.current = { ...current.current, ...patch }; setState(current.current);
  }
  function announce(message: string, error = false) {
    narration.current = message;
    update({ message, error: error ? message : null });
    if (current.current.spoken) speech.current?.speak(message);
  }
  function advance(stage: Stage, draft = current.current.draft) {
    update({ stage, draft }); announce(promptFor(stage, draft));
  }
  function invalidate() {
    request.current++; speech.current?.stop();
    update({ busy: null, confirmed: null, items: [], meta: null, examined: 0, selected: 0 });
  }
  function stop() {
    request.current++; speech.current?.stop(); update({ busy: null });
    update({ message: "Ação interrompida. Você pode continuar pelos controles ou por texto.", error: null });
  }
  useEffect(() => {
    const controller = createSpeechController({
      onText(text) { void answerRef.current(text); },
      onState(audio) { update({ audio }); },
      onError(message) { update({ message, error: message }); },
    });
    speech.current = controller;
    update({ canListen: controller.canListen, canSpeak: controller.canSpeak });
    return () => { request.current++; controller.dispose(); speech.current = null; };
  }, []);

  function getResults() {
    const s = current.current;
    return s.confirmed ? rankVoiceRecords(s.items, s.confirmed.intent) : [];
  }
  function readResults(next = false) {
    const results = getResults();
    if (!results.length) { announce("Não há resultados para ler. Você pode corrigir a busca ou carregar mais resultados, se disponível."); return; }
    const s = current.current;
    const index = next ? Math.min(s.selected + 1, results.length - 1) : 0;
    update({ selected: index });
    const texts = next ? [describeRecord(results[index]!, index + 1, s.resultDemo)]
      : results.slice(0, 3).map((r, i) => describeRecord(r, i + 1, s.resultDemo));
    const intro = next ? "" : `Até três menores preços entre os registros carregados. ${s.confirmed?.intent.embalagem ? "" : "Os tamanhos podem variar. "}`;
    const text = intro + texts.join(" ");
    narration.current = text;
    update({ message: next ? text : "Lendo até três menores preços entre os registros carregados. Use Parar para interromper.", error: null });
    if (!next || s.spoken) speech.current?.speak(text);
  }
  async function run(more = false) {
    const s = current.current;
    if (s.busy) return;
    if (!more && s.stage !== "confirm") { announce("Conclua os campos e confira a busca antes de confirmar.", true); return; }
    if (more && (!s.confirmed || !s.meta || s.meta.ultimaPagina)) { announce("Não há próxima página disponível."); return; }
    const demo = prefsStore.get().demo;
    if (more && demo !== s.confirmed!.demo) {
      invalidate(); advance("confirm"); announce("O modo demonstrativo mudou. Confirme uma nova busca para não misturar os dados."); return;
    }
    const query = more ? { ...s.confirmed!.query, pagina: s.meta!.pagina + 1 } : queryFor(s.draft);
    if (!query) { advance("place"); return; }
    const validated = validateProductQuery(query);
    if (!validated.ok) { announce(Object.values(validated.errors).join(" "), true); return; }
    if (s.draft.embalagem && !parseSize(s.draft.embalagem)) { advance("size"); return; }
    const confirmed: Confirmed = more ? s.confirmed! : { query, intent: { descricao: s.draft.descricao, embalagem: s.draft.embalagem, variante: s.draft.variante }, demo };
    speech.current?.stop(); const id = ++request.current;
    update({ busy: more ? "more" : "search", error: null, confirmed,
      ...(more ? {} : { items: [], meta: null, examined: 0, selected: 0 }) });
    announce("Pesquisando produtos. Você pode cancelar a consulta.");
    let result: SearchResponse;
    try { result = await services.current.search({ data: { query, demo } }); }
    catch { result = { ok: false, code: "unavailable", message: "Não foi possível falar com o servidor. Confira sua conexão e tente novamente." }; }
    if (id !== request.current) return;
    update({ busy: null });
    if (!result.ok) { announce([result.message, result.detail].filter(Boolean).join(" "), true); return; }
    const items = more ? [...s.items, ...result.page.items] : result.page.items;
    const examined = (more ? s.examined : 0) + result.page.registrosPagina;
    update({ items, meta: result.page, examined, selected: 0, stage: "results", resultDemo: result.demo });
    const matches = getResults();
    const summary = `${result.demo ? "Dados demonstrativos. " : ""}${matches.length} correspondências entre ${examined} registros consultados. ${matches.length ? "Mostrando até três menores preços entre os registros carregados." : "Nenhuma correspondência nas páginas carregadas."} ${confirmed.intent.embalagem ? "" : "Os tamanhos podem variar. "}${!result.page.ultimaPagina ? "Você pode carregar mais resultados." : "Última página."}`;
    announce(summary);
  }
  async function useLocation() {
    invalidate(); const id = ++request.current; update({ busy: "location" }); announce("Obtendo localização. Você pode cancelar e escolher um município.");
    try {
      const coords = await services.current.locate();
      if (id !== request.current) return;
      if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng) || Math.abs(coords.lat) > 90 || Math.abs(coords.lng) > 180) throw new Error("invalid coordinates");
      update({ busy: null }); advance(current.current.stage === "place" ? "radius" : current.current.stage, { ...current.current.draft, coords, municipio: "" });
    } catch {
      if (id !== request.current) return;
      update({ busy: null, draft: { ...current.current.draft, coords: null } });
      advance("place"); announce("Não foi possível obter a localização. Escolha um município de Alagoas.", true);
    }
  }
  async function interpret(text: string) {
    if (current.current.busy) return;
    if (!text.trim() || text.trim().length > 500) { announce("Escreva um pedido de até 500 caracteres.", true); return; }
    if (current.current.aiAttempts >= 5) { announce("Limite de interpretações desta visita atingido. Continue pelo modo guiado.", true); return; }
    invalidate(); const id = ++request.current;
    update({ busy: "ai", transcript: text, aiAttempts: current.current.aiAttempts + 1 }); announce("Interpretando pedido com IA. Você ainda vai conferir antes de pesquisar.");
    let result: InterpretResponse;
    try { result = await services.current.interpret({ data: { text } }); }
    catch { result = { ok: false, code: "unavailable", message: "A IA não respondeu. Continue pelo modo guiado; seu texto foi mantido." }; }
    if (id !== request.current) return;
    update({ busy: null });
    if (!result.ok) { announce(result.message, true); return; }
    const parsed = aiIntentSchema.safeParse(result.intent);
    if (!parsed.success) { announce("A IA retornou campos inválidos. Continue pelo modo guiado.", true); return; }
    const intent = parsed.data;
    const draft: Draft = { ...newDraft(), descricao: intent.descricao ?? "", embalagem: intent.embalagem ?? "", variante: intent.variante ?? "",
      municipio: intent.municipio ? canonicalMunicipio(intent.municipio)! : "", raio: intent.raio ?? 5, dias: intent.dias ?? 7 };
    // Always walk through the fields again: partial interpretations must not silently drop restrictions.
    advance(intent.esclarecer || !draft.descricao ? "product" : "size", draft);
    if (intent.esclarecer) announce("O pedido precisa de esclarecimento. Vamos pesquisar um produto por vez. Qual produto?", true);
  }
  async function answer(text: string) {
    const value = text.trim(); if (!value) return;
    update({ transcript: value });
    const command = parseCommand(value);
    if (command === "stop") { stop(); return; }
    if (command === "restart") { invalidate(); advance("product", newDraft()); return; }
    const edits = { editProduct: "product", editSize: "size", editVariant: "variant", editPlace: "place", editRadius: "radius", editDays: "days" } as const;
    if (command && command in edits) { invalidate(); advance(edits[command as keyof typeof edits]); return; }
    if (current.current.busy) { announce("Aguarde ou use Parar para cancelar a ação em andamento."); return; }
    if (command === "confirm") { await run(); return; }
    if (command === "more") { await run(true); return; }
    if (command === "next" || command === "read") { readResults(command === "next"); return; }
    if (command === "repeat") { speech.current?.speak(narration.current); return; }
    if (command === "location") { await useLocation(); return; }
    if (command === "help") { announce("Use Falar ou digite sua resposta e pressione Enviar. Comandos: confirmar busca, corrigir produto, corrigir embalagem, corrigir variante, corrigir município, corrigir raio, corrigir período, ouvir resultados, próximo, carregar mais, repetir, parar e nova busca."); return; }
    const { draft, stage } = current.current; const normalized = normalize(value).replace(/[.!?]+$/, "");
    if (stage === "product") {
      const product = parseProduct(value);
      const error = validateDescricao(product.descricao);
      if (error) { announce(error, true); return; }
      invalidate(); advance("size", { ...draft, ...product });
    } else if (stage === "size") {
      const embalagem = normalized === "manter" ? draft.embalagem : /^(qualquer|qualquer embalagem)$/.test(normalized) ? "" : value;
      if (embalagem && !parseSize(embalagem)) { announce("Informe um tamanho simples, como 2 litros ou 500 gramas, ou diga qualquer embalagem.", true); return; }
      advance("variant", { ...draft, embalagem });
    } else if (stage === "variant") {
      const variante = normalized === "manter" ? draft.variante : /^(qualquer|qualquer variante)$/.test(normalized) ? "" : value;
      if (variante.length > 50) { announce("Use até 50 caracteres para a variante.", true); return; }
      advance("place", { ...draft, variante });
    } else if (stage === "place") {
      const municipio = canonicalMunicipio(value);
      if (!municipio) { announce("Não identifiquei esse município. Escolha um nome da lista de Alagoas.", true); return; }
      advance("confirm", { ...draft, municipio, coords: null });
    } else if (stage === "radius" || stage === "days") {
      const number = guidedNumber(normalized); const max = stage === "radius" ? 15 : 10;
      if (!Number.isInteger(number) || number < 1 || number > max) { announce(`Informe um número inteiro de 1 a ${max}.`, true); return; }
      advance("confirm", { ...draft, [stage === "radius" ? "raio" : "dias"]: number });
    } else { announce(promptFor(stage, draft), true); }
  }
  answerRef.current = answer;
  const results = state.confirmed ? rankVoiceRecords(state.items, state.confirmed.intent) : [];
  return { state, results, canLoadMore: !!state.meta && !state.meta.ultimaPagina && !!state.confirmed,
    answer, interpret, useLocation, stop,
    listen() { if (!current.current.busy) speech.current?.listen(); },
    setSpoken(enabled: boolean) { update({ spoken: enabled }); if (enabled) speech.current?.speak(current.current.message); else speech.current?.stop(); },
  };
}
