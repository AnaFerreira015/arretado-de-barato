import type { SearchResponse } from "@/lib/economiza/api.functions";
import type { Place, ProductQuery } from "@/lib/economiza/validation";
import type { BrowsePage } from "./browse";
import { belongsToCategory } from "./classification";
import { CATEGORY_TERMS, CATEGORY_BROWSE } from "./catalog";
import { GPC_SEGMENTS } from "@/lib/economiza/constants";

export const AVAILABILITY_BATCH_SIZE = 12;
const priority = [
  "50000000",
  "47000000",
  "53000000",
  "10000000",
  "73000000",
  "72000000",
  "51000000",
  "67000000",
];
export const AVAILABILITY_CODES = [
  ...priority,
  ...GPC_SEGMENTS.map((g) => g.codigo).filter((code) => !priority.includes(code)),
];
type Search = (args: { data: { query: ProductQuery; demo: boolean } }) => Promise<SearchResponse>;
export type AvailabilityPage = {
  found: { code: string; page: BrowsePage }[];
  failed: number;
  checked: number;
  next: number | undefined;
};
export async function checkCategoryAvailability(
  search: Search,
  args: {
    place: Place;
    days: number;
    demo: boolean;
    offset: number;
    signal: AbortSignal;
    onFound?: (found: AvailabilityPage["found"][number]) => void;
    onProgress?: (checked: number, total: number) => void;
  },
): Promise<AvailabilityPage> {
  const codes = AVAILABILITY_CODES.slice(args.offset, args.offset + AVAILABILITY_BATCH_SIZE);
  const found: AvailabilityPage["found"] = [];
  let failed = 0;
  let index = 0;
  let checked = 0;
  async function worker() {
    while (index < codes.length && !args.signal.aborted) {
      const code = codes[index++]!;
      const terms = CATEGORY_TERMS[code]!;
      let uncertain = false;
      let confirmed = false;
      for (const term of terms) {
        if (args.signal.aborted) return;
        try {
          const result = await search({
            data: {
              query: {
                descricao: term,
                gpc: code,
                place: args.place,
                dias: args.days,
                pagina: 1,
                registrosPorPagina: CATEGORY_BROWSE.pageSize,
              },
              demo: args.demo,
            },
          });
          if (args.signal.aborted) return;
          if (!result.ok) {
            uncertain = true;
            break;
          }
          const items = result.page.items.filter((record) => belongsToCategory(record, code));
          if (items.length) {
            const match: AvailabilityPage["found"][number] = {
              code,
              page: {
                items,
                fetchedAt: result.fetchedAt,
                partial: false,
                capped: false,
                next: { page: 1, sources: terms.map((_, i) => i) },
              },
            };
            found.push(match);
            args.onFound?.(match);
            confirmed = true;
            break;
          }
        } catch {
          uncertain = true;
          break;
        }
      }
      if (!confirmed && uncertain) failed++;
      args.onProgress?.(++checked, codes.length);
    }
  }
  await Promise.all(Array.from({ length: 4 }, () => worker()));
  if (args.signal.aborted) throw new Error("Consulta cancelada.");
  if (failed === codes.length)
    throw new Error("Não foi possível verificar as categorias. Tente novamente.");
  const next = args.offset + codes.length;
  return {
    found,
    failed,
    checked: codes.length,
    next: next < AVAILABILITY_CODES.length ? next : undefined,
  };
}
