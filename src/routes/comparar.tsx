import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataNotice } from "@/components/eal/Notices";
import { priceLabel } from "@/components/eal/RecordCard";
import { cheapest, equivalenceOf } from "@/lib/economiza/compare";
import { formatBRL, formatDateTime, formatFuelBRL } from "@/lib/economiza/format";
import { compareStore } from "@/lib/store";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar preços — Economiza AL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Compare lado a lado até quatro preços registrados em estabelecimentos de Alagoas." },
      { property: "og:title", content: "Comparar preços — Economiza AL" },
      { property: "og:description", content: "Coloque até quatro resultados lado a lado e veja a diferença entre produtos equivalentes." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const items = compareStore.use();
  const [confirmed, setConfirmed] = useState(false);
  const eq = equivalenceOf(items);
  const canCompute = items.length >= 2 && (eq === "same-gtin" || confirmed);
  const best = canCompute ? cheapest(items) : null;
  const max = canCompute ? Math.max(...items.map((i) => i.valorVenda)) : null;
  const fmt = items[0]?.kind === "combustivel" ? formatFuelBRL : formatBRL;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Comparar</h1>
      {items.length === 0 ? (
        <div className="card-surface p-5">
          <p>Nenhum item na comparação. Use o botão “Comparar” nos resultados para adicionar até 4 itens.</p>
          <Button asChild className="mt-3"><Link to="/">Ir para a pesquisa</Link></Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">{items.length} de 4 itens.</p>
          {items.length >= 2 && eq === "same-gtin" && (
            <p className="rounded-lg bg-primary-soft p-3 text-accent-foreground">
              Todos os itens têm o mesmo código de barras e a mesma unidade, então são o mesmo produto.
            </p>
          )}
          {items.length >= 2 && eq === "unconfirmed" && (
            <div className="rounded-lg border-2 border-warning bg-warning-soft p-3 text-warning-foreground">
              <p className="font-semibold">Não dá para confirmar que estes itens são o mesmo produto.</p>
              <p className="text-sm">Os códigos de barras ou as unidades são diferentes ou não foram informados. Marcas, pesos e embalagens podem variar.</p>
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                <Checkbox checked={confirmed} onCheckedChange={(c) => setConfirmed(c === true)} className="size-5" />
                Conferi e confirmo que são o mesmo produto, na mesma embalagem e quantidade
              </label>
            </div>
          )}
          {best && max != null && max > best.valorVenda && (
            <p role="status" className="text-lg">
              Entre estes {items.length} itens, o menor preço registrado é <strong>{priceLabel(best)}</strong> em{" "}
              <strong>{best.store.nome}</strong>, {fmt(max - best.valorVenda)} a menos que o maior. Não inclui deslocamento.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((r) => (
              <li key={r.id} className="card-surface flex flex-col gap-2 p-4">
                <p className="price-text text-2xl">{priceLabel(r)}</p>
                {best?.id === r.id && <p className="text-sm font-semibold text-primary">✓ Menor preço desta comparação</p>}
                <p className="font-semibold">{r.descricao}</p>
                <dl className="text-sm">
                  <dt className="inline font-semibold">Unidade: </dt><dd className="inline">{r.unidade}</dd><br />
                  <dt className="inline font-semibold">Código de barras: </dt><dd className="inline">{r.gtin ?? "não informado"}</dd><br />
                  <dt className="inline font-semibold">Local: </dt><dd className="inline">{r.store.nome}{r.store.bairro ? `, ${r.store.bairro}` : ""}</dd><br />
                  <dt className="inline font-semibold">Última venda registrada: </dt><dd className="inline">{formatDateTime(r.dataVendaUtc)}</dd>
                </dl>
                <Button variant="outline" size="sm" className="mt-auto" onClick={() => compareStore.set((l) => l.filter((x) => x.id !== r.id))}>
                  <Trash2 aria-hidden /> Remover<span className="sr-only"> {r.descricao}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" onClick={() => { compareStore.reset(); setConfirmed(false); }}>Limpar comparação</Button>
          <DataNotice />
        </>
      )}
    </div>
  );
}
