import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CategoriesPage } from "./categorias";
import { productFormStore, productSearchStore } from "@/lib/economiza/searchStores";
vi.mock("@/components/categories/CategoryProducts", () => ({
  CategoryProducts: () => <div>Pesquisa dentro da categoria</div>,
}));
afterEach(() => {
  cleanup();
  productFormStore.reset();
  productSearchStore.reset();
});
it("seleciona categoria real e abre pesquisa filtrada sem disparar consulta", () => {
  productSearchStore.set((s) => ({ ...s, status: "success" }));
  render(<CategoriesPage />);
  fireEvent.click(screen.getByRole("button", { name: "Produtos de limpeza" }));
  expect(productFormStore.get()).toMatchObject({
    gpc: "47000000",
    modo: "descricao",
    pendingRun: false,
  });
  expect(productSearchStore.get().status).toBe("idle");
  expect(screen.getByText("Pesquisa dentro da categoria")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Todas as categorias" }));
  expect(screen.getByRole("button", { name: "Produtos de limpeza" })).toBeVisible();
});
it("filtra nomes de categorias sem depender de acentos", () => {
  render(<CategoriesPage />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "higiene" } });
  expect(screen.getByRole("button", { name: "Higiene pessoal e beleza" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Produtos de limpeza" })).not.toBeInTheDocument();
});
