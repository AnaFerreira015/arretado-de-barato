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

it("mostra produtos confirmados antes do fim do lote e mantém skeletons na mesma grade", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  let release!: (value: unknown) => void;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  search.mockImplementation(({ data }: { data: { query: { gpc: string } } }) =>
    data.query.gpc === "74000000"
      ? pending
      : Promise.resolve({
          ok: true,
          fetchedAt: "2026-11-07T08:00:00Z",
          page: {
            items: [{ ...sale("PRODUTO"), gpc: data.query.gpc, ncm: "01059400" }],
            ultimaPagina: true,
          },
        }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <CategoriesPage selected={null} onSelect={() => {}} />
    </QueryClientProvider>,
  );
  const button = await screen.findByRole("button", { name: "Alimentos / Bebidas / Tabaco" });
  expect(screen.getByText("Verificando categorias com produtos…")).toBeInTheDocument();
  const skeleton = screen.getAllByTestId("category-card-skeleton")[0]!;
  expect(skeleton.parentElement).toBe(button.parentElement);
  release({ ok: true, fetchedAt: "2026-11-07T08:00:00Z", page: { items: [], ultimaPagina: true } });
  await waitFor(() =>
    expect(screen.queryByTestId("category-card-skeleton")).not.toBeInTheDocument(),
  );
  view.unmount();
  client.clear();
});
