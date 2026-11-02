import { createFileRoute } from "@tanstack/react-router";
import { SearchHub } from "@/components/search/SearchHub";
import { searchMode, selectSearchMode } from "@/lib/economiza/searchMode";
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { tipo?: "produto" | "combustivel" } => ({
    tipo: searchMode(search["tipo"]),
  }),
  head: () => ({
    meta: [
      { title: "Arretado de Barato — Produtos e combustíveis em Alagoas" },
      {
        name: "description",
        content:
          "Compare preços de produtos e combustíveis registrados em Alagoas. Pesquise por texto ou com ajuda do assistente de voz.",
      },
      {
        property: "og:title",
        content: "Arretado de Barato — Preço arretado. Escolha mais esperta.",
      },
      { property: "og:description", content: "Produtos e combustíveis, em uma só busca." },
    ],
  }),
  component: SearchPage,
});
function SearchPage() {
  const { tipo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode = tipo ?? "produto";
  return (
    <SearchHub
      mode={mode}
      onModeChange={(next) => {
        selectSearchMode(mode, next);
        void navigate({ search: { tipo: next } });
      }}
    />
  );
}
