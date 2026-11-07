import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CategoriesPage } from "./categorias";
import { productFormStore, productSearchStore } from "@/lib/economiza/searchStores";
vi.mock("@/components/categories/CategoryProducts", () => ({
  CategoryProducts: () => <div>Pesquisa dentro da categoria</div>,
}));
function CategoriesHarness() {
  const [selected, setSelected] = useState<string | null>(null);
  return <CategoriesPage selected={selected} onSelect={setSelected} />;
}
afterEach(() => {
  cleanup();
  productFormStore.reset();
  productSearchStore.reset();
});
it("seleciona categoria real e abre pesquisa filtrada sem disparar consulta", () => {
  productSearchStore.set((s) => ({ ...s, status: "success" }));
  render(<CategoriesHarness />);
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
  render(<CategoriesHarness />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "higiene" } });
  expect(screen.getByRole("button", { name: "Higiene pessoal e beleza" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Produtos de limpeza" })).not.toBeInTheDocument();
});

it("pede o local antes da escolha e usa ícones vetoriais em todas as categorias", () => {
  render(<CategoriesHarness />);
  expect(screen.getByRole("region", { name: "Local da pesquisa" })).toBeVisible();
  expect(screen.getByText("Primeiro, escolha onde quer pesquisar.")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Município" })).toBeVisible();
  expect(screen.queryByText("Pesquisa dentro da categoria")).not.toBeInTheDocument();
  for (const name of [
    "Produtos de limpeza",
    "Higiene pessoal e beleza",
    "Alimentos, bebidas e tabaco",
  ]) {
    const button = screen.getByRole("button", { name });
    expect(button.querySelector("svg")).toHaveAttribute("stroke-width", "1.8");
  }
});
