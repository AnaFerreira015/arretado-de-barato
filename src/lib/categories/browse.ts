import type { SearchResponse } from "@/lib/economiza/api.functions";
import type { ProductQuery, Place } from "@/lib/economiza/validation";
import type { SaleRecord } from "@/lib/economiza/adapter";
import { belongsToCategory } from "./classification";
import { CATEGORY_BROWSE } from "./catalog";
export type BrowseCursor = { page: number; sources: number[] };
export type BrowsePage = {
  items: SaleRecord[];
  next: BrowseCursor | undefined;
  fetchedAt: string;
  partial: boolean;
  capped: boolean;
};
type Search = (args: { data: { query: ProductQuery; demo: boolean } }) => Promise<SearchResponse>;
export async function browseCategory(
  search: Search,
  args: {
    category: string;
    terms: readonly string[];
    place: Place;
    days: number;
    demo: boolean;
    cursor: BrowseCursor;
    signal: AbortSignal;
  },
): Promise<BrowsePage> {
  const responses = await Promise.all(
    args.cursor.sources.map(async (index) => {
      if (args.signal.aborted) throw new Error("Consulta cancelada.");
      const term = args.terms[index];
      if (!term) throw new Error("Termo inválido.");
      const result: SearchResponse = await search({
        data: {
          query: {
            descricao: term,
            gpc: args.category,
            place: args.place,
            dias: args.days,
            pagina: args.cursor.page,
            registrosPorPagina: CATEGORY_BROWSE.pageSize,
          },
          demo: args.demo,
        },
      }).catch((): SearchResponse => ({
        ok: false,
        code: "network",
        message: "Não foi possível carregar parte dos produtos.",
      }));
      return { index, result };
    }),
  );
  if (args.signal.aborted) throw new Error("Consulta cancelada.");
  const successes = responses.filter((r) => r.result.ok);
  if (!successes.length) {
    const failure = responses[0]?.result;
    throw new Error(
      failure && !failure.ok ? failure.message : "Não foi possível carregar os produtos.",
    );
  }
  const items: SaleRecord[] = [];
  const more: number[] = [];
  const dates: string[] = [];
  let partial = false;
  for (const { index, result } of responses) {
    if (!result.ok) {
      partial = true;
      continue;
    }
    dates.push(result.fetchedAt);
    // Mesmo que a origem ignore o filtro, não misturar produtos de outras categorias.
    items.push(...result.page.items.filter((r) => belongsToCategory(r, args.category)));
    if (!result.page.ultimaPagina) more.push(index);
  }
  const capped = more.length > 0 && args.cursor.page >= CATEGORY_BROWSE.maxPages;
  return {
    items,
    next: more.length && !capped ? { page: args.cursor.page + 1, sources: more } : undefined,
    fetchedAt: dates.sort()[0]!,
    partial,
    capped,
  };
}
export function distinctRecords(pages: BrowsePage[]): SaleRecord[] {
  return [...new Map(pages.flatMap((p) => p.items).map((r) => [r.id, r])).values()].sort(
    (a, b) => a.valorVenda - b.valorVenda,
  );
}
