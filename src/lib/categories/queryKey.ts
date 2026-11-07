import type { Place } from "@/lib/economiza/validation";
export const categoryProductsKey = (
  category: string,
  place: Place | undefined,
  days: number,
  terms: readonly string[],
  demo: boolean,
) => ["category-products-v2", category, place, days, terms, demo] as const;
