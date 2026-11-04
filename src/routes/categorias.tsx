import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Package } from "lucide-react";
import { GPC_SEGMENTS } from "@/lib/economiza/constants";
import { productFormStore, productSearchStore } from "@/lib/economiza/searchStores";
import { ProductSearchPanel } from "@/components/search/ProductSearchPanel";

export const Route = createFileRoute("/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Arretado de Barato" }] }),
  component: CategoriesPage,
});
const illustrations: Record<string, string> = {
  "50000000": "🛒",
  "53000000": "🧴",
  "47000000": "🧽",
  "51000000": "🩹",
  "77000000": "🚗",
  "73000000": "🍳",
  "72000000": "🏠",
  "67000000": "👕",
  "65000000": "💻",
  "81000000": "🌱",
  "74000000": "⛺",
  "60000000": "📚",
  "75000000": "🛋️",
  "61000000": "🎸",
};
export function CategoriesPage() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const category = GPC_SEGMENTS.find((g) => g.codigo === selected);
  const normalized = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const categories = GPC_SEGMENTS.filter((g) => normalized(g.nome).includes(normalized(filter)));
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold">{category?.nome ?? "Explore por categoria"}</h1>
        <p className="mt-1 text-muted-foreground">
          {category
            ? "Digite o produto para buscar dentro desta categoria."
            : "Escolha o que você procura para refinar sua pesquisa."}
        </p>
      </header>
      {category ? (
        <>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary"
          >
            <ArrowLeft aria-hidden className="size-5" />
            Todas as categorias
          </button>
          <ProductSearchPanel key={category.codigo} />
        </>
      ) : (
        <>
          <label className="block">
            <span className="sr-only">Encontrar categoria</span>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Encontrar categoria"
              className="min-h-12 w-full rounded-xl border-2 border-input bg-card px-4"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((g, i) => (
              <button
                key={g.codigo}
                type="button"
                onClick={() => {
                  productFormStore.set((s) => ({
                    ...s,
                    modo: "descricao",
                    gpc: g.codigo,
                    termo: "",
                    cnpj: "",
                    ncm: "",
                    pendingRun: false,
                  }));
                  productSearchStore.reset();
                  setSelected(g.codigo);
                }}
                className="group flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-4 text-center font-semibold transition-shadow hover:border-primary hover:shadow-card"
              >
                <span
                  aria-hidden
                  className={`grid size-16 place-items-center rounded-full text-4xl ${i % 2 ? "bg-secondary" : "bg-primary-soft"}`}
                >
                  {illustrations[g.codigo] ?? <Package className="size-8 text-primary" />}
                </span>
                <span>{g.nome}</span>
              </button>
            ))}
          </div>
          {!categories.length && <p role="status">Nenhuma categoria encontrada.</p>}
          <p className="text-sm text-muted-foreground">
            As categorias seguem a classificação GPC da SEFAZ e se aplicam a produtos com código de
            barras.
          </p>
        </>
      )}
    </div>
  );
}
