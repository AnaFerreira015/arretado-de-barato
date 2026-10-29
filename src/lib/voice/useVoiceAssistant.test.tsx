import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SearchResponse } from "@/lib/economiza/api.functions";
import { prefsStore } from "@/lib/store";
import { useVoiceAssistant } from "./useVoiceAssistant";
import { sale } from "./test-fixtures";

const page = (pagina = 1, items = [sale("COCA ZERO 2L")], ultimaPagina = true): SearchResponse => ({
  ok: true, cached: false, demo: false, fetchedAt: "2026-10-29T12:00:00Z",
  page: { items, invalidCount: 0, pagina, ultimaPagina, primeiraPagina: pagina === 1, totalPaginas: 2, totalRegistros: 200, registrosPagina: 100, registrosPorPagina: 100 },
});
function setup(search = vi.fn().mockResolvedValue(page())) {
  const interpret = vi.fn().mockResolvedValue({ ok: false, code: "quota", message: "Continue pelo modo guiado." });
  const locate = vi.fn().mockRejectedValue(new Error("denied"));
  const hook = renderHook(() => useVoiceAssistant({ search, interpret, locate }));
  const answer = async (text: string) => { await act(async () => { await hook.result.current.answer(text); }); };
  const prepare = async () => { for (const text of ["buscar coca zero de dois litros", "manter", "manter", "Maceió"]) await answer(text); };
  return { ...hook, search, interpret, locate, answer, prepare };
}
afterEach(() => prefsStore.reset());
it("guia por texto sem IA e só consulta após confirmação", async () => {
  const h = setup(); await h.prepare();
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("confirmar busca");
  expect(h.search).toHaveBeenCalledWith({ data: { query: { descricao: "coca", place: { tipo: "municipio", codigoIBGE: 2704302 }, dias: 7, pagina: 1, registrosPorPagina: 100 }, demo: false } });
  expect(h.interpret).not.toHaveBeenCalled();
  expect(h.result.current.results).toHaveLength(1);
});
it("não confirma sem município e recusa GPS negado sem inventar local", async () => {
  const h = setup();
  await h.answer("confirmar");
  expect(h.search).not.toHaveBeenCalled();
  await act(async () => { await h.result.current.useLocation(); });
  expect(h.result.current.state.draft.coords).toBeNull();
  expect(h.result.current.state.message).toMatch(/município/);
});
it("consulta próximo cursor após vazio e repete página que falhou", async () => {
  const search = vi.fn().mockResolvedValueOnce(page(1, [], false)).mockResolvedValueOnce({ ok: false, code: "unavailable", message: "HTTP 500" }).mockResolvedValueOnce(page(2));
  const h = setup(search); await h.prepare(); await h.answer("confirmar");
  expect(h.result.current.canLoadMore).toBe(true);
  await h.answer("carregar mais"); await h.answer("carregar mais");
  expect(search.mock.calls.map(c => c[0].data.query.pagina)).toEqual([1, 2, 2]);
  expect(h.result.current.results).toHaveLength(1);
});
it("cancelamento descarta resposta tardia e impede paginação sem confirmação", async () => {
  let resolve!: (value: SearchResponse) => void;
  const search = vi.fn(() => new Promise<SearchResponse>(r => { resolve = r; }));
  const h = setup(search); await h.prepare();
  let pending!: Promise<void>;
  act(() => { pending = h.result.current.answer("confirmar"); });
  await h.answer("parar");
  await act(async () => { resolve(page()); await pending; });
  expect(h.result.current.results).toEqual([]);
  expect(h.result.current.state.busy).toBeNull();
});
it("edição invalida resultados e nova consulta exige confirmação", async () => {
  const h = setup(); await h.prepare(); await h.answer("confirmar");
  await h.answer("corrigir produto"); await h.answer("arroz");
  expect(h.result.current.results).toEqual([]);
  expect(h.search).toHaveBeenCalledTimes(1);
});
it("cota da IA preserva texto e fluxo guiado", async () => {
  const h = setup();
  await act(async () => { await h.result.current.interpret("arroz em Maceió"); });
  expect(h.result.current.state.transcript).toBe("arroz em Maceió");
  expect(h.result.current.state.message).toContain("guiado");
  await h.answer("arroz");
  expect(h.result.current.state.stage).toBe("size");
});
it("proposta de IA não reutiliza GPS anterior nem inicia consulta", async () => {
  const h = setup();
  h.locate.mockResolvedValueOnce({ lat: -9.6, lng: -35.7 } as never);
  await act(async () => { await h.result.current.useLocation(); });
  h.interpret.mockResolvedValueOnce({ ok: true, intent: { descricao: "arroz", embalagem: null, variante: null, municipio: null, raio: null, dias: null, esclarecer: false } });
  await act(async () => { await h.result.current.interpret("arroz"); });
  expect(h.result.current.state.draft.coords).toBeNull();
  expect(h.result.current.state.draft.municipio).toBe("");
  expect(h.search).not.toHaveBeenCalled();
});
it("não mistura demonstração e dados reais na paginação", async () => {
  const h = setup(vi.fn().mockResolvedValue(page(1, [], false)));
  await h.prepare(); await h.answer("confirmar");
  act(() => prefsStore.set(p => ({ ...p, demo: true })));
  await h.answer("carregar mais");
  expect(h.search).toHaveBeenCalledTimes(1);
  expect(h.result.current.state.stage).toBe("confirm");
});
it("navega resultados por texto mesmo sem síntese de voz", async () => {
  const h = setup(vi.fn().mockResolvedValue(page(1, [sale("COCA ZERO 2L", 6), sale("COCA ZERO 2L", 8, "b")])));
  await h.prepare(); await h.answer("confirmar"); await h.answer("próximo");
  expect(h.result.current.state.selected).toBe(1);
  expect(h.result.current.state.error).toBeNull();
  expect(h.result.current.state.message).toMatch(/Resultado 2/);
});
