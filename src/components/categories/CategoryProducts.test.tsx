import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CategoryProducts } from "./CategoryProducts";
import { productFormStore } from "@/lib/economiza/searchStores";
import { prefsStore } from "@/lib/store";
import { sale } from "@/lib/voice/test-fixtures";
const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/economiza/api.functions", () => ({ searchProducts: search }));
vi.mock("@/components/eal/RecordCard", () => ({
  RecordCard: ({ r }: { r: { descricao: string } }) => <article>{r.descricao}</article>,
}));
vi.mock("@/components/eal/RecordDetailDialog", () => ({ RecordDetailDialog: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  productFormStore.reset();
  prefsStore.reset();
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (category: string) => (
    <QueryClientProvider client={client}>
      <CategoryProducts key={category} category={category} />
    </QueryClientProvider>
  );
  return { client, view };
}
it("carrega automaticamente com município conhecido, reutiliza cache e separa categorias e modo demo", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  search.mockImplementation(async ({ data }: { data: { query: { gpc: string } } }) => ({
    ok: true,
    fetchedAt: "2026-11-04T08:00:00Z",
    page: { items: [{ ...sale("SABAO", 5), gpc: data.query.gpc }], ultimaPagina: true },
  }));
  const { client, view } = setup();
  const result = render(view("47000000"));
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  expect(search).toHaveBeenCalledTimes(3);
  result.rerender(view("53000000"));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(6));
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  result.rerender(view("47000000"));
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  expect(search).toHaveBeenCalledTimes(6);
  act(() => prefsStore.set((s) => ({ ...s, demo: !s.demo })));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(9));
  expect(search.mock.calls.at(-1)?.[0].data.demo).toBe(prefsStore.get().demo);
  result.unmount();
  client.clear();
});
it("pede apenas local quando não há município e não usa GPS automaticamente", () => {
  const { client, view } = setup();
  render(view("47000000"));
  expect(screen.getByRole("status")).toHaveTextContent(/Escolha o município/);
  expect(search).not.toHaveBeenCalled();
  client.clear();
});

it("agrupa mudanças rápidas de período e usa o último filtro", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  search.mockResolvedValue({
    ok: true,
    fetchedAt: "2026-11-04T08:00:00Z",
    page: { items: [], ultimaPagina: true },
  });
  const { client, view } = setup();
  const result = render(view("47000000"));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(3));
  fireEvent.change(screen.getByLabelText("Período das vendas"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Período das vendas"), { target: { value: "3" } });
  await waitFor(() => expect(search).toHaveBeenCalledTimes(6));
  expect(search.mock.calls.slice(3).every((call) => call[0].data.query.dias === 3)).toBe(true);
  result.unmount();
  client.clear();
});

it("mostra skeletons no lugar dos cartões até o carregamento terminar", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  let resolve!: (value: unknown) => void;
  const response = new Promise((r) => {
    resolve = r;
  });
  search.mockReturnValue(response);
  const { client, view } = setup();
  const result = render(view("47000000"));
  expect(screen.getAllByTestId("category-product-skeleton")).toHaveLength(4);
  expect(screen.getByRole("status")).toHaveClass("sr-only");
  expect(screen.queryByText(/Nenhum produto encontrado/)).not.toBeInTheDocument();
  await act(async () => {
    resolve({
      ok: true,
      fetchedAt: "2026-11-07T08:00:00Z",
      page: { items: [{ ...sale("SABAO", 5), gpc: "47000000" }], ultimaPagina: true },
    });
  });
  await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  expect(screen.queryByTestId("category-product-skeleton")).not.toBeInTheDocument();
  result.unmount();
  client.clear();
});
