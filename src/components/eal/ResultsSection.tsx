import { useId, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaleRecord } from "@/lib/economiza/adapter";
import { formatDateTime } from "@/lib/economiza/format";
import { distanceFor, sortRecords, type SearchState, type SortKey } from "@/lib/economiza/useSearch";
import { DataNotice, ErrorState } from "./Notices";
import { RecordCard } from "./RecordCard";
import { RecordDetailDialog } from "./RecordDetailDialog";

export function ResultsSection<Q>({
  state,
  onLoadMore,
  onRetry,
  onFavoriteRecord,
  extra,
  kindLabel,
}: {
  state: SearchState<Q>;
  onLoadMore: () => void;
  onRetry: () => void;
  onFavoriteRecord?: (r: SaleRecord) => void | undefined;
  extra?: (r: SaleRecord) => ReactNode | undefined;
  kindLabel: string;
}) {
  const [sort, setSort] = useState<SortKey>("preco");
  const [detail, setDetail] = useState<SaleRecord | null>(null);
  const sortId = useId();
  const hasOrigin = !!state.origin;
  const effectiveSort = sort === "distancia" && !hasOrigin ? "preco" : sort;
  const sorted = useMemo(() => sortRecords(state.items, effectiveSort, state.origin), [state.items, effectiveSort, state.origin]);
  const minPrice = state.items.length ? Math.min(...state.items.map((i) => i.valorVenda)) : null;
  const total = state.meta?.totalRegistros ?? 0;
  const allLoaded = !!state.meta?.ultimaPagina;

  const live =
    state.status === "loading"
      ? `Pesquisando ${kindLabel}…`
      : state.status === "error"
        ? ""
        : state.status === "success"
          ? state.items.length
            ? `${state.items.length} resultados carregados de ${total}.`
            : "Nenhum resultado encontrado."
          : "";

  return (
    <section aria-labelledby="res-title" className="mt-6 space-y-4">
      <p className="sr-only" role="status" aria-live="polite">
        {live}
      </p>
      {state.status === "loading" && typeof document !== "undefined" && createPortal(
        <div
          className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-background/50 p-4 backdrop-blur-sm"
          aria-hidden="true"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center text-card-foreground shadow-xl">
            <Loader2 className="size-9 animate-spin text-primary motion-reduce:animate-none" />
            <p className="text-lg font-semibold">Pesquisando {kindLabel}…</p>
          </div>
        </div>,
        document.body,
      )}
      {state.status === "error" && state.error && !state.error.errors && (
        <ErrorState message={state.error.message} detail={state.error.detail} onRetry={onRetry} />
      )}
      {(state.status === "success" || state.status === "loadingMore" || (state.status === "error" && state.items.length > 0)) && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="res-title" className="text-xl font-bold">
                Resultados
                {state.demo && <span className="ml-2 rounded bg-warning-soft px-2 py-0.5 text-sm text-warning-foreground">fictícios</span>}
              </h2>
              <p className="text-sm text-muted-foreground">
                {state.items.length} de {total} registros carregados
                {state.fetchedAt && <> · consultado em {formatDateTime(state.fetchedAt)}{state.cached && " (resultado guardado há poucos minutos)"}</>}
              </p>
            </div>
            {state.items.length > 1 && (
              <div>
                <label htmlFor={sortId} className="block text-sm font-semibold">
                  Ordenar por
                </label>
                <select
                  id={sortId}
                  value={effectiveSort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="mt-1 min-h-11 rounded-lg border-2 border-input bg-card px-3"
                >
                  <option value="preco">Menor preço</option>
                  <option value="data">Venda mais recente</option>
                  {hasOrigin && <option value="distancia">Mais perto</option>}
                </select>
              </div>
            )}
          </div>
          {state.items.length > 0 && !allLoaded && (
            <p className="text-sm text-muted-foreground">
              A ordenação considera apenas os {state.items.length} resultados já carregados.
            </p>
          )}
          {state.invalidCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {state.invalidCount} registro(s) com dados incompletos foram ocultados.
            </p>
          )}
          <DataNotice />

          {state.items.length === 0 ? (
            <div className="card-surface flex flex-col items-start gap-2 p-5">
              <p className="flex items-center gap-2 text-lg font-semibold">
                <SearchX aria-hidden className="size-5" /> Nenhuma venda encontrada
              </p>
              <p>Tente aumentar o período, mudar o local ou usar outras palavras (por exemplo, abreviações como “LTE” para leite).</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {sorted.map((r) => (
                <li key={r.id}>
                  <RecordCard
                    r={r}
                    distanceKm={distanceFor(r, state.origin)}
                    cheapest={minPrice != null && r.valorVenda === minPrice && state.items.length > 1}
                    onDetails={() => setDetail(r)}
                    onFavorite={onFavoriteRecord ? () => onFavoriteRecord(r) : undefined}
                    showProductActions={r.kind === "produto"}
                  />
                  {extra?.(r)}
                </li>
              ))}
            </ul>
          )}

          {state.status === "error" && state.error && state.items.length > 0 && (
            <ErrorState message={state.error.message} onRetry={onLoadMore} />
          )}
          {!allLoaded && state.items.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline" size="lg" onClick={onLoadMore} disabled={state.status === "loadingMore"}>
                {state.status === "loadingMore" ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {state.status === "loadingMore" ? "Carregando…" : "Carregar mais"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {state.items.length} de {total} carregados
              </p>
            </div>
          )}
        </>
      )}
      <RecordDetailDialog
        record={detail}
        distanceKm={detail ? distanceFor(detail, state.origin) : null}
        onOpenChange={(o) => !o && setDetail(null)}
      />
    </section>
  );
}
