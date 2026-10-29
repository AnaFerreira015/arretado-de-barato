import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SearchResponse } from "@/lib/economiza/api.functions";
import { prefsStore } from "@/lib/store";
import { useVoiceAssistant } from "./useVoiceAssistant";
import { sale } from "./test-fixtures";

const page = (pagina = 1, items = [sale("COCA ZERO 2L")], ultimaPagina = true): SearchResponse => ({
  ok: true,
  cached: false,
  demo: false,
  fetchedAt: "2026-10-29T12:00:00Z",
  page: {
    items,
    invalidCount: 0,
    pagina,
    ultimaPagina,
    primeiraPagina: pagina === 1,
    totalPaginas: 2,
    totalRegistros: 200,
    registrosPagina: 100,
    registrosPorPagina: 100,
  },
});
function setup(search = vi.fn().mockResolvedValue(page())) {
  const interpret = vi
    .fn()
    .mockResolvedValue({ ok: false, code: "quota", message: "Continue pelo modo guiado." });
  const locate = vi.fn().mockRejectedValue(new Error("denied"));
  const hook = renderHook(() => useVoiceAssistant({ search, interpret, locate }));
  const answer = async (text: string) => {
    await act(async () => {
      await hook.result.current.answer(text);
    });
  };
  const prepare = async () => {
    for (const text of ["buscar coca zero de dois litros", "manter", "manter", "Maceió"])
      await answer(text);
  };
  return { ...hook, search, interpret, locate, answer, prepare };
}
afterEach(() => prefsStore.reset());
it("guia por texto sem IA e só consulta após confirmação", async () => {
  const h = setup();
  await h.prepare();
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("confirmar busca");
  expect(h.search).toHaveBeenCalledWith({
    data: {
      query: {
        descricao: "coca",
        place: { tipo: "municipio", codigoIBGE: 2704302 },
        dias: 7,
        pagina: 1,
        registrosPorPagina: 100,
      },
      demo: false,
    },
  });
  expect(h.interpret).not.toHaveBeenCalled();
  expect(h.result.current.results).toHaveLength(1);
});
it("não confirma sem município e recusa GPS negado sem inventar local", async () => {
  const h = setup();
  await h.answer("confirmar");
  expect(h.search).not.toHaveBeenCalled();
  await act(async () => {
    await h.result.current.requestLocation();
  });
  expect(h.result.current.state.draft.coords).toBeNull();
  expect(h.result.current.state.message).toMatch(/município/);
});
it("consulta próximo cursor após vazio e repete página que falhou", async () => {
  const search = vi
    .fn()
    .mockResolvedValueOnce(page(1, [], false))
    .mockResolvedValueOnce({ ok: false, code: "unavailable", message: "HTTP 500" })
    .mockResolvedValueOnce(page(2));
  const h = setup(search);
  await h.prepare();
  await h.answer("confirmar");
  expect(h.result.current.canLoadMore).toBe(true);
  await h.answer("carregar mais");
  await h.answer("carregar mais");
  expect(search.mock.calls.map((c) => c[0].data.query.pagina)).toEqual([1, 2, 2]);
  expect(h.result.current.results).toHaveLength(1);
});
it("cancelamento descarta resposta tardia e impede paginação sem confirmação", async () => {
  let resolve!: (value: SearchResponse) => void;
  const search = vi.fn(
    () =>
      new Promise<SearchResponse>((r) => {
        resolve = r;
      }),
  );
  const h = setup(search);
  await h.prepare();
  let pending!: Promise<void>;
  act(() => {
    pending = h.result.current.answer("confirmar");
  });
  await h.answer("parar");
  await act(async () => {
    resolve(page());
    await pending;
  });
  expect(h.result.current.results).toEqual([]);
  expect(h.result.current.state.busy).toBeNull();
});
it("edição invalida resultados e nova consulta exige confirmação", async () => {
  const h = setup();
  await h.prepare();
  await h.answer("confirmar");
  await h.answer("corrigir produto");
  await h.answer("arroz");
  expect(h.result.current.results).toEqual([]);
  expect(h.search).toHaveBeenCalledTimes(1);
});
it("cota da IA preserva texto e fluxo guiado", async () => {
  const h = setup();
  await act(async () => {
    await h.result.current.interpret("arroz em Maceió");
  });
  expect(h.result.current.state.transcript).toBe("arroz em Maceió");
  expect(h.result.current.state.message).toContain("guiado");
  await h.answer("arroz");
  expect(h.result.current.state.stage).toBe("size");
});
it("proposta de IA não reutiliza GPS anterior nem inicia consulta", async () => {
  const h = setup();
  h.locate.mockResolvedValueOnce({ lat: -9.6, lng: -35.7 } as never);
  await act(async () => {
    await h.result.current.requestLocation();
  });
  h.interpret.mockResolvedValueOnce({
    ok: true,
    intent: {
      descricao: "arroz",
      embalagem: null,
      variante: null,
      municipio: null,
      raio: null,
      dias: null,
      esclarecer: false,
    },
  });
  await act(async () => {
    await h.result.current.interpret("arroz");
  });
  expect(h.result.current.state.draft.coords).toBeNull();
  expect(h.result.current.state.draft.municipio).toBe("");
  expect(h.search).not.toHaveBeenCalled();
});
it("não mistura demonstração e dados reais na paginação", async () => {
  const h = setup(vi.fn().mockResolvedValue(page(1, [], false)));
  await h.prepare();
  await h.answer("confirmar");
  act(() => prefsStore.set((p) => ({ ...p, demo: true })));
  await h.answer("carregar mais");
  expect(h.search).toHaveBeenCalledTimes(1);
  expect(h.result.current.state.stage).toBe("confirm");
});
it("navega resultados por texto mesmo sem síntese de voz", async () => {
  const h = setup(
    vi.fn().mockResolvedValue(page(1, [sale("COCA ZERO 2L", 6), sale("COCA ZERO 2L", 8, "b")])),
  );
  await h.prepare();
  await h.answer("confirmar");
  await h.answer("próximo");
  expect(h.result.current.state.selected).toBe(1);
  expect(h.result.current.state.error).toBeNull();
  expect(h.result.current.state.message).toMatch(/Resultado 2/);
});
it.each(["quota", "invalid"])("IA com %s invalida a confirmação anterior e o GPS", async (mode) => {
  const h = setup();
  await h.prepare();
  h.locate.mockResolvedValueOnce({ lat: -9.6, lng: -35.7 } as never);
  await act(async () => {
    await h.result.current.requestLocation();
  });
  expect(h.result.current.state.stage).toBe("confirm");
  if (mode === "invalid")
    h.interpret.mockResolvedValueOnce({
      ok: true,
      intent: {
        descricao: "arroz",
        embalagem: null,
        variante: null,
        municipio: null,
        raio: null,
        dias: null,
        esclarecer: false,
        latitude: -9,
      },
    });
  await act(async () => {
    await h.result.current.interpret("arroz");
  });
  await h.answer("confirmar");
  expect(h.search).not.toHaveBeenCalled();
  expect(h.result.current.state.stage).toBe("product");
  expect(h.result.current.state.draft.coords).toBeNull();
  expect(h.result.current.state.draft.descricao).toBe("");
});

it("consulta combustíveis sem embalagem e confirma município extraído", async () => {
  const search = vi.fn();
  const searchFuel = vi
    .fn()
    .mockResolvedValue(
      page(1, [{ ...sale("GAS COMUM", 5.899), kind: "combustivel", unidade: "LT" }]),
    );
  const h = renderHook(() => useVoiceAssistant({ search, searchFuel }));
  await act(async () => {
    await h.result.current.answer("buscar gasolina comum mais barata em Maceió");
  });
  expect(h.result.current.state.stage).toBe("confirm");
  expect(searchFuel).not.toHaveBeenCalled();
  await act(async () => {
    await h.result.current.answer("confirmar");
  });
  expect(search).not.toHaveBeenCalled();
  expect(searchFuel).toHaveBeenCalledWith({
    data: {
      query: {
        tipoCombustivel: 1,
        place: { tipo: "municipio", codigoIBGE: 2704302 },
        dias: 7,
        pagina: 1,
        registrosPorPagina: 100,
      },
      demo: false,
    },
  });
  expect(h.result.current.results).toHaveLength(1);
  expect(h.result.current.state.message).not.toContain("tamanhos");
});
it("gasolina ambígua exige tipo e troca de modo descarta resposta tardia", async () => {
  let resolve!: (value: SearchResponse) => void;
  const searchFuel = vi.fn(
    () =>
      new Promise<SearchResponse>((r) => {
        resolve = r;
      }),
  );
  const h = renderHook(() => useVoiceAssistant({ searchFuel }));
  await act(async () => {
    await h.result.current.answer("gasolina");
  });
  expect(h.result.current.state.stage).toBe("fuel");
  await act(async () => {
    await h.result.current.answer("confirmar");
  });
  expect(searchFuel).not.toHaveBeenCalled();
  for (const text of ["gasolina aditivada", "Maceió"])
    await act(async () => {
      await h.result.current.answer(text);
    });
  let pending!: Promise<void>;
  act(() => {
    pending = h.result.current.answer("confirmar");
  });
  act(() => h.result.current.setMode("produto"));
  await act(async () => {
    resolve(page());
    await pending;
  });
  expect(h.result.current.results).toEqual([]);
  expect(h.result.current.state.stage).toBe("product");
});
it("IA identifica combustível e apresenta confirmação sem perguntar tipo novamente", async () => {
  const interpret = vi.fn().mockResolvedValue({
    ok: true,
    intent: {
      tipoBusca: "combustivel",
      tipoCombustivel: 6,
      descricao: null,
      embalagem: null,
      variante: null,
      municipio: "Maceió",
      raio: null,
      dias: null,
      esclarecer: false,
    },
  });
  const searchFuel = vi.fn();
  const h = renderHook(() => useVoiceAssistant({ interpret, searchFuel }));
  await act(async () => {
    await h.result.current.interpret("GNV em Maceió");
  });
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.result.current.state.draft.tipoCombustivel).toBe(6);
  expect(searchFuel).not.toHaveBeenCalled();
  await act(async () => {
    await h.result.current.answer("manter");
  });
  expect(h.result.current.state.stage).toBe("confirm");
});

it("preserva álcool como produto e reconhece o sinônimo no modo combustível", async () => {
  const h = renderHook(() => useVoiceAssistant());
  await act(async () => {
    await h.result.current.answer("álcool");
  });
  expect(h.result.current.state.draft.mode).toBe("produto");
  expect(h.result.current.state.stage).toBe("size");
  act(() => h.result.current.setMode("combustivel"));
  await act(async () => {
    await h.result.current.answer("álcool");
  });
  expect(h.result.current.state.draft.tipoCombustivel).toBe(3);
});
it("esclarecimento da IA exige nova escolha de um combustível", async () => {
  const interpret = vi.fn().mockResolvedValue({
    ok: true,
    intent: {
      tipoBusca: "combustivel",
      tipoCombustivel: 1,
      descricao: null,
      embalagem: null,
      variante: null,
      municipio: "Maceió",
      raio: null,
      dias: null,
      esclarecer: true,
    },
  });
  const searchFuel = vi.fn();
  const h = renderHook(() => useVoiceAssistant({ interpret, searchFuel }));
  await act(async () => {
    await h.result.current.interpret("gasolina e etanol em Maceió");
  });
  expect(h.result.current.state.draft.tipoCombustivel).toBeNull();
  expect(h.result.current.state.message).toContain("um combustível por vez");
  await act(async () => {
    await h.result.current.answer("manter");
    await h.result.current.answer("confirmar");
  });
  expect(searchFuel).not.toHaveBeenCalled();
  expect(h.result.current.state.stage).toBe("fuel");
});

it("preenche pedido natural completo e confirma com resposta curta", async () => {
  const h = setup();
  await h.answer("eu queria uma Coca zero de dois litros em Maceió, por favor");
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.result.current.state.draft).toMatchObject({
    descricao: "coca",
    embalagem: "2 l",
    variante: "zero",
    municipio: "Maceió",
  });
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("sim");
  expect(h.search).toHaveBeenCalledTimes(1);
});
it("corrige tamanho no resumo sem perder variante e exige nova confirmação", async () => {
  const h = setup();
  await h.answer("quero coca zero dois litros em Maceió");
  await h.answer("na verdade, quero de um litro");
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.result.current.state.draft).toMatchObject({
    descricao: "coca",
    embalagem: "1 l",
    variante: "zero",
    municipio: "Maceió",
  });
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("não pode pesquisar");
  expect(h.search).not.toHaveBeenCalled();
});
it("encaminha frase livre à IA e não pergunta campos já preenchidos", async () => {
  const h = setup();
  h.interpret.mockResolvedValueOnce({
    ok: true,
    intent: {
      descricao: "coca",
      embalagem: "2 litros",
      variante: "zero",
      municipio: "Maceió",
      raio: null,
      dias: null,
      esclarecer: false,
    },
  });
  await h.answer("onde encontro coca zero de dois litros com o melhor preço em Maceió?");
  expect(h.interpret).toHaveBeenCalledTimes(1);
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.search).not.toHaveBeenCalled();
});
it("falha da IA impede executar o pedido anterior e permite retomar manualmente", async () => {
  const h = setup();
  await h.prepare();
  await h.answer("quero algo diferente que combine com meu café");
  expect(h.interpret).toHaveBeenCalledTimes(1);
  await h.answer("sim");
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("arroz");
  expect(h.result.current.state.draft.descricao).toBe("arroz");
});
it("opção sem IA mantém comandos locais e não envia frases complexas", async () => {
  const h = setup();
  act(() => h.result.current.setAutomaticAi(false));
  await h.answer("onde posso encontrar algo para o café?");
  expect(h.interpret).not.toHaveBeenCalled();
  expect(h.result.current.state.message).toMatch(/nome|guiad/);
});
it("GPS em frase completa pede permissão e preserva o produto", async () => {
  const h = setup();
  h.locate.mockResolvedValueOnce({ lat: -9.6, lng: -35.7 } as never);
  await h.answer("quero coca de dois litros perto de mim");
  expect(h.locate).toHaveBeenCalledTimes(1);
  expect(h.result.current.state.draft).toMatchObject({
    descricao: "coca",
    coords: { lat: -9.6, lng: -35.7 },
  });
  expect(h.result.current.state.stage).toBe("confirm");
});
it("cancelamento descarta interpretação automática tardia", async () => {
  const h = setup();
  let resolve!: (v: unknown) => void;
  h.interpret.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let pending!: Promise<void>;
  act(() => {
    pending = h.result.current.answer("onde encontro leite que não tenha lactose?");
  });
  await h.answer("pode parar");
  await act(async () => {
    resolve({
      ok: true,
      intent: {
        descricao: "leite",
        embalagem: null,
        variante: "sem lactose",
        municipio: "Maceió",
        raio: null,
        dias: null,
        esclarecer: false,
      },
    });
    await pending;
  });
  expect(h.result.current.state.draft.descricao).toBe("");
  expect(h.result.current.state.stage).not.toBe("confirm");
});
it("pedido não compreendido sem IA invalida confirmação antiga", async () => {
  const h = setup();
  await h.prepare();
  act(() => h.result.current.setAutomaticAi(false));
  await h.answer("onde encontro outro produto para meu café?");
  await h.answer("sim");
  expect(h.search).not.toHaveBeenCalled();
  expect(h.result.current.state.stage).not.toBe("confirm");
});
it("resposta tanto faz não precisa da IA", async () => {
  const h = setup();
  await h.answer("arroz");
  await h.answer("não tenho preferência");
  await h.answer("tanto faz");
  await h.answer("pode ser em Maceió");
  expect(h.interpret).not.toHaveBeenCalled();
  expect(h.result.current.state.stage).toBe("confirm");
});
it("correção complexa leva contexto atual mas nunca GPS à IA", async () => {
  const h = setup();
  h.locate.mockResolvedValueOnce({ lat: -9.6, lng: -35.7 } as never);
  await h.answer("quero coca zero dois litros perto de mim");
  h.interpret.mockResolvedValueOnce({
    ok: true,
    intent: {
      descricao: "coca",
      embalagem: "2 litros",
      variante: "sem açúcar",
      municipio: null,
      raio: 5,
      dias: 7,
      esclarecer: false,
    },
  });
  await h.answer("na verdade prefiro aquela sem açúcar");
  const sent = h.interpret.mock.calls[0]?.[0];
  expect(sent.data.context).toMatchObject({ descricao: "coca", variante: "zero" });
  expect(JSON.stringify(sent)).not.toMatch(/coords|latitude|longitude|-9.6|-35.7/);
  expect(h.result.current.state.draft.coords).toEqual({ lat: -9.6, lng: -35.7 });
  expect(h.result.current.state.stage).toBe("confirm");
  expect(h.search).not.toHaveBeenCalled();
});
