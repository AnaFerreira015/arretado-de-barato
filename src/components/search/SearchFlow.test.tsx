import { useState, type ReactNode, type AnchorHTMLAttributes } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SearchHub } from "./SearchHub";
import { selectSearchMode, type SearchMode } from "@/lib/economiza/searchMode";
import {
  productFormStore,
  fuelFormStore,
  productSearchStore,
  fuelSearchStore,
} from "@/lib/economiza/searchStores";
const { products, fuel } = vi.hoisted(() => ({ products: vi.fn(), fuel: vi.fn() }));
vi.mock("@/lib/economiza/api.functions", () => ({
  searchProducts: products,
  searchFuel: fuel,
  getApiStatus: async () => ({ status: "ready" }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    search?: unknown;
    children?: ReactNode;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  ),
);
afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  productFormStore.reset();
  fuelFormStore.reset();
  productSearchStore.reset();
  fuelSearchStore.reset();
  vi.clearAllMocks();
});
const place = { mode: "municipio" as const, municipio: 2704302, coords: null, raio: 5 };
const response = {
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
function App({ initialMode = "produto" }: { initialMode?: SearchMode }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <SearchHub
      mode={mode}
      onModeChange={(next) => {
        selectSearchMode(mode, next);
        setMode(next);
      }}
    />
  );
}
function renderApp(mode?: SearchMode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <App initialMode={mode ?? "produto"} />
    </QueryClientProvider>,
  );
}
it("troca de categoria preserva local e consulta somente combustível após enviar", async () => {
  productFormStore.set((s) => ({ ...s, place, dias: 3, termo: "arroz" }));
  fuel.mockResolvedValue(response);
  renderApp();
  fireEvent.click(screen.getByRole("radio", { name: "Combustíveis" }));
  expect(products).not.toHaveBeenCalled();
  expect(fuel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "Etanol" }));
  fireEvent.click(screen.getByRole("button", { name: /^Pesquisar$/ }));
  await waitFor(() => expect(fuelSearchStore.get().status).toBe("success"));
  expect(fuel).toHaveBeenCalledWith({
    data: {
      demo: false,
      query: {
        tipoCombustivel: 3,
        place: { tipo: "municipio", codigoIBGE: 2704302 },
        dias: 3,
        pagina: 1,
        registrosPorPagina: 100,
      },
    },
  });
  expect(products).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "Produtos" }));
  expect(screen.getByLabelText("O que você quer pesquisar?")).toHaveValue("arroz");
});
it("favorito pendente mantém município e período próprios", async () => {
  productFormStore.set((s) => ({ ...s, place, dias: 7 }));
  fuelFormStore.set((s) => ({
    ...s,
    place: { ...place, municipio: 2700300 },
    dias: 2,
    tipo: 1,
    pendingRun: true,
  }));
  fuel.mockResolvedValue(response);
  await act(async () => {
    renderApp("combustivel");
  });
  await waitFor(() => expect(fuelSearchStore.get().status).toBe("success"));
  expect(fuel.mock.calls[0]?.[0].data.query).toMatchObject({
    tipoCombustivel: 1,
    dias: 2,
    place: { codigoIBGE: 2700300 },
  });
  expect(fuelFormStore.get().pendingRun).toBe(false);
});
