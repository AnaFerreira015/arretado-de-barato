import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createSearchStore, useSearchRunner } from "./useSearch";
import type { ProductQuery } from "./validation";
import type { SearchResponse } from "./api.functions";
it("ignora resposta quando o painel deixa a tela", async () => {
  const store = createSearchStore<ProductQuery>();
  let resolve!: (response: SearchResponse) => void;
  const fn = vi.fn(
    () =>
      new Promise<SearchResponse>((r) => {
        resolve = r;
      }),
  );
  const hook = renderHook(() => useSearchRunner(store, fn));
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.run(
      {
        descricao: "arroz",
        place: { tipo: "municipio", codigoIBGE: 2704302 },
        dias: 7,
        pagina: 1,
        registrosPorPagina: 100,
      },
      "new",
    );
  });
  hook.unmount();
  await act(async () => {
    resolve({ ok: false, code: "unavailable", message: "resposta antiga" });
    await pending;
  });
  expect(store.get().status).toBe("idle");
  expect(store.get().error).toBeNull();
});
it("mantém paginação disponível quando página carregada não tinha correspondências", async () => {
  const store = createSearchStore<ProductQuery>();
  const query: ProductQuery = {
    descricao: "coca",
    place: { tipo: "municipio", codigoIBGE: 2704302 },
    dias: 7,
    pagina: 1,
    registrosPorPagina: 100,
  };
  store.set((s) => ({
    ...s,
    status: "success",
    query,
    items: [],
    meta: {
      pagina: 1,
      totalPaginas: 2,
      totalRegistros: 200,
      registrosPagina: 100,
      registrosPorPagina: 100,
      primeiraPagina: true,
      ultimaPagina: false,
    },
  }));
  let resolve!: (response: SearchResponse) => void;
  const fn = vi.fn(
    () =>
      new Promise<SearchResponse>((r) => {
        resolve = r;
      }),
  );
  const hook = renderHook(() => useSearchRunner(store, fn));
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.run({ ...query, pagina: 2 }, "more");
  });
  hook.unmount();
  expect(store.get().status).toBe("success");
  await act(async () => {
    resolve({ ok: false, code: "unavailable", message: "antiga" });
    await pending;
  });
  expect(store.get().meta?.pagina).toBe(1);
  expect(store.get().error).toBeNull();
});
