import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { searchProducts } from "@/lib/economiza/api.functions";
import type { Place } from "@/lib/economiza/validation";
import { checkCategoryAvailability } from "@/lib/categories/availability";
import { categoryProductsKey } from "@/lib/categories/queryKey";
import { CATEGORY_BROWSE, CATEGORY_TERMS } from "@/lib/categories/catalog";
import type { BrowsePage, BrowseCursor } from "@/lib/categories/browse";

export function useAvailableCategories(
  place: Place | undefined,
  days: number,
  demo: boolean,
  enabled: boolean,
) {
  const client = useQueryClient();
  const scope = JSON.stringify([place, days, demo]);
  const [settled, setSettled] = useState(scope);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(scope), CATEGORY_BROWSE.filterDelayMs);
    return () => clearTimeout(timer);
  }, [scope]);
  const waiting = scope !== settled;
  const query = useInfiniteQuery({
    queryKey: ["available-categories-v1", place, days, demo],
    enabled: enabled && !!place && !waiting,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const result = await checkCategoryAvailability(searchProducts, {
        place: place!,
        days,
        demo,
        offset: pageParam,
        signal,
      });
      for (const found of result.found) {
        const key = categoryProductsKey(found.code, place, days, CATEGORY_TERMS[found.code]!, demo);
        const existing = client.getQueryData<InfiniteData<BrowsePage, BrowseCursor>>(key);
        if (!existing?.pages.some((page) => page.items.length))
          client.setQueryData<InfiniteData<BrowsePage, BrowseCursor>>(key, {
            pages: [found.page],
            pageParams: [{ page: 1, sources: CATEGORY_TERMS[found.code]!.map((_, i) => i) }],
          });
      }
      return result;
    },
    getNextPageParam: (page) => page.next,
    staleTime: CATEGORY_BROWSE.staleMs,
    gcTime: CATEGORY_BROWSE.gcMs,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const pages = query.data?.pages ?? [];
  return {
    query,
    waiting,
    codes: new Set(pages.flatMap((p) => p.found.map((f) => f.code))),
    failed: pages.some((p) => p.failed > 0),
  };
}
