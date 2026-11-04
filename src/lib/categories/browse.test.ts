import { expect, it, vi } from "vitest";
import { browseCategory, distinctRecords, type BrowsePage } from "./browse";
import { GPC_SEGMENTS } from "@/lib/economiza/constants";
import { CATEGORY_TERMS } from "./catalog";
import { sale } from "@/lib/voice/test-fixtures";
const record = { ...sale("SABAO", 5), gpc: "47000000" };
const args = () => ({
  category: "47000000",
  terms: ["sabao", "detergente"],
  place: { tipo: "municipio" as const, codigoIBGE: 2704302 },
  days: 7,
  demo: false,
  cursor: { page: 1, sources: [0, 1] },
  signal: new AbortController().signal,
});
const success = (items = [record], ultimaPagina = true) => ({
  ok: true as const,
  demo: false,
  cached: false,
  fetchedAt: "2026-11-04T08:00:00Z",
  page: {
    items,
    ultimaPagina,
    totalRegistros: items.length,
    totalPaginas: 2,
    pagina: 1,
    registrosPorPagina: 50,
    registrosPagina: items.length,
    primeiraPagina: true,
    invalidCount: 0,
  },
});
it("cada categoria tem termos válidos e usa exatamente descrição + GPC + local", async () => {
  for (const g of GPC_SEGMENTS) expect(CATEGORY_TERMS[g.codigo]?.length).toBe(3);
  const search = vi.fn().mockResolvedValue(success());
  const page = await browseCategory(search, args());
  expect(search).toHaveBeenCalledTimes(2);
  expect(search.mock.calls[0]![0].data.query).toMatchObject({
    descricao: "sabao",
    gpc: "47000000",
    place: args().place,
    pagina: 1,
    registrosPorPagina: 50,
  });
  expect(page.items).toHaveLength(2);
  expect(distinctRecords([page])).toHaveLength(1);
});
it("exclui registros de outro GPC e mantém paginação mesmo com página filtrada vazia", async () => {
  const search = vi
    .fn()
    .mockResolvedValueOnce(success([{ ...record, gpc: "50000000" }], false))
    .mockResolvedValueOnce(success([], true));
  const page = await browseCategory(search, args());
  expect(page.items).toHaveLength(0);
  expect(page.next).toEqual({ page: 2, sources: [0] });
});
it("preserva respostas parciais e falha quando nenhuma fonte responde", async () => {
  const search = vi
    .fn()
    .mockResolvedValueOnce(success())
    .mockResolvedValue({ ok: false, message: "Indisponível" });
  expect((await browseCategory(search, args())).partial).toBe(true);
  await expect(browseCategory(search, args())).rejects.toThrow("Indisponível");
});
it("limita páginas e ignora respostas de consultas canceladas", async () => {
  const search = vi.fn().mockResolvedValue(success([record], false));
  const page = await browseCategory(search, { ...args(), cursor: { page: 3, sources: [0] } });
  expect(page.capped).toBe(true);
  expect(page.next).toBeUndefined();
  const ctrl = new AbortController();
  ctrl.abort();
  await expect(browseCategory(search, { ...args(), signal: ctrl.signal })).rejects.toThrow(
    "cancelada",
  );
});

it("falha de transporte em uma fonte não descarta produtos das outras", async () => {
  const search = vi
    .fn()
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(success());
  const page = await browseCategory(search, args());
  expect(page.partial).toBe(true);
  expect(page.items).toHaveLength(1);
});
