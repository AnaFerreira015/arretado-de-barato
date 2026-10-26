import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PlaceSelector, initialPlace, type PlaceState } from "@/components/eal/PlaceSelector";
import { PeriodSelect } from "@/components/eal/PeriodSelect";
import { FieldError } from "@/components/eal/FieldError";
import { DataNotice, ModeBanner } from "@/components/eal/Notices";
import { LIMITS } from "@/lib/economiza/constants";
import { searchProducts } from "@/lib/economiza/api.functions";
import { computeBasket, runLimited } from "@/lib/economiza/compare";
import { formatBRL, formatDateTime } from "@/lib/economiza/format";
import { toPlace } from "@/lib/economiza/useSearch";
import type { FieldErrors } from "@/lib/economiza/validation";
import { validateDescricao, validateGtin, validateProductQuery } from "@/lib/economiza/validation";
import type { SaleRecord } from "@/lib/economiza/adapter";
import { listStore, prefsStore, uid, type ListItem } from "@/lib/store";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Lista de compras — Economiza AL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Monte sua lista de compras e estime o total com preços registrados em Alagoas." },
      { property: "og:title", content: "Lista de compras — Economiza AL" },
      { property: "og:description", content: "Organize sua lista e veja onde cada item foi vendido mais barato." },
    ],
  }),
  component: ListPage,
});

type ItemPrices = { status: "ok" | "error"; records: SaleRecord[]; suggestions: SaleRecord[]; message?: string | undefined };

function ListPage() {
  const items = listStore.use();
  const [place, setPlace] = useState<PlaceState | null>(null);
  const [dias, setDias] = useState<number>(LIMITS.diasDefault);
  const [placeErrors, setPlaceErrors] = useState<FieldErrors>({});
  const [prices, setPrices] = useState<Record<string, ItemPrices>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [searchedAt, setSearchedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setPlace(initialPlace()), []);
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (id: string, patch: Partial<ListItem>) => listStore.set((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const runPrices = async () => {
    const p = place ? toPlace(place, "") : undefined;
    const probe = validateProductQuery({ descricao: "abc", place: p!, dias, pagina: 1, registrosPorPagina: LIMITS.registrosDefault });
    if (!probe.ok) {
      setPlaceErrors(probe.errors);
      return;
    }
    setPlaceErrors({});
    const pending = items.filter((i) => !i.comprado);
    if (!pending.length) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPrices({});
    setProgress({ done: 0, total: pending.length });
    const demo = prefsStore.get().demo;
    await runLimited(
      pending,
      LIMITS.basketConcurrency,
      async (it) => {
        const byGtin = !!it.gtin;
        const res = await searchProducts({
          data: {
            demo,
            query: {
              gtin: byGtin ? it.gtin! : undefined,
              descricao: byGtin ? undefined : it.nome.trim().slice(0, LIMITS.descricaoMax),
              place: p!, dias, pagina: 1, registrosPorPagina: LIMITS.registrosDefault,
            },
          },
        });
        if (ctrl.signal.aborted) return;
        const val: ItemPrices = !res.ok
          ? { status: "error", records: [], suggestions: [], message: res.errors ? Object.values(res.errors)[0] : res.message }
          : byGtin
            ? { status: "ok", records: res.page.items.filter((r) => r.gtin === it.gtin), suggestions: [] }
            : {
                status: "ok",
                records: [],
                suggestions: dedupeByGtin(res.page.items.filter((r) => r.gtin)).slice(0, 4),
              };
        setPrices((m) => ({ ...m, [it.id]: val }));
      },
      { signal: ctrl.signal, onProgress: (done, total) => setProgress({ done, total }) },
    );
    if (!ctrl.signal.aborted) setSearchedAt(new Date().toISOString());
    setProgress(null);
  };

  const cancel = () => {
    abortRef.current?.abort();
    setProgress(null);
  };

  const pending = items.filter((i) => !i.comprado);
  const searched = pending.filter((i) => prices[i.id]);
  const basket = computeBasket(searched.map((i) => ({ id: i.id, quantidade: i.quantidade, records: prices[i.id]?.records ?? [] })));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold md:text-3xl">Lista de compras</h1>
      <ModeBanner />
      <AddItemForm />

      {items.length === 0 ? (
        <p className="card-surface p-5">Sua lista está vazia. Adicione itens acima ou pelos resultados da pesquisa.</p>
      ) : (
        <ul className="space-y-2" aria-label="Itens da lista">
          {items.map((it) => (
            <ListRow key={it.id} item={it} prices={prices[it.id]} onUpdate={(p) => update(it.id, p)}
              onRemove={() => listStore.set((l) => l.filter((x) => x.id !== it.id))} />
          ))}
        </ul>
      )}

      {pending.length > 0 && place && (
        <section aria-labelledby="pp-t" className="card-surface space-y-4 p-4 md:p-6">
          <h2 id="pp-t" className="text-xl font-bold">Pesquisar preços da lista</h2>
          <p className="text-sm text-muted-foreground">
            Cada item é pesquisado separadamente. Itens com código de barras são comparados com segurança; itens só com nome
            precisam ser associados a um produto para entrar no total.
          </p>
          <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
            <PlaceSelector value={place} onChange={setPlace} errors={placeErrors} />
            <PeriodSelect value={dias} onChange={setDias} />
          </div>
          {progress ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="flex items-center gap-2">
                <Loader2 aria-hidden className="size-5 animate-spin" /> Pesquisando {progress.done} de {progress.total} itens…
              </p>
              <Progress value={(progress.done / progress.total) * 100} aria-label="Progresso da pesquisa" />
              <Button variant="outline" onClick={cancel}><X aria-hidden /> Cancelar</Button>
            </div>
          ) : (
            <Button size="lg" onClick={runPrices}><Search aria-hidden /> Pesquisar preços ({pending.length} itens)</Button>
          )}
        </section>
      )}

      {searched.length > 0 && !progress && (
        <section aria-labelledby="sum-t" className="card-surface space-y-3 p-4 md:p-6">
          <h2 id="sum-t" className="text-xl font-bold">Estimativa da cesta</h2>
          {searchedAt && <p className="text-sm text-muted-foreground">Consultado em {formatDateTime(searchedAt)}.</p>}
          <p className="text-lg font-semibold" role="status">
            Preços encontrados para {basket.pricedItems} de {basket.totalItems} itens
          </p>
          {basket.missingItemIds.length > 0 && (
            <p className="text-sm text-warning-foreground">
              Sem preço confiável: {basket.missingItemIds.map((id) => items.find((i) => i.id === id)?.nome).join(", ")}. Esses
              itens não entram no total (não são contados como zero).
            </p>
          )}
          {basket.splitTotal != null && (
            <p>
              Comprando cada item onde foi vendido mais barato ({basket.pricedItems} {basket.pricedItems === 1 ? "item" : "itens"}):{" "}
              <strong className="price-text text-xl">{formatBRL(basket.splitTotal)}</strong>
            </p>
          )}
          {basket.bestCompleteStore ? (
            <p>
              Tudo em um só lugar, {basket.bestCompleteStore.nome}: <strong className="price-text text-xl">{formatBRL(basket.bestCompleteStore.total)}</strong>
            </p>
          ) : (
            basket.pricedItems > 0 && <p className="text-sm text-muted-foreground">Nenhum estabelecimento tem registro de venda de todos os itens.</p>
          )}
          {basket.splitSavings != null && basket.splitSavings > 0 && (
            <p className="rounded-lg bg-primary-soft p-3 text-accent-foreground">
              Dividindo as compras, a diferença estimada é de {formatBRL(basket.splitSavings)} em relação à melhor loja única, considerando
              os {basket.totalItems} itens. Não inclui deslocamento entre lojas.
            </p>
          )}
          {basket.stores.length > 0 && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver total por estabelecimento</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {basket.stores.slice(0, 10).map((s) => (
                  <li key={s.cnpj}>
                    {s.nome}: {formatBRL(s.total)} — {s.covered} de {basket.totalItems} itens{s.complete ? " (completa)" : " (incompleta, não comparável)"}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <DataNotice />
        </section>
      )}

      {items.length > 0 && (
        <p className="text-sm text-muted-foreground">A lista fica salva só neste aparelho.</p>
      )}
    </div>
  );
}

function dedupeByGtin(rs: SaleRecord[]) {
  const m = new Map<string, SaleRecord>();
  for (const r of rs) if (!m.has(r.gtin!)) m.set(r.gtin!, r);
  return [...m.values()];
}

function AddItemForm() {
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("1");
  const [unidade, setUnidade] = useState("UN");
  const [gtin, setGtin] = useState("");
  const [errors, setErrors] = useState<{ nome?: string; qtd?: string; gtin?: string }>({});
  const ids = { nome: useId(), qtd: useId(), un: useId(), gtin: useId() };
  const submit = () => {
    const e: { nome?: string; qtd?: string; gtin?: string } = {};
    const nErr = validateDescricao(nome);
    if (nErr) e.nome = nErr;
    const q = Number(qtd.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) e.qtd = "Informe uma quantidade maior que zero.";
    if (gtin) {
      const g = validateGtin(gtin);
      if (g) e.gtin = g;
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    listStore.set((l) => [...l, { id: uid(), nome: nome.trim(), quantidade: q, unidade: unidade.trim() || "UN", observacao: "", comprado: false, gtin: gtin || null }]);
    setNome(""); setQtd("1"); setGtin("");
  };
  return (
    <form className="card-surface grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] sm:items-end" noValidate
      onSubmit={(e) => { e.preventDefault(); submit(); }} aria-label="Adicionar item à lista">
      <div>
        <label htmlFor={ids.nome} className="block text-sm font-semibold">Item</label>
        <Input id={ids.nome} value={nome} maxLength={50} onChange={(e) => setNome(e.target.value)} aria-invalid={!!errors.nome} className="mt-1 min-h-11 border-2 border-input" placeholder="Ex.: arroz" />
        <FieldError message={errors.nome} />
      </div>
      <div>
        <label htmlFor={ids.qtd} className="block text-sm font-semibold">Quantidade</label>
        <Input id={ids.qtd} inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} aria-invalid={!!errors.qtd} className="mt-1 min-h-11 border-2 border-input" />
        <FieldError message={errors.qtd} />
      </div>
      <div>
        <label htmlFor={ids.un} className="block text-sm font-semibold">Unidade</label>
        <Input id={ids.un} value={unidade} maxLength={6} onChange={(e) => setUnidade(e.target.value.toUpperCase())} className="mt-1 min-h-11 border-2 border-input" />
      </div>
      <div>
        <label htmlFor={ids.gtin} className="block text-sm font-semibold">Código de barras (opcional)</label>
        <Input id={ids.gtin} inputMode="numeric" maxLength={14} value={gtin} onChange={(e) => setGtin(e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.gtin} className="mt-1 min-h-11 border-2 border-input" />
        <FieldError message={errors.gtin} />
      </div>
      <Button type="submit"><Plus aria-hidden /> Adicionar</Button>
    </form>
  );
}

function ListRow({ item, prices, onUpdate, onRemove }: { item: ListItem; prices?: ItemPrices | undefined; onUpdate: (p: Partial<ListItem>) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const cb = useId();
  const best = prices?.records.length ? prices.records.reduce((m, r) => (r.valorVenda < m.valorVenda ? r : m)) : null;
  return (
    <li className="card-surface p-3">
      {editing ? (
        <form className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]" onSubmit={(e) => {
          e.preventDefault();
          const q = Number(String(draft.quantidade).replace(",", "."));
          if (validateDescricao(draft.nome) || !(q > 0)) return;
          onUpdate({ ...draft, quantidade: q, nome: draft.nome.trim() });
          setEditing(false);
        }}>
          <Input aria-label="Nome do item" value={draft.nome} maxLength={50} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} className="min-h-11 border-2 border-input" />
          <Input aria-label="Quantidade" inputMode="decimal" value={draft.quantidade} onChange={(e) => setDraft({ ...draft, quantidade: e.target.value as unknown as number })} className="min-h-11 border-2 border-input" />
          <Input aria-label="Unidade" value={draft.unidade} maxLength={6} onChange={(e) => setDraft({ ...draft, unidade: e.target.value.toUpperCase() })} className="min-h-11 border-2 border-input" />
          <Input aria-label="Observação" value={draft.observacao} onChange={(e) => setDraft({ ...draft, observacao: e.target.value })} placeholder="Observação" className="min-h-11 border-2 border-input" />
          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => { setDraft(item); setEditing(false); }}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox id={cb} checked={item.comprado} onCheckedChange={(c) => onUpdate({ comprado: c === true })} className="size-6" />
          <label htmlFor={cb} className="min-w-0 flex-1 cursor-pointer">
            <span className={item.comprado ? "font-semibold line-through text-muted-foreground" : "font-semibold"}>
              {item.nome}
            </span>{" "}
            <span className="text-muted-foreground">— {String(item.quantidade).replace(".", ",")} {item.unidade}</span>
            {item.comprado && <span className="ml-2 text-sm">(comprado)</span>}
            {item.gtin && <span className="block text-sm text-muted-foreground">Código de barras {item.gtin}</span>}
            {item.observacao && <span className="block text-sm text-muted-foreground">{item.observacao}</span>}
          </label>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" aria-label={`Editar ${item.nome}`} onClick={() => { setDraft(item); setEditing(true); }}><Pencil aria-hidden /></Button>
            <Button variant="outline" size="icon" aria-label={`Remover ${item.nome}`} onClick={onRemove}><Trash2 aria-hidden /></Button>
          </div>
        </div>
      )}
      {prices && !item.comprado && (
        <div className="mt-2 border-t pt-2 text-sm">
          {prices.status === "error" ? (
            <p className="text-destructive">Não foi possível pesquisar: {prices.message}</p>
          ) : best ? (
            <p>
              Menor preço entre os carregados: <strong className="price-text">{formatBRL(best.valorVenda)}</strong> por {best.unidade} em {best.store.nome}
              {item.quantidade !== 1 && <> · {String(item.quantidade).replace(".", ",")} × = {formatBRL(best.valorVenda * item.quantidade)}</>}
              <span className="block text-muted-foreground">{prices.records.length} registro(s) do mesmo código de barras. Última venda {formatDateTime(best.dataVendaUtc)}.</span>
            </p>
          ) : item.gtin ? (
            <p className="text-warning-foreground">Sem preço: nenhuma venda encontrada para este código de barras.</p>
          ) : prices.suggestions.length ? (
            <div>
              <p className="text-warning-foreground">Sem preço confiável. Escolha o produto exato para pesquisar pelo código de barras:</p>
              <ul className="mt-1 space-y-1">
                {prices.suggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <span className="flex-1">{s.descricao} ({s.unidade}) · {s.gtin}</span>
                    <Button size="sm" variant="outline" onClick={() => onUpdate({ gtin: s.gtin })}>Usar este produto</Button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-muted-foreground">Depois de escolher, pesquise os preços novamente.</p>
            </div>
          ) : (
            <p className="text-warning-foreground">Sem preço: nenhum produto com código de barras encontrado para este nome.</p>
          )}
        </div>
      )}
    </li>
  );
}
