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
  Reflect.deleteProperty(navigator, "geolocation");
  vi.unstubAllGlobals();
});
function chooseKnownPlace() {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
}
it("seleciona categoria real e abre pesquisa filtrada sem disparar consulta", () => {
  chooseKnownPlace();
  productSearchStore.set((s) => ({ ...s, status: "success" }));
  render(<CategoriesHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Produtos de Higiene/Limpeza" }));
  expect(productFormStore.get()).toMatchObject({
    gpc: "47000000",
    modo: "descricao",
    pendingRun: false,
  });
  expect(productSearchStore.get().status).toBe("idle");
  expect(screen.getByText("Pesquisa dentro da categoria")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Todas as categorias" }));
  expect(screen.getByRole("button", { name: "Produtos de Higiene/Limpeza" })).toBeVisible();
});
it("filtra nomes de categorias sem depender de acentos", () => {
  chooseKnownPlace();
  render(<CategoriesHarness />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "informatica" } });
  expect(screen.getByRole("button", { name: "Informática/Computação" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Produtos de Higiene/Limpeza" }),
  ).not.toBeInTheDocument();
});

it("pede o local antes da escolha e usa ícones vetoriais em todas as categorias", () => {
  render(<CategoriesHarness />);
  expect(screen.getByRole("region", { name: "Local da pesquisa" })).toBeVisible();
  expect(screen.getByText("Primeiro, escolha onde quer pesquisar.")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Município" })).toBeVisible();
  expect(screen.queryByText("Pesquisa dentro da categoria")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Animais Vivos" })).not.toBeInTheDocument();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (
        success: (position: { coords: { latitude: number; longitude: number } }) => void,
      ) => success({ coords: { latitude: -9.66, longitude: -35.73 } }),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Usar minha localização" }));
  for (const name of [
    "Produtos de Higiene/Limpeza",
    "Higiene/Cuidados Pessoais/ Beleza",
    "Alimentos / Bebidas / Tabaco",
  ]) {
    const button = screen.getByRole("button", { name });
    expect(button.querySelector("svg")).toHaveAttribute("stroke-width", "1.8");
  }
});

it("links diretos para categoria também exigem local antes dos produtos", () => {
  render(<CategoriesPage selected="89000000" onSelect={() => {}} />);
  expect(screen.getByRole("status")).toHaveTextContent(/As categorias aparecerão depois/);
  expect(screen.queryByText("Pesquisa dentro da categoria")).not.toBeInTheDocument();
});

it("permissão negada mantém a etapa de local e não libera as categorias", () => {
  const getCurrentPosition = vi.fn((_success, failure) =>
    failure({ code: 1, PERMISSION_DENIED: 1 }),
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  render(<CategoriesHarness />);
  expect(getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Usar minha localização" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/Permissão de localização negada/);
  expect(screen.queryByRole("button", { name: "Animais Vivos" })).not.toBeInTheDocument();
});
