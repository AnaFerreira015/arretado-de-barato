import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useVoiceAssistant } from "./useVoiceAssistant";
const page = {
  ok: true,
  demo: false,
  cached: false,
  fetchedAt: "2026-11-02",
  page: {
    items: [],
    invalidCount: 0,
    pagina: 1,
    totalPaginas: 1,
    totalRegistros: 0,
    registrosPagina: 0,
    registrosPorPagina: 100,
    primeiraPagina: true,
    ultimaPagina: true,
  },
};
const intent = {
  descricao: "leite",
  embalagem: null,
  variante: "sem lactose",
  municipio: "Maceió",
  raio: null,
  dias: null,
  esclarecer: false,
};
function setup() {
  const search = vi.fn().mockResolvedValue(page);
  const interpret = vi.fn().mockResolvedValue({ ok: true, intent });
  const locate = vi.fn().mockRejectedValue(new Error("denied"));
  const hook = renderHook(() => useVoiceAssistant({ search, interpret, locate }));
  const answer = async (text: string) => {
    await act(async () => {
      await hook.result.current.answer(text);
    });
  };
  return { ...hook, search, interpret, locate, answer };
}
it("frase sem prefixo conhecido usa IA e consulta sem confirmação", async () => {
  const h = setup();
  await h.answer("Será que acho leite sem lactose em Maceió");
  expect(h.interpret).toHaveBeenCalledTimes(1);
  expect(h.search).toHaveBeenCalledTimes(1);
  expect(h.search.mock.calls[0]?.[0].data.query.descricao).toBe("leite");
  expect(h.result.current.state.stage).toBe("results");
});
it("pedido local completo consulta uma vez e correção atualiza automaticamente", async () => {
  const h = setup();
  await h.answer("quero coca zero de dois litros em Maceió");
  expect(h.search).toHaveBeenCalledTimes(1);
  await h.answer("na verdade quero de um litro");
  expect(h.search).toHaveBeenCalledTimes(2);
  expect(h.result.current.state.draft).toMatchObject({
    descricao: "coca",
    embalagem: "1 l",
    variante: "zero",
  });
});
it("pede apenas cidade quando ela falta e consulta depois da resposta", async () => {
  const h = setup();
  await h.answer("quero arroz");
  expect(h.result.current.state.stage).toBe("place");
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("Maceió");
  expect(h.search).toHaveBeenCalledTimes(1);
});
it("fala livre durante pergunta de tamanho vai à IA, não ao campo literal", async () => {
  const h = setup();
  await h.answer("corrigir embalagem");
  await h.answer("A garrafa menor de leite sem lactose em Maceió");
  expect(h.interpret).toHaveBeenCalledTimes(1);
  expect(h.result.current.state.stage).toBe("results");
});
it("ambiguidades perguntam especificamente e não são executadas com sim", async () => {
  const h = setup();
  h.interpret.mockResolvedValueOnce({
    ok: true,
    intent: { ...intent, esclarecer: true, pergunta: "Você quer leite integral ou desnatado?" },
  });
  await h.answer("Pode ser daquele leite que eu falei");
  expect(h.result.current.state.message).toContain("integral ou desnatado");
  await h.answer("sim");
  expect(h.search).not.toHaveBeenCalled();
});
it("GPS negado não executa busca e pede município", async () => {
  const h = setup();
  await h.answer("quero arroz perto de mim");
  expect(h.locate).toHaveBeenCalledTimes(1);
  expect(h.search).not.toHaveBeenCalled();
  expect(h.result.current.state.stage).toBe("place");
});
it("cancelar interpretação impede busca automática tardia", async () => {
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
    pending = h.result.current.answer("Será que acho aquele leite em Maceió");
  });
  await h.answer("parar");
  await act(async () => {
    resolve({ ok: true, intent });
    await pending;
  });
  expect(h.search).not.toHaveBeenCalled();
});
it("opção de confirmação manual continua disponível", async () => {
  const h = setup();
  act(() => h.result.current.setAutomaticSearch(false));
  await h.answer("quero arroz em Maceió");
  expect(h.search).not.toHaveBeenCalled();
  await h.answer("pode buscar");
  expect(h.search).toHaveBeenCalledTimes(1);
});

it("continua interpretando depois de cinco pedidos sem limite artificial", async () => {
  const h = setup();
  for (let i = 0; i < 6; i++) await h.answer("Será que acho aquele leite em Maceió");
  expect(h.interpret).toHaveBeenCalledTimes(6);
  expect(h.search).toHaveBeenCalledTimes(6);
});
it("falha de interpretação não executa rascunho anterior", async () => {
  const h = setup();
  await h.answer("quero arroz em Maceió");
  h.interpret.mockResolvedValueOnce({ ok: false, code: "quota", message: "Cota esgotada" });
  await h.answer("Será que acho outra coisa");
  await h.answer("sim");
  expect(h.search).toHaveBeenCalledTimes(1);
});
it("resposta ao esclarecimento recebe a pergunta no contexto", async () => {
  const h = setup();
  h.interpret.mockResolvedValueOnce({
    ok: true,
    intent: { ...intent, esclarecer: true, pergunta: "Integral ou desnatado?" },
  });
  await h.answer("Será que acho aquele leite em Maceió");
  await h.answer("desnatado");
  expect(h.interpret.mock.calls[1]?.[0].data.context.pergunta).toBe("Integral ou desnatado?");
  expect(h.search).toHaveBeenCalledTimes(1);
});
