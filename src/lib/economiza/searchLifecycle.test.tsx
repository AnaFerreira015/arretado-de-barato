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
