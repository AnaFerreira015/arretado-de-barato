import { focusInvalidField } from "@/lib/accessibility";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BookmarkPlus, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { initialPlace } from "@/components/eal/PlaceSelector";
import { SearchLocationFields } from "./SearchLocationFields";
import { FieldError } from "@/components/eal/FieldError";
import { ResultsSection } from "@/components/eal/ResultsSection";
import { GPC_SEGMENTS, LIMITS, SEARCH_EXAMPLES } from "@/lib/economiza/constants";
import { searchProducts } from "@/lib/economiza/api.functions";
import { productFormStore, productSearchStore, savedPlaceOf } from "@/lib/economiza/searchStores";
import { toPlace, useSearchRunner } from "@/lib/economiza/useSearch";
import {
  validateProductQuery,
  type FieldErrors,
  type ProductQuery,
} from "@/lib/economiza/validation";
import { favoritesStore, uid } from "@/lib/store";
import type { SaleRecord } from "@/lib/economiza/adapter";

export function ProductSearchPanel() {
  const form = productFormStore.use();
  const state = productSearchStore.use();
  const { run } = useSearchRunner(productSearchStore, searchProducts);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [advOpen, setAdvOpen] = useState(!!(form.cnpj || form.ncm || form.gpc));
  const ids = {
    termo: useId(),
    termoErr: useId(),
    hint: useId(),
    cnpj: useId(),
    ncm: useId(),
    gpc: useId(),
  };
  const termoRef = useRef<HTMLInputElement>(null);
  const set = useCallback(
    (patch: Partial<typeof form>) => productFormStore.set((f) => ({ ...f, ...patch })),
    [],
  );

  useEffect(() => {
    if (!productFormStore.get().place) set({ place: initialPlace() });
  }, [set]);

  const buildQuery = useCallback((pagina: number): ProductQuery | null => {
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
      registrosPorPagina:
        place.tipo === "geolocalizacao" ? LIMITS.registrosGeo : LIMITS.registrosDefault,
    };
  }, []);

  const submit = useCallback(() => {
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
  }, [buildQuery, run]);

  // Favorites can request a run after prefilling the form.
  useEffect(() => {
    if (form.pendingRun && form.place) {
      set({ pendingRun: false });
      submit();
    }
  }, [form.pendingRun, form.place, set, submit]);

  const serverErrors = state.error?.errors ?? {};
  const allErrors = { ...serverErrors, ...errors };

  const saveSearch = () => {
    const q = state.query;
    if (!q) return;
    favoritesStore.set((l) => [
      ...l,
      {
        id: uid(),
        kind: "produto",
        label: q.descricao ?? `Código ${q.gtin}`,
        modo: q.gtin ? "gtin" : "descricao",
        termo: (q.gtin ?? q.descricao)!,
        gpc: q.gpc,
        ncm: q.ncm,
        place: savedPlaceOf(q.place),
        dias: q.dias,
        savedAt: new Date().toISOString(),
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
        id: uid(),
        kind: "produto",
        label: r.descricaoSefaz || r.descricao,
        modo: r.gtin ? "gtin" : "descricao",
        termo: r.gtin ?? q.descricao ?? r.descricao.slice(0, 50),
        place: savedPlaceOf(q.place),
        dias: q.dias,
        savedAt: new Date().toISOString(),
        lastSeen: { valor: r.valorVenda, at: r.dataVendaUtc, loja: r.store.nome },
      },
    ]);
    toast.success(
      r.gtin
        ? "Produto salvo nos favoritos pelo código de barras."
        : "Produto salvo nos favoritos pela descrição.",
    );
  };

  if (!form.place) return null;

  return (
    <div className="space-y-4">
      <form
        className="card-surface space-y-5 p-4 md:p-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
          focusInvalidField(e.currentTarget);
        }}
        aria-label="Pesquisa de produtos"
      >
        <div role="radiogroup" aria-label="Pesquisar por" className="flex flex-wrap gap-2">
          {(["descricao", "gtin"] as const).map((m) => (
            <label
              key={m}
              className="relative flex min-h-11 cursor-pointer items-center rounded-full border-2 border-input bg-card px-3 font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                className="sr-only"
                name={`${ids.termo}-modo`}
                checked={form.modo === m}
                onChange={() => {
                  set({ modo: m, termo: "" });
                  setErrors({});
                }}
              />
              {m === "descricao" ? "Nome do produto" : "Código de barras"}
            </label>
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
              onChange={(e) =>
                set({
                  termo: form.modo === "gtin" ? e.target.value.replace(/\D/g, "") : e.target.value,
                })
              }
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
                <Button
                  key={ex}
                  type="button"
                  variant="chip"
                  size="sm"
                  onClick={() => set({ termo: ex })}
                >
                  {ex}
                </Button>
              ))}
            </div>
          )}
        </div>

        <SearchLocationFields
          place={form.place}
          dias={form.dias}
          onPlaceChange={(p) => set({ place: p })}
          onDaysChange={(dias) => set({ dias })}
          errors={allErrors}
        />
        {form.cnpj.trim() && (
          <p className="rounded-lg bg-warning-soft p-2 text-sm text-warning-foreground">
            Como você informou um CNPJ nos filtros avançados, a pesquisa será feita só nesse
            estabelecimento, e o município ou a localização serão ignorados.
          </p>
        )}

        <Collapsible open={advOpen} onOpenChange={setAdvOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="px-2">
              <ChevronDown
                aria-hidden
                className={advOpen ? "rotate-180 transition-transform" : "transition-transform"}
              />
              Filtros avançados
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid gap-4 md:grid-cols-3 md:gap-y-0">
            <div className="md:row-span-4 md:grid md:grid-rows-subgrid">
              <label htmlFor={ids.cnpj} className="block text-sm font-semibold">
                CNPJ do estabelecimento
              </label>
              <p className="text-sm text-muted-foreground">
                Número da empresa. Use os 8 primeiros dígitos (todas as filiais) ou os 14.
              </p>
              <Input
                id={ids.cnpj}
                inputMode="numeric"
                maxLength={14}
                value={form.cnpj}
                onChange={(e) => set({ cnpj: e.target.value.replace(/\D/g, "") })}
                aria-invalid={!!allErrors.cnpj}
                aria-describedby={allErrors.cnpj ? `${ids.cnpj}-error` : undefined}
                className="mt-1 min-h-11 border-2 border-input"
              />
              <FieldError id={`${ids.cnpj}-error`} message={allErrors.cnpj} />
            </div>
            <div className="md:row-span-4 md:grid md:grid-rows-subgrid">
              <label htmlFor={ids.gpc} className="block text-sm font-semibold">
                Categoria (GPC)
              </label>
              <p className="text-sm text-muted-foreground">
                Restringe a busca por nome a um tipo de produto. Só vale para produtos com código de
                barras.
              </p>
              <select
                id={ids.gpc}
                value={form.gpc}
                onChange={(e) => set({ gpc: e.target.value })}
                disabled={form.modo !== "descricao"}
                aria-invalid={!!allErrors.gpc}
                aria-describedby={allErrors.gpc ? `${ids.gpc}-error` : undefined}
                className="mt-1 min-h-11 w-full rounded-lg border-2 border-input bg-card px-3 disabled:opacity-60"
              >
                <option value="">Todas as categorias</option>
                {[...GPC_SEGMENTS]
                  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((g) => (
                    <option key={g.codigo} value={g.codigo}>
                      {g.nome}
                    </option>
                  ))}
              </select>
              <FieldError id={`${ids.gpc}-error`} message={allErrors.gpc} />
            </div>
            <div className="md:row-span-4 md:grid md:grid-rows-subgrid">
              <label htmlFor={ids.ncm} className="block text-sm font-semibold">
                Código NCM
              </label>
              <p className="text-sm text-muted-foreground">
                Código fiscal de 8 números que aparece na nota. Só para busca por nome.
              </p>
              <Input
                id={ids.ncm}
                inputMode="numeric"
                maxLength={8}
                value={form.ncm}
                onChange={(e) => set({ ncm: e.target.value.replace(/\D/g, "") })}
                disabled={form.modo !== "descricao"}
                aria-invalid={!!allErrors.ncm}
                aria-describedby={allErrors.ncm ? `${ids.ncm}-error` : undefined}
                className="mt-1 min-h-11 border-2 border-input"
              />
              <FieldError id={`${ids.ncm}-error`} message={allErrors.ncm} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={state.status === "loading"}
        >
          <Search aria-hidden /> Pesquisar
        </Button>
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
        onLoadMore={() =>
          state.query &&
          state.meta &&
          run({ ...state.query, pagina: state.meta.pagina + 1 }, "more")
        }
        onFavoriteRecord={favoriteRecord}
      />
    </div>
  );
}
