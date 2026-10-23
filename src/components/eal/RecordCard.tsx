import { Clock, GitCompareArrows, Heart, Info, ListPlus, MapPin, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SaleRecord } from "@/lib/economiza/adapter";
import { formatBRL, formatDateTime, formatFuelBRL, formatKm, relativeDays } from "@/lib/economiza/format";
import { LIMITS } from "@/lib/economiza/constants";
import { compareStore, listStore, uid } from "@/lib/store";

export function priceLabel(r: SaleRecord) {
  return r.kind === "combustivel" ? formatFuelBRL(r.valorVenda) : formatBRL(r.valorVenda);
}

export function addToCompare(r: SaleRecord) {
  const cur = compareStore.get();
  if (cur.some((c) => c.id === r.id)) {
    toast.info("Este item já está na comparação.");
    return;
  }
  if (cur.length >= LIMITS.compareMax) {
    toast.error("A comparação aceita até 4 itens. Remova um para adicionar outro.");
    return;
  }
  compareStore.set([...cur, r]);
  toast.success(`Adicionado à comparação (${cur.length + 1} de 4).`);
}

export function addRecordToList(r: SaleRecord) {
  listStore.set((l) => [
    ...l,
    { id: uid(), nome: r.descricaoSefaz || r.descricao, quantidade: 1, unidade: r.unidade, observacao: "", comprado: false, gtin: r.gtin },
  ]);
  toast.success("Adicionado à lista de compras.");
}

export function RecordCard({
  r,
  distanceKm,
  cheapest,
  onDetails,
  onFavorite,
  showProductActions = true,
}: {
  r: SaleRecord;
  distanceKm: number | null;
  cheapest?: boolean | undefined;
  onDetails: () => void;
  onFavorite?: () => void | undefined;
  showProductActions?: boolean | undefined;
}) {
  const inCompare = compareStore.use().some((c) => c.id === r.id);
  return (
    <article className="card-surface fade-in flex flex-col gap-3 p-4" aria-labelledby={`t-${r.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={`t-${r.id}`} className="text-lg font-semibold break-words">
            {r.descricao}
          </h3>
          {r.descricaoSefaz && r.descricaoSefaz.toUpperCase() !== r.descricao.toUpperCase() && (
            <p className="text-sm text-muted-foreground">Descrição SEFAZ: {r.descricaoSefaz}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {r.gtin ? <>Código de barras {r.gtin} · </> : null}Unidade: {r.unidade}
          </p>
        </div>
        <div className="text-right">
          <p className="price-text text-2xl leading-none">{priceLabel(r)}</p>
          <p className="mt-1 text-sm text-muted-foreground">por {r.unidade}</p>
          {cheapest && (
            <p className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              Menor preço entre os carregados
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p className="flex items-start gap-2">
          <StoreIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{r.store.nome}</span>
        </p>
        <p className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {[r.store.bairro, r.store.municipio].filter(Boolean).join(", ") || "Endereço não informado"}
            {distanceKm != null && <> · aprox. {formatKm(distanceKm)}</>}
          </span>
        </p>
        <p className="flex items-start gap-2 sm:col-span-2">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Última venda registrada: {formatDateTime(r.dataVendaUtc)} ({relativeDays(r.dataVendaUtc)})
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onDetails}>
          <Info aria-hidden /> Detalhes
        </Button>
        <Button variant="outline" size="sm" onClick={() => addToCompare(r)} aria-pressed={inCompare}>
          <GitCompareArrows aria-hidden /> {inCompare ? "Na comparação" : "Comparar"}
        </Button>
        {onFavorite && (
          <Button variant="outline" size="sm" onClick={onFavorite}>
            <Heart aria-hidden /> Favoritar
          </Button>
        )}
        {showProductActions && (
          <Button variant="outline" size="sm" onClick={() => addRecordToList(r)}>
            <ListPlus aria-hidden /> Adicionar à lista
          </Button>
        )}
      </div>
    </article>
  );
}
