import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { productFormStore } from "@/lib/economiza/searchStores";
import { CategoriesPage, Route as categoriesDefinition } from "@/routes/categorias";
vi.mock("@/components/categories/CategoryProducts", () => ({
  CategoryProducts: () => <p>Produtos selecionados</p>,
}));
afterEach(() => {
  cleanup();
  productFormStore.reset();
});
it("tocar Categorias no menu limpa a seleção na mesma rota", async () => {
  productFormStore.set((s) => ({
    ...s,
    place: { mode: "municipio", municipio: 2704302, raio: 5, coords: null },
  }));
  const root = createRootRoute({
    component: () => (
      <>
        <Link to="/categorias" search={{}}>
          Categorias
        </Link>
        <Outlet />
      </>
    ),
  });
  const categoryRoute = createRoute({
    getParentRoute: () => root,
    path: "/categorias",
    validateSearch: categoriesDefinition.options.validateSearch,
    component: () => {
      const { categoria } = categoryRoute.useSearch();
      const navigate = categoryRoute.useNavigate();
      return (
        <CategoriesPage
          selected={categoria ?? null}
          onSelect={(code) => void navigate({ search: code ? { categoria: code } : {} })}
        />
      );
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([categoryRoute]),
    history: createMemoryHistory({ initialEntries: ["/categorias?categoria=47000000"] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(screen.getByText("Produtos selecionados")).toBeVisible());
  fireEvent.click(screen.getByRole("link", { name: "Categorias" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Explore por categoria" })).toBeVisible(),
  );
  expect(screen.queryByText("Produtos selecionados")).not.toBeInTheDocument();
  expect(router.state.location.search).toEqual({});
});
