import type { ReactNode, AnchorHTMLAttributes } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchHub } from "./SearchHub";
import { fuelFormStore, productFormStore } from "@/lib/economiza/searchStores";
import { selectSearchMode, searchMode } from "@/lib/economiza/searchMode";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children?: ReactNode;
    to: string;
    search?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/eal/Notices", () => ({ ModeBanner: () => null }));
vi.mock("./ProductSearchPanel", () => ({
  ProductSearchPanel: () => <div>Formulário de produtos</div>,
}));
vi.mock("./FuelSearchPanel", () => ({
  FuelSearchPanel: () => <div>Formulário de combustíveis</div>,
}));
afterEach(() => {
  cleanup();
  productFormStore.reset();
  fuelFormStore.reset();
});
it("mostra somente o formulário selecionado e destaca voz", () => {
  const change = vi.fn();
  const view = render(<SearchHub mode="produto" onModeChange={change} />);
  expect(screen.getByText("Formulário de produtos")).toBeVisible();
  expect(screen.queryByText("Formulário de combustíveis")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /buscar por voz/i })).toBeVisible();
  fireEvent.click(screen.getByRole("radio", { name: "Combustíveis" }));
  expect(change).toHaveBeenCalledWith("combustivel");
  view.rerender(<SearchHub mode="combustivel" onModeChange={change} />);
  expect(screen.getByText("Formulário de combustíveis")).toBeVisible();
});
it("troca manual compartilha local e período sem apagar campos específicos ou executar", () => {
  const place = { mode: "municipio" as const, municipio: 2704302, raio: 5, coords: null };
  productFormStore.set((s) => ({ ...s, place, dias: 3, termo: "arroz", cnpj: "12345678" }));
  fuelFormStore.set((s) => ({ ...s, tipo: 3, quantidade: "40" }));
  selectSearchMode("produto", "combustivel");
  expect(fuelFormStore.get()).toMatchObject({
    place,
    dias: 3,
    tipo: 3,
    quantidade: "40",
    cnpj: "",
    pendingRun: false,
  });
  expect(productFormStore.get().termo).toBe("arroz");
});
it("valida modo da URL", () => {
  expect(searchMode("combustivel")).toBe("combustivel");
  expect(searchMode("inválido")).toBe("produto");
});
