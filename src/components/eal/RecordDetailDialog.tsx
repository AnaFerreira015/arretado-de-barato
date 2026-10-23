import { Copy, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fullAddress, mapsUrl, type SaleRecord } from "@/lib/economiza/adapter";
import { formatBRL, formatCnpj, formatDateTime, formatFuelBRL, formatKm } from "@/lib/economiza/format";
import { GPC_SEGMENTS } from "@/lib/economiza/constants";
import { priceLabel } from "./RecordCard";
import { DataNotice } from "./Notices";

export function RecordDetailDialog({
  record,
  distanceKm,
  onOpenChange,
}: {
  record: SaleRecord | null;
  distanceKm: number | null;
  onOpenChange: (o: boolean) => void;
}) {
  const r = record;
  const addr = r ? fullAddress(r.store) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${r!.store.nome} — ${addr}`);
      toast.success("Endereço copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto do endereço manualmente.");
    }
  };
  const fmt = r?.kind === "combustivel" ? formatFuelBRL : formatBRL;
  return (
    <Dialog open={!!r} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {r && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-xl">{r.descricao}</DialogTitle>
              <DialogDescription>Informações da última venda registrada em nota fiscal.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-base">
              <div className="rounded-lg bg-primary-soft p-3">
                <p className="price-text text-3xl">{priceLabel(r)}</p>
                <p className="text-sm">por {r.unidade} · Última venda registrada: {formatDateTime(r.dataVendaUtc)}</p>
                {r.valorDeclarado != null && Math.abs(r.valorDeclarado - r.valorVenda) > 0.004 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Valor declarado na nota: {fmt(r.valorDeclarado)}. A diferença pode vir de desconto na nota e não
                    indica promoção.
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {r.descricaoSefaz && (<><dt className="font-semibold">Descrição SEFAZ</dt><dd>{r.descricaoSefaz}</dd></>)}
                {r.gtin && (<><dt className="font-semibold">Código de barras</dt><dd>{r.gtin}</dd></>)}
                {r.ncm && r.kind === "produto" && (<><dt className="font-semibold">NCM</dt><dd>{r.ncm}</dd></>)}
                {r.gpc && (<><dt className="font-semibold">Categoria</dt><dd>{GPC_SEGMENTS.find((g) => g.codigo === r.gpc)?.nome ?? r.gpc}</dd></>)}
                {r.codigo && (<><dt className="font-semibold">Código na loja</dt><dd>{r.codigo}</dd></>)}
              </dl>
              <section aria-labelledby="det-loja">
                <h3 id="det-loja" className="text-lg font-semibold">{r.store.nome}</h3>
                {r.store.razaoSocial && r.store.razaoSocial !== r.store.nome && (
                  <p className="text-sm text-muted-foreground">{r.store.razaoSocial}</p>
                )}
                {r.store.cnpj && <p className="text-sm text-muted-foreground">CNPJ {formatCnpj(r.store.cnpj)}</p>}
                <p className="mt-2">{addr || "Endereço não informado"}</p>
                {distanceKm != null && <p className="text-sm">Distância aproximada em linha reta: {formatKm(distanceKm)}</p>}
                {r.store.telefone && (
                  <p className="mt-1">
                    <a className="inline-flex min-h-11 items-center gap-2 text-primary underline" href={`tel:${r.store.telefone.replace(/[^\d+]/g, "")}`}>
                      <Phone aria-hidden className="size-4" /> {r.store.telefone}
                    </a>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={copy} disabled={!addr}>
                    <Copy aria-hidden /> Copiar endereço
                  </Button>
                  <Button asChild>
                    <a href={mapsUrl(r.store)} target="_blank" rel="noopener noreferrer">
                      <Navigation aria-hidden /> Abrir rota no mapa
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </Button>
                </div>
              </section>
              <DataNotice />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
