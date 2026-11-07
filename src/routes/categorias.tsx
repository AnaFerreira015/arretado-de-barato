import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Package,
  Tent,
  Watch,
  ShoppingBasket,
  Bird,
  Plug,
  Paintbrush,
  NotebookPen,
  Camera,
  Gamepad2,
  Footprints,
  Flame,
  Smartphone,
  Sprout,
  PawPrint,
  AirVent,
  Dumbbell,
  Wrench,
  Drill,
  Hammer,
  Sparkles,
  Laptop,
  Droplets,
  BookOpen,
  Armchair,
  Music,
  Flower,
  BrushCleaning,
  BrickWall,
  Box,
  Shield,
  Lock,
  Car,
  HeartPulse,
  CookingPot,
  House,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { initialPlace } from "@/components/eal/PlaceSelector";
import { SearchLocationFields } from "@/components/search/SearchLocationFields";
import { GPC_SEGMENTS, GPC_CODES } from "@/lib/economiza/constants";
import { productFormStore, productSearchStore } from "@/lib/economiza/searchStores";
import { validatePlace, type FieldErrors } from "@/lib/economiza/validation";
import { toPlace } from "@/lib/economiza/useSearch";
import { CategoryProducts } from "@/components/categories/CategoryProducts";

export const Route = createFileRoute("/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Arretado de Barato" }] }),
  validateSearch: (search: Record<string, unknown>): { categoria?: string } => {
    const value = search["categoria"];
    const code = typeof value === "string" || typeof value === "number" ? String(value) : "";
    return GPC_CODES.has(code) ? { categoria: code } : {};
  },
  component: CategoriesRoute,
});
const illustrations: Record<string, LucideIcon> = {
  "74000000": Tent,
  "64000000": Watch,
  "50000000": ShoppingBasket,
  "89000000": Bird,
  "78000000": Plug,
  "70000000": Paintbrush,
  "62000000": NotebookPen,
  "68000000": Camera,
  "86000000": Gamepad2,
  "63000000": Footprints,
  "87000000": Flame,
  "66000000": Smartphone,
  "94000000": Sprout,
  "10000000": PawPrint,
  "79000000": AirVent,
  "71000000": Dumbbell,
  "84000000": Wrench,
  "82000000": Drill,
  "80000000": Hammer,
  "53000000": Sparkles,
  "65000000": Laptop,
  "88000000": Droplets,
  "60000000": BookOpen,
  "81000000": Sprout,
  "75000000": Armchair,
  "61000000": Music,
  "93000000": Flower,
  "47000000": BrushCleaning,
  "83000000": BrickWall,
  "92000000": Box,
  "58000000": Package,
  "85000000": Shield,
  "91000000": Lock,
  "77000000": Car,
  "51000000": HeartPulse,
  "73000000": CookingPot,
  "72000000": House,
  "67000000": Shirt,
};
function CategoriesRoute() {
  const { categoria } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CategoriesPage
      key={categoria ?? "all"}
      selected={categoria ?? null}
      onSelect={(code) => {
        void navigate({ to: "/categorias", search: code ? { categoria: code } : {} });
      }}
    />
  );
}
export function CategoriesPage({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  const [filter, setFilter] = useState("");
  const form = productFormStore.use();
  const [fallbackPlace] = useState(initialPlace);
  const place = form.place ?? fallbackPlace;
  const locationErrors: FieldErrors = {};
  validatePlace(toPlace(place, ""), locationErrors);
  const locationReady = Object.keys(locationErrors).length === 0;
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
            ? "Veja produtos e preços registrados nesta categoria."
            : "Escolha o que você procura para refinar sua pesquisa."}
        </p>
      </header>
      <section aria-label="Local da pesquisa" className="rounded-2xl border bg-card p-4">
        {!locationReady && (
          <p className="mb-3 font-semibold">Primeiro, escolha onde quer pesquisar.</p>
        )}
        <SearchLocationFields
          place={place}
          dias={form.dias}
          errors={{}}
          onPlaceChange={(next) => productFormStore.set((s) => ({ ...s, place: next }))}
          onDaysChange={(days) => productFormStore.set((s) => ({ ...s, dias: days }))}
        />
      </section>
      {!locationReady ? (
        <p role="status" className="rounded-xl bg-primary-soft p-4">
          Escolha um município acima ou toque em “Usar minha localização”. As categorias aparecerão
          depois dessa escolha.
        </p>
      ) : category ? (
        <>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary"
          >
            <ArrowLeft aria-hidden className="size-5" />
            Todas as categorias
          </button>
          <CategoryProducts
            key={category.codigo}
            category={category.codigo}
            showLocationControls={false}
          />
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
            {categories.map((g) => {
              const Icon = illustrations[g.codigo] ?? Package;
              return (
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
                    onSelect(g.codigo);
                  }}
                  className="group flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-4 text-center font-semibold transition-shadow hover:border-primary hover:shadow-card"
                >
                  <span
                    aria-hidden
                    className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary"
                  >
                    <Icon className="size-8" strokeWidth={1.8} />
                  </span>
                  <span>{g.nome}</span>
                </button>
              );
            })}
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
