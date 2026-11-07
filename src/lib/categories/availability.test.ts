import type { ProductQuery } from "@/lib/economiza/validation";
import type { SearchResponse } from "@/lib/economiza/api.functions";
import { expect, it, vi } from "vitest";
import { checkCategoryAvailability, AVAILABILITY_BATCH_SIZE } from "./availability";
import { sale } from "@/lib/voice/test-fixtures";
const args = () => ({
  place: { tipo: "municipio" as const, codigoIBGE: 2704302 },
  days: 7,
  demo: false,
  offset: 0,
  signal: new AbortController().signal,
});
const response = (code: string, hasItems: boolean): SearchResponse => ({
  ok: true,
  cached: false,
  demo: false,
  fetchedAt: "2026-11-07T08:00:00Z",
  page: {
    items: hasItems ? [{ ...sale("PRODUTO"), gpc: code }] : [],
    ultimaPagina: true,
    pagina: 1,
    totalPaginas: 1,
    totalRegistros: hasItems ? 1 : 0,
    registrosPagina: hasItems ? 1 : 0,
    registrosPorPagina: 50,
    primeiraPagina: true,
    invalidCount: 0,
  },
});
it("retorna apenas categorias com registros compatíveis e tenta outros termos antes de omitir", async () => {
  let active = 0,
    max = 0;
  const search = vi.fn(async ({ data }: { data: { query: ProductQuery } }) => {
    active++;
    max = Math.max(max, active);
    await Promise.resolve();
    active--;
    return response(
      data.query.gpc!,
      data.query.gpc === "47000000" && data.query.descricao === "sabao",
    );
  });
  const result = await checkCategoryAvailability(search, args());
  expect(result.found.map((r) => r.code)).toEqual(["47000000"]);
  expect(result.checked).toBe(AVAILABILITY_BATCH_SIZE);
  expect(max).toBeLessThanOrEqual(4);
  expect(search.mock.calls.length).toBeLessThanOrEqual(AVAILABILITY_BATCH_SIZE * 3);
});
it("diferencia erro de categoria vazia e rejeita resultados com GPC incorreto", async () => {
  const search = vi.fn(async ({ data }: { data: { query: ProductQuery } }) =>
    data.query.gpc === "47000000"
      ? { ok: false as const, code: "unavailable", message: "Indisponível" }
      : response("99999999", true),
  );
  const result = await checkCategoryAvailability(search, args());
  expect(result.found).toHaveLength(0);
  expect(result.failed).toBe(1);
});
it("falha total não é apresentada como catálogo vazio e cancelamento impede consultas", async () => {
  await expect(
    checkCategoryAvailability(vi.fn().mockRejectedValue(new Error("offline")), args()),
  ).rejects.toThrow(/Não foi possível verificar/);
  const controller = new AbortController();
  controller.abort();
  const search = vi.fn();
  await expect(
    checkCategoryAvailability(search, { ...args(), signal: controller.signal }),
  ).rejects.toThrow(/cancelada/);
  expect(search).not.toHaveBeenCalled();
});
