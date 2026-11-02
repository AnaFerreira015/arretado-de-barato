import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mic, MapPin } from "lucide-react";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { FuelSearchPanel } from "./FuelSearchPanel";
import { TypeFilter } from "./TypeFilter";
import { ModeBanner } from "@/components/eal/Notices";
import type { SearchMode } from "@/lib/economiza/searchMode";

export function SearchHub({
  mode,
  onModeChange,
}: {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="search-hero relative overflow-hidden rounded-3xl p-6 sm:p-9">
        <div className="relative max-w-2xl space-y-4">
          <p className="flex items-center gap-2 text-sm font-bold text-white/85">
            <MapPin aria-hidden className="size-4" /> Feito para economizar em Alagoas
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            Preço arretado.
            <br />
            <span className="text-mango">Escolha mais esperta.</span>
          </h1>
          <p className="max-w-lg text-base text-white/90 sm:text-lg">
            Produtos e combustíveis, em uma só busca. Compare preços registrados perto de você.
          </p>
        </div>
        <span className="hero-decoration" aria-hidden>
          R$
        </span>
      </section>
      <ModeBanner />
      <section
        aria-label="Escolher tipo de pesquisa"
        className="grid gap-5 rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <TypeFilter
          value={mode}
          onChange={(value) => {
            if (value !== "todos") onModeChange(value);
          }}
        />
        <Link
          to="/assistente"
          search={{ modo: mode }}
          className="voice-cta group flex min-h-16 items-center gap-3 rounded-xl px-5 py-3"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground/10">
            <Mic aria-hidden className="size-6" />
          </span>
          <span>
            <span className="block text-lg font-extrabold">Buscar por voz</span>
            <span className="block text-sm">Fale do seu jeito. Eu te ajudo.</span>
          </span>
          <ArrowUpRight aria-hidden className="ml-auto size-5" />
        </Link>
      </section>
      {mode === "produto" ? <ProductSearchPanel /> : <FuelSearchPanel />}
    </div>
  );
}
