import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { BookmarkPlus, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlaceSelector, initialPlace } from "@/components/eal/PlaceSelector";
import { PeriodSelect } from "@/components/eal/PeriodSelect";
import { FieldError } from "@/components/eal/FieldError";
import { ModeBanner } from "@/components/eal/Notices";
import { ResultsSection } from "@/components/eal/ResultsSection";
import { GPC_SEGMENTS, LIMITS, SEARCH_EXAMPLES } from "@/lib/economiza/constants";
import { searchProducts } from "@/lib/economiza/api.functions";
import { productFormStore, productSearchStore, savedPlaceOf } from "@/lib/economiza/searchStores";
import { toPlace, useSearchRunner } from "@/lib/economiza/useSearch";
import { validateProductQuery, type FieldErrors, type ProductQuery } from "@/lib/economiza/validation";
import { favoritesStore, uid } from "@/lib/store";
import type { SaleRecord } from "@/lib/economiza/adapter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Economiza AL — Pesquise preços de produtos em Alagoas" },
      { name: "description", content: "Compare preços registrados em notas fiscais de supermercados e lojas de Alagoas, por nome ou código de barras." },
      { property: "og:title", content: "Economiza AL — Pesquise preços em Alagoas" },
      { property: "og:description", content: "Pesquise e compare preços registrados em vendas de Alagoas, com dados da SEFAZ/AL." },
    ],
  }),
  component: ProductSearchPage,
});

function ProductSearchPage() {
  const form = productFormStore.use();
  const state = productSearchStore.use();
  const { run } = useSearchRunner(productSearchStore, searchProducts);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [advOpen, setAdvOpen] = useState(!!(form.cnpj || form.ncm || form.gpc));
  const ids = { termo: useId(), termoErr: useId(), hint: useId(), cnpj: useId(), ncm: useId(), gpc: useId() };
  const termoRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof form>) => productFormStore.set((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!productFormStore.get().place) set({ place: initialPlace() });
  }, []);

  const buildQuery = (pagina: number): ProductQuery | null => {
    const f = productFormStore.get();
    const place = toPlace(f.place ?? initialPlace(), f.cnpj);
    if (!place) return null;
    return {
      gtin: f.modo === "gtin" ? f.termo.trim() : undefined,
      descricao: f.modo === "descricao" ? f.termo.trim() : undefined,
      ncm: f.modo === "descricao" ? f.ncm.trim() || undefined : undefined,
      gpc: f.modo === "descricao" ? f.gpc || undefined : undefined,
      place,
      dias: f.dias,
      pagina,
      registrosPorPagina: LIMITS.registrosDefault,
    };
  };

  const submit = () => {
    const q = buildQuery(1);
    if (!q) {
      setErrors({ place: "Escolha um município, use sua localização ou informe um CNPJ." });
      return;
    }
    const v = validateProductQuery(q);
    if (!v.ok) {
      setErrors(v.errors);
      if (v.errors.termo) termoRef.current?.focus();
      if (v.errors.cnpj || v.errors.ncm || v.errors.gpc) setAdvOpen(true);
      return;
    }
    setErrors({});
    void run(q, "new");
  };

  // Favorites can request a run after prefilling the form.
  useEffect(() => {
    if (form.pendingRun && form.place) {
      set({ pendingRun: false });
      submit();
    }
  }, [form.pendingRun, form.place]);

  const serverErrors = state.error?.errors ?? {};
  const allErrors = { ...serverErrors, ...errors };
  const currentQuery = buildQuery(1);
  const canSearch = currentQuery !== null && validateProductQuery(currentQuery).ok;

  const saveSearch = () => {
    const q = state.query;
    if (!q) return;
    favoritesStore.set((l) => [
      ...l,
      {
        id: uid(), kind: "produto", label: q.descricao ?? `Código ${q.gtin}`,
        modo: q.gtin ? "gtin" : "descricao", termo: (q.gtin ?? q.descricao)!, gpc: q.gpc, ncm: q.ncm,
        place: savedPlaceOf(q.place), dias: q.dias, savedAt: new Date().toISOString(),
      },
    ]);
    toast.success("Pesquisa salva nos favoritos.");
  };

  const favoriteRecord = (r: SaleRecord) => {
    const q = state.query;
    if (!q) return;
    favoritesStore.set((l) => [
      ...l,
      {
        id: uid(), kind: "produto", label: r.descricaoSefaz || r.descricao,
        modo: r.gtin ? "gtin" : "descricao", termo: r.gtin ?? q.descricao ?? r.descricao.slice(0, 50),
        place: savedPlaceOf(q.place), dias: q.dias, savedAt: new Date().toISOString(),
        lastSeen: { valor: r.valorVenda, at: r.dataVendaUtc, loja: r.store.nome },
      },
    ]);
    toast.success(r.gtin ? "Produto salvo nos favoritos pelo código de barras." : "Produto salvo nos favoritos pela descrição.");
  };

  if (!form.place) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Pesquisar preços</h1>
      <ModeBanner />
      <form
        className="card-surface space-y-5 p-4 md:p-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        aria-label="Pesquisa de produtos"
      >
        <div role="radiogroup" aria-label="Pesquisar por" className="flex flex-wrap gap-2">
          {(["descricao", "gtin"] as const).map((m) => (
            <Button
              key={m}
              type="button"
              variant="chip"
              role="radio"
              aria-checked={form.modo === m}
              aria-pressed={form.modo === m}
              onClick={() => {
                set({ modo: m, termo: "" });
                setErrors({});
              }}
            >
              {m === "descricao" ? "Nome do produto" : "Código de barras"}
            </Button>
          ))}
        </div>

        <div>
          <label htmlFor={ids.termo} className="block text-lg font-semibold">
            O que você quer pesquisar?
          </label>
          <p id={ids.hint} className="text-sm text-muted-foreground">
            {form.modo === "descricao"
              ? "Digite de 3 a 50 letras. As lojas costumam abreviar, então palavras curtas funcionam melhor."
              : "Digite os números abaixo das barras: 8, 12, 13 ou 14 dígitos, incluindo zeros no início."}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              ref={termoRef}
              id={ids.termo}
              value={form.termo}
              onChange={(e) => set({ termo: form.modo === "gtin" ? e.target.value.replace(/\D/g, "") : e.target.value })}
              inputMode={form.modo === "gtin" ? "numeric" : "search"}
              maxLength={form.modo === "gtin" ? 14 : LIMITS.descricaoMax}
              autoComplete="off"
              placeholder={form.modo === "descricao" ? "Ex.: arroz" : "Ex.: 7891234567895"}
              aria-invalid={!!allErrors.termo}
              aria-describedby={`${ids.hint} ${allErrors.termo ? ids.termoErr : ""}`}
              className="min-h-12 flex-1 border-2 border-input text-lg"
            />
          </div>
          <FieldError id={ids.termoErr} message={allErrors.termo} />
          {form.modo === "descricao" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Exemplos:</span>
              {SEARCH_EXAMPLES.map((ex) => (
                <Button key={ex} type="button" variant="chip" size="sm" onClick={() => set({ termo: ex })}>
                  {ex}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
          <PlaceSelector value={form.place} onChange={(p) => set({ place: p })} errors={allErrors} />
          <PeriodSelect value={form.dias} onChange={(d) => set({ dias: d })} />
        </div>
        {form.cnpj.trim() && (
          <p className="rounded-lg bg-warning-soft p-2 text-sm text-warning-foreground">
            Como você informou um CNPJ nos filtros avançados, a pesquisa será feita só nesse estabelecimento, e o município ou a localização serão ignorados.
          </p>
        )}

        <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="px-2">
              <ChevronDown aria-hidden className={advOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              Filtros avançados
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor={ids.cnpj} className="block text-sm font-semibold">CNPJ do estabelecimento</label>
              <p className="text-sm text-muted-foreground">Número da empresa. Use os 8 primeiros dígitos (todas as filiais) ou os 14.</p>
              <Input id={ids.cnpj} inputMode="numeric" maxLength={14} value={form.cnpj}
                onChange={(e) => set({ cnpj: e.target.value.replace(/\D/g, "") })}
                aria-invalid={!!allErrors.cnpj} className="mt-1 min-h-11 border-2 border-input" />
              <FieldError message={allErrors.cnpj} />
            </div>
            <div>
              <label htmlFor={ids.gpc} className="block text-sm font-semibold">Categoria (GPC)</label>
              <p className="text-sm text-muted-foreground">Restringe a busca por nome a um tipo de produto. Só vale para produtos com código de barras.</p>
              <select id={ids.gpc} value={form.gpc} onChange={(e) => set({ gpc: e.target.value })}
                disabled={form.modo !== "descricao"} aria-invalid={!!allErrors.gpc}
                className="mt-1 min-h-11 w-full rounded-lg border-2 border-input bg-card px-3 disabled:opacity-60">
                <option value="">Todas as categorias</option>
                {[...GPC_SEGMENTS].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((g) => (
                  <option key={g.codigo} value={g.codigo}>{g.nome}</option>
                ))}
              </select>
              <FieldError message={allErrors.gpc} />
            </div>
            <div>
              <label htmlFor={ids.ncm} className="block text-sm font-semibold">Código NCM</label>
              <p className="text-sm text-muted-foreground">Código fiscal de 8 números que aparece na nota. Só para busca por nome.</p>
              <Input id={ids.ncm} inputMode="numeric" maxLength={8} value={form.ncm}
                onChange={(e) => set({ ncm: e.target.value.replace(/\D/g, "") })}
                disabled={form.modo !== "descricao"} aria-invalid={!!allErrors.ncm} className="mt-1 min-h-11 border-2 border-input" />
              <FieldError message={allErrors.ncm} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        {canSearch && (
          <Button type="submit" size="lg" disabled={state.status === "loading"}>
            <Search aria-hidden /> Pesquisar
          </Button>
        )}
      </form>

      {state.status === "success" && state.query && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={saveSearch}>
            <BookmarkPlus aria-hidden /> Salvar esta pesquisa
          </Button>
        </div>
      )}

      <ResultsSection
        state={state}
        kindLabel="produtos"
        onRetry={() => state.query && run({ ...state.query, pagina: 1 }, "new")}
        onLoadMore={() => state.query && state.meta && run({ ...state.query, pagina: state.meta.pagina + 1 }, "more")}
        onFavoriteRecord={favoriteRecord}
      />
    </div>
  );
}
