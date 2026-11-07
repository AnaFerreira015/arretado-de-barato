import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CategoriesPage } from "@/routes/categorias";
import { CategoryProducts } from "./CategoryProducts";
import { productFormStore } from "@/lib/economiza/searchStores";
import { sale } from "@/lib/voice/test-fixtures";
const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/lib/economiza/api.functions", () => ({ searchProducts: search }));
vi.mock("@/components/eal/RecordDetailDialog", () => ({ RecordDetailDialog: () => null }));
vi.mock("@/components/eal/RecordCard", () => ({
  RecordCard: ({ r }: { r: { descricao: string } }) => <article>{r.descricao}</article>,
}));
afterEach(() => {
  cleanup();
  productFormStore.reset();
  vi.clearAllMocks();
});
it("oculta categoria vazia, reutiliza dados ao abri-la e não repete a descoberta ao voltar", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  search.mockImplementation(async ({ data }: { data: { query: { gpc: string } } }) => ({
    ok: true,
    fetchedAt: "2026-11-07T08:00:00Z",
    page: {
      items: data.query.gpc === "47000000" ? [{ ...sale("SABAO"), gpc: "47000000" }] : [],
      ultimaPagina: true,
    },
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = <CategoriesPage selected={null} onSelect={() => {}} />;
  const renderWith = (children: React.ReactNode) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = render(renderWith(root));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Produtos de Higiene/Limpeza" })).toBeVisible(),
  );
  await waitFor(() =>
    expect(screen.queryByText("Verificando categorias com produtos…")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: "Alimentos / Bebidas / Tabaco" }),
  ).not.toBeInTheDocument();
  const calls = search.mock.calls.length;
  view.rerender(renderWith(<CategoryProducts category="47000000" />));
  await waitFor(() => expect(screen.getByRole("article")).toHaveTextContent("SABAO"));
  expect(search).toHaveBeenCalledTimes(calls);
  view.rerender(renderWith(root));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Produtos de Higiene/Limpeza" })).toBeVisible(),
  );
  expect(search).toHaveBeenCalledTimes(calls);
  view.unmount();
  client.clear();
});
