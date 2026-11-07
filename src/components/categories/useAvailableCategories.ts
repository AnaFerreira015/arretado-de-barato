import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { searchProducts } from "@/lib/economiza/api.functions";
import type { Place } from "@/lib/economiza/validation";
import {
  checkCategoryAvailability,
  AVAILABILITY_BATCH_SIZE,
  AVAILABILITY_CODES,
  type AvailabilityPage,
} from "@/lib/categories/availability";
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
  const [progress, setProgress] = useState<{
    scope: string;
    found: AvailabilityPage["found"];
    checked: number;
    total: number;
  }>({ scope: "", found: [], checked: 0, total: AVAILABILITY_BATCH_SIZE });
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
      setProgress({
        scope,
        found: [],
        checked: 0,
        total: Math.min(AVAILABILITY_BATCH_SIZE, AVAILABILITY_CODES.length - pageParam),
      });
      const result = await checkCategoryAvailability(searchProducts, {
        place: place!,
        days,
        demo,
        offset: pageParam,
        signal,
        onFound: (found) => {
          if (signal.aborted) return;
          const key = categoryProductsKey(
            found.code,
            place,
            days,
            CATEGORY_TERMS[found.code]!,
            demo,
          );
          const existing = client.getQueryData<InfiniteData<BrowsePage, BrowseCursor>>(key);
          if (!existing?.pages.some((page) => page.items.length))
            client.setQueryData<InfiniteData<BrowsePage, BrowseCursor>>(key, {
              pages: [found.page],
              pageParams: [{ page: 1, sources: CATEGORY_TERMS[found.code]!.map((_, i) => i) }],
            });
          setProgress((previous) =>
            previous.scope === scope
              ? { ...previous, found: [...previous.found, found] }
              : { scope, found: [found], checked: 0, total: AVAILABILITY_BATCH_SIZE },
          );
        },
        onProgress: (checked, total) => {
          if (!signal.aborted) setProgress((previous) => ({ ...previous, scope, checked, total }));
        },
      });
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
    codes: new Set([
      ...pages.flatMap((p) => p.found.map((f) => f.code)),
      ...(progress.scope === scope ? progress.found.map((f) => f.code) : []),
    ]),
    remaining:
      progress.scope === scope
        ? Math.max(0, progress.total - progress.checked)
        : AVAILABILITY_BATCH_SIZE,
    failed: pages.some((p) => p.failed > 0),
  };
}
