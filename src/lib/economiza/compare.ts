// Business rules for comparing records and estimating shopping baskets.
import type { SaleRecord } from "./adapter";

/** Records are automatically equivalent only when they share the same GTIN (and unit). */
export function equivalenceOf(items: SaleRecord[]): "same-gtin" | "unconfirmed" {
  if (items.length < 2) return "unconfirmed";
  const first = items[0]!;
  const g = first.gtin;
  const u = first.unidade.toUpperCase();
  return g && items.every((i) => i.gtin === g && i.unidade.toUpperCase() === u) ? "same-gtin" : "unconfirmed";
}

/** Cheapest among loaded records only. Returns null when there is nothing to compare. */
export function cheapest(items: SaleRecord[]): SaleRecord | null {
  if (!items.length) return null;
  return items.reduce((m, i) => (i.valorVenda < m.valorVenda ? i : m));
}

export type BasketItemInput = {
  id: string;
  quantidade: number;
  /** All loaded records for this item; must already be filtered to equivalent products (same GTIN). */
  records: SaleRecord[];
};

export type BasketResult = {
  totalItems: number;
  pricedItems: number;
  missingItemIds: string[];
  /** Sum using the lowest price for each priced item, from any store. */
  splitTotal: number | null;
  /** Per-store totals; `complete` true only when the store has every priced item... and every item overall. */
  stores: Array<{ cnpj: string; nome: string; total: number; covered: number; complete: boolean }>;
  bestCompleteStore: { cnpj: string; nome: string; total: number } | null;
  /** Savings of split vs best complete store; only when every item is priced and a complete store exists. */
  splitSavings: number | null;
};

export function computeBasket(items: BasketItemInput[]): BasketResult {
  const priced = items.filter((i) => i.records.length > 0);
  const missingItemIds = items.filter((i) => i.records.length === 0).map((i) => i.id);
  const splitTotal = priced.length
    ? round2(priced.reduce((s, i) => s + i.quantidade * Math.min(...i.records.map((r) => r.valorVenda)), 0))
    : null;

  const storeMap = new Map<string, { cnpj: string; nome: string; total: number; covered: number }>();
  for (const it of items) {
    const bestPerStore = new Map<string, SaleRecord>();
    for (const r of it.records) {
      const cur = bestPerStore.get(r.store.cnpj);
      if (!cur || r.valorVenda < cur.valorVenda) bestPerStore.set(r.store.cnpj, r);
    }
    for (const [cnpj, r] of bestPerStore) {
      const s = storeMap.get(cnpj) ?? { cnpj, nome: r.store.nome, total: 0, covered: 0 };
      s.total += it.quantidade * r.valorVenda;
      s.covered += 1;
      storeMap.set(cnpj, s);
    }
  }
  const stores = [...storeMap.values()]
    .map((s) => ({ ...s, total: round2(s.total), complete: s.covered === items.length }))
    .sort((a, b) => b.covered - a.covered || a.total - b.total);
  const completes = stores.filter((s) => s.complete);
  const best = completes.length ? completes.reduce((m, s) => (s.total < m.total ? s : m)) : null;
  const allPriced = missingItemIds.length === 0 && items.length > 0;
  return {
    totalItems: items.length,
    pricedItems: priced.length,
    missingItemIds,
    splitTotal,
    stores,
    bestCompleteStore: best ? { cnpj: best.cnpj, nome: best.nome, total: best.total } : null,
    splitSavings: allPriced && best && splitTotal != null ? round2(best.total - splitTotal) : null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Runs async tasks with limited concurrency, reporting progress; stops scheduling when aborted. */
export async function runLimited<T, R>(
  inputs: T[],
  limit: number,
  task: (input: T, signal: AbortSignal) => Promise<R>,
  opts: { signal: AbortSignal; onProgress?: (done: number, total: number) => void },
): Promise<Array<{ input: T; result?: R; error?: unknown }>> {
  const out: Array<{ input: T; result?: R; error?: unknown }> = new Array(inputs.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < inputs.length && !opts.signal.aborted) {
      const idx = next++;
      try {
        const inp = inputs[idx]!;
        out[idx] = { input: inp, result: await task(inp, opts.signal) };
      } catch (error) {
        out[idx] = { input: inputs[idx]!, error };
      }
      done++;
      opts.onProgress?.(done, inputs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, inputs.length) }, worker));
  return out.filter(Boolean);
}
