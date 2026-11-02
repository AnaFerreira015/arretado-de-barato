import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode, AnchorHTMLAttributes } from "react";
import { FavoritesPage } from "@/routes/favoritos";
import { favoritesStore } from "@/lib/store";
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  favoritesStore.reset();
  vi.clearAllMocks();
});
it("filtra favoritos sem remover dados e abre combustível na busca única", () => {
  const shared = {
    place: { tipo: "municipio" as const, codigoIBGE: 2704302 },
    dias: 3,
    savedAt: "2026-11-02",
  };
  favoritesStore.set([
    { ...shared, id: "p", kind: "produto", label: "Arroz", modo: "descricao", termo: "arroz" },
    { ...shared, id: "f", kind: "combustivel", label: "Etanol", tipoCombustivel: 3 },
  ]);
  render(<FavoritesPage />);
  fireEvent.click(screen.getByRole("radio", { name: "Combustíveis" }));
  expect(screen.queryByRole("heading", { name: "Arroz" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Etanol" })).toBeVisible();
  expect(favoritesStore.get()).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Pesquisar de novo" }));
  expect(navigate).toHaveBeenCalledWith({ to: "/", search: { tipo: "combustivel" } });
});
