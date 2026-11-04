import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchProducts } from "@/lib/economiza/api.functions";
import { CATEGORY_TERMS, CATEGORY_BROWSE } from "@/lib/categories/catalog";
import { browseCategory, distinctRecords, type BrowseCursor } from "@/lib/categories/browse";
import { productFormStore } from "@/lib/economiza/searchStores";
import { prefsStore } from "@/lib/store";
import { initialPlace } from "@/components/eal/PlaceSelector";
import { SearchLocationFields } from "@/components/search/SearchLocationFields";
import { toPlace } from "@/lib/economiza/useSearch";
import { validateDescricao } from "@/lib/economiza/validation";
import { formatDateTime } from "@/lib/economiza/format";
import { RecordCard } from "@/components/eal/RecordCard";
import { RecordDetailDialog } from "@/components/eal/RecordDetailDialog";
import type { SaleRecord } from "@/lib/economiza/adapter";
import { Button } from "@/components/ui/button";

export function CategoryProducts({ category }: { category: string }) {
  const form = productFormStore.use();
  const prefs = prefsStore.use();
  const [place, setPlace] = useState(() => form.place ?? initialPlace());
  const [days, setDays] = useState(form.dias);
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SaleRecord | null>(null);
  const location = toPlace(place, "");
  const terms = term ? [term] : (CATEGORY_TERMS[category] ?? []);
  const scope = JSON.stringify([location, days]);
  const [settledScope, setSettledScope] = useState(scope);
  useEffect(() => {
    const timer = setTimeout(() => setSettledScope(scope), CATEGORY_BROWSE.filterDelayMs);
    return () => clearTimeout(timer);
  }, [scope]);
  const waiting = settledScope !== scope;
  const query = useInfiniteQuery({
    queryKey: ["category-products", category, location, days, terms, prefs.demo],
    enabled: !!location && terms.length > 0 && !waiting,
    initialPageParam: { page: 1, sources: terms.map((_, i) => i) } as BrowseCursor,
    queryFn: ({ pageParam, signal }) =>
      browseCategory(searchProducts, {
        category,
        terms,
        place: location!,
        days,
        demo: prefs.demo,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (last) => last.next,
    staleTime: CATEGORY_BROWSE.staleMs,
    gcTime: CATEGORY_BROWSE.gcMs,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const pages = query.data?.pages ?? [];
  const records = distinctRecords(pages);
  const fetchedAt = pages.map((p) => p.fetchedAt).sort()[0];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-4">
        <SearchLocationFields
          place={place}
          dias={days}
          errors={{}}
          onPlaceChange={(next) => {
            setPlace(next);
            setDetail(null);
            productFormStore.set((s) => ({ ...s, place: next }));
          }}
          onDaysChange={(next) => {
            setDays(next);
            setDetail(null);
            productFormStore.set((s) => ({ ...s, dias: next }));
          }}
        />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = text.trim();
          const invalid = value ? validateDescricao(value) : null;
          setError(invalid);
          if (!invalid) {
            setTerm(value);
            setDetail(null);
          }
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label className="flex-1">
          <span className="mb-1 block font-semibold">Buscar outro produto nesta categoria</span>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={50}
            aria-invalid={!!error}
            placeholder="Digite o nome do produto"
            className="min-h-12 w-full rounded-xl border-2 border-input bg-card px-3"
          />
        </label>
        <Button type="submit">Buscar</Button>
        {term && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setText("");
              setTerm("");
              setError(null);
            }}
          >
            Ver vitrine
          </Button>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {!location ? (
        <p role="status" className="rounded-xl bg-primary-soft p-4">
          Escolha o município ou use sua localização para ver os produtos desta categoria.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              {term ? `Resultados para “${term}”` : "Produtos nesta categoria"}
            </h2>
            <Button
              variant="ghost"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Atualizar
            </Button>
          </div>
          {prefs.demo && (
            <p className="rounded-xl bg-warning-soft p-3 font-semibold">
              Demonstração: estes preços são fictícios.
            </p>
          )}
          {!term && (
            <p className="text-sm text-muted-foreground">
              Vitrine de produtos comuns, não um catálogo completo. Busque pelo nome para encontrar
              outros itens.
            </p>
          )}
          {fetchedAt && (
            <p className="text-sm text-muted-foreground">
              Consultado em {formatDateTime(fetchedAt)}. Preços de vendas passadas; confirme preço e
              estoque na loja.
            </p>
          )}
          {(query.isFetching || waiting) && (
            <p role="status">
              {records.length ? "Atualizando produtos…" : "Carregando produtos da categoria…"}
            </p>
          )}
          {query.isError && (
            <p role="alert">{query.error.message} Use Atualizar para tentar novamente.</p>
          )}
          {pages.some((p) => p.partial) && (
            <p role="status" className="rounded-xl bg-warning-soft p-3">
              Parte das consultas falhou. Os produtos abaixo são das consultas concluídas. Use
              Atualizar para tentar novamente.
            </p>
          )}
          {!query.isPending && !query.isError && !records.length && (
            <p role="status">
              Nenhum produto encontrado nas páginas consultadas. Tente outro nome, local ou período.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {records.map((r) => (
              <RecordCard key={r.id} r={r} distanceKm={null} onDetails={() => setDetail(r)} />
            ))}
          </div>
          {query.hasNextPage && (
            <Button disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
              Carregar mais produtos
            </Button>
          )}
          {pages.some((p) => p.capped) && (
            <p className="text-sm text-muted-foreground">
              Para manter a consulta rápida, esta vitrine mostra até três páginas por termo. Busque
              um produto pelo nome para refinar.
            </p>
          )}
        </>
      )}
      <RecordDetailDialog
        record={detail}
        distanceKm={null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
    </div>
  );
}
